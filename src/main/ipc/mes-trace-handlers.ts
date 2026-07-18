import Database from 'better-sqlite3'
import { app, ipcMain } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  MesTraceDirectionDto,
  MesTraceExpandDto,
  MesTraceLevelDto,
  MesTraceLotDto,
  MesTraceStatusDto
} from '@shared/ipc-types'

/**
 * LOT 계보 조회 (7/19 Scan-to-Trace) — MES POP_TRACE 328만 링크의 정·역추적.
 * 데이터 = 사이드카 mes_trace.db (scripts/mes_trace_build.py 가 덤프에서 생성).
 * 본 DB에 넣지 않는 이유: 수백 MB — 마이그레이션 스냅샷·백업 비대화 방지.
 * 경로: app_config 'mes.traceDbPath' > <userData>/mes_trace.db 기본.
 * 읽기전용 + 파일 mtime 변경 시 자동 재오픈(주기적 dmp 반입 시 앱 재시작 불필요).
 */

const MAX_DEPTH = 10
/** 방향당 전개 상한 — UI 응답 크기 가드(초과분은 truncated 로 정직 표기) */
const MAX_NODES = 3000
/** 단계당 표시 상한 */
const LEVEL_DISPLAY_MAX = 100
const SEARCH_LIMIT = 30

let side: Database.Database | null = null
let sideMtime = 0
let sidePath = ''

function resolvePath(): string {
  const conf = getSqlite()
    .prepare("SELECT value FROM app_config WHERE key = 'mes.traceDbPath'")
    .get() as { value: string } | undefined
  return conf?.value || join(app.getPath('userData'), 'mes_trace.db')
}

/** 사이드카 열기 — 없으면 null. mtime 이 바뀌면 재오픈. */
function openSide(): Database.Database | null {
  const p = resolvePath()
  if (!existsSync(p)) {
    if (side) {
      side.close()
      side = null
    }
    return null
  }
  const mtime = statSync(p).mtimeMs
  if (side && (p !== sidePath || mtime !== sideMtime)) {
    side.close()
    side = null
  }
  if (!side) {
    side = new Database(p, { readonly: true, fileMustExist: true })
    side.pragma('case_sensitive_like = ON') // 접두 LIKE 가 인덱스를 타도록
    sidePath = p
    sideMtime = mtime
  }
  return side
}

const LOT_COLS = 'id, barcode, lotseq, pno, addymd, gbn, qty'

function walkDirection(db: Database.Database, startId: number, downward: boolean): MesTraceDirectionDto {
  const [fromCol, toCol] = downward ? ['parent_id', 'child_id'] : ['child_id', 'parent_id']
  const t0 = performance.now()
  // (id, depth) UNION 이 사이클을 depth 상한 안에서 흡수 — 노드별 최단 depth 로 집계
  const rows = db
    .prepare(
      `WITH RECURSIVE walk(id, depth) AS (
         SELECT ?, 0
         UNION
         SELECT e.${toCol}, w.depth + 1 FROM edges e JOIN walk w ON e.${fromCol} = w.id
         WHERE w.depth < ?
       )
       SELECT l.id, l.barcode, l.lotseq, l.pno, l.addymd, l.gbn, l.qty, MIN(w.depth) AS depth
       FROM walk w JOIN lots l ON l.id = w.id
       WHERE w.depth > 0
       GROUP BY l.id
       ORDER BY depth, l.addymd
       LIMIT ?`
    )
    .all(startId, MAX_DEPTH, MAX_NODES + 1) as Array<MesTraceLotDto & { depth: number }>
  const ms = Math.round((performance.now() - t0) * 10) / 10

  const truncated = rows.length > MAX_NODES
  if (truncated) rows.pop()

  const byDepth = new Map<number, MesTraceLotDto[]>()
  for (const r of rows) {
    const { depth, ...lot } = r
    const arr = byDepth.get(depth)
    if (arr) arr.push(lot)
    else byDepth.set(depth, [lot])
  }
  const levels: MesTraceLevelDto[] = [...byDepth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([depth, lots]) => ({ depth, count: lots.length, lots: lots.slice(0, LEVEL_DISPLAY_MAX) }))

  return { levels, total: rows.length, ms, truncated }
}

export function registerMesTraceHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MES_TRACE_STATUS, (): MesTraceStatusDto => {
    const p = resolvePath()
    const db = openSide()
    if (!db) {
      return {
        available: false,
        path: p,
        builtAt: null,
        sourceDmp: null,
        lotCount: 0,
        edgeCount: 0,
        yearRange: null
      }
    }
    const meta = new Map(
      (db.prepare('SELECT key, value FROM meta').all() as Array<{ key: string; value: string }>).map((r) => [
        r.key,
        r.value
      ])
    )
    const yMin = meta.get('trace_year_min')
    const yMax = meta.get('trace_year_max')
    return {
      available: true,
      path: p,
      builtAt: meta.get('built_at') ?? null,
      sourceDmp: meta.get('source_dmp') ?? null,
      lotCount: Number(meta.get('lot_rows') ?? 0),
      edgeCount: Number(meta.get('edge_rows') ?? 0),
      yearRange: yMin && yMax ? `${yMin}~${yMax}` : null
    }
  })

  ipcMain.handle(IPC_CHANNELS.MES_TRACE_SEARCH, (_e, req: { query: string }): MesTraceLotDto[] => {
    const db = openSide()
    const q = (req?.query ?? '').trim().toUpperCase()
    if (!db || q.length < 2) return []
    const pattern = `${q.replace(/[%_]/g, '')}%`
    const byBarcode = db
      .prepare(
        `SELECT ${LOT_COLS} FROM lots WHERE barcode LIKE ? ORDER BY addymd IS NULL, addymd DESC LIMIT ?`
      )
      .all(pattern, SEARCH_LIMIT) as MesTraceLotDto[]
    const byPno = db
      .prepare(`SELECT ${LOT_COLS} FROM lots WHERE pno LIKE ? ORDER BY addymd IS NULL, addymd DESC LIMIT ?`)
      .all(pattern, SEARCH_LIMIT) as MesTraceLotDto[]
    const seen = new Set<number>()
    const merged: MesTraceLotDto[] = []
    for (const r of [...byBarcode, ...byPno]) {
      if (seen.has(r.id)) continue
      seen.add(r.id)
      merged.push(r)
    }
    merged.sort((a, b) => (b.addymd ?? '').localeCompare(a.addymd ?? ''))
    return merged.slice(0, SEARCH_LIMIT)
  })

  ipcMain.handle(IPC_CHANNELS.MES_TRACE_EXPAND, (_e, req: { lotId: number }): MesTraceExpandDto | null => {
    const db = openSide()
    if (!db || typeof req?.lotId !== 'number') return null
    const start = db.prepare(`SELECT ${LOT_COLS} FROM lots WHERE id = ?`).get(req.lotId) as
      | MesTraceLotDto
      | undefined
    if (!start) return null
    return {
      start,
      up: walkDirection(db, start.id, false),
      down: walkDirection(db, start.id, true)
    }
  })
}
