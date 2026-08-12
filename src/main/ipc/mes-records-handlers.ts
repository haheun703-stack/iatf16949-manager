import Database from 'better-sqlite3'
import { app, ipcMain } from 'electron'
import { existsSync, statSync } from 'fs'
import { join } from 'path'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { todayKST } from '@shared/date-kst'
import { getSqlite } from '../database/connection'
import type {
  MesPartProcessDto,
  MesPartProcessRow,
  MesProcessLiveCol,
  MesProcessLiveDto,
  MesProcessStatus,
  MesRecordsCoverageDto,
  MesRecordsDayCell,
  MesRecordsDetailDto,
  MesRecordsPartRow,
  MesRecordsStatusDto,
  MesRecordsTypeStat,
  SqAuditCellDto,
  SqAuditMark,
  SqAuditMatrixDto,
  SqAuditRowDto
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

// ===== P1 ⓑ 공정 실황(커버리지) — WRKCTR↔공정 상수 매핑 (25번 §3, "별도 엔진 금지") =====
// 열 = 실측 7공정(목업 각주 "공정은 실측" 이행 — WRKCTR 전수 판독 260731 기준).
// 포장·출하는 MES 원천 없음(수불·출하대장 = ⓒ·P3 영역) — 원천 생기면 열 추가(가짜 숫자 금지).
const PROC_COLUMNS: Array<{ key: string; label: string }> = [
  { key: 'incoming', label: '수입검사' },
  { key: 'cutform', label: '절단·성형' },
  { key: 'bending', label: '밴딩' },
  { key: 'welding', label: '용접·가접' },
  { key: 'brazing', label: '브레이징' },
  { key: 'assembly', label: '조립·압입' },
  { key: 'leak', label: '리크검사' }
]

/**
 * W계열(공정 코드) 정확 일치 매핑 — WRKCTR 코드표상 W1~W18.
 * ⚠️ 실데이터 사용 0건(260731 실측: sqc_daily·mac_daily 모두 정확일치 0) — line_no 에는
 * 공정 코드가 아니라 설비 코드(WM*·RSP*·J* 등)가 들어온다. 표가 바뀔 때를 대비해 남겨둠.
 */
const W_MAP: Record<string, string> = {
  W1: 'cutform', W2: 'cutform', W3: 'bending', W4: 'bending', W5: 'incoming',
  W6: 'cutform', W7: 'welding', W8: 'assembly', W10: 'leak', W11: 'assembly',
  W12: 'cutform', W13: 'cutform', W14: 'cutform', W15: 'brazing', W16: 'welding',
  W17: 'welding', W18: 'welding'
}

/** 설비 프리픽스 매핑 — 긴 프리픽스 우선(RSP 가 RB 보다 먼저) */
const PREFIX_MAP: Array<[string, string]> = [
  // WM* = 스폿/자동스폿/로봇스폿 용접기 11종(mes_codes WRKCTR 대조 확인, 260731).
  // 누락 시 용접·가접 열이 검사 4,388키(78,466항목)·설비점검 2,263키만큼 축소 집계된다.
  ['WM', 'welding'],
  ['RSP', 'welding'], ['RBB', 'brazing'], ['RB', 'brazing'], ['RO', 'brazing'],
  ['LK', 'leak'], ['BPM', 'bending'], ['PB', 'bending'], ['SB', 'bending'],
  ['UTO', 'welding'], ['TOB', 'welding'], ['TO', 'welding'], ['SP', 'welding'],
  ['GA', 'welding'], ['SZ', 'welding'], ['J', 'assembly'], ['OB', 'assembly'],
  ['MT', 'assembly'], ['KO', 'assembly'], ['FO', 'cutform'], ['CG', 'cutform'],
  ['EB', 'cutform'], ['PI', 'cutform'], ['CT', 'cutform'], ['AS', 'cutform']
]

function procOf(lineNo: string | null): string | null {
  if (!lineNo) return null
  const code = lineNo.trim().toUpperCase()
  if (!code || code.startsWith('$') || code.startsWith('ZZ') || code.startsWith('TEST')) return null
  if (W_MAP[code]) return W_MAP[code]
  for (const [pre, proc] of PREFIX_MAP) if (code.startsWith(pre)) return proc
  return null
}

/** 앱 작성 기록 → 공정 매핑(대표 양식 코드 프리픽스 — 최소 상수, 확장은 후속) */
const FORM_PROC: Array<[string, string]> = [
  ['L2100-07', 'incoming'], // 수입검사 관리대장
  ['L2100-01', 'incoming'] // 수입검사표준(-AM)
]

/** 공백 판정 임계 — 마지막 기록이 데이터 끝 대비 2일 이상 뒤처지면 '공백' */
const GAP_THRESHOLD = 2

// ===== PB2 ⓒ SQ 심사 뷰 — SQ 항목 행 축(최소 상수, FORM_PROC 선례) =====
// kind = 원천 연결: W자주 / P패트롤 / I수입 / MAC설비점검 / S출하(원천 존재 시 실데이터로) /
// LOT = 공정축 원천 없음(v1 전열 '—' 정직 — PC 단계 lot_no 동반부터 실측).
const SQ_AUDIT_ROWS: Array<{ sqItem: string; title: string; formCode: string; kind: string }> = [
  { sqItem: '1_4', title: '자주검사 초·중·종', formCode: 'M1200-10', kind: 'W' },
  { sqItem: '2_7', title: '자주/순회 체크시트', formCode: 'L2100-05', kind: 'P' },
  { sqItem: '5_1', title: 'LOT 추적성', formCode: 'M2100-10', kind: 'LOT' },
  { sqItem: '3_1', title: '설비 일상점검', formCode: 'L1100-07', kind: 'MAC' },
  { sqItem: '2_1', title: '수입검사', formCode: 'L2100-07', kind: 'I' },
  { sqItem: '2_8', title: '출하검사 성적서', formCode: 'M3100-05', kind: 'S' }
]

/** 배치⑶ #18 — 창 내 조업달력 조회(0139). 등록 행이 1건이라도 있으면 달력이 분모의 정본.
 *  반환: 등록 없으면 null(종전 프록시 유지 — 미등록 구간 가짜 분모 금지·정직 표기는 DTO 플래그로). */
function calendarWorkDays(windowStart: string, windowEnd: string): Set<string> | null {
  try {
    const rows = getSqlite()
      .prepare(`SELECT ymd, work_type FROM work_calendar WHERE ymd >= ? AND ymd <= ?`)
      .all(windowStart, windowEnd) as Array<{ ymd: string; work_type: string }>
    if (rows.length === 0) return null
    return new Set(rows.filter((r) => r.work_type === '조업').map((r) => r.ymd))
  } catch {
    return null // 미마이그 DB 방어(0137/0138 선례)
  }
}

export function registerMesRecordsHandlers(): void {
  // P1 ⓑ 공정 실황(커버리지 모드) — 사이드카(sqc/mac) + 앱 작성 기록 결합, 신규 테이블 0
  ipcMain.handle(IPC_CHANNELS.MES_RECORDS_PROCESS_LIVE, (_e, req: { ymd?: string }): MesProcessLiveDto => {
    const ymd = req?.ymd || todayKST()
    const db = openSide()
    const dataEndYmd = db ? typeStats(db).dataEndYmd : null

    type Agg = { todayRecords: number; todayItems: number; todayForms: number; lastYmd: string | null; sources: Set<string> }
    const agg = new Map<string, Agg>()
    for (const c of PROC_COLUMNS) {
      agg.set(c.key, { todayRecords: 0, todayItems: 0, todayForms: 0, lastYmd: null, sources: new Set() })
    }
    // PB2 ⓑ 도넛 % — 최근 7일 창(끝 = min(요청일, 데이터 끝)). 분모 = 창 안에서 어느
    // 공정이든 기록이 있던 날(가동일 프록시), 분자 = 공정별 기록일. 가짜 분모 금지.
    const windowEnd = dataEndYmd && dataEndYmd < ymd ? dataEndYmd : ymd
    const windowStart = ymdAdd(windowEnd, -6)
    const weekDaysAll = new Set<string>()
    const weekDaysByProc = new Map<string, Set<string>>()
    for (const c of PROC_COLUMNS) weekDaysByProc.set(c.key, new Set())
    if (db) {
      // M-6: 전 이력 풀스캔 → SQL 집계 3종(오늘분·MAX 최종일·7일 창) — 덤프 누적에도 로딩 상수화.
      // 수입검사(I) = line 무관 열 귀속 · 자주(W)/패트롤(P) = line_no(WRKCTR)로 공정 귀속(기존 규칙 유지)
      const sqcProc = (g: string, line: string | null): string | null => (g === 'I' ? 'incoming' : procOf(line))
      for (const r of db
        .prepare(`SELECT qcgubun, line_no, COUNT(*) cnt, COALESCE(SUM(items),0) items FROM sqc_daily WHERE ymd = ? GROUP BY qcgubun, line_no`)
        .all(ymd) as Array<{ qcgubun: string; line_no: string | null; cnt: number; items: number }>) {
        const a = agg.get(sqcProc(r.qcgubun, r.line_no) ?? '')
        if (a) {
          a.todayRecords += r.cnt
          a.todayItems += r.items
        }
      }
      for (const r of db
        .prepare(`SELECT qcgubun, line_no, MAX(ymd) last FROM sqc_daily GROUP BY qcgubun, line_no`)
        .all() as Array<{ qcgubun: string; line_no: string | null; last: string }>) {
        const a = agg.get(sqcProc(r.qcgubun, r.line_no) ?? '')
        if (!a) continue
        a.sources.add(`MES ${gbnLabel(r.qcgubun)}`) // 원천 = 전체 이력 기준
        if (!a.lastYmd || r.last > a.lastYmd) a.lastYmd = r.last
      }
      for (const r of db
        .prepare(`SELECT DISTINCT ymd, qcgubun, line_no FROM sqc_daily WHERE ymd >= ? AND ymd <= ?`)
        .all(windowStart, windowEnd) as Array<{ ymd: string; qcgubun: string; line_no: string | null }>) {
        const proc = sqcProc(r.qcgubun, r.line_no)
        if (!proc || !agg.has(proc)) continue
        weekDaysAll.add(r.ymd)
        weekDaysByProc.get(proc)?.add(r.ymd)
      }
      for (const r of db
        .prepare(`SELECT line_no, COUNT(*) cnt, COALESCE(SUM(items),0) items FROM mac_daily WHERE ymd = ? GROUP BY line_no`)
        .all(ymd) as Array<{ line_no: string | null; cnt: number; items: number }>) {
        const a = agg.get(procOf(r.line_no) ?? '')
        if (a) {
          a.todayRecords += r.cnt
          a.todayItems += r.items
        }
      }
      for (const r of db
        .prepare(`SELECT line_no, MAX(ymd) last FROM mac_daily GROUP BY line_no`)
        .all() as Array<{ line_no: string | null; last: string }>) {
        const a = agg.get(procOf(r.line_no) ?? '')
        if (!a) continue
        a.sources.add('MES 설비점검')
        if (!a.lastYmd || r.last > a.lastYmd) a.lastYmd = r.last
      }
      for (const r of db
        .prepare(`SELECT DISTINCT ymd, line_no FROM mac_daily WHERE ymd >= ? AND ymd <= ?`)
        .all(windowStart, windowEnd) as Array<{ ymd: string; line_no: string | null }>) {
        const proc = procOf(r.line_no)
        if (!proc || !agg.has(proc)) continue
        weekDaysAll.add(r.ymd)
        weekDaysByProc.get(proc)?.add(r.ymd)
      }
    }

    // 앱 작성 기록 — 공정 매핑 양식만(최소 상수), 실시간 원천. 7일 창 = 도넛 % 겸용.
    try {
      const rows = getSqlite()
        .prepare(
          `SELECT date(created_at, 'localtime') d, form_code, COUNT(*) n FROM form_submissions
           WHERE date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?
           GROUP BY d, form_code`
        )
        .all(windowStart < ymd ? windowStart : ymd, ymd) as Array<{ d: string; form_code: string; n: number }>
      for (const r of rows) {
        const hit = FORM_PROC.find(([pre]) => r.form_code.startsWith(pre))
        if (!hit) continue
        const a = agg.get(hit[1])
        if (!a) continue
        if (r.d === ymd) {
          a.todayForms += r.n
          a.todayRecords += r.n
        }
        // lastYmd 는 창 내 어떤 날이든 갱신(8/6 검수 Minor: "오늘만 갱신" 모순 해소)
        if (!a.lastYmd || r.d > a.lastYmd) a.lastYmd = r.d
        a.sources.add('앱 작성')
        if (r.d >= windowStart && r.d <= windowEnd) {
          weekDaysAll.add(r.d)
          weekDaysByProc.get(hit[1])?.add(r.d)
        }
      }
    } catch {
      /* form_submissions 조회 실패 시 MES 원천만 표시(정직 축소) */
    }

    // 배치⑶ #18 분모 정밀화: 창 내 달력 등록이 있으면 분모 = 조업일(정본) · 분자 = 그 조업일과의
    // 교집합(휴무일 특근 기록은 %에서 제외 — 모순 표식은 조업달력 화면 몫). 미등록 = 종전 프록시.
    const calDays = calendarWorkDays(windowStart, windowEnd)
    const denomDays = calDays ?? weekDaysAll
    const columns: MesProcessLiveCol[] = PROC_COLUMNS.map((c) => {
      const a = agg.get(c.key)!
      const gapDays = a.lastYmd && dataEndYmd ? daysBetween(a.lastYmd, dataEndYmd) : null
      let status: MesProcessStatus
      if (a.todayRecords > 0) status = 'active'
      else if (!db || a.lastYmd == null) status = 'nosource'
      else if (dataEndYmd && ymd > dataEndYmd) status = 'stale' // 덤프 미반입 구간 — 회색 정직
      else if (gapDays != null && gapDays >= GAP_THRESHOLD) status = 'gap'
      else status = 'stale'
      const procSet = weekDaysByProc.get(c.key) ?? new Set<string>()
      const procDays = calDays ? [...procSet].filter((d) => calDays.has(d)).length : procSet.size
      return {
        key: c.key,
        label: c.label,
        todayRecords: a.todayRecords,
        todayItems: a.todayItems,
        todayForms: a.todayForms,
        lastYmd: a.lastYmd,
        gapDays,
        status,
        source: a.sources.size > 0 ? [...a.sources].join('+') : '—',
        weekPct: denomDays.size > 0 ? Math.round((procDays / denomDays.size) * 100) : null
      }
    })
    return { ymd, dataEndYmd, available: !!db, columns, denomSource: calDays ? 'calendar' : 'proxy' }
  })

  // ── PB2 ⓒ SQ 심사 뷰 (30번 v2 하단부) — SQ 항목 × 공정 ●◐×, 실측만 ──
  // 창 = 도넛과 동일(끝 = min(오늘, 데이터 끝), 7일). 분모 = 창 내 가동일(전사 기록일).
  // ● = 가동일 전부 기록 · ◐ = 일부 · × = 대상(이력 있음)인데 창 내 0 · — = 비대상(이력 원천 없음).
  // 갭 ＋행 = pack_forms 'iatf-gap'(0135 시드 — 조항 확장은 데이터 행 추가로만) → 근거 양식
  // 작성 기록(전사 축)으로 판정. 렌더러가 아니라 여기서 전부 계산 — 렌더러 무수정 원칙 계열.
  ipcMain.handle(IPC_CHANNELS.SQ_AUDIT_MATRIX, (_e, req: { ymd?: string; days?: number } | undefined): SqAuditMatrixDto => {
    const ymd = req?.ymd || todayKST()
    const db = openSide()
    const dataEndYmd = db ? typeStats(db).dataEndYmd : null
    const windowEnd = dataEndYmd && dataEndYmd < ymd ? dataEndYmd : ymd
    // 기간 칩(ⓔ — 4차 노트 §2): 7/14/30일. 기본 7일(도넛과 동일 창)
    const days = Math.min(Math.max(req?.days ?? 7, 7), 30)
    const windowStart = ymdAdd(windowEnd, -(days - 1))
    const columns = PROC_COLUMNS.map((c) => ({ key: c.key, label: c.label }))

    const kkey = (proc: string, kind: string): string => `${proc}|${kind}`
    const everLast = new Map<string, string>() // proc|kind → 최근 기록일(전체 이력)
    const winDays = new Map<string, Set<string>>() // proc|kind → 창 내 기록일
    const opDaysSet = new Set<string>() // 창 내 가동일(전사)
    const seen = (proc: string | null, kind: string, ymd0: string): void => {
      if (!proc) return
      const k = kkey(proc, kind)
      const last = everLast.get(k)
      if (!last || ymd0 > last) everLast.set(k, ymd0)
      if (ymd0 >= windowStart && ymd0 <= windowEnd) {
        opDaysSet.add(ymd0)
        let s = winDays.get(k)
        if (!s) winDays.set(k, (s = new Set()))
        s.add(ymd0)
      }
    }
    if (db) {
      // M-6: 전 이력 풀스캔 → MAX/GROUP BY(everLast) + 창 한정 DISTINCT(winDays) 2단 SQL
      const sqcProc = (g: string, line: string | null): string | null => (g === 'I' ? 'incoming' : procOf(line))
      const everOnly = (proc: string | null, kind: string, last: string): void => {
        if (!proc) return
        const k = kkey(proc, kind)
        const cur = everLast.get(k)
        if (!cur || last > cur) everLast.set(k, last)
      }
      for (const r of db
        .prepare(`SELECT qcgubun, line_no, MAX(ymd) last FROM sqc_daily GROUP BY qcgubun, line_no`)
        .all() as Array<{ qcgubun: string; line_no: string | null; last: string }>) {
        everOnly(sqcProc(r.qcgubun, r.line_no), r.qcgubun, r.last)
      }
      for (const r of db
        .prepare(`SELECT line_no, MAX(ymd) last FROM mac_daily GROUP BY line_no`)
        .all() as Array<{ line_no: string | null; last: string }>) {
        everOnly(procOf(r.line_no), 'MAC', r.last)
      }
      for (const r of db
        .prepare(`SELECT DISTINCT ymd, qcgubun, line_no FROM sqc_daily WHERE ymd >= ? AND ymd <= ?`)
        .all(windowStart, windowEnd) as Array<{ ymd: string; qcgubun: string; line_no: string | null }>) {
        seen(sqcProc(r.qcgubun, r.line_no), r.qcgubun, r.ymd)
      }
      for (const r of db
        .prepare(`SELECT DISTINCT ymd, line_no FROM mac_daily WHERE ymd >= ? AND ymd <= ?`)
        .all(windowStart, windowEnd) as Array<{ ymd: string; line_no: string | null }>) {
        seen(procOf(r.line_no), 'MAC', r.ymd)
      }
    }
    // 앱 작성 기록도 원천(수입검사 매핑분 — P1b 커버리지 매핑과 동형)
    const main = getSqlite()
    try {
      const rows = main
        .prepare(
          `SELECT date(created_at, 'localtime') d, form_code FROM form_submissions
           WHERE date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?`
        )
        .all(windowStart, windowEnd) as Array<{ d: string; form_code: string }>
      for (const r of rows) {
        const hit = FORM_PROC.find(([pre]) => r.form_code.startsWith(pre))
        if (hit) seen(hit[1], 'I', r.d)
      }
      // everLast 는 창 밖 이력도 반영(8/6 검수 Minor: 창 한정 → '—' 오표기) — MAX/GROUP BY 1passes
      for (const r of main
        .prepare(`SELECT form_code, MAX(date(created_at, 'localtime')) last FROM form_submissions GROUP BY form_code`)
        .all() as Array<{ form_code: string; last: string | null }>) {
        const hit = r.last ? FORM_PROC.find(([pre]) => r.form_code.startsWith(pre)) : null
        if (!hit) continue
        const k = kkey(hit[1], 'I')
        const cur = everLast.get(k)
        if (!cur || r.last! > cur) everLast.set(k, r.last!)
      }
    } catch {
      /* 앱 기록 조회 실패 — MES 원천만(정직 축소) */
    }
    // 배치⑶ #18 분모 정밀화: 달력 등록 창이면 분모 = 조업일 · 셀 분자 = 조업일 교집합(도넛과 동일 규칙)
    const calDays = calendarWorkDays(windowStart, windowEnd)
    const opDays = calDays ? calDays.size : opDaysSet.size

    const clauseOf = (formCode: string): string => {
      try {
        const r = main
          .prepare(`SELECT iatf_clause FROM pack_forms WHERE form_code = ? AND iatf_clause <> '' LIMIT 1`)
          .get(formCode) as { iatf_clause: string } | undefined
        return r?.iatf_clause ?? ''
      } catch {
        return ''
      }
    }

    const rows: SqAuditRowDto[] = SQ_AUDIT_ROWS.map((def) => {
      const cells: Record<string, SqAuditCellDto> = {}
      for (const c of PROC_COLUMNS) {
        const k = kkey(c.key, def.kind)
        const last = everLast.get(k) ?? null
        let mark: SqAuditMark
        let days = 0
        if (def.kind === 'LOT' || last == null || opDays === 0) {
          mark = '—' // 비대상·원천 없음·가동일 0(판정 불가) — 정직
        } else {
          const set = winDays.get(k)
          days = calDays && set ? [...set].filter((d) => calDays.has(d)).length : set?.size ?? 0
          mark = days === 0 ? '×' : days >= opDays ? '●' : '◐'
        }
        cells[c.key] = { mark, lastYmd: last, days }
      }
      return { sqItem: def.sqItem, title: def.title, formCode: def.formCode, iatfClause: clauseOf(def.formCode), gap: false, cells }
    })

    // 갭 ＋행 (0135 'iatf-gap' — 전사 축: 근거 양식 작성 기록으로 판정)
    try {
      const gaps = main
        .prepare(`SELECT form_code, iatf_clause FROM pack_forms WHERE pack_code = 'iatf-gap' ORDER BY sort_order`)
        .all() as Array<{ form_code: string; iatf_clause: string }>
      for (const g of gaps) {
        const stat = main
          .prepare(
            `SELECT COUNT(*) n, MAX(date(created_at, 'localtime')) last FROM form_submissions
             WHERE form_code = ? AND date(created_at, 'localtime') >= ? AND date(created_at, 'localtime') <= ?`
          )
          .get(g.form_code, windowStart, windowEnd) as { n: number; last: string | null }
        rows.push({
          sqItem: '',
          title: `IATF ${g.iatf_clause} 추가 요구`,
          formCode: g.form_code,
          iatfClause: g.iatf_clause,
          gap: true,
          cells: {},
          overall: { mark: stat.n > 0 ? '●' : '×', lastYmd: stat.last, count: stat.n }
        })
      }
    } catch {
      /* pack_forms 미적용(0134 전 DB) — 갭 행 없이 정직 표출 */
    }

    return { ymd, dataEndYmd, available: !!db, windowStart, windowEnd, opDays, denomSource: calDays ? 'calendar' : 'proxy', columns, rows }
  })

  // P1 ⓒ 품번×공정 매트릭스 — 행 정렬 = 월 수불량 SO(subul_monthly, R1 확정 260730)
  ipcMain.handle(
    IPC_CHANNELS.MES_RECORDS_PART_PROCESS,
    (_e, req: { ymd?: string; limit?: number }): MesPartProcessDto => {
      const ymd = req?.ymd || todayKST()
      const limit = Math.min(Math.max(req?.limit ?? 8, 3), 30)
      const db = openSide()
      const columns = PROC_COLUMNS.map((c) => ({ key: c.key, label: c.label }))
      if (!db) return { ymd, dataEndYmd: null, subulMonth: null, available: false, columns, rows: [] }
      const { dataEndYmd } = typeStats(db)

      // 구 사이드카(subul_monthly 없는 빌드) 호환 — 정직하게 빈 정렬로
      let subulMonth: string | null = null
      let tops: Array<{ pno: string; qty: number }> = []
      try {
        subulMonth =
          (db.prepare("SELECT month FROM subul_monthly WHERE iogbn = 'SO' ORDER BY month DESC LIMIT 1").get() as
            | { month: string }
            | undefined)?.month ?? null
        if (subulMonth) {
          tops = db
            .prepare(
              "SELECT pno, SUM(qty) qty FROM subul_monthly WHERE iogbn = 'SO' AND month = ? GROUP BY pno ORDER BY qty DESC LIMIT ?"
            )
            .all(subulMonth, limit) as Array<{ pno: string; qty: number }>
        }
      } catch {
        subulMonth = null
      }
      if (tops.length === 0) return { ymd, dataEndYmd, subulMonth, available: true, columns, rows: [] }

      const ph = tops.map(() => '?').join(',')
      const pnames = new Map(
        (
          db.prepare(`SELECT pno, MAX(pname) pname FROM sqc_parts WHERE pno IN (${ph}) GROUP BY pno`).all(
            ...tops.map((t) => t.pno)
          ) as Array<{ pno: string; pname: string | null }>
        ).map((r) => [r.pno, r.pname])
      )
      const recs = db
        .prepare(`SELECT pno, ymd, qcgubun, line_no, items FROM sqc_daily WHERE pno IN (${ph})`)
        .all(...tops.map((t) => t.pno)) as Array<{
        pno: string
        ymd: string
        qcgubun: string
        line_no: string | null
        items: number
      }>

      const byPart = new Map<string, MesPartProcessRow>()
      for (const t of tops) {
        byPart.set(t.pno, { pno: t.pno, pname: pnames.get(t.pno) ?? null, monthQty: Math.round(t.qty), cells: {} })
      }
      for (const r of recs) {
        const proc = r.qcgubun === 'I' ? 'incoming' : procOf(r.line_no)
        if (!proc) continue
        const row = byPart.get(r.pno)
        if (!row) continue
        const cell = row.cells[proc] ?? (row.cells[proc] = { today: 0, lastYmd: null })
        if (r.ymd === ymd) cell.today += r.items
        if (!cell.lastYmd || r.ymd > cell.lastYmd) cell.lastYmd = r.ymd
      }
      return { ymd, dataEndYmd, subulMonth, available: true, columns, rows: tops.map((t) => byPart.get(t.pno)!) }
    }
  )
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
      const end = dataEndYmd ?? ymdAdd(todayKST(), 0)
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

/** M3 트리거 엔진(T2 증거 공백)용 — 사이드카 최신 데이터 일자(YYYY-MM-DD). 사이드카 없으면 null. */
export function getMesDataEndYmd(): string | null {
  try {
    const db = openSide()
    if (!db) return null
    return typeStats(db).dataEndYmd
  } catch {
    return null
  }
}
