import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { extname, join } from 'path'
import type {
  SemimesCaptureContentV1,
  SemimesCaptureKind,
  SemimesCaptureListDto,
  SemimesCaptureRowDto,
  SemimesCaptureTagInput,
  SemimesItemDetailDto,
  SemimesItemSearchRowDto,
  SemimesSummaryDto,
  SemimesTreeDto,
  SemimesTreeEdgeDto
} from '@shared/ipc-types'

/**
 * 반(半)-MES 코어 조회 (15번 M0 — 품번 트리·마스터 요약).
 * 데이터 = 0101 코어스키마 (시드/갱신 = scripts/semimes-seed.cjs, TPC팩).
 * 전량이 수천 행 규모라 트리는 통째로 내려 렌더러가 조립한다(간선 2.7k ≈ 수십 KB).
 * 읽기전용 — 기록 5종의 쓰기 채널은 M1(현장 입력) 단계에서 별도 명세.
 */
export function registerSemimesHandlers(): void {
  const db = getSqlite()

  /** 0101 미적용 DB(설치판 구버전 등)에서 조회 시 안전 폴백 */
  function hasCore(): boolean {
    try {
      db.prepare('SELECT 1 FROM item_master LIMIT 1').get()
      return true
    } catch {
      return false
    }
  }

  ipcMain.handle(IPC_CHANNELS.SEMIMES_SUMMARY, (): SemimesSummaryDto => {
    if (!hasCore()) {
      return {
        items: 0, itemsByType: [], edgesActive: 0, edgesTotal: 0,
        routingSteps: 0, processes: 0, partners: 0, defectTypes: 0, lastImport: null
      }
    }
    const c = (sql: string): number => (db.prepare(sql).get() as { c: number }).c
    const lastRun = db
      .prepare('SELECT run_at, source, file_name, added, updated, deactivated, unchanged, items_new FROM bom_import_runs ORDER BY id DESC LIMIT 1')
      .get() as
      | { run_at: string; source: string; file_name: string | null; added: number; updated: number; deactivated: number; unchanged: number; items_new: number }
      | undefined
    return {
      items: c('SELECT COUNT(*) c FROM item_master WHERE active=1'),
      itemsByType: db
        .prepare('SELECT item_type AS type, COUNT(*) AS count FROM item_master WHERE active=1 GROUP BY item_type ORDER BY count DESC')
        .all() as { type: string; count: number }[],
      edgesActive: c('SELECT COUNT(*) c FROM bom_edge WHERE active=1'),
      edgesTotal: c('SELECT COUNT(*) c FROM bom_edge'),
      routingSteps: c('SELECT COUNT(*) c FROM routing_step WHERE active=1'),
      processes: c('SELECT COUNT(*) c FROM process_master WHERE active=1'),
      partners: c('SELECT COUNT(*) c FROM partner WHERE active=1'),
      defectTypes: c('SELECT COUNT(*) c FROM defect_type WHERE active=1'),
      lastImport: lastRun
        ? {
            runAt: lastRun.run_at,
            source: lastRun.source,
            fileName: lastRun.file_name,
            added: lastRun.added,
            updated: lastRun.updated,
            deactivated: lastRun.deactivated,
            unchanged: lastRun.unchanged,
            itemsNew: lastRun.items_new
          }
        : null
    }
  })

  ipcMain.handle(IPC_CHANNELS.SEMIMES_TREE, (): SemimesTreeDto => {
    if (!hasCore()) return { roots: [], edges: [], items: {} }
    const edges = db
      .prepare('SELECT parent_code AS parent, child_code AS child, qty, active, source FROM bom_edge')
      .all() as SemimesTreeEdgeDto[]
    const items: Record<string, [string, string]> = {}
    for (const r of db
      .prepare('SELECT item_code, item_type, source FROM item_master')
      .all() as { item_code: string; item_type: string; source: string | null }[]) {
      items[r.item_code] = [r.item_type, r.source ?? '']
    }
    // 루트 = 활성 간선 기준으로 부모이면서 누구의 자식도 아닌 품번
    const children = new Set<string>()
    const parents = new Set<string>()
    for (const e of edges) {
      if (!e.active) continue
      parents.add(e.parent)
      children.add(e.child)
    }
    const roots = [...parents].filter((p) => !children.has(p)).sort()
    return { roots, edges, items }
  })

  ipcMain.handle(IPC_CHANNELS.SEMIMES_ITEM, (_e, { itemCode }: { itemCode: string }): SemimesItemDetailDto | null => {
    if (!hasCore() || !itemCode) return null
    const row = db
      .prepare(
        `SELECT item_code, item_name, item_type, source, active, trace_gbn, inlotuse, out_yn, cust_pno1, car_type
         FROM item_master WHERE item_code = ?`
      )
      .get(itemCode) as
      | { item_code: string; item_name: string | null; item_type: string; source: string | null; active: number; trace_gbn: number; inlotuse: number; out_yn: number; cust_pno1: string | null; car_type: string | null }
      | undefined
    if (!row) return null
    const routing = db
      .prepare(
        `SELECT r.seq, r.proc_code AS procCode, p.proc_name AS procName, r.out_yn AS outYn
         FROM routing_step r LEFT JOIN process_master p ON p.proc_code = r.proc_code
         WHERE r.item_code = ? AND r.active = 1 ORDER BY r.seq`
      )
      .all(itemCode) as SemimesItemDetailDto['routing']
    const children = db
      .prepare('SELECT child_code AS code, qty, active FROM bom_edge WHERE parent_code = ? ORDER BY active DESC, child_code')
      .all(itemCode) as SemimesItemDetailDto['children']
    const usedBy = db
      .prepare('SELECT parent_code AS code, qty, active FROM bom_edge WHERE child_code = ? ORDER BY active DESC, parent_code')
      .all(itemCode) as SemimesItemDetailDto['usedBy']
    return {
      itemCode: row.item_code,
      itemName: row.item_name,
      itemType: row.item_type,
      source: row.source,
      active: row.active,
      traceGbn: row.trace_gbn,
      inlotuse: row.inlotuse,
      outYn: row.out_yn,
      custPno1: row.cust_pno1,
      carType: row.car_type,
      routing,
      children,
      usedBy
    }
  })

  registerCaptureInboxHandlers()
}

/**
 * G1 수집함 (29번 §8-⑥ 도장 · M1 견적 이행, 마이그 0136).
 * 방 1개 + 유형 태그(receipt_in|receipt_out) — 외주 왕복 계보를 끊지 않는다(M1 §0-3 실측).
 * 사진 1장 : 수불 N행(1:N) — 다품목 전표가 기본형(4장 중 3장 실측).
 * 출하는 mat_receipt 를 만들지 않는다 — content.items 가 유일 구조화(15번 경계 "수불부 금지").
 * 태깅완료 재태깅 거부 — 정정은 append-only 원칙(29번 §4)대로 후속 검수 트랙에서.
 */
function registerCaptureInboxHandlers(): void {
  const db = getSqlite()
  const RECEIPT_KINDS: SemimesCaptureKind[] = ['receipt_in', 'receipt_out']
  const capturesDir = (): string => {
    const dir = join(app.getPath('userData'), 'receipt-captures')
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    return dir
  }

  function hasInboxSchema(): boolean {
    try {
      db.prepare('SELECT capture_id FROM mat_receipt LIMIT 1').get()
      return true
    } catch {
      return false
    }
  }

  // ── 목록 + 숫자 밴드 + 태깅 폼 선택지 (읽기) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_CAPTURE_LIST, (): SemimesCaptureListDto => {
    if (!hasInboxSchema()) return { rows: [], untagged: 0, todayIn: 0, todayOut: 0, partners: [] }
    const partnerRows = db
      .prepare(`SELECT partner_code AS code, name, partner_type AS type FROM partner WHERE active = 1 AND partner_code IS NOT NULL ORDER BY name`)
      .all() as { code: string; name: string; type: string }[]
    const partnerName = new Map(partnerRows.map((p) => [p.code, p.name]))

    const raw = db
      .prepare(
        `SELECT c.id, c.kind, c.status, c.created_by, c.created_at, c.attached_path, c.content,
                (SELECT COUNT(*) FROM mat_receipt m WHERE m.capture_id = c.id) AS receipt_rows
         FROM raw_captures c
         WHERE c.kind IN ('receipt_in','receipt_out')
         ORDER BY c.created_at DESC LIMIT 500`
      )
      .all() as Array<{
      id: number
      kind: SemimesCaptureKind
      status: string
      created_by: string | null
      created_at: string
      attached_path: string | null
      content: string
      receipt_rows: number
    }>

    const rows: SemimesCaptureRowDto[] = raw.map((r) => {
      let parsed: Partial<SemimesCaptureContentV1> = {}
      try {
        parsed = JSON.parse(r.content) as Partial<SemimesCaptureContentV1>
      } catch {
        /* content 파손 — 요약 없이 표출(사진 원본이 증거) */
      }
      return {
        id: r.id,
        kind: r.kind,
        status: r.status === '태깅완료' ? '태깅완료' : '미분류',
        createdBy: r.created_by,
        createdAt: r.created_at,
        hasImage: !!r.attached_path,
        docDate: parsed.docDate ?? null,
        partnerCode: parsed.partnerCode ?? null,
        partnerName: parsed.partnerCode ? (partnerName.get(parsed.partnerCode) ?? null) : null,
        itemCount: Array.isArray(parsed.items) ? parsed.items.length : 0,
        receiptClass: parsed.receiptClass ?? null,
        receiptRows: r.receipt_rows
      }
    })

    const todayOf = (kind: SemimesCaptureKind): number =>
      (
        db
          .prepare(
            `SELECT COUNT(*) AS c FROM raw_captures
             WHERE kind = ? AND date(created_at, 'localtime') = date('now', 'localtime')`
          )
          .get(kind) as { c: number }
      ).c
    return {
      rows,
      untagged: rows.filter((r) => r.status === '미분류').length,
      todayIn: todayOf('receipt_in'),
      todayOut: todayOf('receipt_out'),
      partners: partnerRows
    }
  })

  // ── 사진 등록 (쓰기 — 유형은 버튼 선택, M1 §3 1차) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_CAPTURE_CREATE,
    (_e, req: { kind: SemimesCaptureKind; imageBase64: string; fileName?: string; createdBy?: string }) => {
      if (!hasInboxSchema()) return { success: false, error: '수집함 스키마(0136) 미적용 DB입니다.' }
      if (!RECEIPT_KINDS.includes(req?.kind)) return { success: false, error: '유형은 receipt_in|receipt_out 만 허용됩니다.' }
      const b64 = (req.imageBase64 || '').replace(/^data:image\/[a-z+]+;base64,/i, '')
      if (!b64) return { success: false, error: '사진 데이터가 비었습니다.' }
      if (b64.length > 9_000_000) return { success: false, error: '사진이 너무 큽니다(약 6MB 초과) — 촬영 화질을 낮춰 주세요.' }
      let buf: Buffer
      try {
        buf = Buffer.from(b64, 'base64')
      } catch {
        return { success: false, error: '사진 데이터 해석 실패(base64 아님).' }
      }
      if (buf.length < 100) return { success: false, error: '사진 데이터가 손상됐습니다.' }
      const ext = /^data:image\/png/i.test(req.imageBase64 || '') || (req.fileName || '').toLowerCase().endsWith('.png') ? '.png' : '.jpg'
      const name = `cap_${new Date().toISOString().replace(/[:.]/g, '-')}_${req.kind}${ext}`
      const filePath = join(capturesDir(), name)
      writeFileSync(filePath, buf)
      const content: SemimesCaptureContentV1 = { v: 1, docDate: '', partnerCode: '', items: [], note: '' }
      const info = db
        .prepare(
          `INSERT INTO raw_captures (kind, content, attached_path, status, created_by, created_at)
           VALUES (?, ?, ?, '미분류', ?, ?)`
        )
        .run(req.kind, JSON.stringify(content), filePath, req.createdBy ?? null, new Date().toISOString())
      return { success: true, id: Number(info.lastInsertRowid) }
    }
  )

  // ── 사진 열람 (읽기 — 웹·데스크톱 공통 data URL, 서버 정적 노출 없이 채널로만) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_CAPTURE_IMAGE, (_e, { id }: { id: number }): { dataUrl: string | null } => {
    const row = db
      .prepare(`SELECT attached_path FROM raw_captures WHERE id = ? AND kind IN ('receipt_in','receipt_out')`)
      .get(id) as { attached_path: string | null } | undefined
    if (!row?.attached_path || !existsSync(row.attached_path)) return { dataUrl: null }
    try {
      const buf = readFileSync(row.attached_path)
      const mime = extname(row.attached_path).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg'
      return { dataUrl: `data:${mime};base64,${buf.toString('base64')}` }
    } catch {
      return { dataUrl: null }
    }
  })

  // ── 태깅 저장 (쓰기 — 입고 = mat_receipt N행 + content, 출하 = content 만) ──
  ipcMain.handle(IPC_CHANNELS.SEMIMES_CAPTURE_TAG, (_e, req: SemimesCaptureTagInput) => {
    if (!hasInboxSchema()) return { success: false, error: '수집함 스키마(0136) 미적용 DB입니다.' }
    const cap = db
      .prepare(`SELECT id, kind, status FROM raw_captures WHERE id = ?`)
      .get(req?.captureId) as { id: number; kind: string; status: string } | undefined
    if (!cap || !RECEIPT_KINDS.includes(cap.kind as SemimesCaptureKind))
      return { success: false, error: '수집함 사진이 아닙니다.' }
    if (cap.status === '태깅완료')
      return { success: false, error: '이미 태깅완료된 사진입니다 — 정정은 취소+재등록(append-only)으로.' }
    if (!RECEIPT_KINDS.includes(req.kind)) return { success: false, error: '유형은 receipt_in|receipt_out 만 허용됩니다.' }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(req.docDate || '')) return { success: false, error: '전표 일자는 YYYY-MM-DD 형식이어야 합니다.' }
    const partner = db
      .prepare(`SELECT partner_code, partner_type FROM partner WHERE partner_code = ? AND active = 1`)
      .get(req.partnerCode) as { partner_code: string; partner_type: string } | undefined
    if (!partner) return { success: false, error: `거래처(${req.partnerCode})가 마스터에 없습니다.` }

    const items = Array.isArray(req.items) ? req.items : []
    if (items.length === 0) return { success: false, error: '품목이 최소 1행 필요합니다(다품목 전표 = 행 추가).' }
    const itemStmt = db.prepare(`SELECT item_code, inlotuse FROM item_master WHERE item_code = ? AND active = 1`)
    for (const it of items) {
      if (!it?.itemCode) return { success: false, error: '품번이 빈 행이 있습니다.' }
      if (!itemStmt.get(it.itemCode)) return { success: false, error: `품번(${it.itemCode})이 품목 마스터에 없습니다.` }
      if (!Number.isFinite(it.qty) || it.qty <= 0) return { success: false, error: `수량이 유효하지 않습니다(${it.itemCode}).` }
    }

    // 입고 구분: 입력값 우선, 없으면 partner_type 초안(자재공급처→원자재·외주처→외주재입고) — M1 §1
    let receiptClass: string | undefined
    if (req.kind === 'receipt_in') {
      receiptClass =
        req.receiptClass ||
        (partner.partner_type === '자재공급처' ? '원자재' : partner.partner_type === '외주처' ? '외주재입고' : undefined)
      if (receiptClass !== '원자재' && receiptClass !== '외주재입고')
        return { success: false, error: "입고 구분(원자재|외주재입고)을 지정해 주세요 — 거래처 유형으로 유도할 수 없습니다." }
    }

    const content: SemimesCaptureContentV1 = {
      v: 1,
      docDate: req.docDate,
      partnerCode: req.partnerCode,
      items: items.map((it) => ({ itemCode: it.itemCode, qty: it.qty, vendorLot: it.vendorLot?.trim() || null })),
      ...(req.kind === 'receipt_in' ? { receiptClass } : {}),
      note: (req.note || '').trim() // 단가·금액 기입 금지 — 사진 원본이 증거(M1 §2.5)
    }

    const receiptIds: number[] = []
    const insReceipt = db.prepare(
      `INSERT INTO mat_receipt (receipt_date, item_code, vendor_lot, internal_lot, partner_code, qty, note, created_by, capture_id, receipt_class)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    const updCapture = db.prepare(`UPDATE raw_captures SET kind = ?, content = ?, status = '태깅완료' WHERE id = ?`)
    db.transaction(() => {
      if (req.kind === 'receipt_in') {
        for (const it of content.items) {
          // 업체LOT 승계(INLOTUSE) 시에만 internal_lot = vendor_lot — 자체 발번은 PC 단계(lotIssue) 소관
          const im = itemStmt.get(it.itemCode) as { inlotuse: number }
          const internalLot = im.inlotuse === 1 && it.vendorLot ? it.vendorLot : null
          const info = insReceipt.run(
            content.docDate, it.itemCode, it.vendorLot, internalLot, content.partnerCode, it.qty,
            content.note || null, req.createdBy ?? null, cap.id, receiptClass
          )
          receiptIds.push(Number(info.lastInsertRowid))
        }
      }
      updCapture.run(req.kind, JSON.stringify(content), cap.id)
    })()
    return { success: true, receiptIds }
  })

  // ── 품번 검색 (읽기 — 태깅 폼용 경량 조회) ──
  ipcMain.handle(
    IPC_CHANNELS.SEMIMES_ITEM_SEARCH,
    (_e, { query, limit }: { query: string; limit?: number }): SemimesItemSearchRowDto[] => {
      const q = (query || '').trim()
      if (!q) return []
      const n = Math.min(Math.max(limit ?? 20, 1), 50)
      return db
        .prepare(
          `SELECT item_code AS itemCode, item_name AS itemName, item_type AS itemType
           FROM item_master WHERE active = 1 AND (item_code LIKE ? OR item_name LIKE ?)
           ORDER BY item_code LIMIT ?`
        )
        .all(`%${q}%`, `%${q}%`, n) as SemimesItemSearchRowDto[]
    }
  )
}
