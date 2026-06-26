// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 IPC — Phase C 그라운디드 코파일럿(read-only).
//  게이트웨이(aiCall)에 read 도구만 주입 → 우리 데이터로만 답. draft/쓰기 도구 미주입 = 위험 0.
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { aiCall } from '../ai/gateway'
import { computeBriefingFacts, summarizeBriefing } from '../ai/briefing'
import type {
  CopilotAskRequest,
  CopilotAskResponse,
  BriefingFacts,
  BriefingSummarizeResponse
} from '@shared/ipc-types'

const COPILOT_SYSTEM = `당신은 TPC(2공장 AM사업부)의 IATF 16949 품질경영시스템 데이터 어시스턴트입니다.
- 우리 데이터로만 답합니다. 먼저 search_knowledge 로 근거(조항 clause·SQ항목 sq_item·양식 form_def·케이스 case·프로세스 process)를 찾고, 필요하면 get_form_definition·get_open_cases·get_document_bom 으로 사실을 조회하세요.
- 검색은 핵심 키워드로 1~2회면 충분합니다. 근거를 찾았으면 더 검색하지 말고 바로 답하세요. 완벽한 정의가 없어도 찾은 근거 범위에서 답하면 됩니다.
- 추측 금지: 관련 근거가 전혀 없으면 "우리 데이터에서 찾지 못했습니다"라고 답하세요. 숫자·날짜·이름·근거를 지어내지 마세요.
- 근거가 된 항목의 ref_key(예: B-2100, 3_5, QC-2026-0007)를 답변 안에 명시하세요.
- 한국어, 간결, 공식 문서체. 목록/표가 적절하면 사용. 마크다운 표 가능.`

const COPILOT_TOOLS = ['search_knowledge', 'get_form_definition', 'get_open_cases', 'get_document_bom']

export function registerAiHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.AI_COPILOT_ASK,
    async (_event, req: CopilotAskRequest): Promise<CopilotAskResponse> => {
      try {
        const messages = (req.messages ?? [])
          .filter((m) => m.text && m.text.trim())
          .map((m) => ({ role: m.role, content: m.text }))
        if (messages.length === 0) return { success: false, error: '질문이 비어 있습니다.' }

        const result = await aiCall({
          purpose: 'copilot',
          system: COPILOT_SYSTEM,
          messages,
          tools: COPILOT_TOOLS,
          tier: 'fast',
          maxTokens: 1800,
          maxToolTurns: 6
        })

        return {
          success: true,
          text: result.text,
          sources: result.sources,
          tools: result.toolCalls.map((t) => ({ name: t.name, ok: t.ok })),
          costUsd: result.costUsd
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:copilot] error', msg)
        return { success: false, error: msg }
      }
    }
  )

  // ──── C2 브리핑: 사실(결정론, 무API) ────
  ipcMain.handle(IPC_CHANNELS.AI_BRIEFING_FACTS, (): BriefingFacts => computeBriefingFacts())

  // ──── C2 브리핑: AI 요약(사실 → 자연어, 온디맨드) ────
  ipcMain.handle(
    IPC_CHANNELS.AI_BRIEFING_SUMMARIZE,
    async (_event, { facts }: { facts: BriefingFacts }): Promise<BriefingSummarizeResponse> => {
      try {
        const { text, costUsd } = await summarizeBriefing(facts)
        return { success: true, text, costUsd }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:briefing] error', msg)
        return { success: false, error: msg }
      }
    }
  )
}
