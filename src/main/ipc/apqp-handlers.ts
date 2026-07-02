import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  ApqpBoardDto,
  ApqpPhaseDto,
  ApqpElementDto,
  ApqpStatus,
  ApqpCoreTool,
  ApqpElementUpdateInput
} from '@shared/ipc-types'

function rowToElement(r: Record<string, unknown>): ApqpElementDto {
  return {
    id: r.id as string,
    phaseId: r.phase_id as string,
    seq: r.seq as number,
    name: r.name as string,
    nameEn: (r.name_en as string) || null,
    io: (r.io as 'input' | 'output') ?? 'output',
    coreTool: (r.core_tool as ApqpCoreTool) || null,
    clauseId: (r.clause_id as string) || null,
    clauseTitle: (r.clause_title as string) || null,
    teamId: (r.team_id as string) || null,
    teamName: (r.team_name as string) || null,
    status: (r.status as ApqpStatus) ?? 'not_started',
    targetDate: (r.target_date as string) || null,
    actualDate: (r.actual_date as string) || null,
    note: (r.note as string) || null
  }
}

export function registerApqpHandlers(): void {
  const db = getSqlite()

  // ──── 보드: 5단계 + 43산출물 + 진척 집계 ────
  ipcMain.handle(IPC_CHANNELS.APQP_BOARD, (): ApqpBoardDto => {
    const phaseRows = db
      .prepare('SELECT * FROM apqp_phases ORDER BY sort_order ASC')
      .all() as Array<Record<string, unknown>>
    const elemRows = db
      .prepare(
        `SELECT e.*, c.title AS clause_title, t.name AS team_name
         FROM apqp_elements e
         LEFT JOIN clauses c ON e.clause_id = c.id
         LEFT JOIN teams t ON e.team_id = t.id
         ORDER BY e.phase_id ASC, e.seq ASC`
      )
      .all() as Array<Record<string, unknown>>

    const byPhase = new Map<string, ApqpElementDto[]>()
    for (const r of elemRows) {
      const e = rowToElement(r)
      if (!byPhase.has(e.phaseId)) byPhase.set(e.phaseId, [])
      byPhase.get(e.phaseId)!.push(e)
    }

    const phases: ApqpPhaseDto[] = phaseRows.map((p) => {
      const elements = byPhase.get(p.id as string) ?? []
      const applicable = elements.filter((e) => e.status !== 'na')
      return {
        id: p.id as string,
        phaseNo: p.phase_no as number,
        title: p.title as string,
        titleEn: (p.title_en as string) || null,
        description: (p.description as string) || null,
        elements,
        total: applicable.length,
        completed: applicable.filter((e) => e.status === 'completed').length,
        inProgress: applicable.filter((e) => e.status === 'in_progress').length
      }
    })

    const totAll = phases.reduce((s, p) => s + p.total, 0)
    const totDone = phases.reduce((s, p) => s + p.completed, 0)
    const overallPct = totAll > 0 ? Math.round((totDone / totAll) * 100) : 0
    // 현재 단계 = 미완료 요소가 남은 첫 단계 (전부 완료면 마지막 단계)
    const firstOpen = phases.find((p) => p.completed < p.total)
    const currentPhaseNo = firstOpen ? firstOpen.phaseNo : (phases.at(-1)?.phaseNo ?? 5)

    return { phases, overallPct, currentPhaseNo }
  })

  // ──── 산출물 수정 (화이트리스트: 상태·일정·메모) ────
  ipcMain.handle(
    IPC_CHANNELS.APQP_ELEMENT_UPDATE,
    (_event, input: ApqpElementUpdateInput): { success: boolean } => {
      const sets: string[] = []
      const values: unknown[] = []
      if ('status' in input && input.status) {
        sets.push('status = ?')
        values.push(input.status)
      }
      if ('targetDate' in input) {
        sets.push('target_date = ?')
        values.push(input.targetDate ?? null)
      }
      if ('actualDate' in input) {
        sets.push('actual_date = ?')
        values.push(input.actualDate ?? null)
      }
      if ('note' in input) {
        sets.push('note = ?')
        values.push(input.note ?? null)
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE apqp_elements SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )
}
