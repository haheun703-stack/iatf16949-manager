/* eslint-disable */
// ============================================================
// scripts/forms-gap-audit.cjs — 양식 완성전 갭 전수 감사 (2026-07-28, 사장님 지시 스트림 A 1단계)
//
// 양식 코드별 [셀맵(form_fields) / 엑셀좌표(form_cell_map) / 원본(template_path) /
// 연결 의무 / 프로세스 / SQ 항목·배점 / 작성 실적]을 한 표로 집계해 우선순위 근거를 만든다.
// 읽기 전용. 재실행 가능(배치 제작 중 진척 추적 도구로 재사용).
//
// 실행(electron-node, better-sqlite3 = Electron ABI):
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe scripts/forms-gap-audit.cjs [db경로]
//   기본 db = %APPDATA%/iatf16949-manager/iatf16949.db (검증은 복사본 권장)
// 출력: 콘솔 요약 + docs/forms-gap/audit_<날짜>.json (전체 행)
// ============================================================
'use strict'
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath =
  process.argv[2] || path.join(process.env.APPDATA || '', 'iatf16949-manager', 'iatf16949.db')
const db = new Database(dbPath, { readonly: true })

// 심사 핵심 의무 카테고리(IATF 대시보드 DUTY_CATS와 동일 축)
const CORE_DUTY_CATS = new Set(['내부심사', '경영검토', '교정/MSA', '교육/인식', '문서관리', '안전/비상'])

// ── 기초 맵 ──────────────────────────────────────────────
const fieldsCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_fields GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const cellCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_cell_map GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const gridCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_grid_columns GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const subCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_submissions GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const obl = new Map()
for (const r of db
  .prepare(`SELECT form_code, id, title, category, active FROM recurring_obligations WHERE form_code IS NOT NULL`)
  .all()) {
  if (!obl.has(r.form_code)) obl.set(r.form_code, [])
  obl.get(r.form_code).push(r)
}
const procs = new Map()
for (const r of db.prepare(`SELECT form_code, process_code FROM process_forms`).all()) {
  if (!procs.has(r.form_code)) procs.set(r.form_code, [])
  procs.get(r.form_code).push(r.process_code)
}
const itemPoints = new Map(db.prepare(`SELECT code, points FROM sq_items`).all().map((r) => [r.code, r.points]))
// reg → SQ items (sq_reg_map)
const regItems = new Map()
for (const r of db.prepare(`SELECT reg_code, item_code FROM sq_reg_map`).all()) {
  if (!regItems.has(r.reg_code)) regItems.set(r.reg_code, new Set())
  regItems.get(r.reg_code).add(r.item_code)
}
// sqtrack (심사 트랙 직접 연결)
const trackForms = new Map()
for (const r of db
  .prepare(`SELECT form_code, sq_item_code FROM sqtrack_items WHERE form_code IS NOT NULL`)
  .all()) {
  if (!trackForms.has(r.form_code)) trackForms.set(r.form_code, new Set())
  if (r.sq_item_code) trackForms.get(r.form_code).add(r.sq_item_code)
}
// SQ 체크포인트 미비 항목(우선순위 가중)
const cpBad = new Map()
for (const r of db
  .prepare(
    `SELECT item_code, SUM(CASE WHEN status='missing' THEN 1 ELSE 0 END) miss,
            SUM(CASE WHEN status='partial' THEN 1 ELSE 0 END) part, COUNT(*) tot
     FROM sq_checkpoints GROUP BY item_code`
  )
  .all())
  cpBad.set(r.item_code, r)

// ── 양식 전수 행 구성 ─────────────────────────────────────
const forms = db
  .prepare(
    `SELECT code, name, reg_code, resp_dept, iatf_clause, sq_item_ids, template_path, scope, deprecated
     FROM forms ORDER BY code`
  )
  .all()

// 신규 설계본(코워크 A-2 조건⑴): 회사 원본 부재로 리포 템플릿이 정본인 양식 — 심사 대체 이력 표시
const isNewDesign = (tp) => !!tp && String(tp).includes('sq_gap_forms')

const rows = []
for (const f of forms) {
  if (f.deprecated) continue
  const sqItems = new Set()
  if (f.sq_item_ids) {
    for (const s of String(f.sq_item_ids).split(/[,\s]+/)) if (s && itemPoints.has(s)) sqItems.add(s)
  }
  if (f.reg_code && regItems.has(f.reg_code)) for (const it of regItems.get(f.reg_code)) sqItems.add(it)
  if (trackForms.has(f.code)) for (const it of trackForms.get(f.code)) sqItems.add(it)
  const sqPts = [...sqItems].reduce((a, it) => a + (itemPoints.get(it) || 0), 0)
  const sqMissing = [...sqItems].reduce((a, it) => a + (cpBad.get(it)?.miss || 0), 0)
  const o = obl.get(f.code) || []
  const coreDuty = o.some((x) => CORE_DUTY_CATS.has(x.category))
  rows.push({
    code: f.code,
    name: f.name,
    regCode: f.reg_code,
    respDept: f.resp_dept,
    clause: f.iatf_clause,
    fields: fieldsCnt.get(f.code) || 0,
    cells: cellCnt.get(f.code) || 0,
    gridCols: gridCnt.get(f.code) || 0,
    template: f.template_path ? 1 : 0,
    newDesign: isNewDesign(f.template_path),
    submissions: subCnt.get(f.code) || 0,
    obligations: o.map((x) => `#${x.id} ${x.title}${x.active ? '' : '(비활성)'}`),
    coreDuty,
    processes: procs.get(f.code) || [],
    sqItems: [...sqItems],
    sqPoints: sqPts,
    sqMissingCp: sqMissing
  })
}

// ── 요약 ────────────────────────────────────────────────
const N = rows.length
const withFields = rows.filter((r) => r.fields > 0)
const noFields = rows.filter((r) => r.fields === 0)
const fieldsNoCells = withFields.filter((r) => r.cells === 0 && r.gridCols === 0)
const noTemplate = rows.filter((r) => r.template === 0)
const sum = {
  dbPath,
  ranAt: new Date().toISOString(),
  total: N,
  writable_fields: withFields.length,
  gapA_noFields: noFields.length,
  gapB_fieldsButNoCellmap: fieldsNoCells.length,
  gapC_noTemplate: noTemplate.length,
  linkedObligation: rows.filter((r) => r.obligations.length > 0).length,
  linkedProcess: rows.filter((r) => r.processes.length > 0).length,
  linkedSq: rows.filter((r) => r.sqItems.length > 0).length,
  newDesign: rows.filter((r) => r.newDesign).length
}
console.log('=== 양식 갭 감사 요약 ===')
console.log(JSON.stringify(sum, null, 1))

// 갭A(셀맵 미정의) 우선순위: SQ배점 + 미비CP 가중 + 핵심의무 + 의무연결 + 프로세스
const score = (r) =>
  r.sqPoints * 2 + r.sqMissingCp * 3 + (r.coreDuty ? 60 : 0) + r.obligations.length * 30 + r.processes.length * 5 + Math.min(r.submissions, 5) * 4
const gapA = noFields.map((r) => ({ ...r, prio: score(r) })).sort((a, b) => b.prio - a.prio)
console.log('\n=== 갭A(셀맵 미정의) 상위 40 — 우선순위 점수순 ===')
for (const r of gapA.slice(0, 40))
  console.log(
    `${String(r.prio).padStart(4)} | ${r.code.padEnd(10)} | ${r.name} | 팀=${r.respDept || '—'} | SQ ${r.sqPoints}점(${r.sqItems.join(',') || '—'}) 미비CP ${r.sqMissingCp} | 의무 ${r.obligations.length}${r.coreDuty ? '(핵심)' : ''} | 프로세스 ${r.processes.join(',') || '—'} | 원본 ${r.template ? 'O' : 'X'}`
  )

console.log('\n=== 갭B(fields 有·엑셀 좌표 無) 전체 ===')
for (const r of fieldsNoCells)
  console.log(`${r.code.padEnd(10)} | ${r.name} | fields ${r.fields} | 작성본 ${r.submissions}`)

// 팀별 갭A 분포
const byTeam = {}
for (const r of gapA) byTeam[r.respDept || '(미지정)'] = (byTeam[r.respDept || '(미지정)'] || 0) + 1
console.log('\n=== 갭A 팀별 분포 ===')
console.log(JSON.stringify(byTeam, null, 1))

// 전체 JSON 저장
const outDir = path.join(__dirname, '..', 'docs', 'forms-gap')
fs.mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const outFile = path.join(outDir, `audit_${stamp}.json`)
fs.writeFileSync(outFile, JSON.stringify({ summary: sum, gapA, gapB: fieldsNoCells, rows }, null, 1), 'utf-8')
console.log('\nJSON 저장:', outFile)
