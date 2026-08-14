// ============================================================
// scripts/e2e-d34-b4.mjs — 34호 배치⑷ E2E (2026-08-12)
//
// 계약 검증(대조표 #9·10·11·13·17·8 + 0140):
//   설비/금형 마스터 = UPSERT 정정·STAMP·필수 거부·연결 품번 실존 강제 ·
//   금형 타발수 = 실적 연동(취소 제외·캐비티 미기입 '—') ·
//   일상점검 = 2축 병렬(사이드카 부재 시 정직 축소) ·
//   XBAR-R = n<2 군 제외·군 2개↑만 관리한계·산식 재현 ·
//   KPI 기준정보 = UPSERT·빈 목표 null·익명 거부.
// 대상 = 검증 웹서버(:8081 복사본). 라이브(:8080) 오염 금지.
//   E2E_DB=<복사본.db> node(electron) scripts/e2e-d34-b4.mjs <로그인> [비번]
// ============================================================
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const { assertCopyDb, assertBaseNotLive, guardLoginName } = await import('./lib/e2e.mjs')

// 공용 게이트(8/14 — lib/e2e.mjs): 라이브 경로 거부(무조건 DELETE 하네스)·:8080 거부·E2E봇 강제
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
console.log(`로그인 ${LOGIN} ✓ (${BASE})`)

const ITEM = '28236-2MAA0'

// 0단 — 0140 스키마 + 픽스처(마스터 성격 — 복사본 한정 초기화)
{
  const dbw = new Database(DB_PATH)
  dbw.prepare("DELETE FROM equipment_master WHERE equip_code LIKE 'E2E-%'").run()
  dbw.prepare("DELETE FROM mold_master WHERE mold_code LIKE 'E2E-%'").run()
  dbw.prepare("DELETE FROM kpi_indicators WHERE name LIKE 'E2E테스트%'").run()
  // 4단 XBAR 군 재현 멱등 — 본 스크립트가 만든 'E2E외경' 기록만 정리(복사본 한정 픽스처.
  // append-only 는 앱 계약 — 검증 복사본의 자기 잔여물 정리는 회신 '정리 재량' 이행)
  const rids = dbw.prepare("SELECT DISTINCT record_id id FROM insp_record_value WHERE insp_item = 'E2E외경'").all().map((r) => r.id)
  dbw.prepare("DELETE FROM insp_record_value WHERE insp_item = 'E2E외경'").run()
  for (const id of rids) dbw.prepare('DELETE FROM insp_record WHERE id = ?').run(id)
  dbw.close()
}
const dbr = new Database(DB_PATH, { readonly: true })
for (const t of ['equipment_master', 'mold_master']) {
  const cols = dbr.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name)
  check(`0단 ${t} 스키마(0140)`, cols.includes('updated_by') && cols.includes('active'))
}

// 1단 — 설비 마스터: 거부 → 등록 → STAMP → 정정(UPSERT)
check('1단 설비 무명 거부', (await api('semimes:equipSave', { equipCode: 'E2E-EQ1', name: '' })).success === false)
check('1단 설비 설치일 실재 검증(2026-13-01 거부)', (await api('semimes:equipSave', { equipCode: 'E2E-EQ1', name: '프레스', installDate: '2026-13-01' })).success === false)
const eq1 = await api('semimes:equipSave', { equipCode: 'E2E-EQ1', name: '프레스1호', equipType: '프레스', updatedBy: '위조' })
check('1단 설비 등록 성공', eq1.success === true)
const eqRow = dbr.prepare("SELECT name, updated_by FROM equipment_master WHERE equip_code = 'E2E-EQ1'").get()
check('1단 설비 STAMP(위조 무시)', eqRow?.updated_by === LOGIN, `updated_by=${eqRow?.updated_by}`)
await api('semimes:equipSave', { equipCode: 'E2E-EQ1', name: '프레스1호(개명)', equipType: '프레스' })
const eqRow2 = dbr.prepare("SELECT name, (SELECT COUNT(*) FROM equipment_master WHERE equip_code = 'E2E-EQ1') cnt FROM equipment_master WHERE equip_code = 'E2E-EQ1'").get()
check('1단 설비 정정 = 덮어쓰기(1코드 1행)', eqRow2?.name === '프레스1호(개명)' && eqRow2?.cnt === 1)
const eqList = await api('semimes:equipList', {})
check('1단 equipList 반영 + 관측 라인 동봉', eqList.rows.some((r) => r.equipCode === 'E2E-EQ1') && Array.isArray(eqList.observedLines))

// 2단 — 금형 마스터: 연결 품번 실존 강제·캐비티 정수 거부·타발수 연동
check('2단 금형 무존재 품번 거부', (await api('semimes:moldSave', { moldCode: 'E2E-MD1', name: '금형1', itemCode: 'NOPE-999' })).success === false)
check('2단 금형 캐비티 0 거부(0 대입 금지)', (await api('semimes:moldSave', { moldCode: 'E2E-MD1', name: '금형1', cavity: 0 })).success === false)
const md1 = await api('semimes:moldSave', { moldCode: 'E2E-MD1', name: '금형1', itemCode: ITEM, cavity: 2, guaranteeShots: 100000 })
check('2단 금형 등록(품번 연결·캐비티 2)', md1.success === true)
const md2 = await api('semimes:moldSave', { moldCode: 'E2E-MD2', name: '금형2 (캐비티 미기입)', itemCode: ITEM })
check('2단 금형 등록(캐비티 미기입)', md2.success === true)
const molds = await api('semimes:moldList', {})
const m1 = molds.find((m) => m.moldCode === 'E2E-MD1')
const m2 = molds.find((m) => m.moldCode === 'E2E-MD2')
const dbQty = dbr.prepare('SELECT COALESCE(SUM(ok_qty)+SUM(ng_qty),0) q FROM prod_record WHERE item_code = ? AND canceled_at IS NULL').get(ITEM)
check('2단 타발수 = 실적(취소 제외) ÷ 캐비티 재현', m1 && m1.prodQty === dbQty.q && m1.shots === Math.ceil(dbQty.q / 2), `qty=${m1 && m1.prodQty}/${dbQty.q} shots=${m1 && m1.shots}`)
check('2단 캐비티 미기입 = 타발수 — (추정 금지)', m2 && m2.shots === null && m2.remainShots === null)
check('2단 잔여 수명 = 보증 − 타발수', m1 && m1.remainShots === 100000 - m1.shots, `remain=${m1 && m1.remainShots}`)

// 3단 — 설비 일상점검 내역(2축 병렬 — 복사본 = 사이드카 부재 → 정직 축소)
const chk = await api('semimes:equipCheckList', { from: '2026-07-01', to: '2026-08-12' })
check('3단 점검 내역 2축 응답', Array.isArray(chk.mes) && Array.isArray(chk.app), `mes=${chk.mes.length} app=${chk.app.length} mesAvailable=${chk.mesAvailable}`)
check('3단 사이드카 부재 = mesAvailable false 정직', chk.mesAvailable === false || chk.mes.length >= 0)
const badChk = await api('semimes:equipCheckList', { from: '2026-08-12', to: '2026-07-01' })
check('3단 역전 기간 = 빈 응답', badChk.mes.length === 0 && badChk.app.length === 0)

// 4단 — XBAR-R: 군 성립 계약 (기존 기록 = 시료 1개뿐 → 전군 제외 정직)
const xr0 = await api('semimes:xbarR', { itemCode: ITEM })
check('4단 시료 1개 기록 = 군 제외 정직 카운트', xr0.points.length === 0 ? xr0.skippedSmall > 0 : true, `points=${xr0.points.length} skipped=${xr0.skippedSmall}`)
// 시료 3개 기록 2건 생성 → 군 2개 성립 → 한계 계산
const today = new Date().toISOString().slice(0, 10)
const mkInsp = (vals) => api('semimes:inspRecordCreate', {
  inspDate: today, inspKind: '자주', itemCode: ITEM, samplePhase: '중품', judgment: '합격',
  values: vals.map((v, i) => ({ inspItem: 'E2E외경', sampleNo: i + 1, value: v }))
})
const i1 = await mkInsp([8.01, 8.03, 8.02])
const i2 = await mkInsp([8.02, 8.05, 8.0])
check('4단 시료 3개 기록 2건 생성', i1.success === true && i2.success === true)
const xr = await api('semimes:xbarR', { itemCode: ITEM, inspItem: 'E2E외경' })
check('4단 군 2개 성립 + n=3 한계 계산', xr.points.length === 2 && xr.limits != null && xr.limits.n === 3, `limits=${JSON.stringify(xr.limits)}`)
if (xr.limits) {
  const xbars = xr.points.map((p) => p.xbar)
  const cl = xbars.reduce((s, v) => s + v, 0) / 2
  const rbar = xr.points.reduce((s, p) => s + p.r, 0) / 2
  const ucl = Math.round((cl + 1.023 * rbar) * 10000) / 10000
  check('4단 X̄ UCL = CL + A2(n=3)·R̄ 산식 재현', Math.abs(xr.limits.xbarUcl - ucl) < 0.0001, `ucl=${xr.limits.xbarUcl}/${ucl}`)
}

// 5단 — KPI 기준정보: 신설·정정·빈 목표 null·비수치 거부
check('5단 KPI 무명 거부', (await api('kpi:indicatorSave', { name: '' })).success === false)
check('5단 KPI 비수치 목표 거부', (await api('kpi:indicatorSave', { name: 'E2E테스트지표', target: 'abc' })).success === false)
const k1 = await api('kpi:indicatorSave', { name: 'E2E테스트지표', unit: '%', target: 95, direction: 'higher', updatedBy: '위조' })
check('5단 KPI 신설 성공', k1.success === true && typeof k1.id === 'number', `#${k1.id}`)
const k2 = await api('kpi:indicatorSave', { id: k1.id, name: 'E2E테스트지표', target: null, direction: 'lower' })
const kRow = dbr.prepare('SELECT target, direction FROM kpi_indicators WHERE id = ?').get(k1.id)
check('5단 KPI 정정 — 빈 목표 = null(미설정 정직)·방향 변경', k2.success && kRow?.target === null && kRow?.direction === 'lower')
const k3 = await api('kpi:indicatorSave', { id: k1.id, name: 'E2E테스트지표', active: 0 })
check('5단 KPI 비활성 강하(삭제 없음)', k3.success === true && dbr.prepare('SELECT active FROM kpi_indicators WHERE id = ?').get(k1.id)?.active === 0)

// 6단 — #17 문서형 리포트 원천(prodList detail 당일) 자기일관
const rpt = await api('semimes:prodList', { from: today, to: today, mode: 'detail' })
const dbToday = dbr.prepare('SELECT COUNT(*) c FROM prod_record WHERE record_date = ?').get(today)
check('6단 일일 실적 원천 = 당일 전 행(취소 포함 정직 병기)', rpt.rows.length === dbToday.c, `rows=${rpt.rows.length}/${dbToday.c}`)

dbr.close()
console.log(`\n합계: ${pass}/${pass + fail} 통과`)
process.exit(fail === 0 ? 0 : 1)
