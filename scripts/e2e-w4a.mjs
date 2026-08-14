// ============================================================
// scripts/e2e-w4a.mjs — W4 배치A(서버 보안 재검) E2E (2026-08-13)
//
// 계약 검증(37호 배치A · 도장 8/13):
//   ④ health 무인증 슬림({ok}만 — DB 경로·건수 비노출) · 세션 시 상세+copy 플래그 ·
//   PROTECTED 확장 3종(조업달력·KPI 기준·PPM 목표 = manager+, member 403) ·
//   기존 가드 회귀(appUser 계열) · E2E봇 계정(STAMP 분리 — 8/13 오인 사고 후속).
// 대상 = 검증 웹서버(:8081 복사본 — IATF_DATA_DIR 구동 = copy 플래그 true 전제).
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-w4a.mjs [비번(기본 qms1234)]
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부(copy 게이트는 1단이 원조)
const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const DB_PATH = assertCopyDb(process.env.E2E_DB)
const PW = process.argv[2] || 'qms1234'

let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }

async function login(name, pw) {
  const r = await fetch(`${BASE}/api/auth:login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, password: pw }) })
  if (!r.ok) throw new Error(`로그인 실패: ${name}`)
  return (r.headers.get('set-cookie') || '').split(';')[0]
}
async function api(cookie, ch, body) {
  const r = await fetch(`${BASE}/api/${ch}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {}) })
  return { status: r.status, json: await r.json().catch(() => null) }
}

const dbr = new Database(DB_PATH, { readonly: true })
const memberName = dbr.prepare("SELECT name FROM app_users WHERE role='member' AND active=1 ORDER BY sort_order LIMIT 1").get()?.name
if (!memberName) { console.error('member 계정 없음'); process.exit(1) }

// 0단 — health 무인증 슬림(37호 ④ + 8/13 검수 M-12 정정): 경로·건수·런타임 비노출 유지,
// 단 신원 아닌 "식별자"(pid·startedAt)는 노출 — 재기동 스크립트의 구판/신판 구분 근거.
{
  const j = await (await fetch(`${BASE}/api/health`)).json()
  check('0단 health 무인증 = 슬림(경로·건수 비노출) + 식별자(pid·startedAt)', j.ok === true && !('db' in j) && !('users' in j) && !('forms' in j) && !('runtime' in j) && typeof j.pid === 'number' && !!j.startedAt, Object.keys(j).join(','))
}

// 1단 — E2E봇 계정(시드 보장) + health 세션 상세 + copy 플래그
const bot = await login('E2E봇', PW)
check('1단 E2E봇 로그인(복사본 전용 계정 시드)', !!bot)
{
  const j = await (await fetch(`${BASE}/api/health`, { headers: { cookie: bot } })).json()
  check('1단 health 세션 = 상세 복원 + copy 표식', j.ok === true && 'db' in j && j.copy === true, `copy=${j.copy}`)
}

// 2단 — PROTECTED 확장 3종: member 403 (가드가 payload 검증보다 앞 — 형태 무관 차단)
const mem = await login(memberName, PW)
for (const [ch, body] of [
  ['semimes:workCalendarSave', { ymd: '2026-08-13', workType: '조업' }],
  ['kpi:indicatorSave', { name: 'W4A테스트' }],
  ['semimes:ppmTargetSave', { year: '2026', target: 100 }]
]) {
  const r = await api(mem, ch, body)
  check(`2단 member → ${ch} = 403`, r.status === 403, `status ${r.status}`)
}

// 3단 — manager(E2E봇) 통과 + STAMP = E2E봇 (사람 이름 혼입 금지 실증)
{
  const r = await api(bot, 'semimes:workCalendarSave', { ymd: '2026-08-13', workType: '조업', note: 'W4A 가드 검증' })
  check('3단 E2E봇(manager) 조업달력 저장 통과', r.status === 200 && r.json && r.json.success === true, r.json && r.json.error)
  const row = dbr.prepare("SELECT updated_by FROM work_calendar WHERE ymd = '2026-08-13'").get()
  check("3단 STAMP = 'E2E봇'(세션 강제 — 실무자 이름 혼입 0)", row && row.updated_by === 'E2E봇', row && row.updated_by)
}

// 4단 — 기존 가드 회귀(W3-4 유지): member → appUser:upsert 403
{
  const r = await api(mem, 'appUser:upsert', { name: 'W4A테스트유저' })
  check('4단 member → appUser:upsert = 403(기존 가드 유지)', r.status === 403, `status ${r.status}`)
}

dbr.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
