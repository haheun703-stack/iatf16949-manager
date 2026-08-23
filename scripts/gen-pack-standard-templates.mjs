#!/usr/bin/env node
// ============================================================
// scripts/gen-pack-standard-templates.mjs — 표준팩 xlsx 템플릿 생성기 (39호 S3-2 후반, 2026-08-23)
//
// 40호 ④-2 ⓐ 도장 이행: 표준팩 양식(080 카탈로그) 중 레이아웃(셀맵/그리드)을 가진 전 양식에 대해
// 출력용 xlsx 1장씩을 `resources/templates/standard/<code>.xlsx` 로 만든다.
//   소스 ① forms.template_path(번들 신규 설계본·추출본 39) — 그대로 복사 후 중립화
//   소스 ② 정본 규정집(mastersDir, 회사 기밀·미커밋) — 양식 시트 1장만 잘라내기(199) → 기록 클리어 + 중립화
// 처리(시트 1장):
//   a. 행 범위 = 전부(절단 없음). 기록 영역 끝 + 60행 넘게 남고 뒷영역이 숫자·날짜 위주(≥30%·30셀↑)면 실기록 대장으로 보고
//      뒷영역의 숫자·날짜 셀만 비운다(라벨·수식·프리셋 보존) — 리포트 ★ 표기
//   b. 기록 클리어 = form_cell_map 셀 + form_grid_spec 행×form_grid_columns 열 (수식 셀은 보존)
//   c. 문자열 중립화 = scripts/lib/neutralize-xlsx.mjs (회사명 → {{companyName}} 토큰 · TPC- 접두 · 실명 · 사업부 N · 공정 표현)
//   d. 게이트 = 치환 뒤 회사식별/실명/브레이징 잔재 0 (위반 파일은 쓰지 않고 목록으로 중단)
//   e. 병합·열폭·행높이·페이지 설정 복사. 이미지는 미복사(로고·현장 사진 = 고객사 자산 — 수량만 리포트) · 차트/개체 미보존
// 출력 시트명 = 양식 코드 (export 엔진 resolveSheet 가 코드로 찾음). 멱등: 재실행 = 동일 결과.
// 정본 폴더: IATF_MASTERS_DIR 환경변수 → 기본 리포 상위 "IATF 전체 자료모음_김권표이사_260501/3.IATF16949 규정&지침 _230501".
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\gen-pack-standard-templates.mjs [--report out.md]
// ============================================================
import ExcelJS from 'exceljs'
import { readFileSync, readdirSync, mkdirSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { EXCLUDE_FORMS } from './lib/neutralize-forms.mjs'
import { neutralizeString, XLSX_RESIDUE_RE, cellStrings } from './lib/neutralize-xlsx.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const core = require('../server/migrate-core.cjs')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')
const OUT = join(repo, 'resources', 'templates', 'standard')
const MASTER = process.env.IATF_MASTERS_DIR || join(repo, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501')
const reportPath = process.argv.includes('--report') ? process.argv[process.argv.indexOf('--report') + 1] : null
const TRUNCATE_SLACK = 60 // 기록 영역 끝 뒤로 이만큼 넘게 남으면 대장형 실기록으로 보고 절단
const TRUNCATE_KEEP = 8 // 절단 시 기록 영역 끝 뒤에 남기는 행(합계·결재 행 여유)

if (!existsSync(MASTER)) {
  console.error(`[gen-templates] 정본 폴더 없음: ${MASTER} (IATF_MASTERS_DIR 로 지정)`)
  process.exit(1)
}
mkdirSync(OUT, { recursive: true })

// ── 체인 DB(운영 DB 비접촉) ──
const tmp = mkdtempSync(join(tmpdir(), 'iatf-tpl-'))
const db = new Database(join(tmp, 'chain.db'))
for (const f of core.listMigrationFiles(migDir)) {
  db.exec('BEGIN')
  db.exec(readFileSync(join(migDir, f), 'utf-8'))
  db.exec('COMMIT')
}
const forms = db
  .prepare(
    `SELECT f.code, f.name, f.reg_code, f.template_path,
      (SELECT COUNT(*) FROM form_cell_map m WHERE m.form_code=f.code) AS cm,
      (SELECT COUNT(*) FROM form_grid_spec g WHERE g.form_code=f.code) AS gs
     FROM forms f ORDER BY f.code`
  )
  .all()
  .filter((f) => !EXCLUDE_FORMS[f.code] && (f.cm > 0 || f.gs > 0))
const cellMapOf = db.prepare('SELECT cell FROM form_cell_map WHERE form_code = ?')
const gridSpecOf = db.prepare('SELECT grid_key, data_start_row, stride, max_rows FROM form_grid_spec WHERE form_code = ?')
const gridColsOf = db.prepare('SELECT sheet_col FROM form_grid_columns WHERE form_code = ? AND grid_key = ?')

const masterFiles = readdirSync(MASTER).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
const wbCache = new Map()
async function loadWb(p) {
  if (wbCache.has(p)) return wbCache.get(p)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)
  wbCache.set(p, wb)
  return wb
}
const colNum = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)
const splitAddr = (a) => {
  const m = a.match(/^([A-Z]+)(\d+)$/)
  return m ? { c: colNum(m[1]), r: +m[2] } : null
}
const cellString = (v) => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object') {
    if ('richText' in v) return v.richText.map((t) => t.text).join('')
    if ('formula' in v || 'sharedFormula' in v) return typeof v.result === 'string' ? v.result : ''
    if ('text' in v) return String(v.text)
  }
  return ''
}
const isFormula = (v) => v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v)
function setNeutral(cell, stats) {
  const v = cell.value
  if (v == null) return
  if (typeof v === 'string') {
    const n = neutralizeString(v)
    if (n !== v) { cell.value = n; stats.neutralized++ }
  } else if (typeof v === 'object' && 'richText' in v) {
    let changed = false
    const rt = v.richText.map((t) => { const n = neutralizeString(t.text); if (n !== t.text) changed = true; return { ...t, text: n } })
    if (changed) { cell.value = { richText: rt }; stats.neutralized++ }
  } else if (isFormula(v)) {
    // 수식 텍스트 안의 리터럴("㈜티피씨 "&B3)과 캐시 결과 둘 다(리뷰 8/23: 결과만 바꾸면 재계산 시 회사명이 되살아남)
    const nf = typeof v.formula === 'string' ? neutralizeString(v.formula) : v.formula
    const nr = typeof v.result === 'string' ? neutralizeString(v.result) : v.result
    if (nf !== v.formula || nr !== v.result) { cell.value = { ...v, formula: nf, result: nr }; stats.neutralized++ }
  }
}

const report = []
const residues = []
let written = 0
for (const f of forms) {
  const stats = { cleared: 0, neutralized: 0, images: 0, truncated: false, rowsKept: 0, rowsTotal: 0, beyondCells: 0, beyondNumericShare: 0, source: '' }
  let src, srcWs
  if (f.template_path) {
    src = join(repo, 'resources', f.template_path)
    if (!existsSync(src)) { residues.push(`${f.code}: 번들 템플릿 없음 ${f.template_path}`); continue }
    const wb = await loadWb(src)
    srcWs = wb.worksheets.find((w) => w.name.includes(f.code)) ?? wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    stats.source = `번들 ${f.template_path}`
  } else {
    const hit = masterFiles.find((x) => x.startsWith(f.reg_code + ' ') || x.startsWith(f.reg_code))
    if (!hit) { residues.push(`${f.code}: 정본 규정집 없음 reg=${f.reg_code}`); continue }
    const wb = await loadWb(join(MASTER, hit))
    srcWs = wb.worksheets.find((w) => w.name.includes(f.code))
    if (!srcWs) { residues.push(`${f.code}: 정본 시트 없음 (${hit})`); continue }
    stats.source = `정본 ${f.reg_code} / 시트 "${srcWs.name}"`
  }

  // 기록 영역 좌표
  const clearCells = new Set(cellMapOf.all(f.code).map((r) => r.cell))
  let recEnd = 0
  for (const a of clearCells) { const p = splitAddr(a); if (p) recEnd = Math.max(recEnd, p.r) }
  const gridAreas = []
  for (const g of gridSpecOf.all(f.code)) {
    const cols = gridColsOf.all(f.code, g.grid_key).map((r) => colNum(r.sheet_col))
    const rowEnd = g.data_start_row + g.stride * g.max_rows - 1
    gridAreas.push({ r1: g.data_start_row, r2: rowEnd, cols })
    recEnd = Math.max(recEnd, rowEnd)
  }
  stats.rowsTotal = srcWs.rowCount
  let keepRows = srcWs.rowCount
  // 절단 판정: 기록 영역 끝 뒤로 60행 넘게 남고 + 그 뒷영역이 숫자·날짜 위주(실기록)일 때만. 문항·프리셋(문자 위주)은 보존.
  if (recEnd > 0 && srcWs.rowCount > recEnd + TRUNCATE_SLACK) {
    let cells = 0, numeric = 0
    for (let r = recEnd + TRUNCATE_KEEP + 1; r <= srcWs.rowCount; r++) {
      srcWs.getRow(r).eachCell({ includeEmpty: false }, (c) => {
        const v = c.value
        if (v == null || isFormula(v)) return
        cells++
        if (typeof v === 'number' || v instanceof Date || (typeof v === 'string' && /^\s*\d{2,4}[-./]\d{1,2}([-./]\d{1,2})?\s*$/.test(v))) numeric++
      })
    }
    stats.beyondCells = cells
    stats.beyondNumericShare = cells ? Math.round((numeric / cells) * 100) : 0
    if (cells >= 30 && numeric / cells >= 0.3) stats.truncated = true // 절단 대신 뒷영역 숫자·날짜 셀 클리어(구조 보존) — 아래 b'
  }
  stats.rowsKept = keepRows
  const maxCol = Math.max(srcWs.columnCount || 1, 1)

  // 시트 복사
  const out = new ExcelJS.Workbook()
  const tw = out.addWorksheet(f.code, { properties: srcWs.properties, pageSetup: srcWs.pageSetup, views: srcWs.views })
  for (let c = 1; c <= maxCol; c++) { const col = srcWs.getColumn(c); if (col.width) tw.getColumn(c).width = col.width; if (col.hidden) tw.getColumn(c).hidden = true }
  for (let r = 1; r <= keepRows; r++) {
    const sr = srcWs.getRow(r)
    const trow = tw.getRow(r)
    if (sr.height) trow.height = sr.height
    if (sr.hidden) trow.hidden = true
    for (let c = 1; c <= maxCol; c++) {
      const sc = sr.getCell(c)
      const tc = trow.getCell(c)
      let v = sc.value
      if (v && typeof v === 'object' && 'sharedFormula' in v && !('formula' in v)) v = { formula: v.sharedFormula, result: v.result } // 공유수식 → 개별 수식(추출 시 원본 마스터 셀 참조 끊김 방지)
      tc.value = v
      if (sc.style && Object.keys(sc.style).length) tc.style = JSON.parse(JSON.stringify(sc.style))
      if (sc.dataValidation) tc.dataValidation = sc.dataValidation
    }
  }
  for (const m of srcWs.model?.merges || []) {
    const mm = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (mm && +mm[4] <= keepRows) { try { tw.mergeCells(m) } catch { /* 겹침 */ } }
  }
  // 이미지는 싣지 않는다 — 정본의 이미지는 회사 로고·현장 사진(고객사 자산). 수량만 리포트.
  try { stats.images = srcWs.getImages().length } catch { /* noop */ }

  // b. 기록 클리어
  for (const a of clearCells) {
    const p = splitAddr(a)
    if (!p || p.r > keepRows) continue
    const cell = tw.getCell(a)
    if (cell.value != null && !isFormula(cell.value)) { cell.value = null; stats.cleared++ }
  }
  for (const g of gridAreas) {
    for (let r = g.r1; r <= Math.min(g.r2, keepRows); r++) {
      for (const c of g.cols) {
        const cell = tw.getRow(r).getCell(c)
        if (cell.value != null && !isFormula(cell.value)) { cell.value = null; stats.cleared++ }
      }
    }
  }
  // b'. 실기록 대장(뒷영역 숫자·날짜 위주): 행을 자르지 않고 숫자·날짜 셀만 비운다(라벨·수식·프리셋 보존)
  if (stats.truncated) {
    for (let r = recEnd + TRUNCATE_KEEP + 1; r <= keepRows; r++) {
      tw.getRow(r).eachCell({ includeEmpty: false }, (c) => {
        const v = c.value
        if (v == null || isFormula(v)) return
        if (typeof v === 'number' || v instanceof Date || (typeof v === 'string' && /^\s*\d{2,4}[-./]\d{1,2}([-./]\d{1,2})?\s*$/.test(v))) { c.value = null; stats.cleared++ }
      })
    }
  }
  // c. 중립화 + d. 게이트
  const hits = []
  tw.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (cell) => {
    setNeutral(cell, stats)
    for (const s of cellStrings(cell.value)) if (s && XLSX_RESIDUE_RE.test(s)) hits.push(`${cell.address}:"${s.slice(0, 40).replace(/\n/g, ' ')}"`)
  }))
  if (hits.length) { residues.push(`${f.code} (${stats.source}) 잔재 ${hits.length}: ${hits.slice(0, 4).join(' · ')}`); continue }

  const outPath = join(OUT, `${f.code}.xlsx`)
  await out.xlsx.writeFile(outPath)
  written++
  report.push({ code: f.code, name: f.name, ...stats })
}
db.close()
rmSync(tmp, { recursive: true, force: true })

if (reportPath) {
  const L = []
  L.push(`# 표준팩 xlsx 템플릿 생성 리포트 (gen-pack-standard-templates.mjs · 2026-08-23)`)
  L.push('')
  L.push(`- 대상 ${forms.length}종(레이아웃 보유 양식) → 생성 ${written} · 잔재/오류 ${residues.length}`)
  L.push(`- 대장형 실기록 클리어 ${report.filter((r) => r.truncated).length}종 · 이미지 미복사 ${report.reduce((a, r) => a + r.images, 0)}장 · 기록 클리어 ${report.reduce((a, r) => a + r.cleared, 0)}셀 · 문자열 중립화 ${report.reduce((a, r) => a + r.neutralized, 0)}셀`)
  L.push('')
  L.push('| code | 양식 | 소스 | 행 | 대장클리어 | 뒷영역 셀/숫자% | 클리어 | 중립화 | 이미지(미복사) |')
  L.push('|---|---|---|---|---|---|---|---|---|')
  for (const r of report) L.push(`| ${r.code} | ${r.name} | ${r.source} | ${r.rowsKept}/${r.rowsTotal} | ${r.truncated ? '★' : ''} | ${r.beyondCells ? `${r.beyondCells}/${r.beyondNumericShare}%` : ''} | ${r.cleared} | ${r.neutralized} | ${r.images} |`)
  if (residues.length) { L.push(''); L.push('## 잔재/오류'); for (const x of residues) L.push(`- ${x}`) }
  writeFileSync(reportPath, L.join('\n'), 'utf-8')
}
console.log(`[gen-templates] 대상 ${forms.length} · 생성 ${written} · 대장클리어 ${report.filter((r) => r.truncated).length} · 클리어 ${report.reduce((a, r) => a + r.cleared, 0)}셀 · 중립화 ${report.reduce((a, r) => a + r.neutralized, 0)}셀`)
if (residues.length) {
  console.error(`[gen-templates] 잔재/오류 ${residues.length}건 — 해당 파일은 쓰지 않음:`)
  for (const x of residues) console.error('  ' + x)
  process.exit(1)
}
