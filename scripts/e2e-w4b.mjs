// ============================================================
// scripts/e2e-w4b.mjs — W4 배치B(#19 권한 매트릭스 + 편승 2건) E2E (2026-08-13)
//
// 계약 검증(37호 배치B · 도장 ②③ + 판정 ① 8/13 = perm:save executive 전용):
//   0142 스키마(7종 비트·단가 CHECK 하드락·IATF 플래그) · perm:save 가드(member·manager 403) ·
//   단가 저장 거부(이중 방어) · 모순 규칙 거부 · 서버 정본 강제(팀 규칙 403 → 개인
//   오버라이드 200 → 해제 복귀) · executive 전권 · perm:effective 병합 ·
//   편승⑴ E2E봇 발번 = E2E-WO- 접두(실번호대 WO- 불침범) · 편승⑵ 'E2E' 주체 잔재 0.
// 대상 = 검증 웹서버(:8081 복사본). 규칙은 전부 자체 정리(종료 시 0행) — 회귀 무영향.
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-w4b.mjs [비번(기본 qms1234)]
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive, ymdKST } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부. copy 게이트는 로그인 직후.
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
const execName = dbr.prepare("SELECT name FROM app_users WHERE role='executive' AND active=1 LIMIT 1").get()?.name
const botRow = dbr.prepare("SELECT id, team_dept FROM app_users WHERE name='E2E봇'").get()
if (!memberName || !execName || !botRow) { console.error('계정 시드 부족(member/executive/E2E봇)'); process.exit(1) }

// 0단 — 0142 스키마 + IATF 플래그
{
  const cols = dbr.prepare('PRAGMA table_info(screen_permission)').all().map((c) => c.name)
  check('0단 screen_permission 7종 비트 컬럼', ['can_read', 'can_write', 'can_edit', 'can_delete', 'can_excel', 'can_print', 'can_price'].every((c) => cols.includes(c)), cols.join(','))
  const flag = dbr.prepare("SELECT value FROM app_config WHERE key='license.iatf_addon'").get()
  check("0단 IATF 라이선스 플래그 = 'off' 1행(자리 확보)", flag && flag.value === 'off', flag && flag.value)
}

// 0.5단 — 단가 스키마 하드락(37호 ③): 직접 INSERT can_price=1 → CHECK 거부
{
  const dbw = new Database(DB_PATH)
  let blocked = false
  try {
    dbw.prepare("INSERT INTO screen_permission (subject_kind, subject_key, page_id, can_price) VALUES ('team','스키마검증','work-order',1)").run()
  } catch (e) { blocked = /can_price/.test(String(e)) } // M-14 동반(8/13 검수): 매처 좁히기 — 무관 제약 오탐 방지
  dbw.prepare("DELETE FROM screen_permission WHERE subject_key='스키마검증'").run()
  // M-15(8/13 검수): 이전 실행이 도중 죽어 남긴 거부 규칙 스윕 — 3단 "규칙 없음" 전제 복원
  // (복사본 한정 — 규칙은 이 하네스의 검증 산물뿐이어야 정상)
  const swept = dbw.prepare('DELETE FROM screen_permission').run().changes
  if (swept > 0) console.log(`… 시작 스윕: 잔류 규칙 ${swept}행 제거(이전 실행 크래시 잔여물)`)
  dbw.close()
  check('0.5단 단가 can_price=1 = 스키마 CHECK 거부(전원 잠금 하드락)', blocked)
}

const bot = await login('E2E봇', PW)
// 복사본 서버 게이트(M-13 — w4a 에만 있던 것의 공용화): health.copy ≠ true = 라이브 DB 서버
{
  const hj = await (await fetch(`${BASE}/api/health`, { headers: { cookie: bot } })).json().catch(() => null)
  if (!hj || hj.copy !== true) { console.error(`[e2e-guard] 복사본 서버 아님(copy=${hj && hj.copy}) — 중단`); process.exit(1) }
}
const mem = await login(memberName, PW)
// 판정 ①(사장님 확정 8/13): perm:save = executive 전용 — 규칙 저장은 이 세션만.
// (규칙은 종료 시 전량 삭제 — 실기록 STAMP 아님, E2E봇 단일 로그인 규약의 예외 아님)
const ex = await login(execName, PW)
const CAL = 'semimes:workCalendarSave'
const CAL_BODY = { ymd: '2026-08-14', workType: '조업', note: 'W4B 매트릭스 검증' }
const BITS_ALLOW = { read: true, write: true, edit: true, delete: true, excel: true, print: true, price: false }

// 1단 — perm:save 가드(판정 ①): member 403 · manager 도 403 · executive 통과 + STAMP
{
  const r = await api(mem, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-calendar'], bits: BITS_ALLOW })
  check('1단 member → perm:save = 403', r.status === 403, `status ${r.status}`)
  const rm = await api(bot, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-calendar'], bits: BITS_ALLOW })
  check('1단 manager(E2E봇) → perm:save = 403(판정 ① — 사장님 전용)', rm.status === 403, `status ${rm.status}`)
  const r2 = await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-calendar'], bits: BITS_ALLOW, updatedBy: '위조' })
  check('1단 executive perm:save 통과', r2.status === 200 && r2.json && r2.json.success === true, r2.json && r2.json.error)
  const row = dbr.prepare("SELECT updated_by FROM screen_permission WHERE subject_kind='team' AND subject_key='검수' AND page_id='work-calendar'").get()
  check('1단 저장 STAMP = 세션 사용자(위조 무시)', row && row.updated_by === execName, row && row.updated_by)
  // 정리 — 3단은 "규칙 없음" 상태에서 시작해야 한다
  await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-calendar'], bits: BITS_ALLOW, remove: true })
}

// 2단 — 단가 저장 거부(핸들러 친절 거부 = 스키마 이전 이중 방어) + 모순 규칙 거부
{
  const r = await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-order'], bits: { ...BITS_ALLOW, price: true } })
  check('2단 단가 켜기 = 거부(돈 경계 헌법 안내문)', r.json && r.json.success === false && /단가|잠/.test(r.json.error ?? ''), r.json && r.json.error)
  const r2 = await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: '검수', pageIds: ['work-order'], bits: { ...BITS_ALLOW, read: false } })
  check('2단 읽기 0 + 타 권한 1 = 모순 거부', r2.json && r2.json.success === false && /읽기/.test(r2.json.error ?? ''), r2.json && r2.json.error)
}

// 3단 — 서버 정본 강제: 팀 규칙(쓰기 0) 403 → 개인 오버라이드(쓰기 1) 200 → 해제 역순 복귀
{
  const r0 = await api(bot, CAL, CAL_BODY)
  check('3단 규칙 없음 = 현행 허용(조업달력 저장 200)', r0.status === 200 && r0.json && r0.json.success === true, r0.json && r0.json.error)

  const deny = { ...BITS_ALLOW, write: false, edit: false, delete: false, excel: false, print: false }
  // M-14(8/13 검수): 규칙 저장 결과 확인 — 저장이 조용히 실패하면 아래 403 단언이 공허해진다
  const s1 = await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: botRow.team_dept, pageIds: ['work-calendar'], bits: deny })
  check('3단 차단 규칙 저장 확인(공허 단언 방지)', s1.status === 200 && s1.json?.success === true && s1.json?.saved === 1, s1.json?.error)
  const r1 = await api(bot, CAL, CAL_BODY)
  check('3단 팀(검수) 쓰기 0 규칙 → 403(서버 정본 즉시 효력)', r1.status === 403 && /권한 매트릭스/.test((r1.json && r1.json.error) || ''), r1.json && r1.json.error)

  const s2 = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(botRow.id), pageIds: ['work-calendar'], bits: BITS_ALLOW })
  check('3단 개인 오버라이드 저장 확인(M-14)', s2.status === 200 && s2.json?.success === true && s2.json?.saved === 1, s2.json?.error)
  const r2 = await api(bot, CAL, CAL_BODY)
  check('3단 개인 오버라이드(쓰기 1) → 200(개인이 팀을 대체)', r2.status === 200 && r2.json && r2.json.success === true, r2.json && r2.json.error)

  await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(botRow.id), pageIds: ['work-calendar'], bits: BITS_ALLOW, remove: true })
  const r3 = await api(bot, CAL, CAL_BODY)
  check('3단 개인 해제 → 팀 규칙 복원(403)', r3.status === 403, `status ${r3.status}`)

  // perm:effective — 팀 규칙만 남은 상태에서 병합 확인(bypass=false·write=false)
  const eff = await api(bot, 'perm:effective', {})
  const rule = eff.json && eff.json.rules && eff.json.rules['work-calendar']
  check('3단 perm:effective 병합(E2E봇 = 팀 규칙 노출)', eff.json && eff.json.bypass === false && rule && rule.write === false && rule.read === true, JSON.stringify(rule))

  await api(ex, 'perm:save', { subjectKind: 'team', subjectKey: botRow.team_dept, pageIds: ['work-calendar'], bits: BITS_ALLOW, remove: true })
  const r4 = await api(bot, CAL, CAL_BODY)
  check('3단 팀 해제 → 현행 복귀(200)', r4.status === 200 && r4.json && r4.json.success === true, r4.json && r4.json.error)
}

// 4단 — executive = 최종관리자 전권(개인 차단 규칙조차 무시)
{
  const exRow = dbr.prepare('SELECT id FROM app_users WHERE name = ?').get(execName)
  const deny = { ...BITS_ALLOW, write: false }
  // M-14(8/13 검수): 차단 규칙이 실제로 생겼는지 저장 결과 + DB 실행(實row) 확인 —
  // 종전엔 미확인이라 executive bypass 코드를 지워도 "규칙 없음 = 200"으로 통과했다(공허 단언)
  const s4 = await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(exRow.id), pageIds: ['work-calendar'], bits: deny })
  const s4row = dbr.prepare("SELECT can_write FROM screen_permission WHERE subject_kind='user' AND subject_key=? AND page_id='work-calendar'").get(String(exRow.id))
  check('4단 차단 규칙 실재 확인(저장 성공 + DB can_write=0)', s4.json?.success === true && s4row?.can_write === 0, `saved=${s4.json?.saved} row=${JSON.stringify(s4row)}`)
  const r = await api(ex, CAL, { ymd: '2026-08-15', workType: '조업', note: 'W4B 전권 검증' })
  check('4단 executive 쓰기 0 규칙에도 200(그림33 최종관리자 전권)', r.status === 200 && r.json && r.json.success === true, r.json && r.json.error)
  const eff = await api(ex, 'perm:effective', {})
  check('4단 perm:effective(executive) = bypass', eff.json && eff.json.bypass === true)
  await api(ex, 'perm:save', { subjectKind: 'user', subjectKey: String(exRow.id), pageIds: ['work-calendar'], bits: deny, remove: true })
}

// 5단 — 편승⑴: E2E봇 지시 발번 = E2E-WO- 접두 · 실번호대(WO-) 카운트 불침범
{
  const ymd = ymdKST().slice(2).replace(/-/g, '') // 8/13 검수 슬러지: 날짜식 복제 → lib 공용식
  const realBefore = dbr.prepare("SELECT COUNT(*) c FROM work_order WHERE order_no LIKE ?").get(`WO-${ymd}-%`).c
  const w1 = await api(bot, 'semimes:workOrderUpsert', { itemCode: '28236-2MAA0', orderQty: 100, createdBy: '위조' })
  const w2 = await api(bot, 'semimes:workOrderUpsert', { itemCode: '28236-2MAA0', orderQty: 200 })
  const re = new RegExp(`^E2E-WO-${ymd}-\\d{2}$`)
  check('5단 E2E봇 발번 = E2E-WO-YYMMDD-nn', w1.json && w1.json.success && re.test(w1.json.orderNo), w1.json && w1.json.orderNo)
  check('5단 연속 발번 접두 유지·차수 증가', w2.json && w2.json.success && re.test(w2.json.orderNo) && w2.json.orderNo !== w1.json.orderNo, w2.json && w2.json.orderNo)
  const realAfter = dbr.prepare("SELECT COUNT(*) c FROM work_order WHERE order_no LIKE ?").get(`WO-${ymd}-%`).c
  check('5단 실번호대(WO-) 카운트 불침범(발번 전후 동일)', realBefore === realAfter, `${realBefore} → ${realAfter}`)
  const stamp = dbr.prepare('SELECT created_by FROM work_order WHERE order_no = ?').get(w1.json.orderNo)
  check("5단 발번 STAMP = 'E2E봇'(위조 무시)", stamp && stamp.created_by === 'E2E봇', stamp && stamp.created_by)
}

// 6단 — 편승⑵: 기록 주체 'E2E' 맨몸 표기 잔재 0(계정명 'E2E봇' 단일 — 혼재 정리)
{
  const c1 = dbr.prepare("SELECT COUNT(*) c FROM work_order WHERE created_by = 'E2E'").get().c
  const c2 = dbr.prepare("SELECT COUNT(*) c FROM prod_record WHERE worker = 'E2E'").get().c
  check("6단 주체 'E2E' 잔재 0 (work_order·prod_record)", c1 === 0 && c2 === 0, `wo=${c1} prod=${c2}`)
}

// 종료 — 자체 생성 규칙 0행 확인(회귀 무영향 보증)
{
  const left = dbr.prepare('SELECT COUNT(*) c FROM screen_permission').get().c
  check('종료 screen_permission 잔여 규칙 0(자체 정리 — 회귀 무영향)', left === 0, `${left}행`)
}

dbr.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
