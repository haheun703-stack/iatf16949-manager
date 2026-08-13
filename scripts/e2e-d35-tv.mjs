// ============================================================
// scripts/e2e-d35-tv.mjs — 35호 전광판(TV현황판) E2E (2026-08-13)
//
// 계약 검증(35호 §3·§4 + 그림65):
//   tvBoard = 미완료(대기·진행)만 · 실적 합 = 취소 제외 검산 ·
//   달성률 = 생산÷지시(100% 초과 그대로 — 239% 재현) · 지시수량 null 그대로 전달('—' 정직) ·
//   완료/취소 지시 미포함 · 정렬 = 진행 우선 · limit 절단 = total 로 정직 · 조업달력 오늘 판정 대사.
// 대상 = 검증 웹서버(:8081 복사본). 라이브(:8080) 오염 금지.
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-d35-tv.mjs <로그인> [비번]
// ============================================================
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081'
const DB_PATH = process.env.E2E_DB
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN || !DB_PATH) { console.error('사용법: E2E_DB=<복사본.db> ... <로그인> [비번]'); process.exit(1) }

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
console.log(`로그인 ${LOGIN} ✓ (${BASE})`)

const ITEM = '28236-2MAA0'
const YMD = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10) // KST 오늘(record_date 용)

// 0단 — 픽스처(복사본 한정 · E2E-TV- 접두 멱등 정리 후 재구축)
let woIds = {}
{
  const dbw = new Database(DB_PATH)
  dbw.prepare("DELETE FROM prod_record WHERE work_order_id IN (SELECT id FROM work_order WHERE order_no LIKE 'E2E-TV-%')").run()
  dbw.prepare("DELETE FROM work_order WHERE order_no LIKE 'E2E-TV-%'").run()
  const wo = dbw.prepare("INSERT INTO work_order (order_no, item_code, order_qty, status, created_by) VALUES (?, ?, ?, ?, 'E2E')")
  const pr = dbw.prepare('INSERT INTO prod_record (record_date, work_order_id, item_code, ok_qty, ng_qty, worker, canceled_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
  // W1 진행 1000: 실적 130+70(양품)·불량 5 + 취소 999(집계 제외 대상) → okSum 200 · ngSum 5 · 20%
  woIds.w1 = wo.run('E2E-TV-01', ITEM, 1000, '진행').lastInsertRowid
  pr.run(YMD, woIds.w1, ITEM, 130, 5, 'E2E', null)
  pr.run(YMD, woIds.w1, ITEM, 70, 0, 'E2E', null)
  pr.run(YMD, woIds.w1, ITEM, 999, 99, 'E2E', new Date().toISOString()) // 취소 행 — 합산 금지
  // W2 진행 100: 실적 239 → 239% (그림65 실측 — 100% 초과 그대로)
  woIds.w2 = wo.run('E2E-TV-02', ITEM, 100, '진행').lastInsertRowid
  pr.run(YMD, woIds.w2, ITEM, 239, 0, 'E2E', null)
  // W3 대기 · 지시수량 NULL: 실적 50 → 달성률 '—'(계산 불가 정직)
  woIds.w3 = wo.run('E2E-TV-03', ITEM, null, '대기').lastInsertRowid
  pr.run(YMD, woIds.w3, ITEM, 50, 0, 'E2E', null)
  // W4 완료 · W5 취소 — 전광판 미출현 대상
  woIds.w4 = wo.run('E2E-TV-04', ITEM, 500, '완료').lastInsertRowid
  woIds.w5 = wo.run('E2E-TV-05', ITEM, 500, '취소').lastInsertRowid
  dbw.close()
}

// 1단 — 조회(limit 60 = 상한) + 픽스처 행 검산
const d = await api('semimes:tvBoard', { limit: 60 })
check('1단 응답 형태(ymd·orders·total)', /^\d{4}-\d{2}-\d{2}$/.test(d.ymd) && Array.isArray(d.orders) && typeof d.total === 'number')
const byNo = Object.fromEntries(d.orders.filter((o) => o.orderNo.startsWith('E2E-TV-')).map((o) => [o.orderNo, o]))
const w1 = byNo['E2E-TV-01'], w2 = byNo['E2E-TV-02'], w3 = byNo['E2E-TV-03']
check('1단 W1 취소 제외 검산(okSum 200·ngSum 5)', !!w1 && w1.okSum === 200 && w1.ngSum === 5, w1 && `ok ${w1.okSum} ng ${w1.ngSum}`)
check('1단 W1 달성률 20%(화면 산식 재현)', !!w1 && Math.round((w1.okSum / w1.orderQty) * 100) === 20)
check('1단 W2 100% 초과 그대로(239%)', !!w2 && w2.orderQty === 100 && Math.round((w2.okSum / w2.orderQty) * 100) === 239)
check("1단 W3 지시수량 null 그대로('—' 정직)", !!w3 && w3.orderQty === null && w3.okSum === 50 && w3.status === '대기')
check('1단 완료(W4)·취소(W5) 미출현', !byNo['E2E-TV-04'] && !byNo['E2E-TV-05'])

// 2단 — 정렬(진행 우선) + 절단 정직(total)
const idx = (no) => d.orders.findIndex((o) => o.orderNo === no)
check('2단 정렬 = 진행 우선(대기 W3 이 진행 W1·W2 뒤)', idx('E2E-TV-01') >= 0 && idx('E2E-TV-02') >= 0 && idx('E2E-TV-03') > Math.max(idx('E2E-TV-01'), idx('E2E-TV-02')))
{
  const dbr = new Database(DB_PATH, { readonly: true })
  const cnt = dbr.prepare("SELECT COUNT(*) c FROM work_order WHERE status IN ('대기','진행')").get().c
  check('2단 total = DB 미완료 전수 대사', d.total === cnt, `dto ${d.total} / db ${cnt}`)
  const cal = dbr.prepare('SELECT work_type t, note FROM work_calendar WHERE ymd = ?').get(d.ymd)
  check('2단 조업달력 오늘 판정 대사(미등록 = null)', cal ? d.calToday && d.calToday.workType === cal.t : d.calToday === null, cal ? cal.t : '미등록')
  dbr.close()
}
const cut = await api('semimes:tvBoard', { limit: 1 })
check('3단 limit 절단 — orders 1건·total 전수 유지(+n건 정직)', cut.orders.length === 1 && cut.total === d.total)
const clamp = await api('semimes:tvBoard', { limit: 9999 })
check('3단 limit 상한 클램프(≤60)', clamp.orders.length <= 60)

// 4단 — 폴링 등가(같은 요청 재호출 = 같은 결과 — 읽기 전용·부작용 0)
const d2 = await api('semimes:tvBoard', { limit: 60 })
const w1b = d2.orders.find((o) => o.orderNo === 'E2E-TV-01')
check('4단 재호출 멱등(쓰기 0 — okSum·total 불변)', !!w1b && w1b.okSum === 200 && d2.total === d.total)

console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
