import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { todayKST } from '@shared/date-kst'
import { getSqlite } from '../database/connection'
import type {
  SemimesHomeKpisDto,
  SemimesInspListReq,
  SemimesInspRowDto,
  SemimesInspValueRowDto,
  SemimesMatStockRowDto,
  SemimesProdAggRowDto,
  SemimesProdListReq,
  SemimesProdRowDto
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
