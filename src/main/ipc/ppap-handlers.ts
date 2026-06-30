import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  PpapSubmissionDto,
  PpapElementDto,
  PpapBoardDto,
  PpapLevel,
  PpapSubmissionStatus,
  PpapElementStatus,
  PpapSubmissionCreateInput,
  PpapSubmissionUpdateInput,
  PpapElementUpdateInput
} from '@shared/ipc-types'

function rowToSubmission(r: Record<string, unknown>): PpapSubmissionDto {
  return {
    id: r.id as number,
    partNo: r.part_no as string,
    partName: (r.part_name as string) || null,
    customer: (r.customer as string) || null,
    level: (r.level as PpapLevel) ?? 3,
    status: (r.status as PpapSubmissionStatus) ?? 'draft',
    submittedDate: (r.submitted_date as string) || null,
    approvedDate: (r.approved_date as string) || null,
    note: (r.note as string) || null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

function rowToElement(r: Record<string, unknown>): PpapElementDto {
  return {
    id: r.id as number,
    submissionId: r.submission_id as number,
    seq: r.seq as number,
    name: r.name as string,
    nameEn: (r.name_en as string) || null,
    clauseId: (r.clause_id as string) || null,
    teamId: (r.team_id as string) || null,
    teamName: (r.team_name as string) || null,
    status: (r.status as PpapElementStatus) ?? 'not_started',
    note: (r.note as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    updatedAt: r.updated_at as string
  }
}

export function registerPpapHandlers(): void {
  const db = getSqlite()

  // ──── 제출 목록 ────
  ipcMain.handle(IPC_CHANNELS.PPAP_SUBMISSION_LIST, (): PpapSubmissionDto[] => {
    const rows = db
      .prepare('SELECT * FROM ppap_submissions ORDER BY created_at DESC, id DESC')
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToSubmission)
  })

  // ──── 보드 (제출 + 18요소 + 진척률) ────
  ipcMain.handle(
    IPC_CHANNELS.PPAP_BOARD,
    (_event, { submissionId }: { submissionId: number }): PpapBoardDto | null => {
      const sub = db
        .prepare('SELECT * FROM ppap_submissions WHERE id = ?')
        .get(submissionId) as Record<string, unknown> | undefined
      if (!sub) return null

      const rows = db
        .prepare(
          `SELECT e.*, t.name AS team_name
           FROM ppap_elements e
           LEFT JOIN teams t ON e.team_id = t.id
           WHERE e.submission_id = ?
           ORDER BY e.seq ASC`
        )
        .all(submissionId) as Array<Record<string, unknown>>
      const elements = rows.map(rowToElement)

      // 진척률: na 제외한 적용대상 중 completed 비율
      const applicable = elements.filter((e) => e.status !== 'na').length
      const completed = elements.filter((e) => e.status === 'completed').length
      const percent = applicable > 0 ? Math.round((completed / applicable) * 100) : 0

      return { submission: rowToSubmission(sub), elements, progress: { completed, applicable, percent } }
    }
  )

  // ──── 요소 상태/메모 수정 (화이트리스트) ────
  ipcMain.handle(
    IPC_CHANNELS.PPAP_ELEMENT_UPDATE,
    (_event, input: PpapElementUpdateInput): { success: boolean } => {
      const sets: string[] = []
      const values: unknown[] = []
      if ('status' in input && input.status) {
        sets.push('status = ?')
        values.push(input.status)
      }
      if ('note' in input) {
        sets.push('note = ?')
        values.push(input.note ?? null)
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE ppap_elements SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 제출 생성 (헤더 + 18 표준요소 자동 생성) ────
  ipcMain.handle(
    IPC_CHANNELS.PPAP_SUBMISSION_CREATE,
    (_event, input: PpapSubmissionCreateInput): { id: number } => {
      const create = db.transaction(() => {
        const res = db
          .prepare(
            `INSERT INTO ppap_submissions (part_no, part_name, customer, level, status, submitted_date, approved_date, note)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            input.partNo?.trim() || 'NEW-001',
            input.partName ?? null,
            input.customer ?? null,
            input.level ?? 3,
            input.status ?? 'draft',
            input.submittedDate ?? null,
            input.approvedDate ?? null,
            input.note ?? null
          )
        const newId = Number(res.lastInsertRowid)
        // 기존 데모 제출의 18 표준요소를 템플릿으로 복제(상태는 초기화)
        const template = db
          .prepare(
            `SELECT seq, name, name_en, clause_id, team_id, sort_order
             FROM ppap_elements
             WHERE submission_id = (SELECT id FROM ppap_submissions ORDER BY id ASC LIMIT 1)
             ORDER BY seq ASC`
          )
          .all() as Array<Record<string, unknown>>
        const ins = db.prepare(
          `INSERT INTO ppap_elements (submission_id, seq, name, name_en, clause_id, team_id, status, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, 'not_started', ?)`
        )
        for (const t of template) {
          ins.run(newId, t.seq, t.name, t.name_en, t.clause_id, t.team_id, t.sort_order)
        }
        return newId
      })
      return { id: create() }
    }
  )

  // ──── 제출 헤더 수정 (부분) ────
  ipcMain.handle(
    IPC_CHANNELS.PPAP_SUBMISSION_UPDATE,
    (_event, input: PpapSubmissionUpdateInput): { success: boolean } => {
      const map: Record<string, string> = {
        partNo: 'part_no',
        partName: 'part_name',
        customer: 'customer',
        level: 'level',
        status: 'status',
        submittedDate: 'submitted_date',
        approvedDate: 'approved_date',
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
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE ppap_submissions SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )
}
