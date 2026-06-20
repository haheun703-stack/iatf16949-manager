import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  CaseIntakeInput,
  CaseListItem,
  CaseDetailDto,
  CaseStepDto,
  CaseScreeningDto,
  CaseCreateResult
} from '@shared/ipc-types'

/** 8D 흐름 단계 정의(케이스 생성 시 자동 생성). 라벨은 여기 단일원천. */
const STEP_DEFS: Array<{ key: string; label: string }> = [
  { key: 'intake', label: '고객 통보 접수' },
  { key: 'containment', label: '임시대책 (선별)' },
  { key: 'investigate', label: '5Why & 8D 원인분석' },
  { key: 'corrective', label: '개선대책서' },
  { key: 'verify', label: '개선적용 유효성 AUDIT' },
  { key: 'horizontal', label: '수평전개' },
  { key: 'change4m', label: '4M 변경' },
  { key: 'close', label: '종결 / 정상품 입고' }
]
const STEP_LABEL = new Map(STEP_DEFS.map((s) => [s.key, s.label]))

/** 선별 두 주체(사내재고=사내/생산, 고객사=품질) — 케이스 생성 시 자동 생성. */
const SCREENING_DEFS: Array<{ scope: string; ownerDept: string }> = [
  { scope: 'internal', ownerDept: '생산 / 공장' },
  { scope: 'customer', ownerDept: '품질팀' }
]

/** 케이스 채번 QC-YYYY-#### (cases.case_no 최대 시퀀스+1). */
function nextCaseNo(db: ReturnType<typeof getSqlite>, year: number): string {
  const rows = db
    .prepare(`SELECT case_no FROM cases WHERE case_no LIKE ?`)
    .all(`QC-${year}-%`) as Array<{ case_no: string | null }>
  let max = 0
  for (const r of rows) {
    const m = r.case_no?.match(/(\d+)\s*$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `QC-${year}-${String(max + 1).padStart(4, '0')}`
}

export function registerCaseHandlers(): void {
  const db = getSqlite()

  // ──── 목록 ────
  ipcMain.handle(IPC_CHANNELS.CASE_LIST, (): CaseListItem[] => {
    const rows = db
      .prepare(
        `SELECT id, case_no, title, customer, part_no, defect_desc, status, due_date, created_at
         FROM cases ORDER BY created_at DESC`
      )
      .all() as Array<Record<string, unknown>>
    return rows.map((r) => ({
      id: r.id as number,
      caseNo: (r.case_no as string) ?? '',
      title: (r.title as string) ?? '',
      customer: (r.customer as string) ?? '',
      partNo: (r.part_no as string) ?? '',
      defectDesc: (r.defect_desc as string) ?? '',
      status: (r.status as string) ?? 'open',
      dueDate: (r.due_date as string) ?? null,
      createdAt: (r.created_at as string) ?? ''
    }))
  })

  // ──── 상세 ────
  ipcMain.handle(IPC_CHANNELS.CASE_GET, (_e, { id }: { id: number }): CaseDetailDto | null => {
    const c = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as Record<string, unknown> | undefined
    if (!c) return null

    const stepRows = db
      .prepare('SELECT step_key, status, done_at, sort_order FROM case_steps WHERE case_id = ? ORDER BY sort_order')
      .all(id) as Array<{ step_key: string; status: string; done_at: string | null; sort_order: number }>
    const steps: CaseStepDto[] = stepRows.map((s) => ({
      stepKey: s.step_key,
      label: STEP_LABEL.get(s.step_key) ?? s.step_key,
      status: s.status,
      doneAt: s.done_at,
      sortOrder: s.sort_order
    }))

    const scrRows = db
      .prepare('SELECT scope, owner_dept, total_qty, screened_qty, defect_qty, status, note FROM case_screening WHERE case_id = ? ORDER BY scope DESC')
      .all(id) as Array<Record<string, unknown>>
    const screening: CaseScreeningDto[] = scrRows.map((s) => ({
      scope: s.scope as 'internal' | 'customer',
      ownerDept: (s.owner_dept as string) ?? '',
      totalQty: (s.total_qty as number) ?? null,
      screenedQty: (s.screened_qty as number) ?? null,
      defectQty: (s.defect_qty as number) ?? null,
      status: (s.status as string) ?? 'todo',
      note: (s.note as string) ?? null
    }))

    const factRows = db
      .prepare('SELECT fact_key, value FROM case_facts WHERE case_id = ?')
      .all(id) as Array<{ fact_key: string; value: string | null }>
    const facts: Record<string, string> = {}
    for (const f of factRows) facts[f.fact_key] = f.value ?? ''

    return {
      id: c.id as number,
      caseNo: (c.case_no as string) ?? '',
      title: (c.title as string) ?? '',
      customer: (c.customer as string) ?? '',
      source: (c.source as string) ?? '',
      partNo: (c.part_no as string) ?? '',
      partName: (c.part_name as string) ?? '',
      model: (c.model as string) ?? '',
      defectDesc: (c.defect_desc as string) ?? '',
      defectQty: (c.defect_qty as number) ?? null,
      attributable: (c.attributable as string) ?? '',
      occurredDate: (c.occurred_date as string) ?? '',
      receivedDate: (c.received_date as string) ?? '',
      dueDate: (c.due_date as string) ?? '',
      status: (c.status as string) ?? 'open',
      owner: (c.owner as string) ?? '',
      steps,
      screening,
      facts
    }
  })

  // ──── 생성(접수) ────
  ipcMain.handle(IPC_CHANNELS.CASE_CREATE, (_e, input: CaseIntakeInput): CaseCreateResult => {
    const now = new Date().toISOString()
    const year = new Date().getFullYear()
    const caseNo = nextCaseNo(db, year)

    const create = db.transaction(() => {
      const info = db
        .prepare(
          `INSERT INTO cases
             (case_no, title, customer, source, part_no, part_name, model, defect_desc,
              defect_qty, attributable, occurred_date, received_date, due_date, status, owner, created_at, updated_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?, 'in_progress', ?, ?, ?)`
        )
        .run(
          caseNo,
          input.title ?? null,
          input.customer ?? null,
          input.source ?? null,
          input.partNo ?? null,
          input.partName ?? null,
          input.model ?? null,
          input.defectDesc ?? null,
          input.defectQty ?? null,
          input.attributable ?? null,
          input.occurredDate ?? null,
          input.receivedDate ?? null,
          input.dueDate ?? null,
          input.owner ?? null,
          now,
          now
        )
      const caseId = info.lastInsertRowid as number

      // 8단계: 접수는 done, 선별은 doing, 나머지 todo
      const insStep = db.prepare(
        'INSERT INTO case_steps (case_id, step_key, status, done_at, sort_order) VALUES (?,?,?,?,?)'
      )
      STEP_DEFS.forEach((s, i) => {
        const status = s.key === 'intake' ? 'done' : s.key === 'containment' ? 'doing' : 'todo'
        insStep.run(caseId, s.key, status, s.key === 'intake' ? now : null, i)
      })

      // 선별 2주체
      const insScr = db.prepare(
        "INSERT INTO case_screening (case_id, scope, owner_dept, status) VALUES (?,?,?, 'todo')"
      )
      for (const sc of SCREENING_DEFS) insScr.run(caseId, sc.scope, sc.ownerDept)

      return caseId
    })

    const id = create()
    return { id, caseNo }
  })

  // ──── 헤더 수정 ────
  ipcMain.handle(IPC_CHANNELS.CASE_UPDATE, (_e, data: { id: number } & Partial<CaseIntakeInput>) => {
    const map: Record<string, string> = {
      title: 'title', customer: 'customer', source: 'source', partNo: 'part_no',
      partName: 'part_name', model: 'model', defectDesc: 'defect_desc', defectQty: 'defect_qty',
      attributable: 'attributable', occurredDate: 'occurred_date', receivedDate: 'received_date',
      dueDate: 'due_date', owner: 'owner'
    }
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, col] of Object.entries(map)) {
      if (k in data) {
        sets.push(`${col} = ?`)
        vals.push((data as Record<string, unknown>)[k] ?? null)
      }
    }
    if (sets.length === 0) return { success: false }
    sets.push("updated_at = ?")
    vals.push(new Date().toISOString(), data.id)
    db.prepare(`UPDATE cases SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return { success: true }
  })

  // ──── 단계 상태 변경 ────
  ipcMain.handle(
    IPC_CHANNELS.CASE_STEP_UPDATE,
    (_e, { id, stepKey, status }: { id: number; stepKey: string; status: string }) => {
      const doneAt = status === 'done' ? new Date().toISOString() : null
      db.prepare('UPDATE case_steps SET status = ?, done_at = ? WHERE case_id = ? AND step_key = ?')
        .run(status, doneAt, id, stepKey)
      db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
      return { success: true }
    }
  )

  // ──── 선별 저장 ────
  ipcMain.handle(
    IPC_CHANNELS.CASE_SCREENING_SAVE,
    (
      _e,
      d: {
        id: number
        scope: 'internal' | 'customer'
        ownerDept?: string
        totalQty?: number | null
        screenedQty?: number | null
        defectQty?: number | null
        status?: string
        note?: string | null
      }
    ) => {
      const doneAt = d.status === 'done' ? new Date().toISOString() : null
      db.prepare(
        `UPDATE case_screening
           SET owner_dept = COALESCE(?, owner_dept),
               total_qty = ?, screened_qty = ?, defect_qty = ?,
               status = COALESCE(?, status), note = ?, done_at = ?
         WHERE case_id = ? AND scope = ?`
      ).run(
        d.ownerDept ?? null,
        d.totalQty ?? null,
        d.screenedQty ?? null,
        d.defectQty ?? null,
        d.status ?? null,
        d.note ?? null,
        doneAt,
        d.id,
        d.scope
      )
      return { success: true }
    }
  )

  // ──── 공유 사실 저장(근본원인·개선대책 등) ────
  ipcMain.handle(
    IPC_CHANNELS.CASE_FACT_SAVE,
    (_e, { id, key, value }: { id: number; key: string; value: string }) => {
      db.prepare(
        `INSERT INTO case_facts (case_id, fact_key, value) VALUES (?,?,?)
         ON CONFLICT(case_id, fact_key) DO UPDATE SET value = excluded.value`
      ).run(id, key, value)
      db.prepare('UPDATE cases SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), id)
      return { success: true }
    }
  )
}
