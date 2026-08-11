import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { todayKST } from '@shared/date-kst'
import { getSqlite } from '../database/connection'
import type {
  SemimesBomExplodeRowDto,
  SemimesCodeGroupDto,
  SemimesHomeKpisDto,
  SemimesItemMasterRowDto,
  SemimesPartnerRowDto,
  SemimesInspListReq,
  SemimesInspRowDto,
  SemimesInspValueRowDto,
  SemimesMatStockRowDto,
  SemimesPpmDashDto,
  SemimesProdAggRowDto,
  SemimesProdListReq,
  SemimesProdRowDto,
  SemimesReceiptRowDto,
  SemimesSpecRegistryRowDto
} from '@shared/ipc-types'

/**
 * 32호 1차분 — MES 조회 화면 5종 원천 (읽기 전용 · 쓰기 채널과 분리).
 * 계약:
 *  · 날짜 축 = record_date/insp_date/receipt_date (todayKST 강제 저장분 — YYYY-MM-DD 문자열).
 *    created_at(UTC 타임스탬프) 절단 금지 — 필요 시 date(…,'localtime')만 (8/6 검수 M-4 규약).
 *  · 취소 마크(canceled_at) 행: 집계·재고 계산에서 제외, 행 목록에서는 canceled 플래그로 정직 표기.
 *  · 재고 잔량 = 입고(mat_receipt, 취소 제외) − 투입(mat_input) 실계산. 안전재고 기준 미보유 —
 *    화면이 '미등록'으로 정직 표기(추정 기입 금지).
 */

const YMD = /^\d{4}-\d{2}-\d{2}$/

function rangeOk(from?: string, to?: string): boolean {
  return !!from && !!to && YMD.test(from) && YMD.test(to) && from <= to
}

export function registerSemimesQueryHandlers(): void {
  const db = getSqlite()

  // ── ① prodList — 생산실적 상세/일별/월별 (1차분 ③ 그림24·25) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_PROD_LIST,
    (_e, req: SemimesProdListReq): { rows: SemimesProdRowDto[]; agg: SemimesProdAggRowDto[] } => {
      if (!rangeOk(req?.from, req?.to)) return { rows: [], agg: [] }
      const itemCond = req.itemCode ? 'AND p.item_code = ?' : ''
      const args: unknown[] = req.itemCode ? [req.from, req.to, req.itemCode] : [req.from, req.to]
      const mode = req.mode ?? 'detail'
      if (mode === 'daily' || mode === 'monthly') {
        const bucket = mode === 'daily' ? 'p.record_date' : 'substr(p.record_date, 1, 7)'
        const agg = db
          .prepare(
            `SELECT ${bucket} AS bucket, COUNT(*) AS rows, COALESCE(SUM(p.ok_qty),0) AS okSum,
                    COALESCE(SUM(p.ng_qty),0) AS ngSum
             FROM prod_record p
             WHERE p.record_date >= ? AND p.record_date <= ? ${itemCond} AND p.canceled_at IS NULL
             GROUP BY bucket ORDER BY bucket DESC`
          )
          .all(...args) as SemimesProdAggRowDto[]
        return { rows: [], agg }
      }
      const rows = db
        .prepare(
          `SELECT p.id, p.record_date AS recordDate, w.order_no AS orderNo, p.item_code AS itemCode,
                  i.item_name AS itemName, p.lot_no AS lotNo, p.line_no AS procCode, p.ok_qty AS okQty,
                  p.ng_qty AS ngQty, p.defect_code AS defectCode, p.shift, p.worker,
                  (p.canceled_at IS NOT NULL) AS canceled
           FROM prod_record p
           LEFT JOIN item_master i ON i.item_code = p.item_code
           LEFT JOIN work_order w ON w.id = p.work_order_id
           WHERE p.record_date >= ? AND p.record_date <= ? ${itemCond}
           ORDER BY p.record_date DESC, p.id DESC LIMIT 500`
        )
        .all(...args) as Array<Omit<SemimesProdRowDto, 'canceled'> & { canceled: 0 | 1 }>
      return { rows: rows.map((r) => ({ ...r, canceled: !!r.canceled })), agg: [] }
    }
  )

  // ── ② inspList — 검사내역 (1차분 ④수입 그림30 · ⑤통합 그림32~36 — 검사구분 콤보 겸용) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_INSP_LIST, (_e, req: SemimesInspListReq): SemimesInspRowDto[] => {
    if (!rangeOk(req?.from, req?.to)) return []
    const conds: string[] = ['r.insp_date >= ?', 'r.insp_date <= ?']
    const args: unknown[] = [req.from, req.to]
    if (req.kind?.trim()) {
      conds.push('r.insp_kind = ?')
      args.push(req.kind.trim())
    }
    if (req.itemCode?.trim()) {
      conds.push('r.item_code = ?')
      args.push(req.itemCode.trim())
    }
    const rows = db
      .prepare(
        `SELECT r.id, r.insp_date AS inspDate, r.insp_kind AS inspKind, r.item_code AS itemCode,
                i.item_name AS itemName, r.lot_no AS lotNo, r.proc_code AS procCode, r.inspector,
                r.judgment, r.defect_qty AS defectQty, r.sample_phase AS samplePhase,
                r.spec_revision AS specRevision, r.confirmer, r.confirmed_at AS confirmedAt,
                (SELECT COUNT(*) FROM insp_record_value v WHERE v.record_id = r.id) AS valueCnt,
                (r.canceled_at IS NOT NULL) AS canceled
         FROM insp_record r
         LEFT JOIN item_master i ON i.item_code = r.item_code
         WHERE ${conds.join(' AND ')}
         ORDER BY r.insp_date DESC, r.id DESC LIMIT 500`
      )
      .all(...args) as Array<Omit<SemimesInspRowDto, 'canceled'> & { canceled: 0 | 1 }>
    return rows.map((r) => ({ ...r, canceled: !!r.canceled }))
  })

  // ── ③ inspValues — 검사기록 측정값(시료 1~n 열 원천 · 스펙 규격 동봉 = 이탈 표시) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_INSP_VALUES, (_e, { id }: { id: number }): SemimesInspValueRowDto[] => {
    if (!Number.isInteger(id)) return []
    return db
      .prepare(
        `SELECT v.insp_item AS inspItem, v.sample_no AS sampleNo, v.value, v.value_text AS valueText,
                s.su, s.sl, s.unit
         FROM insp_record_value v
         LEFT JOIN insp_spec s ON s.id = v.spec_id
         WHERE v.record_id = ? ORDER BY v.insp_item, v.sample_no`
      )
      .all(id) as SemimesInspValueRowDto[]
  })

  // ── ④ matStock — 재고현황(자재) 잔량 실계산 (1차분 ⑥ 그림18~20) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_MAT_STOCK, (_e, req: { itemCode?: string } | undefined): SemimesMatStockRowDto[] => {
    const itemCond = req?.itemCode?.trim() ? 'WHERE m.item_code = ?' : ''
    const args: unknown[] = req?.itemCode?.trim() ? [req.itemCode.trim()] : []
    return db
      .prepare(
        `SELECT m.item_code AS itemCode, i.item_name AS itemName, i.item_type AS itemType,
                COALESCE(r.receiptSum, 0) AS receiptSum, COALESCE(u.inputSum, 0) AS inputSum,
                COALESCE(r.receiptSum, 0) - COALESCE(u.inputSum, 0) AS balance,
                r.lastReceiptDate
         FROM (
           SELECT item_code FROM mat_receipt WHERE canceled_at IS NULL
           UNION SELECT item_code FROM mat_input
         ) m
         LEFT JOIN item_master i ON i.item_code = m.item_code
         LEFT JOIN (
           SELECT item_code, SUM(qty) AS receiptSum, MAX(receipt_date) AS lastReceiptDate
           FROM mat_receipt WHERE canceled_at IS NULL GROUP BY item_code
         ) r ON r.item_code = m.item_code
         LEFT JOIN (
           SELECT item_code, SUM(qty) AS inputSum FROM mat_input GROUP BY item_code
         ) u ON u.item_code = m.item_code
         ${itemCond}
         ORDER BY balance ASC, m.item_code LIMIT 500`
      )
      .all(...args) as SemimesMatStockRowDto[]
  })

  // ── ⑥ receiptList — 자재입하/입고내역 (34호 2-1 · 원천 = 수집함 태깅 mat_receipt · SQ 2_1·2_2) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_RECEIPT_LIST,
    (_e, req: { from: string; to: string; itemCode?: string; receiptClass?: string }): SemimesReceiptRowDto[] => {
      if (!rangeOk(req?.from, req?.to)) return []
      const conds: string[] = ['m.receipt_date >= ?', 'm.receipt_date <= ?']
      const args: unknown[] = [req.from, req.to]
      if (req.itemCode?.trim()) {
        conds.push('m.item_code = ?')
        args.push(req.itemCode.trim())
      }
      if (req.receiptClass?.trim()) {
        conds.push('m.receipt_class = ?')
        args.push(req.receiptClass.trim())
      }
      const rows = db
        .prepare(
          `SELECT m.id, m.receipt_date AS receiptDate, m.item_code AS itemCode, i.item_name AS itemName,
                  m.partner_code AS partnerCode, p.name AS partnerName, m.qty,
                  m.vendor_lot AS vendorLot, m.internal_lot AS internalLot, m.receipt_class AS receiptClass,
                  m.capture_id AS captureId, m.created_by AS createdBy,
                  (m.canceled_at IS NOT NULL) AS canceled
           FROM mat_receipt m
           LEFT JOIN item_master i ON i.item_code = m.item_code
           LEFT JOIN partner p ON p.partner_code = m.partner_code
           WHERE ${conds.join(' AND ')}
           ORDER BY m.receipt_date DESC, m.id DESC LIMIT 500`
        )
        .all(...args) as Array<Omit<SemimesReceiptRowDto, 'canceled'> & { canceled: 0 | 1 }>
      return rows.map((r) => ({ ...r, canceled: !!r.canceled }))
    }
  )

  // ── ⑦ specList — 검사기준 전 리비전 조회 (34호 #7 · 구판 포함 이력 정직 표기) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_SPEC_LIST,
    (_e, req: { itemCode: string; inspKind?: string }): SemimesSpecRegistryRowDto[] => {
      if (!req?.itemCode?.trim()) return []
      const conds = ['s.item_code = ?']
      const args: unknown[] = [req.itemCode.trim()]
      if (req.inspKind?.trim()) {
        conds.push('s.insp_kind = ?')
        args.push(req.inspKind.trim())
      }
      const rows = db
        .prepare(
          `SELECT s.id, s.item_code AS itemCode, s.insp_kind AS inspKind, s.insp_item AS inspItem,
                  s.instrument, s.unit, s.sl, s.su, s.nominal, s.sample_cnt AS sampleCnt,
                  s.revision, s.rev_date AS revDate, s.active, s.created_by AS createdBy
           FROM insp_spec s WHERE ${conds.join(' AND ')}
           ORDER BY s.insp_kind, s.insp_item, s.revision DESC LIMIT 500`
        )
        .all(...args) as Array<Omit<SemimesSpecRegistryRowDto, 'active'> & { active: 0 | 1 }>
      return rows.map((r) => ({ ...r, active: !!r.active }))
    }
  )

  // ── ⑧ ppmDash — 부적합 PPM 대시보드 (34호 #14 · v1 원천 = 생산실적 불량, 취소 제외) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_PPM_DASH, (_e, req: { year?: string } | undefined): SemimesPpmDashDto => {
    const year = req?.year && /^\d{4}$/.test(req.year) ? req.year : todayKST().slice(0, 4)
    let targetPpm: number | null = null
    try {
      const t = db.prepare("SELECT value FROM app_config WHERE key = 'quality.targetPpm'").get() as
        | { value: string }
        | undefined
      if (t && Number.isFinite(Number(t.value))) targetPpm = Number(t.value)
    } catch {
      /* app_config 부재 — 목표 미설정 정직 */
    }
    const ppmOf = (ok: number, ng: number): number | null => (ok + ng > 0 ? Math.round((ng / (ok + ng)) * 1e6) : null)
    const months = (
      db
        .prepare(
          `SELECT substr(record_date, 1, 7) AS month, COALESCE(SUM(ok_qty),0) AS ok, COALESCE(SUM(ng_qty),0) AS ng
           FROM prod_record WHERE record_date LIKE ? AND canceled_at IS NULL GROUP BY month ORDER BY month`
        )
        .all(`${year}-%`) as Array<{ month: string; ok: number; ng: number }>
    ).map((m) => ({ ...m, ppm: ppmOf(m.ok, m.ng) }))
    const byItem = (
      db
        .prepare(
          `SELECT p.item_code AS itemCode, i.item_name AS itemName,
                  COALESCE(SUM(p.ok_qty),0) AS ok, COALESCE(SUM(p.ng_qty),0) AS ng
           FROM prod_record p LEFT JOIN item_master i ON i.item_code = p.item_code
           WHERE p.record_date LIKE ? AND p.canceled_at IS NULL
           GROUP BY p.item_code HAVING ok + ng > 0 ORDER BY ng DESC, ok DESC LIMIT 50`
        )
        .all(`${year}-%`) as Array<{ itemCode: string; itemName: string | null; ok: number; ng: number }>
    ).map((r) => ({ ...r, ppm: ppmOf(r.ok, r.ng) }))
    const byDefect = db
      .prepare(
        `SELECT p.defect_code AS code, d.name, COALESCE(SUM(p.ng_qty),0) AS ng
         FROM prod_record p LEFT JOIN defect_type d ON d.code = p.defect_code
         WHERE p.record_date LIKE ? AND p.canceled_at IS NULL AND p.ng_qty > 0 AND p.defect_code IS NOT NULL
         GROUP BY p.defect_code ORDER BY ng DESC LIMIT 20`
      )
      .all(`${year}-%`) as Array<{ code: string; name: string | null; ng: number }>
    const curMonth = todayKST().slice(0, 7)
    const cur = months.find((m) => m.month === curMonth)
    return { year, targetPpm, months, byItem, byDefect, currentMonthPpm: cur?.ppm ?? null }
  })

  // ── ⑨ itemList — 품목코드관리 조회 (34호 #1 · 단가 계열 무 — 돈 경계) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_ITEM_LIST,
    (_e, req: { query?: string; itemType?: string; includeInactive?: boolean; limit?: number } | undefined): { rows: SemimesItemMasterRowDto[]; total: number; types: string[] } => {
      const conds: string[] = []
      const args: unknown[] = []
      if (!req?.includeInactive) conds.push('active = 1')
      if (req?.query?.trim()) {
        conds.push('(item_code LIKE ? OR item_name LIKE ?)')
        const q = `%${req.query.trim()}%`
        args.push(q, q)
      }
      if (req?.itemType?.trim()) {
        conds.push('item_type = ?')
        args.push(req.itemType.trim())
      }
      const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
      const limit = Math.min(Math.max(req?.limit ?? 300, 1), 500)
      const total = (db.prepare(`SELECT COUNT(*) c FROM item_master ${where}`).get(...args) as { c: number }).c
      const rows = db
        .prepare(
          `SELECT item_code AS itemCode, item_name AS itemName, item_type AS itemType, spec,
                  car_type AS carType, inlotuse, insp_skip AS inspSkip, qc_gbn_o AS qcGbnO,
                  out_yn AS outYn, active, source
           FROM item_master ${where} ORDER BY item_code LIMIT ${limit}`
        )
        .all(...args) as SemimesItemMasterRowDto[]
      const types = (db.prepare(`SELECT DISTINCT item_type t FROM item_master WHERE item_type IS NOT NULL ORDER BY t`).all() as Array<{ t: string }>).map((r) => r.t)
      return { rows, total, types }
    }
  )

  // ── ⑩ partnerList — 거래처코드관리 조회 (34호 #2 · partner_type 정비 동선 원천) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_PARTNER_LIST,
    (_e, req: { query?: string; partnerType?: string; includeInactive?: boolean } | undefined): { rows: SemimesPartnerRowDto[]; types: string[] } => {
      const conds: string[] = []
      const args: unknown[] = []
      if (!req?.includeInactive) conds.push('active = 1')
      if (req?.query?.trim()) {
        conds.push('(partner_code LIKE ? OR name LIKE ?)')
        const q = `%${req.query.trim()}%`
        args.push(q, q)
      }
      if (req?.partnerType?.trim()) {
        conds.push('partner_type = ?')
        args.push(req.partnerType.trim())
      }
      const where = conds.length > 0 ? `WHERE ${conds.join(' AND ')}` : ''
      const rows = db
        .prepare(
          `SELECT partner_code AS partnerCode, name, partner_type AS partnerType, biz_no AS bizNo, ceo, active
           FROM partner ${where} ORDER BY partner_code LIMIT 300`
        )
        .all(...args) as SemimesPartnerRowDto[]
      const types = (db.prepare(`SELECT DISTINCT partner_type t FROM partner WHERE partner_type IS NOT NULL ORDER BY t`).all() as Array<{ t: string }>).map((r) => r.t)
      return { rows, types }
    }
  )

  // ── ⑪ bomExplode — BOM 정전개/역전개 (34호 #3 · 재귀 CTE, 순환 방어 깊이 10) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_BOM_EXPLODE,
    (_e, { itemCode, direction }: { itemCode: string; direction: 'down' | 'up' }): SemimesBomExplodeRowDto[] => {
      const code = itemCode?.trim()
      if (!code) return []
      const sql =
        direction === 'up'
          ? `WITH RECURSIVE t(parent, child, qty, lvl) AS (
               SELECT parent_code, child_code, qty, 1 FROM bom_edge WHERE child_code = ? AND active = 1
               UNION ALL
               SELECT b.parent_code, b.child_code, b.qty, t.lvl + 1
               FROM bom_edge b JOIN t ON b.child_code = t.parent WHERE b.active = 1 AND t.lvl < 10
             )
             SELECT t.lvl AS level, t.parent AS parentCode, t.child AS childCode, t.qty,
                    i.item_name AS childName, i.item_type AS childType
             FROM t LEFT JOIN item_master i ON i.item_code = t.parent
             ORDER BY t.lvl, t.parent LIMIT 500`
          : `WITH RECURSIVE t(parent, child, qty, lvl) AS (
               SELECT parent_code, child_code, qty, 1 FROM bom_edge WHERE parent_code = ? AND active = 1
               UNION ALL
               SELECT b.parent_code, b.child_code, b.qty, t.lvl + 1
               FROM bom_edge b JOIN t ON b.parent_code = t.child WHERE b.active = 1 AND t.lvl < 10
             )
             SELECT t.lvl AS level, t.parent AS parentCode, t.child AS childCode, t.qty,
                    i.item_name AS childName, i.item_type AS childType
             FROM t LEFT JOIN item_master i ON i.item_code = t.child
             ORDER BY t.lvl, t.parent, t.child LIMIT 500`
      try {
        return db.prepare(sql).all(code) as SemimesBomExplodeRowDto[]
      } catch {
        return []
      }
    }
  )

  // ── ⑫ codeGroups — 코드관리 골격 조회 (34호 #4 · 코드 2단 스키마 미보유 — 기존 코드성 마스터 정직 표출) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_CODE_GROUPS, (): SemimesCodeGroupDto[] => {
    const safe = (sql: string): Array<{ code: string; name: string | null; active: number }> => {
      try {
        return db.prepare(sql).all() as Array<{ code: string; name: string | null; active: number }>
      } catch {
        return []
      }
    }
    return [
      {
        key: 'defect',
        label: '불량유형 (Q)',
        note: '0101 코어 — defect_type',
        codes: safe('SELECT code, name, active FROM defect_type ORDER BY code LIMIT 300')
      },
      {
        key: 'process',
        label: '공정 (D)',
        note: '0101 코어 — process_master',
        codes: safe('SELECT proc_code AS code, proc_name AS name, active FROM process_master ORDER BY proc_code LIMIT 300')
      },
      {
        key: 'itemType',
        label: '품목유형 (P)',
        note: 'item_master 유형 축(파생 — 편집은 품목 화면에서)',
        codes: safe("SELECT DISTINCT item_type AS code, NULL AS name, 1 AS active FROM item_master WHERE item_type IS NOT NULL ORDER BY code LIMIT 100")
      },
      {
        key: 'partnerType',
        label: '거래처유형 (M)',
        note: 'partner 유형 축(파생 — 편집은 거래처 화면에서)',
        codes: safe("SELECT DISTINCT partner_type AS code, NULL AS name, 1 AS active FROM partner WHERE partner_type IS NOT NULL ORDER BY code LIMIT 100")
      }
    ]
  })

  // ── ⑤ homeKpis — MES 홈 오늘 요약 4타일 (33호 §2-2 모듈 홈 대시보드 문법의 홈 적용) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_HOME_KPIS, (_e, req: { ymd?: string } | undefined): SemimesHomeKpisDto => {
    const ymd = req?.ymd && YMD.test(req.ymd) ? req.ymd : todayKST()
    const one = (sql: string): number => {
      try {
        return (db.prepare(sql).get(ymd) as { c: number }).c
      } catch {
        return 0
      }
    }
    return {
      ymd,
      prodCnt: one(`SELECT COUNT(*) c FROM prod_record WHERE record_date = ? AND canceled_at IS NULL`),
      okSum: one(`SELECT COALESCE(SUM(ok_qty),0) c FROM prod_record WHERE record_date = ? AND canceled_at IS NULL`),
      inspCnt: one(`SELECT COUNT(*) c FROM insp_record WHERE insp_date = ? AND canceled_at IS NULL`),
      confirmWait: one(
        `SELECT COUNT(*) c FROM insp_record WHERE insp_date = ? AND canceled_at IS NULL AND (confirmer IS NULL OR confirmer = '')`
      ),
      receiptCnt: one(`SELECT COUNT(*) c FROM mat_receipt WHERE receipt_date = ? AND canceled_at IS NULL`)
    }
  })
}
