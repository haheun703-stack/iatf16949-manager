import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { todayKST } from '@shared/date-kst'
import { getSqlite } from '../database/connection'
import type {
  SemimesInspCreateInput,
  SemimesItemUpdateInput,
  SemimesPartnerUpdateInput,
  SemimesProdCreateInput,
  SemimesScanContextDto,
  SemimesSpecRowDto,
  SemimesSpecSaveInput,
  SemimesTodayRecordsDto,
  SemimesWorkOrderInput,
  SemimesWorkOrderRowDto
} from '@shared/ipc-types'

/**
 * PC 기록 쓰기 채널 (29번 §4 — 기존 읽기 semimes-handlers 와 분리).
 * 계약(도장 원칙의 코드 번역):
 *  · append-only — 기록 UPDATE 채널 없음. 정정 = recordCancel(사유 필수 취소 마크) + 재입력.
 *  · 실측값 강제 — 검사값 수치 필수(○/× 단독 저장 거부). 자동판정은 제안만(suggestion), 확정은 사람.
 *  · §10-1 각인 — inspRecordCreate 가 기록 시점 활성 스펙 revision 을 spec_revision 스냅샷으로,
 *    sample_phase(초중종)를 기록. confirmer 는 inspConfirm 채널만 기입.
 *    데스크톱 경로 주체 인증은 W4 전 미해결 — 현 방어선은 최소방어(검사자 빈 값 거부·
 *    자기확인 금지·검사자 부재 기록 확인 거부)까지. "대필 경로 0"은 웹(STAMP) 한정 사실.
 *  · recordSource — app_config 'semimes.recordSource': 기본 'direct'(판매 기본, 29번 §1).
 *    'sidecar'(TPC 원안)면 쓰기 채널 거부 — 기록 원천은 MES(이중 기록 금지).
 *  · 기록주체 전부 서버 세션 강제(STAMP — index.cjs) — defaultAuthor 폴백 금지.
 */

const INSP_KINDS = ['수입', '공정', '자주', '패트롤', '출하']
const PHASES = ['초품', '중품', '종품']

export function recordSource(): 'direct' | 'sidecar' {
  try {
    const r = getSqlite()
      .prepare("SELECT value FROM app_config WHERE key = 'semimes.recordSource'")
      .get() as { value: string } | undefined
    return r?.value === 'sidecar' ? 'sidecar' : 'direct'
  } catch {
    return 'direct'
  }
}

export const SIDECAR_MSG =
  "sidecar 모드 — 이 설치의 기록 원천은 MES입니다(이중 기록 금지). 직접 기록 전환 = app_config 'semimes.recordSource' = 'direct'."

function ymdOk(s: string | undefined | null): boolean {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
}

export function registerSemimesWriteHandlers(): void {
  const db = getSqlite()

  const itemRow = (code: string): { item_code: string; item_name: string | null; item_type: string } | undefined =>
    db
      .prepare('SELECT item_code, item_name, item_type FROM item_master WHERE item_code = ? AND active = 1')
      .get(code) as { item_code: string; item_name: string | null; item_type: string } | undefined

  // ── ① scanResolve — 스캔/품번/LOT [조회] → 현장 문맥 전부 (읽기) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_SCAN_RESOLVE, (_e, { query }: { query: string }): SemimesScanContextDto => {
    const empty: SemimesScanContextDto = {
      found: false, itemCode: null, itemName: null, itemType: null,
      routing: [], recentLots: [], specs: {}, defects: [], matchedLot: null
    }
    const q = (query || '').trim()
    if (!q) return empty
    let matchedLot: string | null = null
    let item = itemRow(q)
    if (!item) {
      // LOT 번호로 해석(자체발번·승계 공통 — lot_registry 정본)
      const lot = db.prepare('SELECT lot_no, item_code FROM lot_registry WHERE lot_no = ?').get(q) as
        | { lot_no: string; item_code: string }
        | undefined
      if (lot) {
        matchedLot = lot.lot_no
        item = itemRow(lot.item_code)
      }
    }
    if (!item) return empty
    const routing = db
      .prepare(
        `SELECT r.seq, r.proc_code AS procCode, p.proc_name AS procName
         FROM routing_step r LEFT JOIN process_master p ON p.proc_code = r.proc_code
         WHERE r.item_code = ? AND r.active = 1 ORDER BY r.seq`
      )
      .all(item.item_code) as SemimesScanContextDto['routing']
    const recentLots = db
      .prepare('SELECT lot_no AS lotNo, lot_date AS lotDate FROM lot_registry WHERE item_code = ? ORDER BY lot_date DESC, seq DESC LIMIT 5')
      .all(item.item_code) as SemimesScanContextDto['recentLots']
    const specRows = db
      .prepare(
        `SELECT id, insp_kind, insp_item AS inspItem, instrument, unit, su, sl, nominal,
                sample_cnt AS sampleCnt, revision
         FROM insp_spec WHERE item_code = ? AND active = 1 ORDER BY insp_kind, id`
      )
      .all(item.item_code) as Array<SemimesSpecRowDto & { insp_kind: string }>
    const specs: Record<string, SemimesSpecRowDto[]> = {}
    for (const s of specRows) {
      const { insp_kind, ...rest } = s
      ;(specs[insp_kind] ??= []).push(rest)
    }
    const defects = db
      .prepare('SELECT code, name FROM defect_type WHERE active = 1 ORDER BY code LIMIT 100')
      .all() as { code: string; name: string }[]
    return {
      found: true, itemCode: item.item_code, itemName: item.item_name, itemType: item.item_type,
      routing, recentLots, specs, defects, matchedLot
    }
  })

  // ── ② lotIssue — 자체발번 품번-YYMMDD-차수 (0101 계약 · §8-⑦ 도장) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_LOT_ISSUE,
    (_e, { itemCode, date, createdBy }: { itemCode: string; date?: string; createdBy?: string }) => {
      if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
      if (!itemRow(itemCode)) return { success: false, error: `품번(${itemCode})이 품목 마스터에 없습니다.` }
      // M-1 최소방어: 발번 주체 빈 값 거부(웹 = STAMP 주입·데스크톱 = 사용자 선택 필수)
      const issuer = createdBy?.trim()
      if (!issuer) return { success: false, error: '발번 주체가 없습니다 — 사용자를 선택하세요.' }
      const ymd = ymdOk(date) ? date! : todayKST()
      const yymmdd = ymd.slice(2).replace(/-/g, '')
      const issueTxn = db.transaction(() => {
        const { s } = db
          .prepare('SELECT COALESCE(MAX(seq), 0) + 1 AS s FROM lot_registry WHERE item_code = ? AND lot_date = ?')
          .get(itemCode, ymd) as { s: number }
        const no = `${itemCode}-${yymmdd}-${s}`
        db.prepare(
          `INSERT INTO lot_registry (lot_no, item_code, lot_date, seq, source, created_by)
           VALUES (?, ?, ?, ?, '자체발번', ?)`
        ).run(no, itemCode, ymd, s, issuer)
        return no
      })
      // 발번 경합(UNIQUE) = 원시 에러 노출 금지 — 차수 재계산 재시도 2회 후 정직 안내
      for (let attempt = 0; ; attempt++) {
        try {
          return { success: true, lotNo: issueTxn.immediate() }
        } catch (err) {
          const msg = (err as Error).message
          if (!/UNIQUE|SQLITE_BUSY/.test(msg) || attempt >= 2) {
            return { success: false, error: /UNIQUE|SQLITE_BUSY/.test(msg) ? '발번 경합 — 잠시 후 다시 시도하세요.' : msg }
          }
        }
      }
    }
  )

  // ── ③ prodRecordCreate — 생산실적 (append-only) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_PROD_CREATE, (_e, req: SemimesProdCreateInput) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    if (!ymdOk(req?.recordDate)) return { success: false, error: '실적 일자는 YYYY-MM-DD 형식이어야 합니다.' }
    if (!itemRow(req.itemCode)) return { success: false, error: `품번(${req.itemCode})이 품목 마스터에 없습니다.` }
    const ok = Number(req.okQty)
    const ng = Number(req.ngQty)
    if (!Number.isInteger(ok) || ok < 0 || !Number.isInteger(ng) || ng < 0) {
      return { success: false, error: '수량은 0 이상의 정수여야 합니다(실측값 강제).' }
    }
    if (ok === 0 && ng === 0) return { success: false, error: '양품·불량이 모두 0이면 실적이 아닙니다.' }
    if (ng > 0 && !req.defectCode) return { success: false, error: '불량이 있으면 불량유형을 지정해야 합니다(0101 계약).' }
    // M-1 최소방어: 작업자 빈 값 거부
    if (!req.worker?.trim()) return { success: false, error: '작업자 이름이 없습니다 — 기록주체 없는 실적은 저장할 수 없습니다.' }
    try {
      const info = db
        .prepare(
          `INSERT INTO prod_record
             (record_date, work_order_id, item_code, lot_no, line_no, ok_qty, ng_qty, defect_code, shift, worker, note)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          req.recordDate, req.workOrderId ?? null, req.itemCode, req.lotNo?.trim() || null,
          req.procCode?.trim() || null, ok, ng, req.defectCode ?? null, req.shift ?? null,
          req.worker.trim(), req.note?.trim() || null
        )
      return { success: true, id: Number(info.lastInsertRowid) }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── ④ inspRecordCreate — 검사기록 헤더+값 단일 트랜잭션 (§10-1 각인) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_INSP_CREATE, (_e, req: SemimesInspCreateInput) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    if (!ymdOk(req?.inspDate)) return { success: false, error: '검사 일자는 YYYY-MM-DD 형식이어야 합니다.' }
    if (!INSP_KINDS.includes(req.inspKind)) return { success: false, error: `검사종류는 ${INSP_KINDS.join('/')} 중 하나여야 합니다.` }
    if (!itemRow(req.itemCode)) return { success: false, error: `품번(${req.itemCode})이 품목 마스터에 없습니다.` }
    if (req.inspKind === '자주' && !PHASES.includes(req.samplePhase ?? '')) {
      return { success: false, error: '자주검사는 초품/중품/종품을 지정해야 합니다(초중종 3회 문법).' }
    }
    if (req.samplePhase && !PHASES.includes(req.samplePhase)) {
      return { success: false, error: '초중종 값은 초품/중품/종품만 허용됩니다.' }
    }
    if (!['합격', '불합격', '보류'].includes(req.judgment)) {
      return { success: false, error: '판정(합격/불합격/보류)은 사람이 확정해야 합니다.' }
    }
    // C-3 최소방어: 검사자 빈 값 거부 — inspector 부재 기록은 2단 서명의 자기확인 검증이 무력해진다
    const inspector = req.inspector?.trim()
    if (!inspector) {
      return { success: false, error: '검사자 이름이 없습니다 — 기록주체 없는 검사기록은 저장할 수 없습니다(2단 서명 1단).' }
    }
    const values = Array.isArray(req.values) ? req.values : []
    if (values.length === 0) return { success: false, error: '측정값이 최소 1건 필요합니다.' }
    for (const v of values) {
      if (!v?.inspItem?.trim()) return { success: false, error: '검사항목명이 빈 측정값이 있습니다.' }
      if (!Number.isFinite(Number(v.value))) {
        return { success: false, error: `실측값을 수치로 기록해야 합니다(○/× 단독 저장 거부) — ${v.inspItem}` }
      }
    }
    // §10-1 스냅샷: 기록 시점 활성 스펙의 revision (없으면 null — 정직, 추정 기입 금지)
    const rev = db
      .prepare('SELECT MAX(revision) AS r FROM insp_spec WHERE item_code = ? AND insp_kind = ? AND active = 1')
      .get(req.itemCode, req.inspKind) as { r: number | null }
    // 자동판정 = 제안만: 규격(su/sl) 대조 — 스펙 매칭값 전건 규격 내면 합격 제안
    const specMap = new Map(
      (
        db
          .prepare('SELECT id, su, sl FROM insp_spec WHERE item_code = ? AND insp_kind = ? AND active = 1')
          .all(req.itemCode, req.inspKind) as Array<{ id: number; su: number | null; sl: number | null }>
      ).map((s) => [s.id, s])
    )
    let matched = 0
    let offSpec = 0
    for (const v of values) {
      const s = v.specId != null ? specMap.get(v.specId) : undefined
      if (!s) continue
      matched++
      const val = Number(v.value)
      if ((s.su != null && val > s.su) || (s.sl != null && val < s.sl)) offSpec++
    }
    const suggestion = matched === 0 ? '판정 제안 불가(연결 스펙 없음)' : offSpec > 0 ? `불합격 제안(규격 이탈 ${offSpec}건)` : '합격 제안(전건 규격 내)'
    try {
      const id = db.transaction(() => {
        const info = db
          .prepare(
            `INSERT INTO insp_record
               (insp_date, insp_kind, item_code, lot_no, proc_code, inspector, judgment, note,
                spec_revision, sample_phase)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            req.inspDate, req.inspKind, req.itemCode, req.lotNo?.trim() || null, req.procCode?.trim() || null,
            inspector, req.judgment, req.note?.trim() || null, rev.r, req.samplePhase ?? null
          )
        const rid = Number(info.lastInsertRowid)
        const insVal = db.prepare(
          `INSERT INTO insp_record_value (record_id, spec_id, insp_item, sample_no, value, value_text)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        for (const v of values) {
          insVal.run(rid, v.specId ?? null, v.inspItem.trim(), v.sampleNo ?? 1, Number(v.value), v.valueText?.trim() || null)
        }
        return rid
      })()
      return { success: true, id, suggestion, specRevision: rev.r }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── ⑤ workOrderUpsert — 작업지시(사무실). 지시는 계획 앵커라 갱신 허용(기록 5종과 구분) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_WORK_ORDER_UPSERT, (_e, req: SemimesWorkOrderInput) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    try {
      if (req.id != null) {
        const cur = db.prepare('SELECT id FROM work_order WHERE id = ?').get(req.id)
        if (!cur) return { success: false, error: `작업지시(#${req.id})가 없습니다.` }
        if (req.status && !['대기', '진행', '완료', '취소'].includes(req.status)) {
          return { success: false, error: '상태는 대기/진행/완료/취소만 허용됩니다.' }
        }
        db.prepare(
          `UPDATE work_order SET
             order_qty = COALESCE(?, order_qty), line_no = COALESCE(?, line_no),
             start_date = COALESCE(?, start_date), end_date = COALESCE(?, end_date),
             status = COALESCE(?, status), note = COALESCE(?, note),
             updated_at = datetime('now') WHERE id = ?`
        ).run(req.orderQty ?? null, req.lineNo ?? null, req.startDate ?? null, req.endDate ?? null, req.status ?? null, req.note ?? null, req.id)
        return { success: true, id: req.id }
      }
      if (!req.itemCode || !itemRow(req.itemCode)) {
        return { success: false, error: `품번(${req.itemCode ?? ''})이 품목 마스터에 없습니다.` }
      }
      // M-1 최소방어: 지시 발번 주체 빈 값 거부(신규 발번 한정 — 상태 전이는 갱신 동선)
      if (!req.createdBy?.trim()) return { success: false, error: '작성자가 없습니다 — 사용자를 선택하세요.' }
      const ymd = todayKST()
      const yymmdd = ymd.slice(2).replace(/-/g, '')
      const result = db.transaction(() => {
        const { n } = db
          .prepare("SELECT COUNT(*) + 1 AS n FROM work_order WHERE order_no LIKE ?")
          .get(`WO-${yymmdd}-%`) as { n: number }
        const orderNo = `WO-${yymmdd}-${String(n).padStart(2, '0')}`
        const info = db
          .prepare(
            `INSERT INTO work_order (order_no, item_code, order_qty, line_no, start_date, end_date, status, note, created_by)
             VALUES (?, ?, ?, ?, ?, ?, '대기', ?, ?)`
          )
          .run(orderNo, req.itemCode, req.orderQty ?? null, req.lineNo ?? null, req.startDate ?? ymd, req.endDate ?? null, req.note ?? null, req.createdBy!.trim())
        return { id: Number(info.lastInsertRowid), orderNo }
      })()
      return { success: true, ...result }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── ⑤b workOrderList — 사무실 그리드 (읽기) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_WORK_ORDER_LIST,
    (_e, req: { status?: string; limit?: number } | undefined): SemimesWorkOrderRowDto[] => {
      const limit = Math.min(Math.max(req?.limit ?? 50, 1), 200)
      const where = req?.status ? 'WHERE w.status = ?' : ''
      const args: unknown[] = req?.status ? [req.status, limit] : [limit]
      try {
        return db
          .prepare(
            `SELECT w.id, w.order_no AS orderNo, w.item_code AS itemCode, i.item_name AS itemName,
                    w.order_qty AS orderQty, w.line_no AS lineNo, w.start_date AS startDate,
                    w.end_date AS endDate, w.status, w.created_by AS createdBy,
                    COALESCE((SELECT SUM(p.ok_qty) FROM prod_record p
                              WHERE p.work_order_id = w.id AND p.canceled_at IS NULL), 0) AS okSum
             FROM work_order w LEFT JOIN item_master i ON i.item_code = w.item_code
             ${where} ORDER BY w.id DESC LIMIT ?`
          )
          .all(...args) as SemimesWorkOrderRowDto[]
      } catch {
        return []
      }
    }
  )

  // ── ⑥ todayRecords — 현장 [조회] (읽기 — 취소분은 플래그로 정직 표기) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_TODAY_RECORDS, (_e, req: { ymd?: string } | undefined): SemimesTodayRecordsDto => {
    const ymd = ymdOk(req?.ymd) ? req!.ymd! : todayKST()
    const prod = db
      .prepare(
        `SELECT id, item_code AS itemCode, lot_no AS lotNo, line_no AS procCode, ok_qty AS okQty,
                ng_qty AS ngQty, worker, (canceled_at IS NOT NULL) AS canceled
         FROM prod_record WHERE record_date = ? ORDER BY id DESC LIMIT 100`
      )
      .all(ymd) as Array<Omit<SemimesTodayRecordsDto['prod'][number], 'canceled'> & { canceled: 0 | 1 }>
    const insp = db
      .prepare(
        `SELECT r.id, r.insp_kind AS inspKind, r.item_code AS itemCode, r.lot_no AS lotNo,
                r.sample_phase AS samplePhase, r.judgment, r.inspector, r.confirmer,
                (SELECT COUNT(*) FROM insp_record_value v WHERE v.record_id = r.id) AS valueCnt,
                (r.canceled_at IS NOT NULL) AS canceled
         FROM insp_record r WHERE r.insp_date = ? ORDER BY r.id DESC LIMIT 100`
      )
      .all(ymd) as Array<Omit<SemimesTodayRecordsDto['insp'][number], 'canceled'> & { canceled: 0 | 1 }>
    return {
      ymd,
      prod: prod.map((r) => ({ ...r, canceled: !!r.canceled })),
      insp: insp.map((r) => ({ ...r, canceled: !!r.canceled }))
    }
  })

  // ── ⑦ recordCancel — append-only 정정: 사유 필수 취소 마크(행 불변·삭제 금지) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_RECORD_CANCEL,
    (_e, { kind, id, reason, canceledBy }: { kind: 'prod' | 'insp' | 'receipt'; id: number; reason: string; canceledBy?: string }) => {
      if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
      const table = kind === 'prod' ? 'prod_record' : kind === 'insp' ? 'insp_record' : kind === 'receipt' ? 'mat_receipt' : null
      if (!table) return { success: false, error: '취소 대상 종류(prod|insp|receipt)가 유효하지 않습니다.' }
      if (!reason?.trim()) return { success: false, error: '취소 사유는 필수입니다(두 줄 긋고 정정 서명의 전산 등가).' }
      // M-1 최소방어: 취소 주체 빈 값 거부(정정 서명의 주체)
      if (!canceledBy?.trim()) return { success: false, error: '취소자 이름이 없습니다 — 사용자를 선택하세요.' }
      const cur = db.prepare(`SELECT id, canceled_at FROM ${table} WHERE id = ?`).get(id) as
        | { id: number; canceled_at: string | null }
        | undefined
      if (!cur) return { success: false, error: `기록(#${id})이 없습니다.` }
      if (cur.canceled_at) return { success: false, error: '이미 취소된 기록입니다.' }
      // 상태 조건 이중 방어 — 교차 프로세스(데스크톱+웹) 동시 취소 시 덮어씀 방지
      const u = db.prepare(
        `UPDATE ${table} SET canceled_at = datetime('now', 'localtime'), cancel_reason = ?, canceled_by = ? WHERE id = ? AND canceled_at IS NULL`
      ).run(reason.trim(), canceledBy.trim(), id)
      if (u.changes !== 1) return { success: false, error: '이미 취소된 기록입니다(경합 감지).' }
      return { success: true }
    }
  )

  // ── ⑪ itemUpdate — 품목 마스터 정비 (34호 #1 · 단가 계열 무 — 돈 경계. 검사구분 3종은 의미 확정 전 편집 제외) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_ITEM_UPDATE, (_e, req: SemimesItemUpdateInput & { updatedBy?: string }) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    if (!req?.itemCode?.trim()) return { success: false, error: '품번이 없습니다.' }
    // 정비 주체 요구(마스터에 주체 컬럼 없음 — 저장은 안 하되 익명 정비는 거부, M-1 결)
    if (!req.updatedBy?.trim()) return { success: false, error: '정비 주체가 없습니다 — 사용자를 선택하세요.' }
    const cur = db.prepare('SELECT item_code FROM item_master WHERE item_code = ?').get(req.itemCode.trim())
    if (!cur) return { success: false, error: `품번(${req.itemCode})이 마스터에 없습니다.` }
    if (req.active != null && ![0, 1].includes(req.active)) return { success: false, error: 'active 는 0/1 입니다.' }
    if (req.inlotuse != null && ![0, 1].includes(req.inlotuse)) return { success: false, error: 'inlotuse 는 0/1 입니다.' }
    // 전달된 키만 명시 갱신 — null/빈 문자열 = 비우기(COALESCE 부분갱신은 값 소거 불가라 배제)
    const cols: Record<string, string> = { itemName: 'item_name', itemType: 'item_type', spec: 'spec', carType: 'car_type', inlotuse: 'inlotuse', active: 'active' }
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, col] of Object.entries(cols)) {
      const v = (req as unknown as Record<string, unknown>)[k]
      if (v === undefined) continue
      sets.push(`${col} = ?`)
      vals.push(typeof v === 'string' ? v.trim() || null : v)
    }
    if (sets.length === 0) return { success: false, error: '변경할 값이 없습니다.' }
    db.prepare(`UPDATE item_master SET ${sets.join(', ')}, updated_at = datetime('now') WHERE item_code = ?`).run(
      ...vals, req.itemCode.trim()
    )
    return { success: true }
  })

  // ── ⑫ partnerUpdate — 거래처 마스터 정비 (34호 #2 · partner_type 오분류 정비 동선 = G1 소견 1 해소처) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_PARTNER_UPDATE, (_e, req: SemimesPartnerUpdateInput & { updatedBy?: string }) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    if (!req?.partnerCode?.trim()) return { success: false, error: '거래처 코드가 없습니다.' }
    if (!req.updatedBy?.trim()) return { success: false, error: '정비 주체가 없습니다 — 사용자를 선택하세요.' }
    const cur = db.prepare('SELECT partner_code FROM partner WHERE partner_code = ?').get(req.partnerCode.trim())
    if (!cur) return { success: false, error: `거래처(${req.partnerCode})가 마스터에 없습니다.` }
    if (req.active != null && ![0, 1].includes(req.active)) return { success: false, error: 'active 는 0/1 입니다.' }
    // 전달된 키만 명시 갱신(위 itemUpdate 와 동일 계약 — 값 소거 가능)
    const cols: Record<string, string> = { name: 'name', partnerType: 'partner_type', bizNo: 'biz_no', ceo: 'ceo', active: 'active' }
    const sets: string[] = []
    const vals: unknown[] = []
    for (const [k, col] of Object.entries(cols)) {
      const v = (req as unknown as Record<string, unknown>)[k]
      if (v === undefined) continue
      sets.push(`${col} = ?`)
      vals.push(typeof v === 'string' ? v.trim() || null : v)
    }
    if (sets.length === 0) return { success: false, error: '변경할 값이 없습니다.' }
    db.prepare(`UPDATE partner SET ${sets.join(', ')} WHERE partner_code = ?`).run(...vals, req.partnerCode.trim())
    return { success: true }
  })

  // ── ⑨ specSave — 검사기준 등록/개정 (34호 #7 · §10-1 ⓐ: 개정 = 신규 행, 구판 불변) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_SPEC_SAVE, (_e, req: SemimesSpecSaveInput) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    if (!itemRow(req?.itemCode ?? '')) return { success: false, error: `품번(${req?.itemCode ?? ''})이 품목 마스터에 없습니다.` }
    if (!INSP_KINDS.includes(req.inspKind)) return { success: false, error: `검사종류는 ${INSP_KINDS.join('/')} 중 하나여야 합니다.` }
    if (!req.inspItem?.trim()) return { success: false, error: '검사항목명은 필수입니다.' }
    const author = req.createdBy?.trim()
    if (!author) return { success: false, error: '개정 주체가 없습니다 — 사용자를 선택하세요.' }
    const num = (v: number | null | undefined): number | null | false => {
      if (v == null) return null
      const n = Number(v)
      return Number.isFinite(n) ? n : false
    }
    const sl = num(req.sl)
    const su = num(req.su)
    const nominal = num(req.nominal)
    const sampleCnt = num(req.sampleCnt)
    if (sl === false || su === false || nominal === false || sampleCnt === false) {
      return { success: false, error: '규격 값은 수치여야 합니다.' }
    }
    if (sl != null && su != null && sl > su) return { success: false, error: '하한이 상한보다 큽니다 — 규격을 확인하세요.' }
    const item = req.inspItem.trim()
    try {
      const specTxn = db.transaction(() => {
        const cur = db
          .prepare('SELECT COALESCE(MAX(revision), 0) AS r FROM insp_spec WHERE item_code = ? AND insp_kind = ? AND insp_item = ?')
          .get(req.itemCode, req.inspKind, item) as { r: number }
        const rev = cur.r + 1
        // 구판 불변 — 값은 건드리지 않고 active 강하만(개정 이력 = 행으로 보존)
        db.prepare('UPDATE insp_spec SET active = 0 WHERE item_code = ? AND insp_kind = ? AND insp_item = ? AND active = 1').run(
          req.itemCode, req.inspKind, item
        )
        const info = db
          .prepare(
            `INSERT INTO insp_spec (item_code, insp_kind, insp_item, instrument, unit, su, sl, nominal, sample_cnt,
                                    revision, rev_date, active, source, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '앱 등록', ?)`
          )
          .run(
            req.itemCode, req.inspKind, item, req.instrument?.trim() || null, req.unit?.trim() || null,
            su, sl, nominal, sampleCnt, rev, todayKST(), author
          )
        return { id: Number(info.lastInsertRowid), revision: rev }
      })
      return { success: true, ...specTxn.immediate() }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  // ── ⑩ ppmTargetSave — 부적합 목표 PPM (34호 #14 · app_config 단일 키) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_PPM_TARGET_SAVE, (_e, { value, savedBy }: { value: number; savedBy?: string }) => {
    const v = Number(value)
    if (!Number.isFinite(v) || v < 0) return { success: false, error: '목표 PPM 은 0 이상 수치여야 합니다.' }
    if (!savedBy?.trim()) return { success: false, error: '기입 주체가 없습니다 — 사용자를 선택하세요.' }
    db.prepare(
      "INSERT INTO app_config (key, value) VALUES ('quality.targetPpm', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(String(Math.round(v)))
    return { success: true }
  })

  // ── ⑧ inspConfirm — 확인자 2단 서명(§10-1 ⓒ — ✓는 사람, 세션 각인, 1회) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_INSP_CONFIRM, (_e, { id, confirmer }: { id: number; confirmer?: string }) => {
    if (recordSource() === 'sidecar') return { success: false, error: SIDECAR_MSG }
    const cur = db.prepare('SELECT id, confirmer, canceled_at, inspector FROM insp_record WHERE id = ?').get(id) as
      | { id: number; confirmer: string | null; canceled_at: string | null; inspector: string | null }
      | undefined
    if (!cur) return { success: false, error: `검사기록(#${id})이 없습니다.` }
    if (cur.canceled_at) return { success: false, error: '취소된 기록은 확인할 수 없습니다.' }
    if (cur.confirmer) return { success: false, error: `이미 확인됨(${cur.confirmer}) — 2단 서명은 1회입니다.` }
    if (!confirmer?.trim()) return { success: false, error: '확인자 이름이 없습니다(세션 필요).' }
    // C-3 최소방어: 검사자 부재 기록은 자기확인 검증이 불가 — 확인 거부(정정 = 취소+재입력)
    if (!cur.inspector?.trim()) {
      return { success: false, error: '검사자가 비어 있는 기록은 확인할 수 없습니다(자기확인 검증 불가) — 취소 후 재입력하세요.' }
    }
    if (cur.inspector.trim() === confirmer.trim()) {
      return { success: false, error: '검사자 본인은 확인자가 될 수 없습니다(2단 서명 — 자기확인 금지).' }
    }
    // 상태 조건 이중 방어 — 교차 프로세스 동시 확인 시 2단 서명 덮어씀 방지(1회 원칙)
    const u = db.prepare(
      `UPDATE insp_record SET confirmer = ?, confirmed_at = datetime('now', 'localtime')
       WHERE id = ? AND confirmer IS NULL AND canceled_at IS NULL`
    ).run(confirmer.trim(), id)
    if (u.changes !== 1) return { success: false, error: '이미 확인됨 — 2단 서명은 1회입니다(경합 감지).' }
    return { success: true }
  })
}
