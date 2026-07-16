import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  SqGuideDto,
  SqGuideCheckpointDto,
  SqCheckpointStatus,
  SqCheckpointUpdateInput,
  SqSuggestedState
} from '@shared/ipc-types'

/**
 * SQ 작성 가이드층 (0064, 코워크 07/08 지시서 재구성).
 * 가이드 = 읽기 전용 마스터(수정 API 없음 — 개정은 JSON 재시드).
 * 체크포인트 상태 → 이행상태는 "제안"일 뿐, 확정은 자체평가에서 사람이(A레일 원칙).
 */

/** 07번 5절 SqStateSuggestionRule — 결정론 분기. '우수'는 개선증빙 수동 플래그(v1 미지원). */
export function suggestState(checkpoints: Array<{ status: SqCheckpointStatus }>): SqSuggestedState {
  if (checkpoints.length === 0) return '미관리'
  const active = checkpoints.filter((c) => c.status !== 'na')
  if (active.length === 0) return '미해당'
  const missing = active.filter((c) => c.status === 'missing').length
  const partial = active.filter((c) => c.status === 'partial').length
  if (missing === active.length) return '미관리' // 기준·실적 모두 없음
  if (missing === 0 && partial === 0) return '양호'
  if (missing === 0) return '보완'
  if (missing <= 2) return '일부미흡' // [대책수립 요청] 문구는 자체평가 화면에서
  return '다수미흡'
}

export function registerSqGuideHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.SQ_GUIDE_GET, (_event, { itemCode }: { itemCode: string }): SqGuideDto | null => {
    try {
      const head = db
        .prepare(
          `SELECT gi.item_code, gi.area, gi.high_value, gi.regulations_text, gi.forms_text,
                  gi.cycle_retention, gi.guide_version, si.title, si.points
           FROM sq_guide_items gi JOIN sq_items si ON si.code = gi.item_code
           WHERE gi.item_code = ?`
        )
        .get(itemCode) as Record<string, unknown> | undefined
      if (!head) return null

      const bullets = db
        .prepare(
          `SELECT id, section, sort_order, content FROM sq_guides
           WHERE item_code = ? ORDER BY section, sort_order`
        )
        .all(itemCode) as Array<{ id: number; section: string; sort_order: number; content: string }>

      const cps = db
        .prepare(
          `SELECT cp.id, cp.guide_id, cp.status, cp.evidence_note, g.content
           FROM sq_checkpoints cp JOIN sq_guides g ON g.id = cp.guide_id
           WHERE cp.item_code = ? ORDER BY g.sort_order`
        )
        .all(itemCode) as Array<Record<string, unknown>>
      const checkpoints: SqGuideCheckpointDto[] = cps.map((r) => ({
        id: r.id as number,
        guideId: r.guide_id as number,
        content: r.content as string,
        status: (r.status as SqCheckpointStatus) || 'missing',
        evidenceNote: (r.evidence_note as string) || null
      }))

      const pick = (section: string): string[] =>
        bullets.filter((b) => b.section === section).map((b) => b.content)

      return {
        itemCode,
        title: (head.title as string) || itemCode,
        area: head.area as string,
        score: (head.points as number) ?? 0,
        highValue: ((head.high_value as number) ?? 0) === 1,
        regulationsText: (head.regulations_text as string) || null,
        formsText: (head.forms_text as string) || null,
        cycleRetention: (head.cycle_retention as string) || null,
        guideVersion: (head.guide_version as string) || 'Ver4',
        checkpoints,
        howToWrite: pick('how_to_write'),
        examples: pick('examples'),
        penaltyPatterns: pick('penalty_patterns'),
        suggestedState: suggestState(checkpoints)
      }
    } catch (err) {
      console.error('[sq:guideGet] failed:', (err as Error).message)
      return null
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SQ_CHECKPOINT_UPDATE,
    (_event, input: SqCheckpointUpdateInput): { success: boolean; suggestedState: SqSuggestedState } => {
      try {
        const row = db.prepare('SELECT item_code FROM sq_checkpoints WHERE id = ?').get(input.checkpointId) as
          | { item_code: string }
          | undefined
        if (!row) return { success: false, suggestedState: '미관리' }
        const sets: string[] = ["status = ?", "updated_at = datetime('now')"]
        const vals: unknown[] = [input.status]
        if ('evidenceNote' in input) {
          sets.push('evidence_note = ?')
          vals.push(input.evidenceNote ?? null)
        }
        if (input.updatedBy) {
          sets.push('updated_by = ?')
          vals.push(input.updatedBy)
        }
        vals.push(input.checkpointId)
        db.prepare(`UPDATE sq_checkpoints SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

        const cps = db
          .prepare('SELECT status FROM sq_checkpoints WHERE item_code = ?')
          .all(row.item_code) as Array<{ status: SqCheckpointStatus }>
        return { success: true, suggestedState: suggestState(cps) }
      } catch (err) {
        console.error('[sq:checkpointUpdate] failed:', (err as Error).message)
        return { success: false, suggestedState: '미관리' }
      }
    }
  )
}
