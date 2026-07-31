// ============================================================
// scripts/e2e-p1b.mjs — P1 ⓑ 공정 실황 행렬 커버리지 3단 E2E (2026-07-31)
//
// 검수 게이트(25번 §5·final 회신 §3): "기록 주입 → 행렬 반영 → 공백 트리거 발행".
//   1단 = form:submissionCreate 로 수입검사 기록 주입(L2100-07 — FORM_PROC 매핑 양식)
//   2단 = mesRecords:processLive 재조회 → incoming 열 todayForms/todayRecords 반영·status active
//   3단 = team:todayBoard 조회 → 데이터 트리거 이슈([데이터] 배지 — M3 lazy 발행) 존재 확인
// 대상 = 검증 웹서버(복사본 DB) — 사이드카 없는 환경에선 MES 원천 available=false 를
// 정직 확인(앱 작성 원천만 반영 — 프로덕션 사이드카 표출은 dev CDP 캡처로 실증).
// 실행: E2E_BASE=http://127.0.0.1:8081 node scripts/e2e-p1b.mjs <로그인이름> [비번]
// ============================================================
const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080'
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN) { console.error('사용법: node scripts/e2e-p1b.mjs <로그인이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const loginRes = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
if (!loginRes.ok) { console.error('로그인 실패:', await loginRes.text()); process.exit(1) }
cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0]
console.log(`로그인: ${LOGIN} ✓ (${BASE})`)

let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  ok ? pass++ : fail++
}

// 0단: 주입 전 기준값
const before = await api('mesRecords:processLive', {})
const inc0 = before.columns.find((c) => c.key === 'incoming')
check('0단 processLive 응답(열 7)', before.columns.length === 7, `columns=${before.columns.length} · available=${before.available}`)

// 1단: 기록 주입 — 수입검사 관리대장(L2100-07) 1건
const rows = Array.from({ length: 30 }, () => ({}))
rows[0] = { no: '1', 품명: 'P1b 커버리지 검증', 입고lot: 'E2E-P1B', 공급사: '검증', 판정: '합격', 검사자: LOGIN }
const created = await api('form:submissionCreate', { formCode: 'L2100-07', values: { rows }, createdBy: LOGIN })
check('1단 기록 주입(L2100-07)', !!created.id, `submission #${created.id}`)

// 2단: 행렬 반영 — incoming 열 todayForms/todayRecords 증가·active
const after = await api('mesRecords:processLive', {})
const inc1 = after.columns.find((c) => c.key === 'incoming')
check('2단 todayForms 반영', inc1.todayForms === (inc0?.todayForms ?? 0) + 1, `${inc0?.todayForms ?? 0} → ${inc1.todayForms}`)
check('2단 todayRecords 반영', inc1.todayRecords === (inc0?.todayRecords ?? 0) + 1, `${inc0?.todayRecords ?? 0} → ${inc1.todayRecords}`)
check('2단 상태 = active(● 기록중)', inc1.status === 'active', `status=${inc1.status}`)
check('2단 원천에 앱 작성 포함', inc1.source.includes('앱 작성'), `source=${inc1.source}`)

// 3단: 공백 트리거 — 보드 lazy 평가로 데이터 트리거 이슈([데이터] 배지) 발행 확인
const board = await api('team:todayBoard', {})
const allTasks = [
  ...board.teams.flatMap((t) => t.tasks),
  ...(board.unassigned ?? [])
]
const triggerIssues = allTasks.filter((t) => t.triggerIssueId)
check('3단 데이터 트리거 발행([데이터] 배지 ≥1)', triggerIssues.length >= 1, `${triggerIssues.length}건 (M3 lazy 평가)`)

console.log(`\n합계: ${pass}/${pass + fail} 통과${fail ? ' — 실패 ' + fail : ''}`)
process.exit(fail ? 1 : 0)
