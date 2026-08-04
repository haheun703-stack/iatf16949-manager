import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { nextFormSerial, nextCaseNo } from '../database/serial'
import { detectExampleCopy } from './submission-guards'
import { todayKST } from '@shared/date-kst'
import type {
  CaseIntakeInput,
  CaseListItem,
  CaseDetailDto,
  CaseStepDto,
  CaseScreeningDto,
  CaseCreateResult,
  CaseLinkedForm,
  CaseDistributeResult,
  CasePartControlDto,
  ControlPlanItemDto
} from '@shared/ipc-types'
import { ISIR_SUBMIT_TYPE_LABEL } from '@shared/ipc-types'

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

interface CaseRow {
  part_no: string | null
  part_name: string | null
  model: string | null
  defect_desc: string | null
  defect_qty: number | null
  occurred_date: string | null
  due_date: string | null
  customer: string | null
  source: string | null
  owner: string | null
}

/**
 * 분배맵 — 케이스 공유사실을 표준화된(layout 보유) 양식의 field_key 로 매핑.
 * autoKey = 그 양식의 발행번호(auto) 필드(serial 주입). 비표준 양식(B2100-03 등)은 표준화 후 추가.
 */
const DISTRIBUTION: Array<{
  formCode: string
  prefix: string
  autoKey: string
  build: (c: CaseRow, f: Record<string, string>) => Record<string, unknown>
}> = [
  {
    formCode: 'B1100-01',
    prefix: 'NCR',
    autoKey: 'h1',
    build: (c, f) => ({
      h2: today(), // 작성일자 = 분배일(오늘)
      i1: c.occurred_date, // 발생일자
      i2: c.defect_qty, // 불량수량
      i3: c.part_name, // 품명
      i4: f.lot, // LOT NO ← PPT 추출
      i5: c.part_no, // 품번 & 규격
      c1: c.defect_desc, // 부적합 내용
      c3: f.root_cause // 조사 내용 ← 근본원인
    })
  },
  {
    formCode: 'B2100-01',
    prefix: 'CAR',
    autoKey: 's1',
    build: (c, f) => ({
      s2: today(), // 발행일자 = 분배일(오늘)
      s6: c.defect_desc, // 부적합 사항
      s8: c.due_date, // 회신 요구일
      s9: f.root_cause, // 원인 분석
      s10: f.corrective_action // 재발방지 대책 ← 개선대책
    })
  },
  {
    // 8D 체인 종착: 개선 대책서(B2100-03). 0020 에서 표준화됨.
    formCode: 'B2100-03',
    prefix: 'IMP',
    autoKey: 'a1',
    build: (c, f) => ({
      a2: today(), // 작성일자 = 분배일(오늘)
      a5: c.part_name, // 품 명
      a6: c.part_no, // 품 번
      p1: c.defect_desc, // 문제부위 및 불량현상
      p3: c.occurred_date, // 발생일자
      p5: f.root_cause, // 발생원인(고품분석) ← 근본원인
      d1: f.corrective_action // 봉쇄(단기) 대책 ← 개선대책
    })
  },
  {
    // 8D 봉쇄(D3): 불량유출 봉쇄 작업표(B1100-05). 0021 에서 표준화됨.
    formCode: 'B1100-05',
    prefix: 'CTN',
    autoKey: 'a1',
    build: (c) => ({
      a4: today(), // 일자 = 분배일(오늘)
      a5: c.model, // 모델명
      a6: c.part_no, // 품 번
      a7: c.part_name, // 품 명
      a8: c.defect_desc // 부적합 내용
    })
  },
  {
    // 고객불만(VOC) 대응 결과 보고서(H3200-02). 0022 에서 표준화됨.
    formCode: 'H3200-02',
    prefix: 'CCR',
    autoKey: 'a1',
    build: (c, f) => ({
      a2: today(), // 작성일 = 분배일(오늘)
      r1: c.occurred_date, // 고객불만 접수일자(발생일 근사)
      r5: c.customer, // 고객불만 제기처
      m1: c.defect_desc, // 고객불만 내용(부적합 내용)
      i3: f.lot, // 불량 LOT ← case_facts.lot
      i5: f.root_cause, // 불량 발생 원인 ← 근본원인
      c3: f.corrective_action // 고객불만 개선방안 ← 개선대책
    })
  }
]

/** 오늘 날짜 YYYY-MM-DD (양식 작성일자/발행일자 자동값) — KST. UTC 절단이면 아침 작성분이 전날로 찍힌다. */
function today(): string {
  return todayKST()
}

/** null/빈값 제거 후 문자열화(form 렌더가 String(v) 사용). */
function cleanValues(v: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v)) {
    if (val === null || val === undefined || val === '') continue
    out[k] = String(val)
  }
  return out
}

/** 케이스에 연결된 양식 작성본 목록. */
function loadLinkedForms(db: ReturnType<typeof getSqlite>, caseId: number): CaseLinkedForm[] {
  const rows = db
    .prepare(
      `SELECT s.id, s.form_code, s.serial_no, s.status, f.name AS form_name
       FROM form_submissions s JOIN forms f ON f.code = s.form_code
       WHERE s.case_id = ? ORDER BY s.form_code`
    )
    .all(caseId) as Array<Record<string, unknown>>
  return rows.map((r) => ({
    id: r.id as number,
    formCode: r.form_code as string,
    formName: (r.form_name as string) ?? '',
    serialNo: (r.serial_no as string) ?? '',
    status: (r.status as string) ?? 'draft'
  }))
}

/** 케이스 부품의 관리계획서(통제 기준) 조회 — 불량 = 이 기준의 실패.
 *  part_no 로 parts↔isir_packages(최신)↔control_plan_items 조인. 표기차 대비 TRIM 정합.
 *  반환: part_no 없으면 null / parts 미적재면 hasIsir=false(빈 항목). */
function loadPartControl(
  db: ReturnType<typeof getSqlite>,
  rawPartNo: string | null
): CasePartControlDto | null {
  const partNo = (rawPartNo ?? '').trim()
  if (!partNo) return null

  const part = db
    .prepare('SELECT part_no, part_name FROM parts WHERE TRIM(part_no) = ?')
    .get(partNo) as { part_no: string; part_name: string | null } | undefined
  if (!part) {
    // 불량은 있으나 ISIR 미적재 — 정직 신호(품번/ISIR에서 적재 유도).
    return {
      partNo,
      partName: null,
      hasIsir: false,
      revCode: null,
      submitTypeLabel: null,
      ireRisk: null,
      itemCount: 0,
      processCount: 0,
      items: []
    }
  }

  const pkg = db
    .prepare(
      `SELECT id, rev_code, submit_type, ire_risk
       FROM isir_packages WHERE part_no = ? ORDER BY rev_date DESC, id DESC LIMIT 1`
    )
    .get(part.part_no) as
    | { id: number; rev_code: string | null; submit_type: string | null; ire_risk: string | null }
    | undefined

  if (!pkg) {
    return {
      partNo: part.part_no,
      partName: part.part_name,
      hasIsir: false,
      revCode: null,
      submitTypeLabel: null,
      ireRisk: null,
      itemCount: 0,
      processCount: 0,
      items: []
    }
  }

  const rows = db
    .prepare(
      `SELECT seq, process_no, process_name, char_kind, control_item, special_char,
              spec, method, frequency, control_method, reaction, note
       FROM control_plan_items WHERE isir_id = ? ORDER BY seq`
    )
    .all(pkg.id) as Array<Record<string, unknown>>
  const items: ControlPlanItemDto[] = rows.map((r) => ({
    seq: r.seq as number,
    processNo: (r.process_no as string) ?? null,
    processName: (r.process_name as string) ?? null,
    charKind: (r.char_kind as string) ?? null,
    controlItem: (r.control_item as string) ?? null,
    special: (r.special_char as string) ?? null,
    spec: (r.spec as string) ?? null,
    method: (r.method as string) ?? null,
    frequency: (r.frequency as string) ?? null,
    controlMethod: (r.control_method as string) ?? null,
    reaction: (r.reaction as string) ?? null,
    note: (r.note as string) ?? null
  }))
  const processCount = new Set(items.map((i) => i.processName).filter(Boolean)).size

  return {
    partNo: part.part_no,
    partName: part.part_name,
    hasIsir: true,
    revCode: pkg.rev_code,
    submitTypeLabel: ISIR_SUBMIT_TYPE_LABEL[pkg.submit_type ?? ''] ?? pkg.submit_type,
    ireRisk: pkg.ire_risk,
    itemCount: items.length,
    processCount,
    items
  }
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

    const forms = loadLinkedForms(db, id)
    const partControl = loadPartControl(db, (c.part_no as string) ?? null)

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
      facts,
      forms,
      partControl
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

      // LOT — cases 컬럼이 아니라 case_facts.lot 로 저장(분배 B1100-01 i4 의존)
      if (input.lot && input.lot.trim()) {
        db.prepare(
          `INSERT INTO case_facts (case_id, fact_key, value) VALUES (?, 'lot', ?)
           ON CONFLICT(case_id, fact_key) DO UPDATE SET value = excluded.value`
        ).run(caseId, input.lot.trim())
      }

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

  // ──── 분배 엔진: 케이스 공유사실 → 표준화 양식 작성본 자동생성/갱신 ────
  // 같은 (case_id, form_code) 작성본이 있으면 값만 갱신, 없으면 새로 생성(serial 채번 + case_id 연결).
  // 산출 작성본은 form_submissions.case_id 로 묶이고, SQ 준비도(작성본수)에 자동 롤업됨.
  ipcMain.handle(IPC_CHANNELS.CASE_DISTRIBUTE, (_e, { id }: { id: number }): CaseDistributeResult => {
    const c = db.prepare('SELECT * FROM cases WHERE id = ?').get(id) as CaseRow | undefined
    if (!c) return { created: 0, updated: 0, forms: [] }

    const factRows = db
      .prepare('SELECT fact_key, value FROM case_facts WHERE case_id = ?')
      .all(id) as Array<{ fact_key: string; value: string | null }>
    const facts: Record<string, string> = {}
    for (const f of factRows) facts[f.fact_key] = f.value ?? ''

    const now = new Date().toISOString()
    const year = new Date().getFullYear()
    // 작성자 기본값: 회사정보 defaultAuthor (form-handlers와 동일 출처. 인명 리터럴 하드코딩 제거)
    const defaultAuthor =
      (db.prepare("SELECT value FROM company_profile WHERE key = 'defaultAuthor'").get() as
        | { value?: string }
        | undefined)?.value ?? null
    let created = 0
    let updated = 0

    const run = db.transaction(() => {
      for (const d of DISTRIBUTION) {
        // 표준화(layout 보유) 양식만 분배 — 빈 껍데기엔 그릴 칸이 없음
        const form = db
          .prepare('SELECT code FROM forms WHERE code = ? AND layout_json IS NOT NULL')
          .get(d.formCode) as { code: string } | undefined
        if (!form) continue

        const values = cleanValues(d.build(c, facts))
        // H1 조작차단 — 분배 INSERT/UPDATE 도 본 저장 경로와 같은 가드를 통과(검수 7/30 M-조작차단).
        // 케이스 접수값이 예시값 그대로면 여기서 전체 분배가 롤백된다(트랜잭션 내 throw).
        const copied = detectExampleCopy(db, d.formCode, values)
        if (copied) {
          throw new Error(
            `[${d.formCode}] 예시값 그대로는 분배할 수 없습니다: '${copied}' — 케이스 입력값을 실제 값으로 수정하세요.`
          )
        }
        const existing = db
          .prepare('SELECT id, serial_no, values_json FROM form_submissions WHERE case_id = ? AND form_code = ?')
          .get(id, d.formCode) as { id: number; serial_no: string; values_json: string } | undefined

        if (existing) {
          let prev: Record<string, unknown> = {}
          try {
            prev = JSON.parse(existing.values_json || '{}')
          } catch {
            prev = {} // 손상된 values_json은 빈 값으로 폴백(throw 방지)
          }
          const merged = { ...prev, ...values, [d.autoKey]: existing.serial_no }
          db.prepare('UPDATE form_submissions SET values_json = ?, updated_at = ? WHERE id = ?')
            .run(JSON.stringify(merged), now, existing.id)
          updated++
        } else {
          const serial = nextFormSerial(db, d.formCode, d.prefix, year)
          const withSerial = { ...values, [d.autoKey]: serial }
          db.prepare(
            `INSERT INTO form_submissions (form_code, serial_no, values_json, status, created_by, created_at, updated_at, case_id)
             VALUES (?, ?, ?, 'draft', ?, ?, ?, ?)`
          ).run(d.formCode, serial, JSON.stringify(withSerial), c.owner || defaultAuthor, now, now, id)
          created++
        }
      }
    })
    run()

    return { created, updated, forms: loadLinkedForms(db, id) }
  })
}
