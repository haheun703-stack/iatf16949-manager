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
// Minor 8(8/14 검수 2차): lib 수출 5종이 소비처 0 이고 게이트·login·api 가 하네스마다 복붙돼
// 있었다(그 표류가 N-4 의 원인). 이 하네스부터 공용 헬퍼를 실제로 쓴다.
import { assertCopyDb, assertBaseNotLive, assertCopyServer, loginBot, loginProbe, mkApi, mkCheck } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080/외부 호스트 거부
const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const DB_PATH = assertCopyDb(process.env.E2E_DB)
const PW = process.argv[2] || 'qms1234'

const { check, done } = mkCheck()
const api = mkApi(BASE)
const login = (name, pw) => loginProbe(BASE, name, pw)

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
// ★N-4(8/14 검수 2차): 종전엔 copy 확인이 `check()` 뿐이라 **실패해도 3단 쓰기까지 진행**했다
//   (나머지 하네스 9종은 하드 중단 — 여기만 소프트였다). loginBot 이 복사본 게이트를
//   통과하지 못하면 그 자리에서 exit 1 한다. 표기용 check 는 그 뒤에 남긴다.
const bot = await loginBot(BASE, PW)
check('1단 E2E봇 로그인 + ★복사본 하드 게이트 통과(미통과 시 여기 도달 불가)', !!bot)
{
  const j = await assertCopyServer(BASE, bot)
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
done()
