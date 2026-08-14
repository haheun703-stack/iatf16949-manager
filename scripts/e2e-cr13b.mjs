// ============================================================
// scripts/e2e-cr13b.mjs — 8/13 전수 검수 처분 B군(perm:save 위생) E2E (2026-08-14)
//
// 검증 대상(code-review-2026-08-13 Minor — B군 서버 축):
//   ① pageIds 화이트리스트 — 목록 밖 화면 ID = 거부(유령 규칙 예방)
//   ② subject_key 정규화 — '007' 표기 변형이 '7' 단일 표기로 저장(별도 행 방지)
//   ③ 고아 해제 동선 — 명단에 없는 개인 주체의 규칙도 remove 는 허용(정리 가능)
// 렌더러 축(표시 전용 배지·프린트 미배선·M-11 role 가드·읽기 자동 해제)은 화면 검수 몫.
//   IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> node(electron) scripts/e2e-cr13b.mjs [비번]
// 잔여물 0 계약: 규칙은 try/finally 로 전량 정리.
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부
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
const execName = dbr.prepare("SELECT name FROM app_users WHERE role='executive' AND active=1 LIMIT 1").get()?.name
const botRow = dbr.prepare("SELECT id FROM app_users WHERE name='E2E봇'").get()
if (!execName || !botRow) { console.error('픽스처 계정 부족(executive/E2E봇)'); process.exit(1) }
const rulesBefore = dbr.prepare('SELECT COUNT(*) c FROM screen_permission').get().c
const BITS = { read: true, write: true, edit: true, delete: true, excel: true, print: true, price: false }

const ex = await login(execName, PW)
// 복사본 서버 게이트(M-13 공용화): health.copy ≠ true = 라이브 DB 서버 — 즉시 중단
{
  const hj = await (await fetch(`${BASE}/api/health`, { headers: { cookie: ex } })).json().catch(() => null)
  if (!hj || hj.copy !== true) { console.error(`[e2e-guard] 복사본 서버 아님(copy=${hj && hj.copy}) — 중단`); process.exit(1) }
}

// 1단 — pageIds 화이트리스트: 목록 밖 화면 ID = 거부
{
  const r = await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['no-such-page'], bits: BITS })
  check("1단 목록 밖 화면 ID = 거부('알 수 없는 화면')", r.json?.success === false && /알 수 없는 화면/.test(r.json?.error ?? ''), r.json?.error)
  const cnt = dbr.prepare("SELECT COUNT(*) c FROM screen_permission WHERE page_id='no-such-page'").get().c
  check('1단 유령 규칙 행 0(저장 안 됨)', cnt === 0, `rows=${cnt}`)
}

// 2단 — subject_key 정규화: '007' 표기 → '7' 단일 표기(별도 행 방지)
{
  const padded = '00' + String(botRow.id)
  try {
    const r = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: padded, pageIds: ['work-calendar'], bits: BITS })
    check('2단 표기 변형 키 저장 통과', r.status === 200 && r.json?.success === true, r.json?.error)
    const rowCanon = dbr.prepare("SELECT COUNT(*) c FROM screen_permission WHERE subject_kind='user' AND subject_key=? AND page_id='work-calendar'").get(String(botRow.id)).c
    const rowPadded = dbr.prepare("SELECT COUNT(*) c FROM screen_permission WHERE subject_kind='user' AND subject_key=? AND page_id='work-calendar'").get(padded).c
    check(`2단 저장 키 = 정규 표기('${botRow.id}' 1행 · '${padded}' 0행)`, rowCanon === 1 && rowPadded === 0, `canon=${rowCanon} padded=${rowPadded}`)
  } finally {
    const rr = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(botRow.id), pageIds: ['work-calendar'], bits: BITS, remove: true })
    check('2단 정리(해제) 통과', rr.status === 200 && rr.json?.success === true, rr.json?.error)
  }
}

// 3단 — 고아 해제 동선: 명단에 없는 개인 주체도 remove 는 허용(정리 가능해야 한다)
{
  const r = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: '999999', pageIds: ['work-calendar'], bits: BITS, remove: true })
  check('3단 명단 밖 주체 remove = 허용(고아 정리 — 저장과 달리 존재 검사 없음)', r.status === 200 && r.json?.success === true, r.json?.error)
  const r2 = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: '999999', pageIds: ['work-calendar'], bits: BITS })
  check('3단 대조: 같은 주체 저장은 거부(명단 검사)', r2.json?.success === false && /명단에 없습니다/.test(r2.json?.error ?? ''), r2.json?.error)
}

// 4단 — 잔여물 0 검산
{
  const rulesAfter = dbr.prepare('SELECT COUNT(*) c FROM screen_permission').get().c
  check('4단 screen_permission 원상(규칙 잔류 0)', rulesAfter === rulesBefore, `${rulesBefore}→${rulesAfter}`)
}

dbr.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
