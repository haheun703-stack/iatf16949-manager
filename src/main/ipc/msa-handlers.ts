import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  MsaStudyDto,
  MsaMethod,
  MsaResult,
  MsaCreateInput,
  MsaUpdateInput
} from '@shared/ipc-types'

/** %GRR → 판정 (AIAG MSA): <10 양호, ≤30 조건부, >30 부적합, 미입력 보류 */
function judge(grr: number | null | undefined): MsaResult {
  if (grr == null) return 'pending'
  if (grr < 10) return 'acceptable'
  if (grr <= 30) return 'marginal'
  return 'unacceptable'
}

function rowToStudy(r: Record<string, unknown>): MsaStudyDto {
  return {
    id: r.id as number,
    gageName: r.gage_name as string,
    gageNo: (r.gage_no as string) || null,
    characteristic: (r.characteristic as string) || null,
    method: (r.method as MsaMethod) ?? 'gage_rr',
    grrPercent: r.grr_percent == null ? null : (r.grr_percent as number),
    ndc: r.ndc == null ? null : (r.ndc as number),
    result: (r.result as MsaResult) ?? 'pending',
    clauseId: (r.clause_id as string) || null,
    teamId: (r.team_id as string) || null,
    teamName: (r.team_name as string) || null,
    studyDate: (r.study_date as string) || null,
    note: (r.note as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

export function registerMsaHandlers(): void {
  const db = getSqlite()

  // ──── 목록 (판정 나쁜 순 우선 노출) ────
  ipcMain.handle(IPC_CHANNELS.MSA_LIST, (): MsaStudyDto[] => {
    const rows = db
      .prepare(
        `SELECT m.*, t.name AS team_name
         FROM msa_studies m LEFT JOIN teams t ON m.team_id = t.id
         ORDER BY m.sort_order ASC, m.id ASC`
      )
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToStudy)
  })

  // ──── 생성 (result 자동 판정) ────
  ipcMain.handle(IPC_CHANNELS.MSA_CREATE, (_event, input: MsaCreateInput): { id: number } => {
    const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order),0) AS m FROM msa_studies').get() as {
      m: number
    }
    const res = db
      .prepare(
        `INSERT INTO msa_studies
           (gage_name, gage_no, characteristic, method, grr_percent, ndc, result, clause_id, team_id, study_date, note, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.gageName?.trim() || '게이지',
        input.gageNo ?? null,
        input.characteristic ?? null,
        input.method ?? 'gage_rr',
        input.grrPercent ?? null,
        input.ndc ?? null,
        judge(input.grrPercent),
        input.clauseId ?? '7.1.5.1.1',
        input.teamId ?? 'team-qc',
        input.studyDate ?? null,
        input.note ?? null,
        (maxOrder.m ?? 0) + 10
      )
    return { id: Number(res.lastInsertRowid) }
  })

  // ──── 수정 (부분 + grr 변경 시 result 재판정) ────
  ipcMain.handle(IPC_CHANNELS.MSA_UPDATE, (_event, input: MsaUpdateInput): { success: boolean } => {
    const map: Record<string, string> = {
      gageName: 'gage_name',
      gageNo: 'gage_no',
      characteristic: 'characteristic',
      method: 'method',
      grrPercent: 'grr_percent',
      ndc: 'ndc',
      clauseId: 'clause_id',
      teamId: 'team_id',
      studyDate: 'study_date',
      note: 'note'
    }
    const sets: string[] = []
    const values: unknown[] = []
    for (const [key, col] of Object.entries(map)) {
      if (key in input) {
        sets.push(`${col} = ?`)
        values.push((input as unknown as Record<string, unknown>)[key] ?? null)
      }
    }
    // grr 변경 시 result 자동 재판정
    if ('grrPercent' in input) {
      sets.push('result = ?')
      values.push(judge(input.grrPercent))
    }
    if (sets.length === 0) return { success: false }
    sets.push("updated_at = datetime('now')")
    values.push(input.id)
    db.prepare(`UPDATE msa_studies SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return { success: true }
  })

  // ──── 삭제 ────
  ipcMain.handle(IPC_CHANNELS.MSA_DELETE, (_event, { id }: { id: number }): { success: boolean } => {
    db.prepare('DELETE FROM msa_studies WHERE id = ?').run(id)
    return { success: true }
  })
}
