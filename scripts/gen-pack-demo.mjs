#!/usr/bin/env node
// ============================================================
// scripts/gen-pack-demo.mjs — 데모 팩 생성 (M4 판매 v1 패키지, 2026-08-25)
//
// 무엇인가: 시연용 **가상 회사 하나**를 통째로 만든다. 표준팩(업종중립 골격) 위에 얹어
//   `IATF_INSTALL_PACKS=standard,demo` 로 클린 설치하면, 빈 화면이 아니라 **살아 있는 화면**이
//   뜬다 — 기준정보·작업지시·생산실적·검사기록이 최근 2주치로 채워진 상태.
//
// 왜 생성기인가(손편집 금지): 날짜가 상대식이어야 하고(언제 설치해도 "최근 2주"),
//   품번×공정×LOT×검사값이 서로 아귀가 맞아야 한다. 손으로 쓰면 어긋난다.
//
// 산출: resources/packs/demo/200_demo_master.sql · 210_demo_records.sql
//   날짜는 SQL 의 date('now','-N day') 로 박는다 → **설치 시점 기준**으로 계산된다.
//
// 가상 회사 = 주식회사 한빛정밀(경기 화성). 사람·거래처·품번 전부 가공이며,
//   TPC 식별자·실명과 겹치지 않는지 생성 끝에 스스로 검사한다(겹치면 쓰지 않고 중단).
//
// 구동: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\gen-pack-demo.mjs
// ============================================================
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(REPO, 'resources', 'packs', 'demo')

// ── 재현 가능한 난수(같은 입력 → 같은 팩). Math.imul 로 32비트 안에서만 곱한다. ──
let seed = 20260825
const rnd = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 0x100000000
}
const pick = (a) => a[Math.floor(rnd() * a.length)]
const int = (lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1))

const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const n = (v) => (v === null || v === undefined ? 'NULL' : String(v))
/** 오늘로부터 d일 전(음수면 미래)의 날짜식 — 설치 시점에 계산된다. */
const dayExpr = (d) => (d === 0 ? "date('now')" : `date('now','${d > 0 ? '-' : '+'}${Math.abs(d)} day')`)

// ── 가상 회사 ────────────────────────────────────────────────────────────────
const COMPANY = {
  companyName: '주식회사 한빛정밀',
  companyNameShort: '한빛정밀',
  companyNameEn: 'HANBIT',
  ceoName: '김서준',
  address: '경기도 화성시 동탄산단로 128',
  phone: '(031)555-0100',
  fax: '(031)555-0101',
  factoryName: '1공장 정밀부품사업부',
  divisionLabel: '정밀부품사업부',
  plant: '1공장',
  processes: '절단/성형/용접/도장/검사/포장',
  products: '자동차용 브래킷, 파이프 어셈블리, 스티어링 마운트',
  revisionNumber: 'REV.1',
  defaultAuthor: '박지호'
}

const TEAMS = [
  { id: 'T-MGT', name: '경영지원팀' },
  { id: 'T-QA', name: '품질보증팀' },
  { id: 'T-PROD', name: '생산팀' },
  { id: 'T-TECH', name: '기술팀' },
  { id: 'T-MAT', name: '자재팀' }
]

const PERSONS = [
  { id: 'P-001', name: '김서준', team: 'T-MGT', role: '대표이사', email: 'ceo@hanbit-demo.example' },
  { id: 'P-002', name: '박지호', team: 'T-MGT', role: '관리팀장', email: 'mgmt@hanbit-demo.example' },
  { id: 'P-003', name: '이수아', team: 'T-QA', role: '품질팀장', email: 'qa@hanbit-demo.example' },
  { id: 'P-004', name: '정민재', team: 'T-PROD', role: '생산팀장', email: 'prod@hanbit-demo.example' },
  { id: 'P-005', name: '최은우', team: 'T-QA', role: '검사원', email: null },
  { id: 'P-006', name: '한도윤', team: 'T-PROD', role: '작업자', email: null },
  { id: 'P-007', name: '오세림', team: 'T-TECH', role: '기술주임', email: null },
  { id: 'P-008', name: '류가온', team: 'T-MAT', role: '자재담당', email: null }
]

const PARTNERS = [
  { code: 'C-1001', name: '대성모빌리티', type: '고객', ceo: '윤태경' },
  { code: 'C-1002', name: '신우오토텍', type: '고객', ceo: '배성현' },
  { code: 'S-2001', name: '한결금속', type: '자재공급처', ceo: '남지원' },
  { code: 'S-2002', name: '삼진열처리', type: '외주처', ceo: '고은별' }
]

// 품번은 가상임이 드러나는 접두(HB = 한빛)를 쓴다 — 실제 고객사 품번과 혼동되지 않게.
const ITEMS = [
  { code: 'HB-10250-A', name: '프론트 브래킷', spec: 'SPHC t2.3', car: 'DM-1', cust: 'C-1001' },
  { code: 'HB-10260-B', name: '리어 브래킷', spec: 'SPHC t2.0', car: 'DM-1', cust: 'C-1001' },
  { code: 'HB-20410-A', name: '파이프 어셈블리', spec: 'STKM11A Ø25.4', car: 'DM-2', cust: 'C-1002' },
  { code: 'HB-20420-C', name: '파이프 어셈블리(연장)', spec: 'STKM11A Ø25.4', car: 'DM-2', cust: 'C-1002' },
  { code: 'HB-30110-A', name: '스티어링 마운트', spec: 'SAPH440 t3.0', car: 'DM-3', cust: 'C-1001' },
  { code: 'HB-90010-R', name: '강관 원자재', spec: 'STKM11A Ø25.4 x 6M', car: null, cust: null, type: '원자재/기타' }
]

const PROCS = [
  { code: 'C10', name: '절단', order: 10 },
  { code: 'F20', name: '성형', order: 20 },
  { code: 'W30', name: '용접', order: 30 },
  { code: 'P40', name: '도장', order: 40 },
  { code: 'Q50', name: '검사', order: 50 },
  { code: 'K60', name: '포장', order: 60 }
]

const EQUIP = [
  { code: 'EQ-CUT-01', name: 'NC 절단기 #1', type: '절단기', line: 'L1', loc: '1공장 A열', inst: 1120 },
  { code: 'EQ-PRS-01', name: '유압 프레스 150T #1', type: '프레스', line: 'L1', loc: '1공장 A열', inst: 1450 },
  { code: 'EQ-WLD-01', name: '로봇 용접기 #1', type: '용접기', line: 'L2', loc: '1공장 B열', inst: 900 },
  { code: 'EQ-PNT-01', name: '분체도장 부스 #1', type: '도장설비', line: 'L2', loc: '1공장 C열', inst: 1600 },
  { code: 'EQ-CMM-01', name: '3차원 측정기', type: '측정기', line: null, loc: '품질실', inst: 2100 }
]

const DEFECTS = [
  { code: 'D-DIM', name: '치수불량', proc: 'F20' },
  { code: 'D-SCR', name: '외관 스크래치', proc: 'P40' },
  { code: 'D-WLD', name: '용접불량', proc: 'W30' },
  { code: 'D-PNT', name: '도장박리', proc: 'P40' },
  { code: 'D-BUR', name: '버 발생', proc: 'C10' },
  { code: 'D-FOR', name: '이물 혼입', proc: null }
]

// 검사 기준 — 품번별 3항목(치수 2 + 외관 1). CMM/버니어로 측정.
const SPECS = []
for (const it of ITEMS.filter((x) => x.type !== '원자재/기타')) {
  SPECS.push({ item: it.code, kind: '자주', name: '전장', inst: '버니어캘리퍼스', unit: 'mm', nominal: 120.0, tol: 0.3, cnt: 3 })
  SPECS.push({ item: it.code, kind: '자주', name: '홀 피치', inst: '버니어캘리퍼스', unit: 'mm', nominal: 45.0, tol: 0.2, cnt: 3 })
  SPECS.push({ item: it.code, kind: '공정', name: '외관', inst: '육안', unit: null, nominal: null, tol: null, cnt: 1 })
}

const L = []
const R = []
const push = (arr, s) => arr.push(s)

// ── 200_demo_master.sql ─────────────────────────────────────────────────────
push(L, '-- resources/packs/demo/200_demo_master.sql — 데모 기준정보 (gen-pack-demo.mjs 생성 · 손편집 금지)')
push(L, '-- 가상 회사 = 주식회사 한빛정밀. 시연 전용이며 실재 회사·사람·품번이 아니다.')
push(L, '')
push(L, '-- 회사 프로파일 — 데모 회사로 덮어쓴다(시연용 DB 이므로 의도된 덮어쓰기).')
for (const [k, v] of Object.entries(COMPANY)) {
  push(L, `INSERT INTO company_profile (key, value) VALUES (${q(k)}, ${q(v)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value;`)
}
push(L, "INSERT INTO app_config (key, value) VALUES ('demo.pack', 'v1') ON CONFLICT(key) DO UPDATE SET value = excluded.value;")
push(L, '')

push(L, '-- 조직')
for (const t of TEAMS) push(L, `INSERT OR IGNORE INTO teams (id, name) VALUES (${q(t.id)}, ${q(t.name)});`)
push(L, '')
for (const p of PERSONS) {
  push(L, `INSERT OR IGNORE INTO persons (id, name, team_id, role, email) VALUES (${q(p.id)}, ${q(p.name)}, ${q(p.team)}, ${q(p.role)}, ${q(p.email)});`)
}
push(L, '')
push(L, '-- 팀장 지정(사람이 먼저 있어야 하므로 뒤에서 UPDATE)')
push(L, `UPDATE teams SET manager_id = 'P-002' WHERE id = 'T-MGT';`)
push(L, `UPDATE teams SET manager_id = 'P-003' WHERE id = 'T-QA';`)
push(L, `UPDATE teams SET manager_id = 'P-004' WHERE id = 'T-PROD';`)
push(L, '')

push(L, '-- 거래처')
for (const p of PARTNERS) {
  push(L, `INSERT OR IGNORE INTO partner (partner_code, name, partner_type, ceo, source) VALUES (${q(p.code)}, ${q(p.name)}, ${q(p.type)}, ${q(p.ceo)}, 'demo');`)
}
push(L, '')

push(L, '-- 품번')
for (const it of ITEMS) {
  const type = it.type || '완제품/조립'
  push(
    L,
    `INSERT OR IGNORE INTO item_master (item_code, item_name, item_type, spec, cust_pno1, car_type, trace_gbn, active, source) ` +
      `VALUES (${q(it.code)}, ${q(it.name)}, ${q(type)}, ${q(it.spec)}, ${q(it.cust)}, ${q(it.car)}, ${type === '원자재/기타' ? 0 : 1}, 1, 'demo');`
  )
}
push(L, '')

push(L, '-- 공정 마스터')
for (const p of PROCS) {
  push(L, `INSERT OR IGNORE INTO process_master (proc_code, proc_name, proc_type, active, sort_order, source) VALUES (${q(p.code)}, ${q(p.name)}, '사내', 1, ${p.order}, 'demo');`)
}
push(L, '')

push(L, '-- 라우팅(품번별 공정 순서) — 원자재는 무공정')
for (const it of ITEMS.filter((x) => x.type !== '원자재/기타')) {
  const steps = it.code.startsWith('HB-2') ? ['C10', 'W30', 'P40', 'Q50', 'K60'] : ['C10', 'F20', 'W30', 'P40', 'Q50', 'K60']
  steps.forEach((pc, i) => {
    push(L, `INSERT OR IGNORE INTO routing_step (item_code, seq, proc_code, out_yn, active, source) VALUES (${q(it.code)}, ${(i + 1) * 10}, ${q(pc)}, 0, 1, 'demo');`)
  })
}
push(L, '')

push(L, '-- 설비')
for (const e of EQUIP) {
  push(
    L,
    `INSERT OR IGNORE INTO equipment_master (equip_code, name, equip_type, line_no, location, install_date, active, updated_by) ` +
      `VALUES (${q(e.code)}, ${q(e.name)}, ${q(e.type)}, ${q(e.line)}, ${q(e.loc)}, ${dayExpr(e.inst)}, 1, '정민재');`
  )
}
push(L, '')

push(L, '-- 불량 유형')
for (const d of DEFECTS) {
  push(L, `INSERT OR IGNORE INTO defect_type (code, name, proc_code, active, source) VALUES (${q(d.code)}, ${q(d.name)}, ${q(d.proc)}, 1, 'demo');`)
}
push(L, '')

push(L, '-- 검사 기준(자주 2 + 외관 1 / 품번)')
for (const s of SPECS) {
  const su = s.nominal != null ? (s.nominal + s.tol).toFixed(2) : 'NULL'
  const sl = s.nominal != null ? (s.nominal - s.tol).toFixed(2) : 'NULL'
  push(
    L,
    `INSERT OR IGNORE INTO insp_spec (item_code, insp_kind, insp_item, instrument, unit, su, sl, nominal, sample_cnt, revision, rev_date, active, source, created_by) ` +
      `VALUES (${q(s.item)}, ${q(s.kind)}, ${q(s.name)}, ${q(s.inst)}, ${q(s.unit)}, ${su}, ${sl}, ${s.nominal != null ? s.nominal.toFixed(2) : 'NULL'}, ${s.cnt}, 1, ${dayExpr(180)}, 1, 'demo', '이수아');`
  )
}
push(L, '')

// 조업달력 — 과거 60일 ~ 미래 30일, 주말 휴무
push(L, '-- 조업달력(과거 60일 ~ 미래 30일 · 주말 휴무). 요일 판정은 설치 시점에 SQL 이 한다.')
push(L, `INSERT OR IGNORE INTO work_calendar (ymd, work_type, note, updated_by)`)
push(L, `WITH RECURSIVE d(x) AS (`)
push(L, `  SELECT date('now','-60 day') UNION ALL SELECT date(x,'+1 day') FROM d WHERE x < date('now','+30 day')`)
push(L, `)`)
push(L, `SELECT x, CASE WHEN strftime('%w', x) IN ('0','6') THEN '휴무' ELSE '조업' END, NULL, '박지호' FROM d;`)
push(L, '')

// ── 210_demo_records.sql ────────────────────────────────────────────────────
push(R, '-- resources/packs/demo/210_demo_records.sql — 데모 실적·검사 기록 (gen-pack-demo.mjs 생성 · 손편집 금지)')
push(R, '-- 최근 14 조업일치. 날짜는 설치 시점 기준 상대식이라 언제 깔아도 "최근 2주"가 된다.')
push(R, '')

const MAKE_ITEMS = ITEMS.filter((x) => x.type !== '원자재/기타')
// 최근 14 조업일(주말 제외는 근사로 — 생성 시점 기준 평일만 고른다)
const workDays = []
for (let d = 1; workDays.length < 14 && d < 30; d++) {
  const dt = new Date(Date.UTC(2026, 7, 25) - d * 86400000)
  const w = dt.getUTCDay()
  if (w !== 0 && w !== 6) workDays.push(d)
}

let woSeq = 0
let lotSeq = 0
const lots = []

push(R, '-- 작업지시')
for (const it of MAKE_ITEMS) {
  for (const back of [workDays[2], workDays[7], workDays[12]]) {
    woSeq++
    const qty = int(200, 800)
    const status = back <= workDays[3] ? '진행' : '완료'
    push(
      R,
      `INSERT OR IGNORE INTO work_order (order_no, item_code, order_qty, line_no, start_date, end_date, status, note, created_by) ` +
        `VALUES ('WO-${String(woSeq).padStart(4, '0')}', ${q(it.code)}, ${qty}, ${q(it.code.startsWith('HB-2') ? 'L2' : 'L1')}, ${dayExpr(back)}, ${dayExpr(Math.max(0, back - 2))}, ${q(status)}, NULL, '정민재');`
    )
  }
}
push(R, '')

push(R, '-- LOT + 생산실적 + 검사기록 (같은 LOT 으로 서로 이어진다)')
for (const back of workDays) {
  for (const it of MAKE_ITEMS.slice(0, 3)) {
    lotSeq++
    const lot = `L${String(lotSeq).padStart(5, '0')}`
    lots.push({ lot, item: it.code, back })
    push(R, `INSERT OR IGNORE INTO lot_registry (lot_no, item_code, lot_date, seq, source, created_by) VALUES (${q(lot)}, ${q(it.code)}, ${dayExpr(back)}, ${lotSeq}, '자체발번', '한도윤');`)

    const ok = int(150, 420)
    // 불량은 가끔만 — 전부 0이면 화면이 심심하고, 너무 많으면 시연에 나쁘다.
    const ng = rnd() < 0.35 ? int(1, 6) : 0
    const dcode = ng > 0 ? pick(DEFECTS).code : null
    push(
      R,
      `INSERT OR IGNORE INTO prod_record (record_date, seq, item_code, lot_no, line_no, ok_qty, ng_qty, defect_code, shift, worker, note) ` +
        `VALUES (${dayExpr(back)}, 1, ${q(it.code)}, ${q(lot)}, ${q(it.code.startsWith('HB-2') ? 'L2' : 'L1')}, ${ok}, ${ng}, ${q(dcode)}, '주간', ${q(pick(['한도윤', '정민재']))}, NULL);`
    )
  }
}
push(R, '')

push(R, '-- 자주검사 — LOT 마다 전장·홀 피치 실측 3점(기준 안쪽 값으로 채운다)')
for (const l of lots.slice(0, 24)) {
  const judged = pick(['합격', '합격', '합격', '조건부'])
  push(
    R,
    `INSERT INTO insp_record (insp_date, insp_kind, item_code, lot_no, proc_code, inspector, judgment, defect_qty, sample_phase, confirmer, confirmed_at, note) ` +
      `VALUES (${dayExpr(l.back)}, '자주', ${q(l.item)}, ${q(l.lot)}, 'Q50', '최은우', ${q(judged)}, 0, '초품', '이수아', datetime(${dayExpr(l.back)}, '+9 hour'), NULL);`
  )
  for (const sp of SPECS.filter((s) => s.item === l.item && s.nominal != null)) {
    for (let smp = 1; smp <= 3; smp++) {
      const v = (sp.nominal + (rnd() - 0.5) * sp.tol * 1.2).toFixed(2)
      push(
        R,
        `INSERT INTO insp_record_value (record_id, spec_id, insp_item, sample_no, value, judgment) ` +
          `SELECT last_insert_rowid_demo.id, s.id, ${q(sp.name)}, ${smp}, ${v}, '합격' ` +
          `FROM (SELECT MAX(id) id FROM insp_record) last_insert_rowid_demo ` +
          `JOIN insp_spec s ON s.item_code = ${q(l.item)} AND s.insp_item = ${q(sp.name)};`
      )
    }
  }
}
push(R, '')

// ── 실명·TPC 혼입 자체 검사 ─────────────────────────────────────────────────
const BANNED = /티피씨|TPC|AM사업부|필라넥|쇼바|김권표|서상규|하헌|서규하|장석봉|현대위아|HKMC|삼보/
const master = L.join('\n') + '\n'
const records = R.join('\n') + '\n'
const hits = []
for (const [name, text] of [['200_demo_master.sql', master], ['210_demo_records.sql', records]]) {
  text.split('\n').forEach((line, i) => {
    if (BANNED.test(line)) hits.push(`${name}:${i + 1} ${line.slice(0, 80)}`)
  })
}
if (hits.length) {
  console.error('[demo] 실명·TPC 식별자 혼입 — 쓰지 않고 중단:')
  for (const h of hits.slice(0, 5)) console.error('  ' + h)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
writeFileSync(join(OUT, '200_demo_master.sql'), master, 'utf-8')
writeFileSync(join(OUT, '210_demo_records.sql'), records, 'utf-8')

const stmts = (s) => s.split('\n').filter((x) => x.trim().endsWith(';')).length
console.log('[demo] 생성 완료 — 실명·TPC 혼입 0')
console.log(`  200_demo_master.sql   ${String(stmts(master)).padStart(4)} 문 · 회사=${COMPANY.companyName} · 팀 ${TEAMS.length} · 사람 ${PERSONS.length} · 거래처 ${PARTNERS.length} · 품번 ${ITEMS.length} · 공정 ${PROCS.length} · 설비 ${EQUIP.length} · 불량유형 ${DEFECTS.length} · 검사기준 ${SPECS.length}`)
console.log(`  210_demo_records.sql  ${String(stmts(records)).padStart(4)} 문 · 작업지시 ${woSeq} · LOT/실적 ${lots.length} · 자주검사 24건(실측 포함)`)
