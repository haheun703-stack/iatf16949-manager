import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  ScheduleItemDto,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduleStatus,
  ScheduleCategory,
  SchedulePriority
} from '@shared/ipc-types'

function rowToItem(r: Record<string, unknown>): ScheduleItemDto {
  return {
    id: r.id as number,
    title: r.title as string,
    category: (r.category as ScheduleCategory) ?? '기타',
    status: (r.status as ScheduleStatus) ?? '예정',
    priority: (r.priority as SchedulePriority) ?? '보통',
    owner: (r.owner as string) || null,
    startDate: (r.start_date as string) || null,
    dueDate: (r.due_date as string) || null,
    note: (r.note as string) || null,
    formCode: (r.form_code as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

export function registerScheduleHandlers(): void {
  const db = getSqlite()

  // ──── 목록 ────
  ipcMain.handle(IPC_CHANNELS.SCHEDULE_LIST, (): ScheduleItemDto[] => {
    const rows = db
      .prepare(
        `SELECT * FROM schedule_items
         ORDER BY (due_date IS NULL), due_date ASC, sort_order ASC, id ASC`
      )
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToItem)
  })

  // ──── 생성 ────
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_CREATE,
    (_event, input: ScheduleCreateInput): { id: number } => {
      const now = new Date().toISOString()
      const maxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM schedule_items').get() as {
        m: number
      }
      const res = db
        .prepare(
          `INSERT INTO schedule_items
             (title, category, status, priority, owner, start_date, due_date, note, form_code, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.title?.trim() || '제목 없음',
          input.category ?? '기타',
          input.status ?? '예정',
          input.priority ?? '보통',
          input.owner ?? null,
          input.startDate ?? null,
          input.dueDate ?? null,
          input.note ?? null,
          input.formCode ?? null,
          (maxOrder.m ?? 0) + 10,
          now,
          now
        )
      return { id: Number(res.lastInsertRowid) }
    }
  )

  // ──── 수정 (부분 업데이트) ────
  ipcMain.handle(
    IPC_CHANNELS.SCHEDULE_UPDATE,
    (_event, input: ScheduleUpdateInput): { success: boolean } => {
      const map: Record<string, string> = {
        title: 'title',
        category: 'category',
        status: 'status',
        priority: 'priority',
        owner: 'owner',
        startDate: 'start_date',
        dueDate: 'due_date',
        note: 'note',
        formCode: 'form_code'
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
      db.prepare(`UPDATE schedule_items SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 삭제 ────
  ipcMain.handle(IPC_CHANNELS.SCHEDULE_DELETE, (_event, { id }: { id: number }): { success: boolean } => {
    db.prepare('DELETE FROM schedule_items WHERE id = ?').run(id)
    return { success: true }
  })
}
