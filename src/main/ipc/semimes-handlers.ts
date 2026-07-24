import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  SemimesItemDetailDto,
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
}
