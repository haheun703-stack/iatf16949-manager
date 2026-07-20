import Database from 'better-sqlite3'
import { app, ipcMain } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  MesRecordsCoverageDto,
  MesRecordsDayCell,
  MesRecordsDetailDto,
  MesRecordsPartRow,
  MesRecordsStatusDto,
  MesRecordsTypeStat
} from '@shared/ipc-types'

/**
 * MES 기록 현황 (7/20) — "기록이 들어왔는지/비었는지" 커버리지 판정.
 * 데이터 = 사이드카 mes_records.db (scripts/mes_records_build.py 가 덤프의
 * QMS_SQC 헤더+MAC_DESC 전량에서 일자×구분×품번(설비) 집계로 생성).
 * 라벨 해석은 본 DB mes_codes(0076): QC_GBN(W자주/I수입/P패트롤), WRKCTR(설비명).
 * 사이드카 운영은 mes_trace 와 동일(읽기전용·mtime 재오픈·주기 dmp 반입 시 재빌드).
 */

const MAC_KEY = 'MAC'
const MAC_LABEL = '설비 일상점검'
const DETAIL_ROWS_MAX = 200
const RECENT_DAYS = 30

let side: Database.Database | null = null
let sideMtime = 0
let sidePath = ''

function resolvePath(): string {
  const conf = getSqlite()
    .prepare("SELECT value FROM app_config WHERE key = 'mes.recordsDbPath'")
    .get() as { value: string } | undefined
  return conf?.value || join(app.getPath('userData'), 'mes_records.db')
}

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
    sidePath = p
    sideMtime = mtime
  }
  return side
}

function metaMap(db: Database.Database): Map<string, string> {
  return new Map(
    (db.prepare('SELECT key, value FROM meta').all() as Array<{ key: string; value: string }>).map((r) => [
      r.key,
      r.value
    ])
  )
}

/** 검사구분 라벨 — 본 DB mes_codes QC_GBN (없으면 원코드 그대로 정직 표시) */
function gbnLabel(sub: string): string {
  try {
    const r = getSqlite()
      .prepare("SELECT code_name FROM mes_codes WHERE main_code = 'QC_GBN' AND sub_code = ?")
      .get(sub) as { code_name: string } | undefined
    return r?.code_name || sub
  } catch {
    return sub
  }
}

/** 설비명 — 본 DB mes_codes WRKCTR */
function lineName(code: string): string | null {
  try {
    const r = getSqlite()
      .prepare("SELECT code_name FROM mes_codes WHERE main_code = 'WRKCTR' AND sub_code = ?")
      .get(code) as { code_name: string } | undefined
    return r?.code_name ?? null
  } catch {
    return null
  }
}

interface GbnStats {
  [gbn: string]: { items: number; first: string | null; last: string | null }
}

function typeStats(db: Database.Database): { types: MesRecordsTypeStat[]; dataEndYmd: string | null } {
  const meta = metaMap(db)
  const gbn = JSON.parse(meta.get('gbn_stats') ?? '{}') as GbnStats
  const mac = JSON.parse(meta.get('mac_stats') ?? 'null') as {
    items: number
    first: string | null
    last: string | null
  } | null
  const types: MesRecordsTypeStat[] = Object.entries(gbn)
    .sort((a, b) => b[1].items - a[1].items)
    .map(([key, s]) => ({ key, label: gbnLabel(key), totalItems: s.items, firstYmd: s.first, lastYmd: s.last }))
  if (mac) {
    types.push({ key: MAC_KEY, label: MAC_LABEL, totalItems: mac.items, firstYmd: mac.first, lastYmd: mac.last })
  }
  const dataEndYmd = types.reduce<string | null>((acc, t) => (t.lastYmd && (!acc || t.lastYmd > acc) ? t.lastYmd : acc), null)
  return { types, dataEndYmd }
}

function ymdAdd(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}

export function registerMesRecordsHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.MES_RECORDS_STATUS, (): MesRecordsStatusDto => {
    const p = resolvePath()
    const db = openSide()
    if (!db) {
      return { available: false, path: p, builtAt: null, sourceDmp: null, dataEndYmd: null, futureRows: 0, types: [] }
    }
    const meta = metaMap(db)
    const { types, dataEndYmd } = typeStats(db)
    const future = JSON.parse(meta.get('future_rows') ?? '{}') as { sqc?: number; mac?: number }
    return {
      available: true,
      path: p,
      builtAt: meta.get('built_at') ?? null,
      sourceDmp: meta.get('source_dmp') ?? null,
      dataEndYmd,
      futureRows: (future.sqc ?? 0) + (future.mac ?? 0),
      types
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.MES_RECORDS_COVERAGE,
    (_e, req: { days?: number }): MesRecordsCoverageDto => {
      const db = openSide()
      if (!db) return { days: 0, dataEndYmd: null, strips: [] }
      const { types, dataEndYmd } = typeStats(db)
      const days = Math.min(Math.max(req?.days ?? 30, 7), 90)
      const end = dataEndYmd ?? ymdAdd(new Date().toISOString().slice(0, 10), 0)
      const start = ymdAdd(end, -(days - 1))

      const sqcRows = db
        .prepare(
          `SELECT ymd, qcgubun, SUM(items) items, COUNT(DISTINCT pno) parts
           FROM sqc_daily WHERE ymd >= ? AND ymd <= ? GROUP BY ymd, qcgubun`
        )
        .all(start, end) as Array<{ ymd: string; qcgubun: string; items: number; parts: number }>
      const macRows = db
        .prepare(
          `SELECT ymd, SUM(items) items, COUNT(DISTINCT line_no) parts
           FROM mac_daily WHERE ymd >= ? AND ymd <= ? GROUP BY ymd`
        )
        .all(start, end) as Array<{ ymd: string; items: number; parts: number }>

      const byType = new Map<string, Map<string, { items: number; parts: number }>>()
      for (const r of sqcRows) {
        if (!byType.has(r.qcgubun)) byType.set(r.qcgubun, new Map())
        byType.get(r.qcgubun)!.set(r.ymd, { items: r.items, parts: r.parts })
      }
      byType.set(MAC_KEY, new Map(macRows.map((r) => [r.ymd, { items: r.items, parts: r.parts }])))

      const allDays: string[] = []
      for (let i = 0; i < days; i++) allDays.push(ymdAdd(start, i))

      const strips = types.map((t) => {
        const m = byType.get(t.key) ?? new Map<string, { items: number; parts: number }>()
        const cells: MesRecordsDayCell[] = allDays.map((ymd) => {
          const v = m.get(ymd)
          return { ymd, items: v?.items ?? 0, parts: v?.parts ?? 0 }
        })
        return { key: t.key, label: t.label, cells }
      })
      return { days, dataEndYmd, strips }
    }
  )

  ipcMain.handle(IPC_CHANNELS.MES_RECORDS_DETAIL, (_e, req: { key: string }): MesRecordsDetailDto | null => {
    const db = openSide()
    if (!db || !req?.key) return null
    const { types, dataEndYmd } = typeStats(db)
    const t = types.find((x) => x.key === req.key)
    if (!t || !dataEndYmd) return null
    const recentStart = ymdAdd(dataEndYmd, -(RECENT_DAYS - 1))

    if (req.key === MAC_KEY) {
      const rows = (
        db
          .prepare(`SELECT line_no, first_ymd, last_ymd, total_items, active_days FROM mac_lines`)
          .all() as Array<{ line_no: string; first_ymd: string; last_ymd: string; total_items: number; active_days: number }>
      )
        .map<MesRecordsPartRow>((r) => ({
          pno: r.line_no,
          name: lineName(r.line_no),
          firstYmd: r.first_ymd,
          lastYmd: r.last_ymd,
          totalItems: r.total_items,
          activeDays: r.active_days,
          staleDays: daysBetween(r.last_ymd, dataEndYmd)
        }))
        .sort((a, b) => b.staleDays - a.staleDays)
        .slice(0, DETAIL_ROWS_MAX)
      const recent = (
        db
          .prepare(
            `SELECT ymd, SUM(items) items, COUNT(DISTINCT line_no) parts, SUM(checkers) inspectors,
                    SUM(confirmed_items) confirmed, SUM(items) total
             FROM mac_daily WHERE ymd >= ? GROUP BY ymd ORDER BY ymd DESC`
          )
          .all(recentStart) as Array<{ ymd: string; items: number; parts: number; inspectors: number; confirmed: number; total: number }>
      ).map((r) => ({
        ymd: r.ymd,
        items: r.items,
        parts: r.parts,
        inspectors: r.inspectors,
        confirmedPct: r.total > 0 ? Math.round((r.confirmed / r.total) * 100) : null
      }))
      return { key: t.key, label: t.label, rows, recent }
    }

    const rows = (
      db
        .prepare(
          `SELECT pno, pname, first_ymd, last_ymd, total_items, active_days
           FROM sqc_parts WHERE qcgubun = ?`
        )
        .all(req.key) as Array<{ pno: string; pname: string | null; first_ymd: string; last_ymd: string; total_items: number; active_days: number }>
    )
      .map<MesRecordsPartRow>((r) => ({
        pno: r.pno,
        name: r.pname || null,
        firstYmd: r.first_ymd,
        lastYmd: r.last_ymd,
        totalItems: r.total_items,
        activeDays: r.active_days,
        staleDays: daysBetween(r.last_ymd, dataEndYmd)
      }))
      .sort((a, b) => b.staleDays - a.staleDays)
      .slice(0, DETAIL_ROWS_MAX)
    const recent = (
      db
        .prepare(
          `SELECT ymd, SUM(items) items, COUNT(DISTINCT pno) parts, SUM(inspectors) inspectors
           FROM sqc_daily WHERE qcgubun = ? AND ymd >= ? GROUP BY ymd ORDER BY ymd DESC`
        )
        .all(req.key, recentStart) as Array<{ ymd: string; items: number; parts: number; inspectors: number }>
    ).map((r) => ({ ymd: r.ymd, items: r.items, parts: r.parts, inspectors: r.inspectors, confirmedPct: null }))
    return { key: t.key, label: t.label, rows, recent }
  })
}
