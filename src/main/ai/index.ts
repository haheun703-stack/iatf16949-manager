import type { AiProvider, AiProviderId, AiGenerateOptions } from './types'
import { loadEnv } from './env-loader'
import { claudeProvider } from './claude-provider'
import { openaiProvider } from './openai-provider'
import { geminiProvider } from './gemini-provider'

export type { AiGenerateOptions, AiProviderId, AiProvider } from './types'

const PROVIDERS: Record<AiProviderId, AiProvider> = {
  claude: claudeProvider,
  openai: openaiProvider,
  gemini: geminiProvider
}

const DEFAULT_FALLBACK_CHAIN: AiProviderId[] = ['claude', 'openai', 'gemini']

function parseChain(raw: string | undefined): AiProviderId[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is AiProviderId => s === 'claude' || s === 'openai' || s === 'gemini')
}

/** Returns the ordered list of providers to try, based on env. */
function resolveChain(): AiProviderId[] {
  const env = loadEnv()
  const primary = env.AI_PROVIDER as AiProviderId | undefined
  const userChain = parseChain(env.AI_FALLBACK_CHAIN)

  // 1) Explicit AI_FALLBACK_CHAIN wins (full control)
  if (userChain.length > 0) {
    return userChain
  }

  // 2) AI_PROVIDER sets primary, others as fallback
  if (primary && PROVIDERS[primary]) {
    return [primary, ...DEFAULT_FALLBACK_CHAIN.filter((p) => p !== primary)]
  }

  // 3) Default: claude > openai > gemini
  return DEFAULT_FALLBACK_CHAIN
}

export interface AiGenerateResult {
  text: string
  providerId: AiProviderId
  model: string
  attempts: Array<{ providerId: AiProviderId; error: string }>
}

/**
 * Generates text using the configured provider chain, falling back on failure.
 * Throws if all providers fail.
 */
export async function generate(opts: AiGenerateOptions): Promise<AiGenerateResult> {
  const chain = resolveChain()
  const attempts: Array<{ providerId: AiProviderId; error: string }> = []

  for (const id of chain) {
    const provider = PROVIDERS[id]
    if (!provider.isConfigured()) {
      attempts.push({ providerId: id, error: 'API 키 미설정' })
      continue
    }
    try {
      const text = await provider.generate(opts)
      return { text, providerId: id, model: provider.currentModel(), attempts }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[ai] ${id} failed: ${msg}`)
      attempts.push({ providerId: id, error: msg })
    }
  }

  const summary = attempts.map((a) => `${a.providerId}: ${a.error}`).join(' | ')
  throw new Error(`모든 AI 프로바이더 호출 실패. ${summary || '사용 가능한 프로바이더 없음'}`)
}

/** For UI/status display. */
export function getProvidersStatus(): Array<{
  id: AiProviderId
  displayName: string
  configured: boolean
  model: string
}> {
  return (Object.keys(PROVIDERS) as AiProviderId[]).map((id) => {
    const p = PROVIDERS[id]
    return {
      id,
      displayName: p.displayName,
      configured: p.isConfigured(),
      model: p.currentModel()
    }
  })
}
