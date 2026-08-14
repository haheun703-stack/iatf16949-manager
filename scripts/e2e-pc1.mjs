// ============================================================
// scripts/e2e-pc1.mjs — PC-1 기록 쓰기 E2E (2026-08-06)
//
// 계약 검증(29번 §4 + §10-1 + PC 견적): 발번 유일성 · 실측값 강제 거부 · 불량유형 강제 ·
// 자주 초중종 필수 · spec_revision/sample_phase 각인 · STAMP 위조 무시 · 취소 사유 필수 ·
// 자기확인 금지 · todayRecords 반영 · sidecar 모드 쓰기 거부 · 작업지시 발번/상태/진척.
// 대상 = 검증 웹서버(:8081 복사본). 실행: electron-node (better-sqlite3 직접 단언 동반)
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-pc1.mjs 서규하 e2e-g1
// ============================================================
import { createRequire } from 'module'
import { assertCopyDb, assertBaseNotLive, guardLoginName, ymdKST } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부·E2E봇 로그인 강제
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
// 복사본 서버 게이트(M-13 공용화): health.copy ≠ true = 라이브 DB 서버 — 즉시 중단
{
  const hj = await (await fetch(`${BASE}/api/health`, { headers: { cookie } })).json().catch(() => null)
  if (!hj || hj.copy !== true) { console.error(`[e2e-guard] 복사본 서버 아님(copy=${hj && hj.copy}) — 중단`); process.exit(1) }
}
console.log(`로그인 ${LOGIN} ✓`)

// 0단 — 0137 스키마
const dbr = new Database(DB_PATH, { readonly: true })
for (const t of ['prod_record', 'insp_record', 'mat_receipt']) {
  const cols = dbr.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
  check(`0단 ${t} 취소 컬럼 3종`, ['canceled_at', 'cancel_reason', 'canceled_by'].every((c) => cols.includes(c)))
}
const ITEM = '28236-2MAA0'

// 1단 — scanResolve
const ctx = await api('semimes:scanResolve', { query: ITEM })
check('1단 scanResolve found·라우팅', ctx.found === true && Array.isArray(ctx.routing), `routing=${ctx.routing.length}`)

// 2단 — lotIssue 멱등·유일성 (8/12 재봉합 계약: 미사용 발번 재사용 · 사용 후에만 차수 증가)
// 픽스처: 미사용 자체발번 잔여물 정리(복사본 한정 — 검수 회신 '정리 재량' 이행. 취소 기록이
// 참조한 LOT도 '사용'으로 본다 — 번호가 기록에 각인된 이상 재발급 금지, 서버 계약과 동일)
{
  const dbw = new Database(DB_PATH)
  dbw.prepare(
    `DELETE FROM lot_registry WHERE item_code = ? AND source = '자체발번'
       AND NOT EXISTS (SELECT 1 FROM prod_record p WHERE p.lot_no = lot_registry.lot_no)
       AND NOT EXISTS (SELECT 1 FROM insp_record i WHERE i.lot_no = lot_registry.lot_no)`
  ).run(ITEM)
  dbw.close()
}
const l1 = await api('semimes:lotIssue', { itemCode: ITEM, createdBy: '위조' })
const lotRe = new RegExp(`^${ITEM}-\\d{6}-\\d+$`)
check('2단 발번 형식 품번-YYMMDD-차수', l1.success && lotRe.test(l1.lotNo), l1.lotNo)
// 코워크 재봉합 지시 ③: 연타 프로브 = 실제 동시 2발(더블클릭 등가 — await 없이 나란히 발사)
const [la, lb] = await Promise.all([
  api('semimes:lotIssue', { itemCode: ITEM }),
  api('semimes:lotIssue', { itemCode: ITEM })
])
check('2단 더블클릭(동시 2발) = 같은 번호(서버 멱등 — 미사용 재사용)',
  la.success && lb.success && la.lotNo === lb.lotNo && la.lotNo === l1.lotNo,
  `${la.lotNo} = ${lb.lotNo}`)
const lotRow = dbr.prepare('SELECT created_by FROM lot_registry WHERE lot_no = ?').get(l1.lotNo)
check('2단 발번 STAMP(위조 무시)', lotRow?.created_by === LOGIN, `created_by=${lotRow?.created_by}`)

// 3단 — prodRecordCreate 계약 (8/13 검수 슬러지: UTC 오용 → KST 공용식)
const today = ymdKST()
check('3단 불량>0 무유형 거부', (await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 10, ngQty: 2 })).success === false)
check('3단 0/0 거부', (await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 0, ngQty: 0 })).success === false)
const prod = await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, lotNo: l1.lotNo, okQty: 100, ngQty: 0, worker: '위조작업자' })
check('3단 정상 실적 저장', prod.success === true, `#${prod.id}`)
const prow = dbr.prepare('SELECT worker FROM prod_record WHERE id = ?').get(prod.id)
check('3단 실적 STAMP(위조 무시)', prow?.worker === LOGIN, `worker=${prow?.worker}`)
// 사용(실적 각인) 후의 발번만 새 차수 — 유일성 계약 불변(재봉합의 나머지 반쪽)
const l3 = await api('semimes:lotIssue', { itemCode: ITEM })
check('3단 사용 후 발번 = 새 차수(유일성 불변)', l3.success && l3.lotNo !== l1.lotNo && l3.reused !== true, `${l1.lotNo} → ${l3.lotNo}`)

// 4단 — inspRecordCreate 계약 + §10-1 각인
check('4단 자주 초중종 누락 거부', (await api('semimes:inspRecordCreate', { inspDate: today, inspKind: '자주', itemCode: ITEM, judgment: '합격', values: [{ inspItem: '외경', sampleNo: 1, value: 8.02 }] })).success === false)
check('4단 비수치 측정값 거부', (await api('semimes:inspRecordCreate', { inspDate: today, inspKind: '자주', itemCode: ITEM, samplePhase: '초품', judgment: '합격', values: [{ inspItem: '외관', sampleNo: 1, value: 'OK' }] })).success === false)
const insp = await api('semimes:inspRecordCreate', {
  inspDate: today, inspKind: '자주', itemCode: ITEM, lotNo: l1.lotNo, samplePhase: '초품',
  judgment: '합격', values: [{ inspItem: '외경', sampleNo: 1, value: 8.02 }], inspector: '위조검사자'
})
check('4단 정상 검사 저장(+제안 동봉)', insp.success === true && typeof insp.suggestion === 'string', insp.suggestion)
const irow = dbr.prepare('SELECT inspector, sample_phase, spec_revision FROM insp_record WHERE id = ?').get(insp.id)
check('4단 검사 STAMP(위조 무시)', irow?.inspector === LOGIN, `inspector=${irow?.inspector}`)
check('4단 §10-1 각인(sample_phase·spec_revision 필드)', irow?.sample_phase === '초품' && 'spec_revision' in (irow ?? {}), `phase=${irow?.sample_phase} rev=${irow?.spec_revision}`)

// 5단 — 확인자 2단: 자기확인 금지(검사자 = 세션 = 확인자 → 거부)
check('5단 자기확인 금지', (await api('semimes:inspConfirm', { id: insp.id, confirmer: '위조' })).success === false)

// 6단 — recordCancel: 사유 필수·1회 (빈 사유는 서버 REQUIRED 게이트가 400으로 선차단 — 이중 방어)
let emptyReasonRejected = false
try {
  const r = await api('semimes:recordCancel', { kind: 'prod', id: prod.id, reason: '' })
  emptyReasonRejected = r.success === false
} catch (e) {
  emptyReasonRejected = /필수 값 누락|400/.test(String(e))
}
check('6단 취소 사유 누락 거부(서버 게이트 400 = 이중 방어)', emptyReasonRejected)
const cxl = await api('semimes:recordCancel', { kind: 'prod', id: prod.id, reason: '수량 오기입 — 재입력', canceledBy: '위조' })
check('6단 사유 취소 성공', cxl.success === true)
check('6단 이중 취소 거부', (await api('semimes:recordCancel', { kind: 'prod', id: prod.id, reason: '재차' })).success === false)
const crow = dbr.prepare('SELECT cancel_reason, canceled_by FROM prod_record WHERE id = ?').get(prod.id)
check('6단 취소 STAMP·사유 각인', crow?.canceled_by === LOGIN && !!crow?.cancel_reason, `by=${crow?.canceled_by}`)

// 7단 — todayRecords 반영(취소 플래그 포함)
const t = await api('semimes:todayRecords', {})
check('7단 오늘 기록 반영', t.prod.some((r) => r.id === prod.id && r.canceled === true) && t.insp.some((r) => r.id === insp.id), `prod=${t.prod.length} insp=${t.insp.length}`)

// 8단 — 작업지시: 발번·상태·진척
// W4-B 편승⑴: 발번 주체(세션)가 E2E봇이면 'E2E-WO-' 접두 — 실지시 번호대(WO-)와 분리.
const woPrefix = LOGIN === 'E2E봇' ? 'E2E-WO-' : 'WO-'
const wo = await api('semimes:workOrderUpsert', { itemCode: ITEM, orderQty: 500, createdBy: '위조' })
check(`8단 지시 발번 ${woPrefix}YYMMDD-nn(주체별 접두)`, wo.success && new RegExp(`^${woPrefix}\\d{6}-\\d{2}$`).test(wo.orderNo), wo.orderNo)
await api('semimes:workOrderUpsert', { id: wo.id, status: '진행' })
const prod2 = await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 50, ngQty: 0, workOrderId: wo.id })
const wl = await api('semimes:workOrderList', {})
const wrow = wl.find((r) => r.id === wo.id)
check('8단 상태 전이·진척(양품 합, 취소 제외)', wrow?.status === '진행' && wrow?.okSum === 50, `status=${wrow?.status} okSum=${wrow?.okSum}`)
void prod2

// 9단 — sidecar 모드 쓰기 거부 (복사본 설정 직접 전환 → 복원)
// C-2 잔여(8/13 검수): 전환~복원 사이 예외로 죽으면 기록 쓰기가 잠긴 채 남는다 → try/finally
const dbw = new Database(DB_PATH)
let blocked
try {
  dbw.prepare("INSERT INTO app_config (key, value) VALUES ('semimes.recordSource', 'sidecar') ON CONFLICT(key) DO UPDATE SET value = 'sidecar'").run()
  blocked = await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 1, ngQty: 0 })
} finally {
  dbw.prepare("DELETE FROM app_config WHERE key = 'semimes.recordSource'").run()
  dbw.close()
}
check('9단 sidecar 모드 쓰기 거부', blocked.success === false && /sidecar/.test(blocked.error ?? ''), blocked.error?.slice(0, 40))
const again = await api('semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 1, ngQty: 0 })
check('9단 direct 복원 후 저장', again.success === true)
await api('semimes:recordCancel', { kind: 'prod', id: again.id, reason: 'E2E 정리' })

console.log(`\n합계: ${pass}/${pass + fail} 통과${fail ? ' — 실패 ' + fail : ''}`)
process.exit(fail ? 1 : 0)
