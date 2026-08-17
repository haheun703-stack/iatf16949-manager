// ============================================================
// scripts/e2e-g1-inbox.mjs — G1 수집함 E2E (2026-08-05)
//
// 검수 게이트(29번 §7·§10-1 + M1 §5 B-3):
//   0단 = §10-1 스키마 단언(★첫 검수 항목): insp_spec revision 축(UNIQUE 포함)·
//         insp_record spec_revision/sample_phase/confirmer/confirmed_at·mat_receipt capture_id/receipt_class
//   1단 = captureCreate(입고) → 미분류 등재
//   2단 = captureTag 다품목 2행 → mat_receipt 2행(사진 1:N) + 태깅완료 + STAMP(클라 위조 createdBy 무시) 실증
//   3단 = 재태깅 거부(append-only) · 유효성 거부(무등록 거래처/품번·kind 위조)
//   4단 = team:todayBoard → T4 [수입검사 도래] 발행(당일 = due) → L2100-07 기입 → 해소표시
//   5단 = itemSearch 응답 · 출하(receipt_out) 태깅 = mat_receipt 0행(15번 경계)
// 대상 = 검증 웹서버(복사본 DB, :8081) — 라이브(:8080) 오염 금지.
// 실행: E2E_BASE=http://127.0.0.1:8081 E2E_DB=<복사본.db> node scripts/e2e-g1-inbox.mjs <로그인이름> [비번]
// ============================================================
import Database from 'better-sqlite3'
import { assertCopyDb, assertBaseNotLive, guardLoginName, ymdKST, assertCopyServer } from './lib/e2e.mjs'

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부·:8080 거부·E2E봇 로그인 강제
const BASE = assertBaseNotLive(process.env.E2E_BASE || 'http://127.0.0.1:8081')
const DB_PATH = assertCopyDb(process.env.E2E_DB)
const LOGIN = guardLoginName(process.argv[2])
const PW = process.argv[3] || 'qms1234'

let pass = 0, fail = 0
const check = (name, ok, detail) => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`)
  ok ? pass++ : fail++
}

// ── 0단: §10-1 스키마 단언 (직접 열람 — 읽기 전용) ──
const db = new Database(DB_PATH, { readonly: true })
const cols = (t) => db.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
const specCols = cols('insp_spec')
check('0단 insp_spec.revision 존재', specCols.includes('revision'))
check('0단 insp_spec.rev_date 존재', specCols.includes('rev_date'))
const uniqIdx = db.prepare(`PRAGMA index_list(insp_spec)`).all().filter((i) => i.unique)
const uniqCols = uniqIdx.flatMap((i) => db.prepare(`PRAGMA index_info(${i.name})`).all().map((c) => c.name))
check('0단 insp_spec UNIQUE 에 revision 포함(개정=신규 행)', uniqCols.includes('revision'), `unique=[${uniqCols.join(',')}]`)
const recCols = cols('insp_record')
for (const c of ['spec_revision', 'sample_phase', 'confirmer', 'confirmed_at']) {
  check(`0단 insp_record.${c} 존재`, recCols.includes(c))
}
const mrCols = cols('mat_receipt')
check('0단 mat_receipt.capture_id·receipt_class 존재', mrCols.includes('capture_id') && mrCols.includes('receipt_class'))

// 태깅 재료: 실존 마스터에서 조달(가짜 코드 금지)
const partner = db.prepare(`SELECT partner_code AS c, name FROM partner WHERE active=1 AND partner_type='자재공급처' AND partner_code IS NOT NULL LIMIT 1`).get()
const items2 = db.prepare(`SELECT item_code AS c FROM item_master WHERE active=1 ORDER BY item_code LIMIT 2`).all()
check('0단 시드 재료(거래처 1·품목 2)', !!partner && items2.length === 2, `${partner?.c} · ${items2.map((i) => i.c).join(',')}`)

// ── 로그인 ──
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
// 복사본 서버 하드 게이트 — Minor 8(8/14 검수 2차): 이 4줄이 하네스 7개에 복붙돼 있었다.
// lib 수출을 실제로 쓰게 회수(그 표류가 N-4 소프트 게이트의 원인이었다).
await assertCopyServer(BASE, cookie)
console.log(`로그인: ${LOGIN} ✓ (${BASE})`)

const today = ymdKST() // 8/13 검수 슬러지: 날짜식 복제 → lib 공용식

// ── 1단: captureCreate (더미 바이트 512B — 데이터 흐름 검증용. 실사진 리허설은 검수 캡처로) ──
const fakeJpeg = Buffer.alloc(512, 7).toString('base64')
const created = await api('semimes:captureCreate', { kind: 'receipt_in', imageBase64: fakeJpeg, createdBy: '위조촬영자' })
check('1단 captureCreate 성공', created.success === true, `capture #${created.id}`)
const capId = created.id
const list1 = await api('semimes:captureList', {})
const row1 = list1.rows.find((r) => r.id === capId)
check('1단 미분류 등재 + STAMP(위조 촬영자 무시)', row1?.status === '미분류' && row1?.createdBy === LOGIN, `createdBy=${row1?.createdBy}`)
check('1단 잘못된 kind 거부', (await api('semimes:captureCreate', { kind: 'memo', imageBase64: fakeJpeg })).success === false)

// ── 2단: 다품목 태깅 → 수불 2행 (사진 1:N) ──
const tag = await api('semimes:captureTag', {
  captureId: capId, kind: 'receipt_in', docDate: today, partnerCode: partner.c,
  items: [
    { itemCode: items2[0].c, qty: 1500, vendorLot: 'E2E-VLOT-1' },
    { itemCode: items2[1].c, qty: 2000, vendorLot: null } // 업체LOT 공란 허용(M1 §0-2)
  ],
  note: 'G1 E2E 리허설', createdBy: '위조태깅자'
})
check('2단 captureTag 성공(수불 2행)', tag.success === true && (tag.receiptIds?.length ?? 0) === 2, `receiptIds=${tag.receiptIds?.join(',')}`)
const db2 = new Database(DB_PATH, { readonly: true })
const receipts = db2.prepare(`SELECT receipt_date, item_code, qty, receipt_class, created_by, vendor_lot FROM mat_receipt WHERE capture_id = ?`).all(capId)
check('2단 mat_receipt 1:N 실증(2행·입고구분 원자재 초안)', receipts.length === 2 && receipts.every((r) => r.receipt_class === '원자재'), `${receipts.length}행 · class=${receipts[0]?.receipt_class}`)
check('2단 수불 created_by = 세션(STAMP — 위조 무시)', receipts.every((r) => r.created_by === LOGIN), `created_by=${receipts[0]?.created_by}`)
check('2단 업체LOT 공란 보존(억지 기입 없음)', receipts.some((r) => r.vendor_lot === null))
const list2 = await api('semimes:captureList', {})
const row2 = list2.rows.find((r) => r.id === capId)
check('2단 태깅완료·요약 반영', row2?.status === '태깅완료' && row2?.itemCount === 2 && row2?.receiptRows === 2, `items=${row2?.itemCount} · rows=${row2?.receiptRows}`)

// ── 3단: 거부 계약 ──
check('3단 재태깅 거부(append-only)', (await api('semimes:captureTag', { captureId: capId, kind: 'receipt_in', docDate: today, partnerCode: partner.c, items: [{ itemCode: items2[0].c, qty: 1 }] })).success === false)
const capB = await api('semimes:captureCreate', { kind: 'receipt_in', imageBase64: fakeJpeg })
check('3단 무등록 거래처 거부', (await api('semimes:captureTag', { captureId: capB.id, kind: 'receipt_in', docDate: today, partnerCode: 'P-NOPE-999', items: [{ itemCode: items2[0].c, qty: 1 }] })).success === false)
check('3단 무등록 품번 거부', (await api('semimes:captureTag', { captureId: capB.id, kind: 'receipt_in', docDate: today, partnerCode: partner.c, items: [{ itemCode: 'NOPE-00000', qty: 1 }] })).success === false)
check('3단 수량 0 거부(실측값 강제)', (await api('semimes:captureTag', { captureId: capB.id, kind: 'receipt_in', docDate: today, partnerCode: partner.c, items: [{ itemCode: items2[0].c, qty: 0 }] })).success === false)

// ── 4단: T4 트리거 — 발행(당일 due) → L2100-07 기입 → 해소표시 ──
const board1 = await api('team:todayBoard', {})
const tasks1 = [...board1.teams.flatMap((t) => t.tasks), ...(board1.unassigned ?? [])]
const t4a = tasks1.find((t) => t.title.includes('[수입검사 도래]') && t.dueDate === today)
check('4단 T4 발행([수입검사 도래]·입고일 버킷)', !!t4a, t4a?.title)
check('4단 당일 = due(overdue 아님)', t4a?.status === 'due', `status=${t4a?.status}`)
const inspRows = Array.from({ length: 30 }, () => ({}))
inspRows[0] = { no: '1', 품명: 'G1 E2E 수입검사', 판정: '합격', 검사자: LOGIN }
const sub = await api('form:submissionCreate', { formCode: 'L2100-07', values: { rows: inspRows }, createdBy: LOGIN })
check('4단 수입검사 이력카드 기입', !!sub.id, `submission #${sub.id}`)
const board2 = await api('team:todayBoard', {})
const tasks2 = [...board2.teams.flatMap((t) => t.tasks), ...(board2.unassigned ?? [])]
const t4b = tasks2.find((t) => t.title.includes('[수입검사 도래]') && t.dueDate === today)
check('4단 기록 감지 → 해소표시(✓는 사람)', t4b?.triggerResolved === true && t4b?.status !== 'done', `resolved=${t4b?.triggerResolved}`)

// ── 5단: itemSearch · 출하 경계 ──
const found = await api('semimes:itemSearch', { query: items2[0].c.slice(0, 5) })
check('5단 itemSearch 응답', Array.isArray(found) && found.length >= 1, `${found.length}건`)
const capOut = await api('semimes:captureCreate', { kind: 'receipt_out', imageBase64: fakeJpeg })
const tagOut = await api('semimes:captureTag', { captureId: capOut.id, kind: 'receipt_out', docDate: today, partnerCode: partner.c, items: [{ itemCode: items2[0].c, qty: 4000 }] })
const db3 = new Database(DB_PATH, { readonly: true })
const outRows = db3.prepare(`SELECT COUNT(*) AS c FROM mat_receipt WHERE capture_id = ?`).get(capOut.id)
check('5단 출하 = mat_receipt 0행(수불부 금지 경계)', tagOut.success === true && outRows.c === 0, `rows=${outRows.c}`)

console.log(`\n합계: ${pass}/${pass + fail} 통과${fail ? ' — 실패 ' + fail : ''}`)
process.exit(fail ? 1 : 0)
