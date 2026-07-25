import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type { TeamId } from '@shared/team-theme'
import type {
  SqTrackOverviewDto,
  SqTrackPartCardDto,
  SqTrackPartDetailDto,
  SqTrackItemDto,
  SqTrackItemUpdateInput,
  SqTrackStatus,
  SqTrackSeverity
} from '@shared/ipc-types'

/**
 * SQ 심사 아이템 트랙 (0068/0069) — 10월 LEVEL-UP 심사 대비.
 * 심사원 동선(품번→관리계획서→파생문서→현장→인터뷰)을 품번별 4단계 체크리스트로.
 * 마스터(sqtrack_items)는 재시드 가능, 사람 확정 상태(sqtrack_item_status)는
 * lazy UPSERT — 42항목 점등(sq_reg_map)에는 절대 연결하지 않는다.
 */

export const SQTRACK_PHASE_LABELS = ['서류 확보', '정합성 리스크 해소', '현장검증 준비', '인터뷰 대비'] as const

const CONFIG_KEYS = { auditDate: 'sqtrack.audit_date', title: 'sqtrack.title', goal: 'sqtrack.goal' } as const

export function registerSqTrackHandlers(): void {
  const db = getSqlite()

  const getConfig = (key: string): string | null =>
    (db.prepare('SELECT value FROM app_config WHERE key = ?').get(key) as { value: string } | undefined)?.value ?? null

  ipcMain.handle(IPC_CHANNELS.SQTRACK_OVERVIEW, (): SqTrackOverviewDto | null => {
    try {
      const partRows = db
        .prepare(
          `SELECT sp.part_no, sp.binder_info, sp.scan_ref, p.part_name, p.customer, p.model
           FROM sqtrack_parts sp LEFT JOIN parts p ON p.part_no = sp.part_no
           ORDER BY sp.sort_order`
        )
        .all() as Array<Record<string, unknown>>

      const itemRows = db
        .prepare(
          `SELECT i.part_no, i.severity, COALESCE(s.status, 'open') AS status
           FROM sqtrack_items i LEFT JOIN sqtrack_item_status s ON s.item_code = i.code`
        )
        .all() as Array<{ part_no: string; severity: SqTrackSeverity; status: SqTrackStatus }>

      const parts: SqTrackPartCardDto[] = partRows.map((r) => {
        const mine = itemRows.filter((it) => it.part_no === (r.part_no as string))
        const openBySeverity = { red: 0, orange: 0, yellow: 0 }
        let done = 0
        let na = 0
        for (const it of mine) {
          if (it.status === 'done') done++
          else if (it.status === 'na') na++
          else openBySeverity[it.severity]++
        }
        return {
          partNo: r.part_no as string,
          partName: (r.part_name as string) ?? null,
          customer: (r.customer as string) ?? null,
          model: (r.model as string) ?? null,
          binderInfo: (r.binder_info as string) ?? null,
          scanRef: (r.scan_ref as string) ?? null,
          total: mine.length,
          done,
          na,
          openBySeverity
        }
      })

      const total = itemRows.length
      const done = itemRows.filter((it) => it.status === 'done').length
      const na = itemRows.filter((it) => it.status === 'na').length

      return {
        auditDate: getConfig(CONFIG_KEYS.auditDate),
        title: getConfig(CONFIG_KEYS.title) ?? 'SQ LEVEL-UP 심사',
        goal: getConfig(CONFIG_KEYS.goal),
        primaryPartNo: getConfig('audit.primaryPartNo'),
        parts,
        totals: { total, open: total - done - na, done }
      }
    } catch (err) {
      console.error('[sqtrack:overview] failed:', (err as Error).message)
      return null
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SQTRACK_PART_DETAIL,
    (_event, { partNo }: { partNo: string }): SqTrackPartDetailDto | null => {
      try {
        const head = db
          .prepare(
            `SELECT sp.part_no, sp.binder_info, sp.scan_ref, p.part_name, p.customer, p.model
             FROM sqtrack_parts sp LEFT JOIN parts p ON p.part_no = sp.part_no
             WHERE sp.part_no = ?`
          )
          .get(partNo) as Record<string, unknown> | undefined
        if (!head) return null

        const rows = db
          .prepare(
            `SELECT i.code, i.phase, i.seq, i.title, i.detail, i.evidence_pages, i.severity,
                    i.team, i.form_code, i.sq_item_code, i.tag,
                    COALESCE(s.status, 'open') AS status, s.note, s.updated_by, s.updated_at,
                    f.name AS form_name
             FROM sqtrack_items i
             LEFT JOIN sqtrack_item_status s ON s.item_code = i.code
             LEFT JOIN forms f ON f.code = i.form_code
             WHERE i.part_no = ?
             ORDER BY i.phase, i.seq`
          )
          .all(partNo) as Array<Record<string, unknown>>

        const toDto = (r: Record<string, unknown>): SqTrackItemDto => ({
          code: r.code as string,
          phase: r.phase as number,
          seq: r.seq as number,
          title: r.title as string,
          detail: (r.detail as string) || null,
          evidencePages: (r.evidence_pages as string) || null,
          severity: r.severity as SqTrackSeverity,
          team: (r.team as TeamId) || null,
          formCode: (r.form_code as string) || null,
          formName: (r.form_name as string) || null,
          sqItemCode: (r.sq_item_code as string) || null,
          tag: (r.tag as string) || null,
          status: r.status as SqTrackStatus,
          note: (r.note as string) || null,
          updatedBy: (r.updated_by as string) || null,
          updatedAt: (r.updated_at as string) || null
        })

        const phases = SQTRACK_PHASE_LABELS.map((label, idx) => ({
          phase: idx + 1,
          label,
          items: rows.filter((r) => (r.phase as number) === idx + 1).map(toDto)
        })).filter((p) => p.items.length > 0)

        return {
          partNo,
          partName: (head.part_name as string) ?? null,
          customer: (head.customer as string) ?? null,
          model: (head.model as string) ?? null,
          binderInfo: (head.binder_info as string) ?? null,
          scanRef: (head.scan_ref as string) ?? null,
          phases
        }
      } catch (err) {
        console.error('[sqtrack:partDetail] failed:', (err as Error).message)
        return null
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.SQTRACK_ITEM_UPDATE,
    (_event, input: SqTrackItemUpdateInput): { success: boolean; error?: string } => {
      try {
        const exists = db.prepare('SELECT code FROM sqtrack_items WHERE code = ?').get(input.itemCode)
        if (!exists) return { success: false, error: `unknown item: ${input.itemCode}` }

        // lazy UPSERT — 제공된 필드만 갱신 (SQ_CHECKPOINT_UPDATE 동적 sets 준용)
        const current = db
          .prepare('SELECT status, note FROM sqtrack_item_status WHERE item_code = ?')
          .get(input.itemCode) as { status: SqTrackStatus; note: string | null } | undefined
        const status = input.status ?? current?.status ?? 'open'
        const note = 'note' in input ? (input.note ?? null) : (current?.note ?? null)
        db.prepare(
          `INSERT INTO sqtrack_item_status (item_code, status, note, updated_by, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'))
           ON CONFLICT(item_code) DO UPDATE SET
             status = excluded.status, note = excluded.note,
             updated_by = excluded.updated_by, updated_at = excluded.updated_at`
        ).run(input.itemCode, status, note, input.updatedBy ?? null)
        return { success: true }
      } catch (err) {
        console.error('[sqtrack:itemUpdate] failed:', (err as Error).message)
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.SQTRACK_SET_AUDIT_DATE, (_event, { date }: { date: string }): { success: boolean } => {
    try {
      db.prepare(
        "INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).run(CONFIG_KEYS.auditDate, date)
      return { success: true }
    } catch (err) {
      console.error('[sqtrack:setAuditDate] failed:', (err as Error).message)
      return { success: false }
    }
  })
}
