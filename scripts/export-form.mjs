// ─────────────────────────────────────────────────────────────────────────────
// 범용 양식 출력엔진 (갭1 ②) — fill-b2100.mjs 를 모든 폼형 양식으로 일반화.
//
//   입력 : form_code  +  값객체(field_key → value)
//   소스 : _demo_output/전체_폼형_셀맵.csv  (form_code,reg,sheet,field_key,label,cell,type)
//   출력 : 원본 마스터 .xlsx 의 해당 셀에 값 주입 → 공식 양식 그대로 .xlsx (+ 선택 PDF)
//
// 사용:
//   node scripts/export-form.mjs <form_code> --values <values.json> [--pdf] [--out <path>]
//   node scripts/export-form.mjs <form_code> --demo [--pdf]          # 내장 데모값으로 시연
//
// 설계 메모:
//  - 셀맵 CSV 가 곧 field 정의(②③ 공용 재료). 코드에 양식별 분기 없음 = 범용.
//  - value 키 = 셀맵의 field_key (한글 라벨 파생). 매칭 안 되는 키는 경고 후 skip.
//  - 값 주입은 .value 만 교체 → 셀 스타일/폰트/병합/로고/결재란 100% 원본 보존.
//  - PDF 는 Excel COM(ExportAsFixedFormat) — 별도 호출, Windows+Excel 필요.
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// ── 경로 (※ 탐색용 스크립트라 ROOT 하드코딩 — 출하 시 설정화 대상) ──────────────
const PROJECT = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager'
const MASTERS = 'D:\\IATF16949,SQ 자동작성 봇\\IATF 전체 자료모음_김권표이사_260501\\3.IATF16949 규정&지침 _230501'
const CELLMAP = path.join(PROJECT, '_demo_output', '전체_폼형_셀맵.csv')
const OUT_DIR = path.join(PROJECT, '_demo_output')

// ── 최소 CSV 파서 (따옴표/콤마/이스케이프 "" / BOM 처리) ─────────────────────────
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1) // strip BOM
  const rows = []
  let field = '', row = [], inQ = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ }
        else inQ = false
      } else field += c
    } else {
      if (c === '"') inQ = true
      else if (c === ',') { row.push(field); field = '' }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(field); rows.push(row); field = ''; row = [] }
      else field += c
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row) }
  return rows
}

// ── 셀맵 로드: form_code 필터 → {reg, sheet, fields:[{field_key,label,cell,type}]} ─
function loadCellMap(formCode) {
  const rows = parseCsv(fs.readFileSync(CELLMAP, 'utf-8'))
  const header = rows[0]
  const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]))
  const fields = []
  let reg = null, sheet = null
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]
    if (row[idx.form_code] !== formCode) continue
    reg = row[idx.reg]
    sheet = row[idx.sheet]
    fields.push({
      field_key: row[idx.field_key],
      label: row[idx.label],
      cell: row[idx.cell],
      type: (row[idx.type] || 'text').trim(),
    })
  }
  if (!fields.length) throw new Error(`셀맵에 form_code=${formCode} 없음`)
  return { reg, sheet, fields }
}

// ── 원본 마스터 .xlsx 찾기: 파일명이 reg(예 "B-2100")로 시작 ───────────────────
function resolveMasterFile(reg) {
  const files = fs.readdirSync(MASTERS).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
  const hit = files.find((f) => f.startsWith(reg + ' ') || f.startsWith(reg))
  if (!hit) throw new Error(`마스터 파일 없음: reg=${reg}`)
  return path.join(MASTERS, hit)
}

// ── 시트 찾기: CSV sheet명 우선, 실패 시 form_code 포함 시트 ─────────────────────
function resolveSheet(wb, sheetName, formCode) {
  let ws = wb.worksheets.find((w) => w.name === sheetName)
  if (!ws) ws = wb.worksheets.find((w) => w.name.includes(formCode))
  if (!ws) throw new Error(`시트 없음: "${sheetName}" / ${formCode}`)
  return ws
}

// ── type별 셀 주입 ────────────────────────────────────────────────────────────
function injectCell(ws, field, value) {
  const cell = ws.getCell(field.cell)
  switch (field.type) {
    case 'checkbox': {
      // value = 선택할 옵션 텍스트. 셀 안 "□<옵션>" → "■<옵션>" 치환.
      const base = cellText(cell.value)
      if (base.includes('□')) {
        const re = new RegExp('□(\\s*' + escapeRe(String(value)) + ')')
        cell.value = re.test(base) ? base.replace(re, '■$1') : base.replace('□', '■')
      } else {
        cell.value = String(value)
      }
      break
    }
    case 'textarea': {
      cell.value = String(value)
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: cell.alignment?.vertical || 'top' }
      break
    }
    case 'date': {
      // 날짜는 문자열 그대로 주입(원본 셀 표시형식 유지). 통일 포맷은 ③에서 정책화.
      cell.value = String(value)
      break
    }
    default:
      cell.value = String(value)
  }
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
function cellText(v) {
  if (v == null) return ''
  if (typeof v === 'object' && v.richText) return v.richText.map((t) => t.text).join('')
  return String(v)
}

// ── 메인 엔진 ─────────────────────────────────────────────────────────────────
export async function exportForm({ formCode, values, outPath, pdf = false }) {
  const map = loadCellMap(formCode)
  const src = resolveMasterFile(map.reg)
  const out = outPath || path.join(OUT_DIR, `${formCode}_출력.xlsx`)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(src)
  const ws = resolveSheet(wb, map.sheet, formCode)

  // 보존 기준 측정
  const mediaBefore = (wb.media || []).length
  let mergesBefore = 0
  wb.eachSheet((s) => (mergesBefore += (s.model?.merges || []).length))

  // 주입
  const applied = [], missing = [], skipped = []
  for (const f of map.fields) {
    if (!(f.field_key in values)) { missing.push(f.field_key); continue }
    const v = values[f.field_key]
    if (v == null || v === '') { skipped.push(f.field_key); continue }
    injectCell(ws, f, v)
    applied.push({ ...f, value: v })
  }
  // 셀맵에 없는 값 키 경고
  const known = new Set(map.fields.map((f) => f.field_key))
  const unknown = Object.keys(values).filter((k) => !known.has(k))

  fs.mkdirSync(path.dirname(out), { recursive: true })
  await wb.xlsx.writeFile(out)

  // ── 자동 재검증: 다시 열어 값·보존 확인 ──
  const v2 = new ExcelJS.Workbook()
  await v2.xlsx.readFile(out)
  const ws2 = resolveSheet(v2, map.sheet, formCode)
  let okVals = 0
  const valReport = []
  for (const a of applied) {
    const got = cellText(ws2.getCell(a.cell).value).trim()
    // checkbox 는 치환 결과라 정확매칭 대신 ■ 포함으로 판정
    const ok = a.type === 'checkbox' ? got.includes('■') : got === String(a.value).trim()
    if (ok) okVals++
    valReport.push({ ...a, got, ok })
  }
  const mediaAfter = (v2.media || []).length
  let mergesAfter = 0
  v2.eachSheet((s) => (mergesAfter += (s.model?.merges || []).length))

  const result = {
    formCode, src, out,
    sheet: ws.name,
    counts: { mapped: map.fields.length, applied: applied.length, missing: missing.length, skipped: skipped.length },
    verify: {
      values: `${okVals}/${applied.length}`,
      valuesOk: okVals === applied.length,
      media: `${mediaBefore}→${mediaAfter}`,
      mediaOk: mediaBefore === mediaAfter,
      merges: `${mergesBefore}→${mergesAfter}`,
      mergesOk: mergesBefore === mergesAfter,
    },
    missing, skipped, unknown, valReport,
  }

  if (pdf) result.pdf = exportPdfViaCom(out, ws.name)
  return result
}

// ── Excel COM 으로 PDF 출력 (try/finally Quit+Release 로 좀비 방지) ──────────────
// ※ 워크북 전체가 아니라 대상 양식 시트 1장만 내보낸다(규정 본문 전체 출력 방지).
function exportPdfViaCom(xlsxPath, sheetName) {
  const pdfPath = xlsxPath.replace(/\.xlsx$/i, '.pdf')
  const ps = `
$ErrorActionPreference='Stop'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $null
try {
  $wb = $excel.Workbooks.Open('${xlsxPath.replace(/'/g, "''")}')
  $ws = $wb.Worksheets.Item('${sheetName.replace(/'/g, "''")}')
  $ws.ExportAsFixedFormat(0, '${pdfPath.replace(/'/g, "''")}')
} finally {
  if ($ws) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($ws) }
  if ($wb) { $wb.Close($false); [void][Runtime.InteropServices.Marshal]::ReleaseComObject($wb) }
  $excel.Quit()
  [void][Runtime.InteropServices.Marshal]::ReleaseComObject($excel)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
}
Write-Output 'PDF_OK'
`.trim()
  try {
    execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'pipe' })
    return pdfPath
  } catch (e) {
    return `PDF 실패: ${e.message.split('\n')[0]}`
  }
}

// ── 내장 데모값 (시연용; 실제로는 form_submissions.values_json 에서 옴) ──────────
const DEMOS = {
  'B2100-01': {
    발행번호: 'B2100-01-2026-001', 발행일자: '2026-06-25', 수신처: '고성정밀', 발행자: '하헌',
    부적합사항: '브레이징 조인트 누유 발생 — LOT 26-0612, 기밀시험 불합격(규정 누설량 초과). 출하 전 전수검사에서 3건 검출됨.',
    관련규격또는관련문서: 'B-2100 시정조치 규정, 작업표준서 WI-BRZ-03, 기밀시험 기준서',
    회신요구일: '2026-07-05', 피감사자: '김품질', 감사자: '이심사',
    원인: '브레이징 토치 각도 편차로 모재 미용착 구간 발생', 완료예정일: '2026-07-12',
  },
  'B1100-01': {
    발행번호: 'B1100-01-2026-001', 작성일자: '2026-06-25', 작성자: '하헌', 수신처: '생산1팀',
    발생일자: '2026-06-24', LOTNO: '26-0612', 품명: '브레이징 조인트 ASSY', 품번규격: 'BRZ-1180 / Ø12',
    불량수량: '3 EA', 발생장소: '기밀시험 공정',
  },
}

// ── CLI ──────────────────────────────────────────────────────────────────────
async function cli() {
  const argv = process.argv.slice(2)
  const formCode = argv[0]
  if (!formCode || formCode.startsWith('--')) {
    console.log('사용: node scripts/export-form.mjs <form_code> [--demo | --values <json>] [--pdf] [--out <path>]')
    process.exit(1)
  }
  const wantPdf = argv.includes('--pdf')
  const valIdx = argv.indexOf('--values')
  const outIdx = argv.indexOf('--out')
  let values
  if (argv.includes('--demo') || valIdx === -1) {
    values = DEMOS[formCode]
    if (!values) { console.log(`내장 데모값 없음: ${formCode}. --values <json> 로 제공하세요.`); process.exit(1) }
  } else {
    values = JSON.parse(fs.readFileSync(argv[valIdx + 1], 'utf-8'))
  }
  const outPath = outIdx !== -1 ? argv[outIdx + 1] : undefined

  const r = await exportForm({ formCode, values, outPath, pdf: wantPdf })

  console.log(`\n■ ${r.formCode}  →  ${path.basename(r.out)}`)
  console.log(`  원본: ${path.basename(r.src)}`)
  console.log(`  시트: ${r.sheet}`)
  console.log(`  매핑 ${r.counts.mapped} / 주입 ${r.counts.applied} / 값없음 ${r.counts.skipped} / 미제공 ${r.counts.missing}`)
  console.log('  ── 재검증 ──')
  console.log(`  값일치   ${r.verify.values}  ${r.verify.valuesOk ? 'OK' : '✗'}`)
  console.log(`  이미지   ${r.verify.media}  ${r.verify.mediaOk ? 'OK' : '✗ 손실!'}`)
  console.log(`  병합셀   ${r.verify.merges}  ${r.verify.mergesOk ? 'OK' : '✗'}`)
  if (r.unknown.length) console.log(`  ⚠ 셀맵에 없는 값 키: ${r.unknown.join(', ')}`)
  const bad = r.valReport.filter((x) => !x.ok)
  if (bad.length) { console.log('  ✗ 불일치:'); bad.forEach((b) => console.log(`     ${b.cell}(${b.field_key}) 기대="${b.value}" 실제="${b.got}"`)) }
  if (r.pdf) console.log(`  PDF: ${r.pdf}`)
  console.log('')
}

// ESM 직접 실행 감지
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` ||
    process.argv[1].endsWith('export-form.mjs')) {
  cli().catch((e) => { console.error('ERR', e.message); process.exit(1) })
}
