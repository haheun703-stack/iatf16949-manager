// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase A1 — 단일 게이트웨이 (에이전트 경로).
//
//  모든 "도구 쓰는" Claude 호출의 단일 진입점. (단순 텍스트 generate 는 기존 ai/index.ts 유지)
//   - tool-use 루프: tool_use → 핸들러 실행 → tool_result → end_turn 까지.
//   - 프롬프트 캐싱: 불변 척추(system)에 cache_control=ephemeral.
//   - 재시도: 429/overloaded/5xx 지수 백오프.
//   - 모델 라우팅: tier(fast|reasoning) → config(env) 모델.
//   - 모든 호출 → ai_actions 에 토큰·비용·purpose 로깅(감사추적).
//
//  draft 도구는 ai_drafts 에만 쓰므로(A2/A3), 게이트웨이가 공식 테이블을 건드릴 일은 없다.
// ─────────────────────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk'
import { loadEnv } from './env-loader'
import { logAction } from './drafts'
import { getTool, toAnthropicTools, type AiTool } from './tools'

const DEFAULT_MODEL = 'claude-sonnet-4-5'

let cached: { client: Anthropic; key: string } | null = null
function getClient(): { client: Anthropic } | null {
  const key = loadEnv().CLAUDE_API_KEY
  if (!key) return null
  if (!cached || cached.key !== key) cached = { client: new Anthropic({ apiKey: key }), key }
  return { client: cached.client }
}

/** tier 별 모델 해소(config/env). reasoning 모델 미설정 시 기본 모델로 폴백(하드코딩 금지). */
function resolveModel(tier: 'fast' | 'reasoning' | undefined, explicit?: string): string {
  if (explicit) return explicit
  const env = loadEnv() as Record<string, string | undefined>
  if (tier === 'reasoning') return env.CLAUDE_MODEL_REASONING || env.CLAUDE_MODEL || DEFAULT_MODEL
  return env.CLAUDE_MODEL || DEFAULT_MODEL
}

// 대략 단가(USD / 1M tokens). 모델군별 추정 — 정확 청구액 아님(로그/대시보드용 근사).
const PRICING: Array<{ match: RegExp; in: number; out: number }> = [
  { match: /opus/i, in: 15, out: 75 },
  { match: /sonnet/i, in: 3, out: 15 },
  { match: /haiku/i, in: 0.8, out: 4 }
]
function estimateCostUsd(model: string, tin: number, tout: number): number | null {
  const p = PRICING.find((x) => x.match.test(model))
  if (!p) return null
  return +((tin / 1e6) * p.in + (tout / 1e6) * p.out).toFixed(6)
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status
  if (status === 429 || status === 529 || (status != null && status >= 500)) return true
  const msg = err instanceof Error ? err.message.toLowerCase() : ''
  return msg.includes('overloaded') || msg.includes('rate limit') || msg.includes('timeout')
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (i === tries - 1 || !isRetryable(err)) throw err
      const backoff = Math.min(1000 * 2 ** i, 8000)
      await new Promise((r) => setTimeout(r, backoff))
    }
  }
  throw lastErr
}

export interface AiCallOpts {
  purpose: string // 'copilot' | 'briefing' | 'structure_capture' …
  system: string // 불변 척추(캐시 대상)
  messages: Anthropic.MessageParam[]
  tools?: string[] // 활성화할 도구 이름(레지스트리 부분집합)
  tier?: 'fast' | 'reasoning'
  model?: string
  maxTokens?: number
  maxToolTurns?: number
}

export interface AiCallResult {
  text: string
  toolCalls: Array<{ name: string; args: unknown; ok: boolean }>
  /** search_knowledge 가 반환한 근거(인용 칩용). kind+ref_key 로 디둡. */
  sources: Array<{ kind: string; ref_key: string; title: string }>
  usage: { input: number; output: number }
  costUsd: number | null
  model: string
  stopReason: string | null
}

/**
 * 에이전트 호출. 도구가 필요하면 tool-use 루프를 돌고, 최종 텍스트를 반환한다.
 * 모든 호출은 ai_actions(purpose) 에 1행 이상 로깅된다.
 */
export async function aiCall(opts: AiCallOpts): Promise<AiCallResult> {
  const got = getClient()
  if (!got) throw new Error('Claude API 키가 설정되지 않았습니다.(.env CLAUDE_API_KEY)')
  const model = resolveModel(opts.tier, opts.model)
  const enabled: AiTool[] = (opts.tools ?? []).map(getTool).filter((t): t is AiTool => Boolean(t))
  const anthropicTools = enabled.length ? toAnthropicTools(enabled) : undefined

  // 불변 척추는 캐시(반복 호출 비용 절감)
  const system: Anthropic.TextBlockParam[] = [
    { type: 'text', text: opts.system, cache_control: { type: 'ephemeral' } }
  ]
  const messages: Anthropic.MessageParam[] = [...opts.messages]
  const toolCalls: AiCallResult['toolCalls'] = []
  const sourceMap = new Map<string, { kind: string; ref_key: string; title: string }>()
  let totalIn = 0
  let totalOut = 0
  let stopReason: string | null = null
  const maxTurns = opts.maxToolTurns ?? 6

  for (let turn = 0; turn < maxTurns; turn++) {
    const params: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system,
      messages,
      ...(anthropicTools ? { tools: anthropicTools } : {})
    }
    const resp: Anthropic.Message = await withRetry(() => got.client.messages.create(params))
    totalIn += resp.usage.input_tokens
    totalOut += resp.usage.output_tokens
    stopReason = resp.stop_reason

    const toolUses = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
    )

    if (toolUses.length === 0) {
      const text = resp.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      const costUsd = estimateCostUsd(model, totalIn, totalOut)
      logAction({
        actor: 'ai',
        action: 'query',
        purpose: opts.purpose,
        model,
        tokensIn: totalIn,
        tokensOut: totalOut,
        costUsd
      })
      return {
        text,
        toolCalls,
        sources: [...sourceMap.values()],
        usage: { input: totalIn, output: totalOut },
        costUsd,
        model,
        stopReason
      }
    }

    // 도구 실행 → tool_result 회신
    messages.push({ role: 'assistant', content: resp.content })
    const results: Anthropic.ToolResultBlockParam[] = []
    for (const tu of toolUses) {
      const tool = getTool(tu.name)
      let out: unknown
      let ok = true
      try {
        if (!tool) throw new Error(`알 수 없는 도구: ${tu.name}`)
        const args = tool.input.parse(tu.input) as Record<string, unknown>
        out = await tool.handler(args)
      } catch (err) {
        ok = false
        out = { error: err instanceof Error ? err.message : String(err) }
      }
      if (ok && tu.name === 'search_knowledge' && out && typeof out === 'object') {
        const hits = (out as { results?: Array<{ kind: string; ref_key: string; title: string }> }).results
        if (Array.isArray(hits)) {
          for (const h of hits) sourceMap.set(`${h.kind}:${h.ref_key}`, { kind: h.kind, ref_key: h.ref_key, title: h.title })
        }
      }
      toolCalls.push({ name: tu.name, args: tu.input, ok })
      results.push({ type: 'tool_result', tool_use_id: tu.id, content: JSON.stringify(out), is_error: !ok })
    }
    messages.push({ role: 'user', content: results })
  }

  // 최대 턴 도달 — 도구 없이 마지막 1회로 "지금까지 근거"로 답을 강제(빈 응답 방지).
  let finalText = ''
  try {
    const finalParams: Anthropic.MessageCreateParamsNonStreaming = {
      model,
      max_tokens: opts.maxTokens ?? 1500,
      system,
      messages: [
        ...messages,
        { role: 'user', content: '추가 검색하지 말고, 지금까지 찾은 근거만으로 답하세요. 충분치 않으면 찾은 범위에서 정직히 답하세요.' }
      ]
    }
    const fin: Anthropic.Message = await withRetry(() => got.client.messages.create(finalParams))
    totalIn += fin.usage.input_tokens
    totalOut += fin.usage.output_tokens
    stopReason = fin.stop_reason
    finalText = fin.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
  } catch {
    finalText = '(응답을 생성하지 못했습니다)'
  }
  const costUsd = estimateCostUsd(model, totalIn, totalOut)
  logAction({ actor: 'ai', action: 'query', purpose: opts.purpose, model, tokensIn: totalIn, tokensOut: totalOut, costUsd })
  return {
    text: finalText || '(응답 없음)',
    toolCalls,
    sources: [...sourceMap.values()],
    usage: { input: totalIn, output: totalOut },
    costUsd,
    model,
    stopReason
  }
}
