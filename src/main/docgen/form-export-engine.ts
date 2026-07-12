// ─────────────────────────────────────────────────────────────────────────────
// 범용 양식 출력엔진 (갭1 ②③ 메인프로세스 포팅)
//
//  제출값(values_json, 앱 슬롯키 s1/h1…) + form_fields(라벨) + form_cell_map(셀맵)
//    → 원본 마스터 .xlsx 의 해당 셀에 값 주입 → 공식 양식 .xlsx (+ 선택 COM PDF)
//
//  scripts/export-form.mjs 의 일반화 로직을 DB 기반으로 옮긴 것.
//  앱 슬롯키 ↔ 셀맵키 다리 = 라벨 정규화 매칭 + 소수 별칭(ALIASES) 보정.
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdirSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { app } from 'electron'
import type Database from 'better-sqlite3'

const execFileP = promisify(execFile)

// 마스터 폴더 해소 우선순위: 환경변수 → DB설정(company_profile.mastersDir) → 번들 resources/forms.
// 배포 시 resources/forms 에 원본을 넣으면 번들로 동작(electron-builder.yml extraResources).
// 하드코딩 폴백 경로 없음(실명·기밀 경로가 번들에 실리는 것 방지) — 미설정 시 안내 에러.
export function resolveMastersDir(db: Database.Database): string {
  const env = process.env.IATF_MASTERS_DIR
  if (env && existsSync(env)) return env
  try {
    const r = db.prepare("SELECT value FROM company_profile WHERE key = 'mastersDir'").get() as
      | { value: string }
      | undefined
    if (r?.value && existsSync(r.value)) return r.value
  } catch {
    /* company_profile 없거나 키 없음 → 다음 후보 */
  }
  const bundled = app.isPackaged
    ? join(process.resourcesPath, 'forms')
    : join(__dirname, '../../resources/forms')
  // 번들 폴더는 실제 .xlsx 가 들어있을 때만 채택(빈 폴더/README만 있으면 폴백)
  if (existsSync(bundled) && readdirSync(bundled).some((f) => /\.xlsx$/i.test(f))) return bundled
  throw new Error("정본(마스터) 폴더가 설정되지 않았습니다. 사이드바 '정본 폴더'에서 지정하세요.")
}

export interface CellMapRow {
  field_key: string
  label: string | null
  cell: string
  type: string
}
export interface FormFieldLite {
  fieldKey: string
  label: string
  type: string
}

export interface ExportDiag {
  fieldKey: string
  label: string
  cell: string
  type: string
  value: string
}
export interface ExportResult {
  formCode: string
  src: string
  out: string
  sheet: string
  applied: ExportDiag[] // 셀에 주입된 필드
  unmapped: string[] // 값은 있으나 셀맵에 매칭 안 된 라벨
  grids?: Array<{ gridKey: string; written: number; dropped: number }> // 격자/대장 행반복 결과
  optCells?: Array<{ fieldKey: string; marked: number }> // 옵션별 분리셀(H3200-02형) 마킹 결과
  verify: { values: string; valuesOk: boolean; media: string; mediaOk: boolean; merges: string; mergesOk: boolean }
  pdf?: string | null
}

// 라벨/키 정규화: 공백·구분기호 제거, 소문자화 (의미 동일·표기 차이 흡수)
export function norm(s: string | null | undefined): string {
  return (s || '').replace(/[\s/&·.,()[\]·∙・]/g, '').toLowerCase()
}

// 앱 라벨(정규화) → 셀맵 키(원문). 의미는 같으나 단어가 다른 케이스 보정.
// key = norm(앱 form_fields.label), value = 셀맵 쪽 표기(원문, 매칭 시 norm됨).
export const ALIASES: Record<string, string> = {
  원인분석: '원인',
  관련규격문서: '관련규격또는관련문서',
  // H3200-02 고객불만 대응결과 (7/6 캔버스 순회검수)
  고객담당자: '담당자',
  선별수량: '선별수량EA',
  불량발생수량: '불량발생수량EA',
  대응상세내용: '고객불만대응상세내용',
  불량lot: '불량발생LOT',
  // B1100-05 봉쇄 작업표
  봉쇄범위및발견수량: '총발견수량',
  // B1100-03 특채 의뢰서 (특채내용은 부적합내용과 같은 칸(I6) 공유라 의도적 미매핑,
  // 부적합내용 alias 는 B1100-01/05 에선 자기 셀맵 키로 폴백되므로 안전)
  의뢰부서: '의뢰부서업체명',
  부적합내용: '부적합내용특채내용'
}

export function cellText(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'object' && (v as { richText?: unknown }).richText) {
    return (v as { richText: Array<{ text: string }> }).richText.map((t) => t.text).join('')
  }
  return String(v)
}
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// ExcelJS 타입에 media 가 노출 안 됨(런타임엔 존재) → 안전 캐스트로 이미지 개수 측정
function mediaCount(wb: ExcelJS.Workbook): number {
  return ((wb as unknown as { media?: unknown[] }).media || []).length
}

// 앱 제출값을 표시문자열로 (배열=다중선택 → 콤마결합)
function toDisplay(v: unknown): string {
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== '').join(', ')
  return String(v ?? '')
}

// 체크박스/라디오 셀에서 선택 옵션의 □ → ■ 치환.
// 셀 텍스트는 옵션 전체를 담고 내부 공백이 있음("□ 시 정 / □ 예 방") → 옵션을 글자단위 \s* 허용으로 매칭.
function flipCheckbox(base: string, selected: string[]): string {
  let out = base
  for (const opt of selected) {
    const clean = opt.replace(/\s+/g, '')
    if (!clean) continue
    const spaced = clean.split('').map(escapeRe).join('\\s*')
    const re = new RegExp('[□☐]\\s*(' + spaced + ')')
    out = out.replace(re, '■$1')
  }
  return out
}

// 번호매김 인라인("1. 전 화  2. 우 편") 셀 → 선택 옵션의 번호를 ○숫자(①)로 마킹.
const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
const circledNum = (n: number): string => (n >= 1 && n <= 20 ? CIRCLED[n - 1] : `(${n})`)
function markNumberedOption(base: string, selected: string[]): string {
  let out = base
  for (const opt of selected) {
    const clean = opt.replace(/\s+/g, '')
    if (!clean) continue
    const spaced = clean.split('').map(escapeRe).join('\\s*')
    const re = new RegExp('(\\d+)\\s*\\.\\s*(' + spaced + ')')
    out = out.replace(re, (_m, num: string, txt: string) => circledNum(parseInt(num, 10)) + ' ' + txt)
  }
  return out
}

// 옵션별 분리셀형(H3200-02): 선택 옵션의 셀을 【】로 표시
function markOptionCells(
  ws: ExcelJS.Worksheet,
  optionCells: Array<{ option: string; cell: string }>,
  selected: string[]
): number {
  const sel = new Set(selected.map((s) => s.replace(/\s+/g, '')))
  let marked = 0
  for (const oc of optionCells) {
    if (!sel.has(oc.option.replace(/\s+/g, ''))) continue
    const cell = ws.getCell(oc.cell)
    const t = cellText(cell.value).trim()
    if (!t.includes('【')) cell.value = `【${t}】`
    marked++
  }
  return marked
}

function injectCell(ws: ExcelJS.Worksheet, cellAddr: string, type: string, value: string): void {
  const cell = ws.getCell(cellAddr)
  switch (type) {
    case 'checkbox':
    case 'radio': {
      const base = cellText(cell.value)
      const selected = value.split(',').map((s) => s.trim()).filter(Boolean)
      if (/[□☐]/.test(base)) {
        cell.value = flipCheckbox(base, selected) // 박스형 □→■
      } else if (/\d+\s*\.\s*\S/.test(base)) {
        cell.value = markNumberedOption(base, selected) // 번호매김 인라인 → ①
      } else {
        cell.value = value
      }
      break
    }
    case 'textarea': {
      cell.value = value
      cell.alignment = { ...(cell.alignment || {}), wrapText: true, vertical: cell.alignment?.vertical || 'top' }
      break
    }
    default:
      // text/date/number/select/auto → 문자열 그대로(원본 셀 표시형식 유지)
      cell.value = value
  }
}

// 마스터 .xlsx 찾기: 파일명이 reg(예 "B-2100")로 시작
export function resolveMasterFile(reg: string, mastersDir: string): string {
  if (!existsSync(mastersDir)) throw new Error(`마스터 폴더 없음: ${mastersDir}`)
  const files = readdirSync(mastersDir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
  const hit = files.find((f) => f.startsWith(reg + ' ') || f.startsWith(reg))
  if (!hit) throw new Error(`마스터 파일 없음: reg=${reg}`)
  return join(mastersDir, hit)
}

export function resolveSheet(wb: ExcelJS.Workbook, formCode: string): ExcelJS.Worksheet {
  const ws = wb.worksheets.find((w) => w.name.includes(formCode))
  if (!ws) throw new Error(`시트 없음: ${formCode}`)
  return ws
}

// 앱 슬롯값 → (cell,type,value) 해소
function bridge(
  cellMap: CellMapRow[],
  formFields: FormFieldLite[],
  appValues: Record<string, unknown>
): { resolved: Array<{ field: FormFieldLite; cell: string; type: string; value: string }>; unmapped: string[] } {
  const lut = new Map<string, CellMapRow>()
  for (const r of cellMap) {
    lut.set(norm(r.field_key), r)
    if (r.label) lut.set(norm(r.label), r)
  }
  const resolved: Array<{ field: FormFieldLite; cell: string; type: string; value: string }> = []
  const unmapped: string[] = []
  for (const f of formFields) {
    if (f.type === 'grid') continue // 격자/대장형은 별도 행반복 처리
    const raw = appValues[f.fieldKey]
    const display = toDisplay(raw)
    if (display.trim() === '') continue // 값 없는 필드는 건너뜀
    const key = norm(f.label)
    const aliased = ALIASES[key] ? norm(ALIASES[key]) : key
    const row = lut.get(aliased) || lut.get(key)
    if (!row) {
      unmapped.push(f.label)
      continue
    }
    // type 은 앱 필드 우선(checkbox/radio/textarea 의미), 없으면 셀맵 type
    const type = f.type || row.type || 'text'
    resolved.push({ field: f, cell: row.cell, type, value: display })
  }
  return { resolved, unmapped }
}

// ── 격자/대장형 행반복 (갭1 D) ────────────────────────────────────────────────
export interface GridColumn {
  col_key: string
  sheet_col: string
  type: string
}
export interface GridSpec {
  grid_key: string
  data_start_row: number
  stride: number
  max_rows: number
  columns: GridColumn[]
}

// 그리드 스펙 로드: form_grid_spec + form_grid_columns
function loadGridSpec(db: Database.Database, formCode: string, gridKey: string): GridSpec | null {
  let spec: { grid_key: string; data_start_row: number; stride: number; max_rows: number } | undefined
  try {
    spec = db
      .prepare(
        'SELECT grid_key, data_start_row, stride, max_rows FROM form_grid_spec WHERE form_code = ? AND grid_key = ?'
      )
      .get(formCode, gridKey) as typeof spec
  } catch {
    return null // 테이블 미존재(구버전 DB)
  }
  if (!spec) return null
  const columns = db
    .prepare(
      'SELECT col_key, sheet_col, type FROM form_grid_columns WHERE form_code = ? AND grid_key = ? ORDER BY sort_order'
    )
    .all(formCode, gridKey) as GridColumn[]
  return { ...spec, columns }
}

// 레코드 배열을 연속 행에 주입(템플릿 행 수 초과는 잘림 — 동적 행삽입은 v2)
function injectGrid(
  ws: ExcelJS.Worksheet,
  spec: GridSpec,
  records: Array<Record<string, unknown>>
): { written: number; dropped: number } {
  let written = 0
  for (let i = 0; i < records.length; i++) {
    if (i >= spec.max_rows) break
    const r = spec.data_start_row + i * spec.stride
    for (const c of spec.columns) {
      const v = records[i]?.[c.col_key]
      if (v == null || v === '') continue
      injectCell(ws, `${c.sheet_col}${r}`, c.type, toDisplay(v))
    }
    written++
  }
  return { written, dropped: Math.max(0, records.length - spec.max_rows) }
}

export async function exportSubmissionXlsx(opts: {
  db: Database.Database
  formCode: string
  regCode: string
  appValues: Record<string, unknown>
  formFields: FormFieldLite[]
  outPath: string
  pdf?: boolean
}): Promise<ExportResult> {
  const { db, formCode, regCode, appValues, formFields, outPath, pdf } = opts

  const cellMap = db
    .prepare('SELECT field_key, label, cell, type FROM form_cell_map WHERE form_code = ? ORDER BY sort_order')
    .all(formCode) as CellMapRow[]
  if (!cellMap.length) throw new Error(`form_cell_map 비어있음: ${formCode} (폼형 셀맵 미적재 양식)`)

  const src = resolveMasterFile(regCode, resolveMastersDir(db))
  const { resolved, unmapped } = bridge(cellMap, formFields, appValues)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(src)
  const ws = resolveSheet(wb, formCode)

  const mediaBefore = mediaCount(wb)
  let mergesBefore = 0
  wb.eachSheet((s) => (mergesBefore += (s.model?.merges || []).length))

  for (const r of resolved) injectCell(ws, r.cell, r.type, r.value)

  // 격자/대장형 필드(type='grid') 행반복 주입
  const grids: Array<{ gridKey: string; written: number; dropped: number }> = []
  for (const f of formFields) {
    if (f.type !== 'grid') continue
    const spec = loadGridSpec(db, formCode, f.fieldKey)
    const raw = appValues[f.fieldKey]
    if (!spec || !Array.isArray(raw) || raw.length === 0) continue
    const rep = injectGrid(ws, spec, raw as Array<Record<string, unknown>>)
    grids.push({ gridKey: f.fieldKey, ...rep })
  }

  // 옵션별 분리셀형 라디오/체크박스(H3200-02형) 마킹
  const optCellMarks: Array<{ fieldKey: string; marked: number }> = []
  for (const f of formFields) {
    if (f.type !== 'radio' && f.type !== 'checkbox') continue
    let optCells: Array<{ option: string; cell: string }> = []
    try {
      optCells = db
        .prepare('SELECT option, cell FROM form_option_cells WHERE form_code = ? AND field_key = ? ORDER BY sort_order')
        .all(formCode, f.fieldKey) as Array<{ option: string; cell: string }>
    } catch {
      /* form_option_cells 미존재(구버전 DB) */
    }
    if (!optCells.length) continue
    const raw = appValues[f.fieldKey]
    const selected = Array.isArray(raw)
      ? (raw as unknown[]).map((x) => String(x))
      : raw == null || raw === ''
        ? []
        : [String(raw)]
    if (selected.length) {
      const marked = markOptionCells(ws, optCells, selected)
      if (marked > 0) optCellMarks.push({ fieldKey: f.fieldKey, marked })
    }
  }

  mkdirSync(dirname(outPath), { recursive: true })
  await wb.xlsx.writeFile(outPath)

  // 재검증: 다시 열어 값·보존 확인
  const v2 = new ExcelJS.Workbook()
  await v2.xlsx.readFile(outPath)
  const ws2 = resolveSheet(v2, formCode)
  let okVals = 0
  for (const r of resolved) {
    const got = cellText(ws2.getCell(r.cell).value).trim()
    const ok = r.type === 'checkbox' || r.type === 'radio' ? got.includes('■') || got === r.value : got === r.value.trim()
    if (ok) okVals++
  }
  const mediaAfter = mediaCount(v2)
  let mergesAfter = 0
  v2.eachSheet((s) => (mergesAfter += (s.model?.merges || []).length))

  const result: ExportResult = {
    formCode,
    src,
    out: outPath,
    sheet: ws.name,
    applied: resolved.map((r) => ({ fieldKey: r.field.fieldKey, label: r.field.label, cell: r.cell, type: r.type, value: r.value })),
    unmapped,
    grids,
    optCells: optCellMarks,
    verify: {
      values: `${okVals}/${resolved.length}`,
      valuesOk: okVals === resolved.length,
      media: `${mediaBefore}→${mediaAfter}`,
      mediaOk: mediaBefore === mediaAfter,
      merges: `${mergesBefore}→${mergesAfter}`,
      mergesOk: mergesBefore === mergesAfter
    }
  }

  if (pdf) result.pdf = await exportPdfViaCom(outPath, ws.name)
  return result
}

// Excel COM 으로 대상 시트 1장만 PDF 출력 (try/finally Quit+Release 로 좀비 방지)
async function exportPdfViaCom(xlsxPath: string, sheetName: string): Promise<string | null> {
  const pdfPath = xlsxPath.replace(/\.xlsx$/i, '.pdf')
  const ps = `
$ErrorActionPreference='Stop'
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$wb = $null; $ws = $null
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
    await execFileP('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true })
    return pdfPath
  } catch {
    return null
  }
}
