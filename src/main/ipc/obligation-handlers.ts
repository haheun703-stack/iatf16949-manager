import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  ObligationDto,
  ObligationCreateInput,
  ObligationUpdateInput,
  ObligationCadence,
  ObligationCategory
} from '@shared/ipc-types'

function rowToObligation(r: Record<string, unknown>): ObligationDto {
  return {
    id: r.id as number,
    title: r.title as string,
    cadence: (r.cadence as ObligationCadence) ?? '월',
    category: (r.category as ObligationCategory) ?? '기타',
    clauseRef: (r.clause_ref as string) || null,
    owner: (r.owner as string) || null,
    leadDays: (r.lead_days as number) ?? 7,
    anchorDate: (r.anchor_date as string) || null,
    lastDoneDate: (r.last_done_date as string) || null,
    nextDueDate: (r.next_due_date as string) || null,
    formCode: (r.form_code as string) || null,
    active: ((r.active as number) ?? 1) === 1,
    note: (r.note as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

/** YYYY-MM-DD 기준일에서 주기만큼 전진한 다음 도래일. 이행일 기준으로 다음 주기를 잡는다. */
function advanceDate(baseYmd: string, cadence: ObligationCadence): string {
  const d = new Date(baseYmd + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return baseYmd
  switch (cadence) {
    case '일':
      d.setDate(d.getDate() + 1)
      break
    case '주':
      d.setDate(d.getDate() + 7)
      break
    case '월':
      d.setMonth(d.getMonth() + 1)
      break
    case '분기':
      d.setMonth(d.getMonth() + 3)
      break
    case '년':
      d.setMonth(d.getMonth() + 12)
      break
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 로컬 오늘 날짜 YYYY-MM-DD */
function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function registerObligationHandlers(): void {
  const db = getSqlite()

  // ──── 목록 (도래일 빠른 순, 활성 우선) ────
  ipcMain.handle(IPC_CHANNELS.OBLIGATION_LIST, (): ObligationDto[] => {
    const rows = db
      .prepare(
        `SELECT * FROM recurring_obligations
         ORDER BY active DESC, (next_due_date IS NULL), next_due_date ASC, sort_order ASC, id ASC`
      )
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToObligation)
  })

  // ──── 생성 ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_CREATE,
    (_event, input: ObligationCreateInput): { id: number } => {
      const maxOrder = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM recurring_obligations')
        .get() as { m: number }
      const res = db
        .prepare(
          `INSERT INTO recurring_obligations
             (title, cadence, category, clause_ref, owner, lead_days, next_due_date, form_code, active, note, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.title?.trim() || '제목 없음',
          input.cadence ?? '월',
          input.category ?? '기타',
          input.clauseRef ?? null,
          input.owner ?? null,
          input.leadDays ?? 7,
          input.nextDueDate ?? null,
          input.formCode ?? null,
          input.active === false ? 0 : 1,
          input.note ?? null,
          (maxOrder.m ?? 0) + 10
        )
      return { id: Number(res.lastInsertRowid) }
    }
  )

  // ──── 수정 (부분 업데이트) ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_UPDATE,
    (_event, input: ObligationUpdateInput): { success: boolean } => {
      const map: Record<string, string> = {
        title: 'title',
        cadence: 'cadence',
        category: 'category',
        clauseRef: 'clause_ref',
        owner: 'owner',
        leadDays: 'lead_days',
        nextDueDate: 'next_due_date',
        formCode: 'form_code',
        active: 'active',
        note: 'note'
      }
      const sets: string[] = []
      const values: unknown[] = []
      for (const [key, col] of Object.entries(map)) {
        if (key in input) {
          const raw = (input as unknown as Record<string, unknown>)[key]
          sets.push(`${col} = ?`)
          values.push(key === 'active' ? (raw ? 1 : 0) : raw ?? null)
        }
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE recurring_obligations SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 삭제 ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_DELETE,
    (_event, { id }: { id: number }): { success: boolean } => {
      db.prepare('DELETE FROM recurring_obligations WHERE id = ?').run(id)
      return { success: true }
    }
  )

  // ──── 이행 완료 → 최근이행일 기록 + 다음 도래일 자동 전진 ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_COMPLETE,
    (_event, { id, doneDate }: { id: number; doneDate?: string }): {
      success: boolean
      nextDueDate: string | null
    } => {
      const row = db
        .prepare('SELECT cadence FROM recurring_obligations WHERE id = ?')
        .get(id) as { cadence: ObligationCadence } | undefined
      if (!row) return { success: false, nextDueDate: null }

      const done = doneDate || todayYmd()
      const next = advanceDate(done, row.cadence)
      db.prepare(
        `UPDATE recurring_obligations
         SET last_done_date = ?, next_due_date = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(done, next, id)
      return { success: true, nextDueDate: next }
    }
  )
}
