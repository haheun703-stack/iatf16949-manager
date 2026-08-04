/* eslint-disable */
// ============================================================
// scripts/scan-formula-conflicts.cjs — 수식 셀 충돌 전수 스캔 (7차 트랙, 2026-07-30)
//
// 판정 3 승인 이행(review_reply_track7_260730 §판정3): 작성가능 244종 전수(레거시 157
// + 배치 정품 87)의 매핑 좌표(cell_map + grid 전개 셀)를 정본 시트와 대사해
// **수식 셀에 입력 매핑된 충돌**(K2100-05 유형 — 출력 시 수식 파괴)을 색출한다.
// 같은 읽기 패스에서 **병합 비앵커 쓰기**(앵커 덮어씀 함정)도 부수 신호로 수집.
//
// 읽기 전용 — DB·마스터·템플릿 무변경. 시트 해소는 엔진과 동일 규칙
// (template_path → 리포 resources, 폴백 '양식'/첫 시트 · 마스터 → 코드 포함 첫 시트).
//
// 실행(electron-node, better-sqlite3 ABI):
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe \
//     scripts/scan-formula-conflicts.cjs <db경로> [--out docs/forms-gap/formula_scan.json]
// ============================================================
'use strict'
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const ExcelJS = require('exceljs')

const root = path.join(__dirname, '..')
const MASTERS =
  process.env.IATF_MASTERS_DIR ||
  path.join(root, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501')

const dbPath = process.argv[2]
const outArg = process.argv.indexOf('--out')
const outPath = outArg >= 0 ? process.argv[outArg + 1] : path.join(root, 'docs', 'forms-gap', 'formula_scan_20260730.json')
if (!dbPath) { console.error('사용법: scan-formula-conflicts.cjs <db경로> [--out x.json]'); process.exit(1) }

const db = new Database(dbPath, { readonly: true })

const forms = db.prepare(`
  SELECT f.code, f.name, f.reg_code, f.resp_dept, f.template_path
  FROM forms f
  WHERE f.deprecated IS NOT 1
    AND EXISTS (SELECT 1 FROM form_fields ff WHERE ff.form_code = f.code)
  ORDER BY f.code`).all()

const cellMap = new Map()
for (const r of db.prepare(`SELECT form_code, field_key, cell FROM form_cell_map`).all()) {
  if (!cellMap.has(r.form_code)) cellMap.set(r.form_code, [])
  cellMap.get(r.form_code).push(r)
}
const gridSpecs = new Map()
for (const r of db.prepare(`SELECT form_code, grid_key, data_start_row, stride, max_rows FROM form_grid_spec`).all()) {
  if (!gridSpecs.has(r.form_code)) gridSpecs.set(r.form_code, [])
  gridSpecs.get(r.form_code).push(r)
}
const gridCols = new Map()
for (const r of db.prepare(`SELECT form_code, grid_key, col_key, sheet_col FROM form_grid_columns`).all()) {
  const k = `${r.form_code}|${r.grid_key}`
  if (!gridCols.has(k)) gridCols.set(k, [])
  gridCols.get(k).push(r)
}

const masterFiles = fs.readdirSync(MASTERS)
const wbCache = new Map()
async function loadWb(file) {
  if (!wbCache.has(file)) {
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.readFile(file)
    wbCache.set(file, wb)
  }
  return wbCache.get(file)
}

function targetsOf(code) {
  const t = []
  for (const c of cellMap.get(code) || []) t.push({ key: c.field_key, cell: c.cell, src: 'cell_map' })
  for (const g of gridSpecs.get(code) || []) {
    const cols = gridCols.get(`${code}|${g.grid_key}`) || []
    for (let i = 0; i < g.max_rows; i++) {
      const row = g.data_start_row + i * g.stride
      for (const col of cols) t.push({ key: `${g.grid_key}.${col.col_key}[${i + 1}]`, cell: `${col.sheet_col}${row}`, src: 'grid' })
    }
  }
  return t
}

const isFormula = (v) => v && typeof v === 'object' && (v.formula || v.sharedFormula)

async function main() {
  const conflicts = []   // 수식 충돌(손상 유형)
  const nonAnchor = []   // 병합 비앵커(덮어씀 함정) — 부수 신호
  const integrity = []   // 파일/시트 해소 실패
  let scanned = 0

  for (const f of forms) {
    const targets = targetsOf(f.code)
    if (!targets.length) continue
    let src = null, fromTemplate = false
    if (f.template_path) {
      const p = path.join(root, 'resources', f.template_path)
      if (fs.existsSync(p)) { src = p; fromTemplate = true }
    }
    if (!src && f.reg_code) {
      const mf = masterFiles.find((x) => x.startsWith(f.reg_code + ' ')) || masterFiles.find((x) => x.startsWith(f.reg_code))
      if (mf) src = path.join(MASTERS, mf)
    }
    if (!src) { integrity.push({ code: f.code, issue: '정본 파일 해소 실패', detail: f.template_path || f.reg_code }); continue }

    let wb
    try { wb = await loadWb(src) } catch (e) { integrity.push({ code: f.code, issue: '워크북 판독 실패', detail: String(e.message).slice(0, 60) }); continue }
    let ws = wb.worksheets.find((w) => w.name.includes(f.code))
    if (!ws && fromTemplate) ws = wb.worksheets.find((w) => w.name === '양식') || wb.worksheets[0]
    if (!ws) { integrity.push({ code: f.code, issue: '시트 해소 실패', detail: path.basename(src) }); continue }

    // 병합 맵(비앵커 판정)
    const anchors = new Set(), inMerge = new Set()
    const cn = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)
    const colName = (n) => { let s = ''; while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) } return s }
    for (const m of ws.model?.merges || []) {
      const mm = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
      if (!mm) continue
      anchors.add(`${mm[1]}${mm[2]}`)
      for (let r = +mm[2]; r <= +mm[4]; r++)
        for (let c = cn(mm[1]); c <= cn(mm[3]); c++) inMerge.add(`${colName(c)}${r}`)
    }

    for (const t of targets) {
      let v
      try { v = ws.getCell(t.cell).value } catch { integrity.push({ code: f.code, issue: '셀 주소 불량', detail: `${t.key}→${t.cell}` }); continue }
      if (isFormula(v)) {
        conflicts.push({ code: f.code, name: f.name, team: f.resp_dept, sheet: ws.name, key: t.key, cell: t.cell, src: t.src, formula: String(v.formula || v.sharedFormula).slice(0, 60) })
      }
      if (inMerge.has(t.cell) && !anchors.has(t.cell)) {
        nonAnchor.push({ code: f.code, key: t.key, cell: t.cell, src: t.src })
      }
    }
    scanned++
  }

  const byForm = new Map()
  for (const c of conflicts) { if (!byForm.has(c.code)) byForm.set(c.code, []); byForm.get(c.code).push(c) }
  const naByForm = new Map()
  for (const c of nonAnchor) { if (!naByForm.has(c.code)) naByForm.set(c.code, []); naByForm.get(c.code).push(c) }

  console.log(`스캔 완료: 대상 ${forms.length} · 실스캔 ${scanned} · 워크북 ${wbCache.size}`)
  console.log(`★수식 충돌: ${conflicts.length}건 / ${byForm.size}양식`)
  for (const [code, list] of byForm) console.log(`  ${code} (${list.length}): ${list.map((x) => `${x.key}→${x.cell}`).join(', ').slice(0, 120)}`)
  console.log(`병합 비앵커(부수): ${nonAnchor.length}건 / ${naByForm.size}양식`)
  for (const [code, list] of naByForm) console.log(`  ${code} (${list.length}): ${list.slice(0, 6).map((x) => `${x.key}→${x.cell}`).join(', ').slice(0, 110)}`)
  console.log(`해소 실패(무결성): ${integrity.length}건`)
  for (const i of integrity) console.log(`  ${i.code}: ${i.issue} — ${i.detail}`)

  fs.writeFileSync(outPath, JSON.stringify({
    ranAt: new Date().toISOString(), dbPath, scanned, totalForms: forms.length,
    conflicts, nonAnchor, integrity
  }, null, 1), 'utf8')
  console.log(`JSON 저장: ${outPath}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
