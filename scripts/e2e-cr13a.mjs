// ============================================================
// scripts/e2e-cr13a.mjs — 8/13 전수 검수 처분 A군 E2E (2026-08-14)
//
// 검증 대상(code-review-2026-08-13 §7-A · TODO 정본 8/13 도장):
//   C-1 권한 승격 봉쇄 — appUser 쓰기 3종 executive 전용(manager 403) ·
//       데스크톱(bridge 직행 = 주체 없음) 거부 · resetPassword 감사 각인(0143)
//   M-1 fmea 엑셀 가드 소생 — SCREEN_GUARD 실채널 정정 + 웹 다운로드 소생(무음 취소였다)
//   M-12 health 식별자(pid·startedAt) — 무인증 슬림 유지 + 구판/신판 구분 근거
// 대상 = 검증 웹서버(:8081 복사본) + bridge 직접 호출(데스크톱 등가).
//   IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> node(electron) scripts/e2e-cr13a.mjs [비번]
// 잔여물 0 계약: 테스트 유저·권한 규칙은 try/finally 로 전량 정리(M-15 교훈 선반영).
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive, assertCopyServer } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부(copy 게이트는 로그인 직후)
const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const PW = process.argv[2] || 'qms1234'
if (!process.env.IATF_DATA_DIR) {
  console.error('사용법: IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> ... [비번] (라이브 보호 — 필수)')
  process.exit(1)
}
const DB_PATH = assertCopyDb(process.env.E2E_DB)

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
const execName = dbr.prepare("SELECT name FROM app_users WHERE role='executive' AND active=1 LIMIT 1").get()?.name
const botRow = dbr.prepare("SELECT id, team_dept FROM app_users WHERE name='E2E봇'").get()
if (!memberName || !execName || !botRow) { console.error('픽스처 계정 부족(member/executive/E2E봇)'); process.exit(1) }
const usersBefore = dbr.prepare('SELECT COUNT(*) c FROM app_users').get().c
const rulesBefore = dbr.prepare('SELECT COUNT(*) c FROM screen_permission').get().c

// ── 0단 — M-12: health 무인증 = 슬림 유지 + 식별자(pid·startedAt) ──
{
  const j = await (await fetch(`${BASE}/api/health`)).json()
  check('0단 health 무인증 슬림 유지(db·건수·runtime 비노출)', j.ok === true && !('db' in j) && !('users' in j) && !('forms' in j) && !('runtime' in j), Object.keys(j).join(','))
  check('0단 health 식별자 = pid·startedAt(구판/신판 구분 근거)', typeof j.pid === 'number' && typeof j.startedAt === 'string' && j.startedAt.length >= 16, `pid=${j.pid} startedAt=${j.startedAt}`)
}

const bot = await login('E2E봇', PW) // manager
// 복사본 서버 하드 게이트 — Minor 8(8/14 검수 2차): 이 4줄이 하네스 7개에 복붙돼 있었다.
// lib 수출을 실제로 쓰게 회수(그 표류가 N-4 소프트 게이트의 원인이었다).
await assertCopyServer(BASE, bot)
const mem = await login(memberName, PW)
// C-1 검증엔 executive 세션이 필수(승격 시나리오의 방어 실증) — 규칙·계정은 전량 정리, 실기록 0.
const ex = await login(execName, PW)

// ── 1단 — C-1: appUser 쓰기 3종 = executive 전용(manager 403 — 어제까진 200이던 구멍) ──
for (const [ch, body] of [
  ['appUser:upsert', { name: 'CR13A승격시도', role: 'executive' }],
  ['appUser:resetPassword', { id: 1, newPassword: '0000' }],
  ['appUser:delete', { id: 999999 }]
]) {
  const r = await api(bot, ch, body)
  check(`1단 manager(E2E봇) → ${ch} = 403(승격 경로 봉쇄)`, r.status === 403, `status ${r.status}`)
}
{
  const r = await api(mem, 'appUser:upsert', { name: 'CR13A테스트' })
  check('1단 member → appUser:upsert = 403(회귀)', r.status === 403, `status ${r.status}`)
}

// ── 2단 — C-1: executive 정상 경로 + resetPassword 감사 각인(0143) + 정리 ──
let testUserId = null
try {
  const r = await api(ex, 'appUser:upsert', { name: 'CR13A테스트', teamDept: '검수', role: 'member', sortOrder: 998 })
  check('2단 executive → appUser:upsert 통과', r.status === 200 && r.json?.success === true && !!r.json?.id, r.json?.error)
  testUserId = r.json?.id ?? null

  if (testUserId) {
    const rp = await api(ex, 'appUser:resetPassword', { id: testUserId, newPassword: '9999', actorName: '위조주체' })
    check('2단 executive → resetPassword 통과', rp.status === 200 && rp.json?.success === true, rp.json?.error)
    const row = dbr.prepare('SELECT pw_reset_by, pw_reset_at FROM app_users WHERE id=?').get(testUserId)
    check(`2단 감사 각인 = 세션 주체(위조 무시): pw_reset_by='${execName}'`, row?.pw_reset_by === execName && !!row?.pw_reset_at, `by=${row?.pw_reset_by} at=${row?.pw_reset_at}`)
  }
} finally {
  if (testUserId) {
    const rd = await api(ex, 'appUser:delete', { id: testUserId })
    check('2단 executive → delete 정리 통과', rd.status === 200 && rd.json?.success === true, rd.json?.error)
  }
}

// ── 3단 — C-1 데스크톱 등가(bridge 직행 = 세션·주체 없음): 쓰기 3종 전부 거부 ──
// W4-C 방어선 확장 — appUser 계열이 8/13 검수에서 이 방어선 밖이었다.
{
  const { buildRoutes } = require('../server/dist/bridge.cjs')
  const routes = buildRoutes()
  const call = (ch, body) => Promise.resolve(routes.get(ch)(null, body))
  const SUBJECT_RE = /주체|세션/
  for (const [ch, body] of [
    ['appUser:upsert', { name: 'CR13A데스크톱시도', role: 'executive' }],
    ['appUser:delete', { id: 999999 }],
    ['appUser:resetPassword', { id: 999999, newPassword: '0000' }]
  ]) {
    const r = await call(ch, body)
    check(`3단 데스크톱(무주체) → ${ch} 거부`, r && r.success === false && SUBJECT_RE.test(r.error ?? ''), r && String(r.error ?? JSON.stringify(r)).slice(0, 50))
  }
}

// ── 4단 — M-1: fmea 엑셀 가드 소생 + 웹 다운로드 소생(전 주기) ──
const fmeaDoc = dbr.prepare('SELECT id FROM fmea_documents ORDER BY id LIMIT 1').get()
if (!fmeaDoc) {
  console.log('… 4단 skip — 복사본에 fmea_documents 0건(가드·다운로드 단언 불가를 명시)')
} else {
  const denyBits = { read: true, write: false, edit: false, delete: false, excel: false, print: false, price: false }
  try {
    const rs = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(botRow.id), pageIds: ['fmea'], bits: denyBits })
    check('4단 fmea 엑셀 0 규칙 저장(perm:save 결과 확인 — 공허 단언 금지)', rs.status === 200 && rs.json?.success === true, rs.json?.error)
    const r403 = await api(bot, 'fmea:exportXlsx', { docId: fmeaDoc.id })
    check('4단 E2E봇 → fmea:exportXlsx = 403(죽어 있던 가드가 살아났다)', r403.status === 403 && /권한 매트릭스/.test(r403.json?.error ?? ''), `status ${r403.status}`)
  } finally {
    const rr = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(botRow.id), pageIds: ['fmea'], bits: denyBits, remove: true })
    check('4단 규칙 해제 복귀(잔류 금지 — M-15 교훈)', rr.status === 200 && rr.json?.success === true, rr.json?.error)
  }
  const rdl = await api(bot, 'fmea:exportXlsx', { docId: fmeaDoc.id })
  const okDl = rdl.status === 200 && rdl.json?.success === true && typeof rdl.json?.download === 'string'
  check('4단 규칙 해제 후 내보내기 = 다운로드 토큰(무음 취소 소생)', okDl, okDl ? rdl.json.download : JSON.stringify(rdl.json)?.slice(0, 80))
  if (okDl) {
    const f = await fetch(`${BASE}${rdl.json.download}`, { headers: { cookie: bot } })
    const buf = await f.arrayBuffer()
    check('4단 GET /download = xlsx 실물(0바이트 아님)', f.status === 200 && buf.byteLength > 1000, `${f.status} · ${buf.byteLength}B`)
  }
}

// ── 5단 — M-1 동반: 소생 2종(report:exportScores·sq:assessExport) — 데이터 있으면 실단언 ──
{
  const scoreCnt = dbr.prepare("SELECT COUNT(*) c FROM form_scores").get()?.c ?? 0
  if (scoreCnt === 0) console.log('… 5단 report:exportScores skip — form_scores 0건(명시)')
  else {
    const r = await api(bot, 'report:exportScores', {})
    check('5단 report:exportScores = 다운로드 소생', r.status === 200 && r.json?.success !== false && typeof r.json?.download === 'string', JSON.stringify(r.json)?.slice(0, 80))
  }
}

// ── 6단 — 잔여물 0 검산(계정·규칙 원상 복귀) ──
{
  const usersAfter = dbr.prepare('SELECT COUNT(*) c FROM app_users').get().c
  const rulesAfter = dbr.prepare('SELECT COUNT(*) c FROM screen_permission').get().c
  check('6단 app_users 원상(테스트 계정 잔류 0)', usersAfter === usersBefore, `${usersBefore}→${usersAfter}`)
  check('6단 screen_permission 원상(규칙 잔류 0)', rulesAfter === rulesBefore, `${rulesBefore}→${rulesAfter}`)
}

dbr.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
