// ============================================================
// scripts/e2e-d34-b3.mjs — 34호 배치⑶ E2E (2026-08-12)
//
// 계약 검증(대조표 #18·#15·#12·#16 + 0139):
//   조업달력 = 1일 1행·UPSERT 정정·STAMP·모순 표식(휴무+기록) ·
//   분모 정밀화 = 달력 미등록 → proxy, 등록 → calendar (도넛·심사 뷰 공유) ·
//   성과 지표 = 12칸 고정·실적 없는 달 null·연간 = 재합산 ·
//   생산현황 = 일별 집계 취소 제외·달력 조업일수 ·
//   추적 밴드 = 지시수량→공정 열산 자기일관(밴드 합 = 지시 진척 합)·라우팅 밖 정직.
// 대상 = 검증 웹서버(:8081 복사본) + better-sqlite3 직접 단언. 라이브(:8080) 오염 금지.
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-d34-b3.mjs <로그인> [비번]
// ⚠️픽스처 전제(8/13 실증): 복사본 = iatf16949.db 단독 — 사이드카(mes_records.db) 동봉 금지.
//   동봉하면 7일 창이 사이드카 dataEnd(과거)에 앵커돼 4단의 "오늘 달력 등록 → calendar 전환"
//   이 창 밖으로 밀려 proxy 오탐 2건(제품 무혐의 — 창 앵커는 PB2 정직 계약 그대로).
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive, guardLoginName, ymdKST, assertCopyServer } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부(무조건 DELETE 하네스)·:8080 거부·E2E봇 강제
const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const DB_PATH = assertCopyDb(process.env.E2E_DB)
const LOGIN = guardLoginName(process.argv[2])
const PW = process.argv[3] || 'qms1234'

let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }

let cookie = ''
async function api(ch, body) {
  const res = await fetch(`${BASE}/api/${ch}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {}) })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${ch} ${res.status}: ${json && json.error}`)
  return json
}
const login = await fetch(`${BASE}/api/auth:login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: LOGIN, password: PW }) })
if (!login.ok) { console.error('로그인 실패'); process.exit(1) }
cookie = (login.headers.get('set-cookie') || '').split(';')[0]
// 복사본 서버 하드 게이트 — Minor 8(8/14 검수 2차): 이 4줄이 하네스 7개에 복붙돼 있었다.
// lib 수출을 실제로 쓰게 회수(그 표류가 N-4 소프트 게이트의 원인이었다).
await assertCopyServer(BASE, cookie)
console.log(`로그인 ${LOGIN} ✓ (${BASE})`)

const today = ymdKST() // 8/13 검수 슬러지: 날짜식 복제 → lib 공용식
const month = today.slice(0, 7)

// 0단 — 0139 스키마(서버 기동 시 자동 적용) + 픽스처 초기화(재실행 멱등 — 복사본 한정.
// work_calendar 는 마스터 성격(append-only 아님)이라 검증 전 초기화가 계약 위반이 아니다)
const dbw = new Database(DB_PATH)
dbw.prepare('DELETE FROM work_calendar').run()
dbw.close()
const dbr = new Database(DB_PATH, { readonly: true })
const calCols = dbr.prepare('PRAGMA table_info(work_calendar)').all().map((c) => c.name)
check('0단 work_calendar 스키마(0139)', ['ymd', 'work_type', 'note', 'updated_by', 'updated_at'].every((c) => calCols.includes(c)))

// 1단 — 분모: 달력 미등록 상태 = proxy (도넛·심사 뷰 동일)
const live0 = await api('mesRecords:processLive', {})
const mat0 = await api('sq:auditMatrix', {})
check('1단 달력 미등록 → 도넛 분모 = proxy', live0.denomSource === 'proxy', `denomSource=${live0.denomSource}`)
check('1단 달력 미등록 → 심사 뷰 분모 = proxy', mat0.denomSource === 'proxy', `opDays=${mat0.opDays}`)

// 2단 — 조업달력 등록·거부·정정(UPSERT)
const bad1 = await api('semimes:workCalendarSave', { ymd: '2026-13-01', workType: '조업' })
check('2단 잘못된 날짜 거부', bad1.success === false)
const bad2 = await api('semimes:workCalendarSave', { ymd: today, workType: '반휴' })
check('2단 잘못된 구분 거부', bad2.success === false)
const s1 = await api('semimes:workCalendarSave', { ymd: today, workType: '조업', note: 'E2E' })
check('2단 조업 등록 성공', s1.success === true)
const cal1 = await api('semimes:workCalendar', { month })
const d1 = cal1.days.find((d) => d.ymd === today)
check('2단 월 조회 반영 + STAMP(세션 각인)', !!d1 && d1.workType === '조업' && d1.updatedBy === LOGIN, `updatedBy=${d1 && d1.updatedBy}`)
const s2 = await api('semimes:workCalendarSave', { ymd: today, workType: '휴무', note: '정정 테스트' })
const cal2 = await api('semimes:workCalendar', { month })
const d2 = cal2.days.find((d) => d.ymd === today)
check('2단 정정 = 같은 날 덮어쓰기(1일 1행)', s2.success && d2.workType === '휴무' && cal2.days.filter((d) => d.ymd === today).length === 1)

// 3단 — 모순 표식: 오늘 실적이 있으면 휴무 등록에 hasRecords 동반
const hasProdToday = (dbr.prepare(`SELECT COUNT(*) c FROM prod_record WHERE record_date = ? AND canceled_at IS NULL`).get(today)).c > 0
check('3단 휴무+기록 모순 표식(hasRecords)', hasProdToday ? d2.hasRecords === true : d2.hasRecords === false, `실적 ${hasProdToday ? '있음' : '없음'} → hasRecords=${d2.hasRecords}`)

// 조업으로 확정(이후 단의 분모 전제)
await api('semimes:workCalendarSave', { ymd: today, workType: '조업' })

// 4단 — 분모 정밀화: 등록 후 = calendar (도넛·심사 뷰 공유 분모)
const live1 = await api('mesRecords:processLive', {})
const mat1 = await api('sq:auditMatrix', {})
check('4단 달력 등록 → 도넛 분모 = calendar', live1.denomSource === 'calendar', `denomSource=${live1.denomSource}`)
check('4단 달력 등록 → 심사 뷰 분모 = calendar·가동일 = 조업일 수', mat1.denomSource === 'calendar' && mat1.opDays === 1, `opDays=${mat1.opDays}`)

// 5단 — 성과 지표: 12칸 고정·실적 없는 달 null·연간 = 재합산
const perf = await api('semimes:perfIndicators', { year: today.slice(0, 4) })
const yieldInd = perf.indicators.find((i) => i.key === 'yieldRate')
const ppmInd = perf.indicators.find((i) => i.key === 'incomingPpm')
check('5단 지표 2종·월 12칸 고정', perf.indicators.length === 2 && yieldInd.months.length === 12 && ppmInd.months.length === 12)
check('5단 실적 없는 달 = null(가짜 0/100 금지)', yieldInd.months.filter((m) => m.denom === 0).every((m) => m.value === null))
const curM = yieldInd.months.find((m) => m.month === month)
const expectYield = curM && curM.denom > 0 ? Math.round((curM.numer / curM.denom) * 1000) / 10 : null
check('5단 양품률 산식 실측 재현(분자·분모 동봉)', curM && curM.value === expectYield, `${month}: ${curM && curM.numer}/${curM && curM.denom} → ${curM && curM.value}`)
const n = yieldInd.months.reduce((s, m) => s + m.numer, 0), dd = yieldInd.months.reduce((s, m) => s + m.denom, 0)
check('5단 연간 = 분자·분모 재합산(월평균 아님)', yieldInd.yearValue === (dd > 0 ? Math.round((n / dd) * 1000) / 10 : null), `연간=${yieldInd.yearValue}`)

// 6단 — 생산현황 차트: 취소 제외 자기일관 + 달력 조업일수
const chart = await api('semimes:prodChart', { from: `${month}-01`, to: today })
const dbSum = dbr.prepare(`SELECT COALESCE(SUM(ok_qty),0) ok, COALESCE(SUM(ng_qty),0) ng FROM prod_record WHERE record_date >= ? AND record_date <= ? AND canceled_at IS NULL`).get(`${month}-01`, today)
const chartOk = chart.days.reduce((s, d) => s + d.ok, 0), chartNg = chart.days.reduce((s, d) => s + d.ng, 0)
check('6단 일별 합 = DB 실측(취소 제외)', chartOk === dbSum.ok && chartNg === dbSum.ng, `ok=${chartOk}/${dbSum.ok} ng=${chartNg}/${dbSum.ng}`)
check('6단 달력 조업일수 반영', chart.calendarWorkDays === 1, `calendarWorkDays=${chart.calendarWorkDays}`)
const badRange = await api('semimes:prodChart', { from: today, to: `${month}-01` })
check('6단 역전 기간 = 빈 응답(원시 에러 없음)', badRange.days.length === 0 && badRange.calendarWorkDays === null)

// 7단 — 추적 밴드: 지시 열산 자기일관 + 정직 표기
const orders = await api('semimes:workOrderList', {})
check('7단 지시 목록 원천', Array.isArray(orders) && orders.length > 0, `${orders.length}건`)
const wo = orders[0]
const band = await api('semimes:traceBand', { orderNo: wo.orderNo })
check('7단 밴드 found·라우팅 열산', band.found === true && Array.isArray(band.procs) && band.procs.length > 0, `procs=${band.procs && band.procs.length}`)
const bandOk = (band.procs ?? []).reduce((s, p) => s + p.ok, 0) + (band.offRoute ?? []).reduce((s, o) => s + o.ok, 0)
check('7단 밴드 합(라우팅+밖) = 지시 진척 합(취소 제외 자기일관)', bandOk === wo.okSum, `band=${bandOk} · okSum=${wo.okSum}`)
const emptyProcs = (band.procs ?? []).filter((p) => !p.hasRecords)
check('7단 기록 없는 공정 = 0 날조 없이 hasRecords=false', emptyProcs.every((p) => p.ok === 0 && p.ng === 0 && p.lots.length === 0), `${emptyProcs.length}개 공정`)
const nf = await api('semimes:traceBand', { orderNo: 'WO-000000-99' })
check('7단 무존재 지시 = found:false(원시 에러 없음)', nf.found === false)

// 8단 — 취소 행 정직: LOT 그리드에 취소 플래그로 실림(합산은 제외)
const canceledLots = (band.procs ?? []).flatMap((p) => p.lots).filter((l) => l.canceled)
const dbCanceled = (dbr.prepare(`SELECT COUNT(*) c FROM prod_record WHERE work_order_id = (SELECT id FROM work_order WHERE order_no = ?) AND canceled_at IS NOT NULL`).get(wo.orderNo)).c
check('8단 취소 행 = 그리드 정직 표기·합산 제외', canceledLots.length === dbCanceled, `취소 ${canceledLots.length}/${dbCanceled}행`)

dbr.close()
console.log(`\n합계: ${pass}/${pass + fail} 통과`)
process.exit(fail === 0 ? 0 : 1)
