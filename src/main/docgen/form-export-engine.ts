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
import { readdirSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
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

// 셀 가드 신호(2026-07-30 검수 C-7·C-8 대응). 지금까지 이 3종은 전부 무음이었고
// 재검증(verify)까지 통과시켰다 — 수식 파괴는 차단하고, 나머지는 보고해 사람이 판단한다.
//  · formula      = 수식 셀을 가리키는 셀맵 → 주입 차단(수식 보존). 셀맵 교정 대상.
//  · mergeRedirect = 병합 비앵커 좌표 → 앵커로 리다이렉트(ExcelJS 가 이미 앵커로 전파하므로
//                    동작은 종전과 동일하나, 여러 행이 한 앵커로 수렴하는 행 손실을 가시화).
//  · overwrite    = 기존 텍스트가 있던 칸에 평문 주입(양식 라벨 덮어씀 후보).
export interface CellGuardHit {
  cell: string
  kind: 'formula' | 'mergeRedirect' | 'overwrite'
  ctx: string
  detail: string
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
  guard?: {
    skippedFormula: CellGuardHit[] // 수식 보존을 위해 주입하지 않은 셀(= 셀맵 결함 신호)
    mergeRedirects: CellGuardHit[] // 병합 앵커로 옮겨 쓴 셀
    overwrites: CellGuardHit[] // 기존 텍스트를 덮어쓴 셀
  }
  verify: {
    values: string
    valuesOk: boolean
    media: string
    mediaOk: boolean
    merges: string
    mergesOk: boolean
    grid?: string // 격자 주입분 재검증(종전 사각지대)
    gridOk?: boolean
    formulaSafe?: boolean // 수식 셀을 건드리지 않았는가(차단 0건)
  }
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

// ── 셀 가드 (검수 C-7·C-8, 2026-07-30) ───────────────────────────────────────
const A1_RE = /^[A-Z]{1,3}[1-9][0-9]*$/ // A0·ZZZ 류 불량 주소 사전 차단(ExcelJS 는 A0 를 조용히 허용)
const isFormulaValue = (v: unknown): boolean =>
  !!v && typeof v === 'object' && !!((v as { formula?: unknown }).formula || (v as { sharedFormula?: unknown }).sharedFormula)

/**
 * 쓰기 대상 셀 확보 — 병합 비앵커는 앵커로 옮기고, 수식 셀은 거부한다(null).
 * ExcelJS 실측(2026-07-30): 슬레이브 쓰기는 앵커로 전파되고 슬레이브 읽기는 앵커값을 돌려준다
 * → 종전 동작은 "앵커에 쓰고 앵커를 읽어 통과"였으므로 리다이렉트는 회귀 없이 가시화만 한다.
 */
function acquireCell(
  ws: ExcelJS.Worksheet,
  cellAddr: string,
  diag: CellGuardHit[],
  ctx: string
): ExcelJS.Cell | null {
  if (!A1_RE.test(cellAddr)) throw new Error(`셀 주소 불량: "${cellAddr}" (${ctx})`)
  let target: ExcelJS.Cell
  try {
    target = ws.getCell(cellAddr)
  } catch (e) {
    throw new Error(`셀 주소 해소 실패: "${cellAddr}" (${ctx}) — ${(e as Error).message}`)
  }
  if (target.isMerged && target.master && target.master.address !== target.address) {
    diag.push({ cell: cellAddr, kind: 'mergeRedirect', ctx, detail: `병합 앵커 ${target.master.address} 로 주입` })
    target = target.master
  }
  if (isFormulaValue(target.value)) {
    const f = target.value as { formula?: string; sharedFormula?: string }
    diag.push({
      cell: target.address,
      kind: 'formula',
      ctx,
      detail: `수식 보존(주입 차단): ${String(f.formula || f.sharedFormula).slice(0, 60)}`
    })
    return null
  }
  return target
}

// 옵션별 분리셀형(H3200-02): 선택 옵션의 셀을 【】로 표시
function markOptionCells(
  ws: ExcelJS.Worksheet,
  optionCells: Array<{ option: string; cell: string }>,
  selected: string[],
  diag: CellGuardHit[],
  fieldKey: string
): number {
  const sel = new Set(selected.map((s) => s.replace(/\s+/g, '')))
  let marked = 0
  for (const oc of optionCells) {
    if (!sel.has(oc.option.replace(/\s+/g, ''))) continue
    const cell = acquireCell(ws, oc.cell, diag, `${fieldKey}(옵션 ${oc.option})`)
    if (!cell) continue // 수식 셀 = 마킹 차단
    const t = cellText(cell.value).trim()
    if (!t.includes('【')) cell.value = `【${t}】`
    marked++
  }
  return marked
}

/** 셀 주입. 수식 셀이면 주입하지 않고 false 를 돌려준다(가드 기록은 diag). */
function injectCell(
  ws: ExcelJS.Worksheet,
  cellAddr: string,
  type: string,
  value: string,
  diag: CellGuardHit[],
  ctx: string
): boolean {
  const cell = acquireCell(ws, cellAddr, diag, ctx)
  if (!cell) return false
  const before = cellText(cell.value).trim()
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
  // 옵션형(□/번호매김)은 기존 텍스트를 쓰는 게 정상 — 평문 주입만 덮어씀 후보로 본다.
  if (before && type !== 'checkbox' && type !== 'radio') {
    diag.push({ cell: cell.address, kind: 'overwrite', ctx, detail: `기존 텍스트 "${before.slice(0, 30)}" 덮어씀` })
  }
  return true
}

// 마스터 .xlsx 찾기: 파일명이 reg(예 "B-2100")로 시작
export function resolveMasterFile(reg: string, mastersDir: string): string {
  if (!existsSync(mastersDir)) throw new Error(`마스터 폴더 없음: ${mastersDir}`)
  const files = readdirSync(mastersDir).filter((f) => /\.xlsx$/i.test(f) && !f.startsWith('~$'))
  const hit = files.find((f) => f.startsWith(reg + ' ') || f.startsWith(reg))
  if (!hit) throw new Error(`마스터 파일 없음: reg=${reg}`)
  return join(mastersDir, hit)
}

// 신규 설계본 폴백(양식 완성전 1배치, 2026-07-28): 회사 규정집(마스터)에 시트가 없는 양식은
// forms.template_path(리포 resources/ 기준 상대경로 — 0065 갭양식 선례 sq_gap_forms/)가 정본.
// resolveMastersDir 의 3단 폴백(env→DB→번들)과 같은 결 — 새 엔진이 아니라 소스 해소 한 단계.
export function resolveTemplateFile(templatePath: string): string | null {
  const base = app.isPackaged
    ? join(process.resourcesPath, templatePath)
    : join(__dirname, '../../resources', templatePath)
  return existsSync(base) ? base : null
}

// 표준팩 템플릿 토큰 치환(39호 S3-2 ④-2 ⓐ, 2026-08-23 · 리뷰 8/23 개정): 표준팩 xlsx 의 회사 칸은 `{{companyName}}` 같은 토큰.
// company_profile 의 **모든 키**를 `{{key}}` 로 받는다(종전 6키 하드코딩 → 키 추가 시 엔진 무수정). 문자열·리치텍스트·수식 캐시 결과까지
// 치환(리뷰: L3101-02 R48~Y48 수식 결과에 토큰 잔존). 미지 키 = '' (폴백 회사명 금지 — S1 규약). TPC 정본·구 템플릿 = no-op.
const TOKEN_RE = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g
// ── 회사 로고 주입 (2026-08-24 도장) ─────────────────────────────────────────
// 표준팩 템플릿의 로고 자리에는 '{{companyLogo}}' 표식이 들어 있다(정본의 로고 이미지는
// 고객사 자산이라 팩에 싣지 않았다 — S3-2 규약). 출력 때 그 표식을 찾아 **설치처 자기 로고**를
// 같은 자리에 앉힌다. 로고가 없으면 표식만 지우고 빈칸으로 둔다(토큰 문자열 노출 금지).
//
// ⚠ 반드시 applyProfileTokens 보다 **먼저** 부른다 — 토큰 치환이 미지 키를 ''로 지워버리면
//   로고 자리를 잃는다.
const LOGO_TOKEN_RE = /\{\{\s*companyLogo\s*\}\}/gi

/** PNG/JPEG 헤더에서 픽셀 크기를 읽는다(비율 보존용). 실패 시 null. */
function imagePixelSize(buf: Buffer): { w: number; h: number } | null {
  // PNG: 시그니처 8 + IHDR(길이4+타입4) 다음 width/height 각 4바이트 BE
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  }
  // JPEG: SOF 마커에서 height/width
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue }
      const marker = buf[i + 1]
      const len = buf.readUInt16BE(i + 2)
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
      }
      i += 2 + len
    }
  }
  return null
}

/** 엑셀 열 너비(문자) → 픽셀 근사 · 행 높이(pt) → 픽셀 근사(96dpi). */
const colPx = (w: number | undefined): number => Math.round(((w ?? 8.43) * 7) + 5)
const rowPx = (h: number | undefined): number => Math.round((h ?? 15) * (96 / 72))

export function applyProfileLogo(ws: ExcelJS.Worksheet, wb: ExcelJS.Workbook, _db: Database.Database): number {
  // 표식 위치부터 찾는다 — 로고가 없어도 표식은 지워야 하므로 파일 유무보다 먼저.
  const marks: Array<{ row: number; col: number }> = []
  ws.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value
      const text =
        typeof v === 'string' ? v
        : v && typeof v === 'object' && 'richText' in v
          ? (v as ExcelJS.CellRichTextValue).richText.map((t) => t.text).join('')
          : null
      if (text == null) return
      LOGO_TOKEN_RE.lastIndex = 0
      if (!LOGO_TOKEN_RE.test(text)) return
      LOGO_TOKEN_RE.lastIndex = 0
      const rest = text.replace(LOGO_TOKEN_RE, '').trim()
      cell.value = rest ? rest : null   // 표식만 제거 — 곁들인 문구는 남긴다
      marks.push({ row: Number(cell.row), col: Number(cell.col) })
    })
  )
  if (marks.length === 0) return 0

  let logoPath: string | null = null
  try {
    const dir = join(app.getPath('userData'), 'branding')
    if (existsSync(dir)) {
      const f = readdirSync(dir).find((n) => /^logo[.](png|jpg|jpeg|gif|webp)$/i.test(n))
      if (f) logoPath = join(dir, f)
    }
  } catch {
    logoPath = null
  }
  if (!logoPath) return 0   // 로고 미등록 = 빈칸(종전과 동일한 모습)

  const buf = readFileSync(logoPath)
  const rawExt = (logoPath.split('.').pop() || 'png').toLowerCase()
  const imageId = wb.addImage({
    buffer: buf as unknown as ExcelJS.Buffer,
    extension: (rawExt === 'jpg' ? 'jpeg' : rawExt) as 'png' | 'jpeg' | 'gif'
  })

  // 표식 칸이 병합돼 있으면 그 병합 영역 전체가 로고 자리다.
  const merges: string[] = (ws.model?.merges || []) as string[]
  const rangeOf = (row: number, col: number): { r1: number; c1: number; r2: number; c2: number } => {
    for (const m of merges) {
      const [a, b] = m.split(':')
      if (!a || !b) continue
      const ca = ws.getCell(a), cb = ws.getCell(b)
      const r1 = Number(ca.row), c1 = Number(ca.col), r2 = Number(cb.row), c2 = Number(cb.col)
      if (row >= r1 && row <= r2 && col >= c1 && col <= c2) return { r1, c1, r2, c2 }
    }
    return { r1: row, c1: col, r2: row, c2: col }
  }

  let placed = 0
  for (const mk of marks) {
    const { r1, c1, r2, c2 } = rangeOf(mk.row, mk.col)
    let boxW = 0
    for (let c = c1; c <= c2; c++) boxW += colPx(ws.getColumn(c).width)
    let boxH = 0
    for (let r = r1; r <= r2; r++) boxH += rowPx(ws.getRow(r).height)
    boxW = Math.max(24, boxW - 8)   // 여백 4px 씩
    boxH = Math.max(16, boxH - 8)

    // 비율 보존해 자리 안에 맞춘다(찌그러짐 방지). 크기를 못 읽으면 자리를 그대로 채운다.
    const nat = imagePixelSize(buf)
    let w = boxW, h = boxH
    if (nat && nat.w > 0 && nat.h > 0) {
      const k = Math.min(boxW / nat.w, boxH / nat.h)
      w = Math.max(8, Math.round(nat.w * k))
      h = Math.max(8, Math.round(nat.h * k))
    }
    ws.addImage(imageId, {
      tl: { col: c1 - 1 + 0.1, row: r1 - 1 + 0.1 } as ExcelJS.Anchor,
      ext: { width: w, height: h },
      editAs: 'oneCell'
    })
    placed++
  }
  return placed
}

export function applyProfileTokens(ws: ExcelJS.Worksheet, db: Database.Database): number {
  let prof: Record<string, string> = {}
  try {
    const rows = db.prepare('SELECT key, value FROM company_profile').all() as Array<{ key: string; value: string | null }>
    for (const r of rows) prof[r.key] = r.value ?? ''
  } catch {
    prof = {}
  }
  const sub = (t: string): string => t.replace(TOKEN_RE, (_m, k: string) => prof[k] ?? '')
  let n = 0
  ws.eachRow({ includeEmpty: false }, (row) =>
    row.eachCell({ includeEmpty: false }, (cell) => {
      const v = cell.value
      if (typeof v === 'string') {
        if (TOKEN_RE.test(v)) {
          TOKEN_RE.lastIndex = 0
          cell.value = sub(v)
          n++
        }
        TOKEN_RE.lastIndex = 0
      } else if (v && typeof v === 'object' && 'richText' in v) {
        const rt = (v as ExcelJS.CellRichTextValue).richText
        if (rt.some((t) => { const hit = TOKEN_RE.test(t.text); TOKEN_RE.lastIndex = 0; return hit })) {
          cell.value = { richText: rt.map((t) => ({ ...t, text: sub(t.text) })) }
          n++
        }
      } else if (v && typeof v === 'object' && 'formula' in v) {
        const fv = v as ExcelJS.CellFormulaValue
        const r = typeof fv.result === 'string' ? fv.result : null
        const hitF = TOKEN_RE.test(fv.formula); TOKEN_RE.lastIndex = 0
        const hitR = r != null && TOKEN_RE.test(r); TOKEN_RE.lastIndex = 0
        if (hitF || hitR) {
          cell.value = { ...fv, formula: sub(fv.formula), result: r != null ? sub(r) : fv.result } as ExcelJS.CellFormulaValue
          n++
        }
      }
    })
  )
  return n
}

export function resolveSheet(
  wb: ExcelJS.Workbook,
  formCode: string,
  opts?: { allowFirstSheetFallback?: boolean }
): ExcelJS.Worksheet {
  const ws = wb.worksheets.find((w) => w.name.includes(formCode))
  if (ws) return ws
  // 신규 설계본 템플릿(단일 양식 파일)만 첫 시트 폴백 허용 — 시트명이 '양식'(0065 문법).
  // 마스터 규정집(다중 시트)에서는 오주입 방지를 위해 폴백 금지.
  if (opts?.allowFirstSheetFallback) {
    const first = wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    if (first) return first
  }
  throw new Error(`시트 없음: ${formCode}`)
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
    // field_key 폴백 = 캔버스(render-model)와 동일 3단. 종전 export 만 2단이라 라벨이 다르고
    // field_key 만 일치하는 필드는 화면에서 입력받고도 출력에서 조용히 탈락했다(검수 M-5).
    const row = lut.get(aliased) || lut.get(key) || lut.get(norm(f.fieldKey))
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
  records: Array<Record<string, unknown>>,
  diag: CellGuardHit[],
  gridKey: string
): { written: number; dropped: number; cells: Array<{ cell: string; value: string }> } {
  // 스펙 무결성(검수 Minor): stride 0 = 전 레코드가 같은 행을 덮어씀, max_rows NULL = 전량 탈락.
  const stride = Number(spec.stride) > 0 ? Number(spec.stride) : 1
  const maxRows = Number(spec.max_rows) > 0 ? Number(spec.max_rows) : records.length
  let written = 0
  const cells: Array<{ cell: string; value: string }> = []
  for (let i = 0; i < records.length; i++) {
    if (i >= maxRows) break
    const r = spec.data_start_row + i * stride
    for (const c of spec.columns) {
      const v = records[i]?.[c.col_key]
      if (v == null || v === '') continue
      const addr = `${c.sheet_col}${r}`
      const value = toDisplay(v)
      if (injectCell(ws, addr, c.type, value, diag, `${gridKey}.${c.col_key}[${i + 1}]`)) {
        cells.push({ cell: addr, value })
      }
    }
    written++
  }
  return { written, dropped: Math.max(0, records.length - maxRows), cells }
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
  // 대장형(grid) 양식은 cell_map 없이 grid 좌표만으로 성립(7/28 게이트 완화 — L1100-15·B2100류)
  const hasGrid = formFields.some((f) => f.type === 'grid')
  if (!cellMap.length && !hasGrid) throw new Error(`form_cell_map 비어있음: ${formCode} (폼형 셀맵 미적재 양식)`)

  // 소스 해소: ①forms.template_path(신규 설계본 — 리포/번들 templates) ②마스터 규정집(reg 파일)
  let src: string | null = null
  let fromTemplate = false
  try {
    const tp = (
      db.prepare('SELECT template_path FROM forms WHERE code = ?').get(formCode) as
        | { template_path: string | null }
        | undefined
    )?.template_path
    if (tp) {
      src = resolveTemplateFile(tp)
      fromTemplate = src != null
    }
  } catch {
    /* forms.template_path 컬럼 미존재(구버전) → 마스터 경로 */
  }
  if (!src) src = resolveMasterFile(regCode, resolveMastersDir(db))
  const { resolved, unmapped } = bridge(cellMap, formFields, appValues)

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(src)
  const ws = resolveSheet(wb, formCode, { allowFirstSheetFallback: fromTemplate })
  applyProfileLogo(ws, wb, db)   // ⚠ 토큰 치환보다 먼저 — 뒤면 표식이 ''로 지워진다
  applyProfileTokens(ws, db)

  const mediaBefore = mediaCount(wb)
  let mergesBefore = 0
  wb.eachSheet((s) => (mergesBefore += (s.model?.merges || []).length))

  const guardHits: CellGuardHit[] = []
  const injected: Array<{ field: FormFieldLite; cell: string; type: string; value: string }> = []
  for (const r of resolved) {
    if (injectCell(ws, r.cell, r.type, r.value, guardHits, `${r.field.fieldKey}/${r.field.label}`)) injected.push(r)
  }

  // 격자/대장형 필드(type='grid') 행반복 주입
  const grids: Array<{ gridKey: string; written: number; dropped: number }> = []
  const gridCells: Array<{ cell: string; value: string }> = []
  for (const f of formFields) {
    if (f.type !== 'grid') continue
    const spec = loadGridSpec(db, formCode, f.fieldKey)
    const raw = appValues[f.fieldKey]
    if (!spec || !Array.isArray(raw) || raw.length === 0) continue
    const rep = injectGrid(ws, spec, raw as Array<Record<string, unknown>>, guardHits, f.fieldKey)
    gridCells.push(...rep.cells)
    grids.push({ gridKey: f.fieldKey, written: rep.written, dropped: rep.dropped })
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
      const marked = markOptionCells(ws, optCells, selected, guardHits, f.fieldKey)
      if (marked > 0) optCellMarks.push({ fieldKey: f.fieldKey, marked })
    }
  }

  mkdirSync(dirname(outPath), { recursive: true })
  await wb.xlsx.writeFile(outPath)

  // 재검증: 다시 열어 값·보존 확인. 주입 성공분(injected)만 대조하고, 차단분(수식)은 별도 신호.
  const v2 = new ExcelJS.Workbook()
  await v2.xlsx.readFile(outPath)
  const ws2 = resolveSheet(v2, formCode, { allowFirstSheetFallback: fromTemplate })
  let okVals = 0
  for (const r of injected) {
    const got = cellText(ws2.getCell(r.cell).value).trim()
    // 옵션형: □→■ 뿐 아니라 번호매김 ①~⑳ 마킹도 성공(종전엔 성공을 실패로 셌다 — 검수 M-4)
    const ok =
      r.type === 'checkbox' || r.type === 'radio' ? /[■①-⑳]/.test(got) || got === r.value : got === r.value.trim()
    if (ok) okVals++
  }
  // 격자 주입분 재검증(종전 사각지대 — 대장형은 resolved 가 비어 0/0 무조건 통과였다)
  let okGrid = 0
  for (const g of gridCells) {
    if (cellText(ws2.getCell(g.cell).value).trim() === g.value.trim()) okGrid++
  }
  const mediaAfter = mediaCount(v2)
  let mergesAfter = 0
  v2.eachSheet((s) => (mergesAfter += (s.model?.merges || []).length))

  const skippedFormula = guardHits.filter((h) => h.kind === 'formula')
  const mergeRedirects = guardHits.filter((h) => h.kind === 'mergeRedirect')
  const overwrites = guardHits.filter((h) => h.kind === 'overwrite')

  const result: ExportResult = {
    formCode,
    src,
    out: outPath,
    sheet: ws.name,
    applied: injected.map((r) => ({ fieldKey: r.field.fieldKey, label: r.field.label, cell: r.cell, type: r.type, value: r.value })),
    unmapped,
    grids,
    optCells: optCellMarks,
    guard: { skippedFormula, mergeRedirects, overwrites },
    verify: {
      values: `${okVals}/${injected.length}`,
      // 수식 차단이 하나라도 있으면 초록으로 내보내지 않는다(C-7: 파괴를 verify 가 통과시키던 구조 차단)
      valuesOk: okVals === injected.length && skippedFormula.length === 0,
      media: `${mediaBefore}→${mediaAfter}`,
      mediaOk: mediaBefore === mediaAfter,
      merges: `${mergesBefore}→${mergesAfter}`,
      mergesOk: mergesBefore === mergesAfter,
      grid: `${okGrid}/${gridCells.length}`,
      gridOk: okGrid === gridCells.length,
      formulaSafe: skippedFormula.length === 0
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
