// ============================================================
// scripts/e2e-w4c-desktop.mjs — W4 배치C: 데스크톱 경로 주체방어 단언 (2026-08-13)
//
// 8/6 교훈("웹 경로만으로는 C-3류 못 잡음")의 상설 하네스화: 서버 STAMP 주입이 없는
// 경로(= 데스크톱 IPC 등가)에서 기록주체 빈 값이 전부 거부되는지를 핸들러 직접 호출로
// 단언한다. bridge.cjs(전 핸들러 shim 등록)를 HTTP 없이 부른다 — STAMP 미주입 = 데스크톱.
// M-1 수동 확인(사장님 30초 — 재빌드 앱에서 "사용자를 선택하세요" 육안 1회)의 기계 짝.
// 대상 = 복사본 DB 한정(IATF_DATA_DIR 필수 — 라이브 보호). 거부 경로만 호출 = 쓰기 0.
//   IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> node(electron) scripts/e2e-w4c-desktop.mjs
// ============================================================
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

if (!process.env.IATF_DATA_DIR || !process.env.E2E_DB) {
  console.error('사용법: IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> ... (라이브 보호 — 필수)')
  process.exit(1)
}

const { buildRoutes } = require('../server/dist/bridge.cjs')
const routes = buildRoutes()

let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }
const call = (ch, body) => Promise.resolve(routes.get(ch)(null, body))

const dbr = new Database(process.env.E2E_DB, { readonly: true })
const ITEM = '28236-2MAA0'
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const SUBJECT_RE = /주체|이름|사용자|세션|작성자/

// 기록/정비 쓰기 — 주체 빈 값 = 거부(각 채널의 M-1/C-3 방어선). 전부 거부 경로 = DB 쓰기 0.
const CASES = [
  ['semimes:lotIssue', { itemCode: ITEM }],
  ['semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, okQty: 1, ngQty: 0 }],
  ['semimes:inspRecordCreate', { inspDate: today, inspKind: '자주', itemCode: ITEM, samplePhase: '초품', judgment: '합격', values: [{ inspItem: '외경', sampleNo: 1, value: 8.02 }] }],
  ['semimes:workOrderUpsert', { itemCode: ITEM, orderQty: 10 }],
  ['semimes:recordCancel', { kind: 'prod', id: 999999, reason: '데스크톱 경로 검증' }],
  ['semimes:itemUpdate', { itemCode: ITEM, itemName: '무주체 갱신 시도' }],
  ['semimes:specSave', { itemCode: ITEM, inspKind: '자주', inspItem: '외경', method: '버니어', lower: 7.9, upper: 8.1 }],
  ['semimes:workCalendarSave', { ymd: today, workType: '조업' }],
  ['semimes:equipSave', { equipCode: 'W4C-EQ-X', name: 'W4C 무주체 설비' }],
  ['semimes:moldSave', { moldCode: 'W4C-MD-X', name: 'W4C 무주체 금형' }],
  ['semimes:ppmTargetSave', { value: 1 }]
]

const before = {
  prod: dbr.prepare('SELECT COUNT(*) c FROM prod_record').get().c,
  wo: dbr.prepare('SELECT COUNT(*) c FROM work_order').get().c,
  lot: dbr.prepare('SELECT COUNT(*) c FROM lot_registry').get().c
}

for (const [ch, body] of CASES) {
  try {
    const r = await call(ch, body)
    check(`${ch} — 주체 빈 값 거부`, r && r.success === false && SUBJECT_RE.test(r.error ?? ''), r && String(r.error ?? JSON.stringify(r)).slice(0, 60))
  } catch (e) {
    check(`${ch} — 주체 빈 값 거부`, false, String(e).slice(0, 80))
  }
}

// inspConfirm — 실존 미확인 검사기록으로 확인자 빈 값 거부(존재 확인이 주체 확인보다 앞)
{
  const rec = dbr.prepare('SELECT id FROM insp_record WHERE confirmed_at IS NULL AND canceled_at IS NULL LIMIT 1').get()
  if (rec) {
    const r = await call('semimes:inspConfirm', { id: rec.id })
    check('semimes:inspConfirm — 확인자 빈 값 거부', r && r.success === false && SUBJECT_RE.test(r.error ?? ''), r && r.error)
  } else {
    check('semimes:inspConfirm — 확인자 빈 값 거부', false, '미확인 검사기록 픽스처 없음')
  }
}

// 0141 감사 축 — 상태 전이도 무주체 거부(기존 E2E-WO 행 사용, 전이 미성립 = 행 불변)
{
  const wo = dbr.prepare("SELECT id FROM work_order WHERE order_no LIKE 'E2E-WO-%' LIMIT 1").get()
  if (wo) {
    const r = await call('semimes:workOrderUpsert', { id: wo.id, status: '취소' })
    check('semimes:workOrderUpsert 상태 전이 — 무주체 거부(0141 각인 축)', r && r.success === false && SUBJECT_RE.test(r.error ?? ''), r && r.error)
  } else {
    check('semimes:workOrderUpsert 상태 전이 — 무주체 거부(0141 각인 축)', false, 'E2E-WO 픽스처 없음')
  }
}

// 거부 경로 = 쓰기 0 검산(기록 3축 행 수 불변)
{
  const after = {
    prod: dbr.prepare('SELECT COUNT(*) c FROM prod_record').get().c,
    wo: dbr.prepare('SELECT COUNT(*) c FROM work_order').get().c,
    lot: dbr.prepare('SELECT COUNT(*) c FROM lot_registry').get().c
  }
  check('거부 전량 = DB 쓰기 0(prod·wo·lot 행 수 불변)',
    before.prod === after.prod && before.wo === after.wo && before.lot === after.lot,
    `prod ${before.prod}→${after.prod} wo ${before.wo}→${after.wo} lot ${before.lot}→${after.lot}`)
}

dbr.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
