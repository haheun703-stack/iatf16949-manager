// ─────────────────────────────────────────────────────────────────────────────
// 양식 캔버스 RenderModel 생성기 (엑셀형 작성 화면의 심장)
//
//  원본 마스터 .xlsx 시트를 ExcelJS로 파싱 → 병합·테두리·색·폭·높이를 담은
//  RenderModel JSON → 렌더러가 colgroup+table로 원본 양식을 재현하고
//  form_cell_map 좌표의 셀만 입력 셀로 치환한다.
//
//  화면 재현 목표는 90~95% (대각테두리·회전텍스트·이미지는 포기 항목).
//  최종 출력은 어차피 form-export-engine 이 원본 xlsx 에 값을 주입하므로
//  화면 오차가 결과물 품질에 영향을 주지 않는다 (정적 렌더 + 단방향 저장).
// ─────────────────────────────────────────────────────────────────────────────
import ExcelJS from 'exceljs'
import type Database from 'better-sqlite3'
import type { FormRenderModelDto, RenderCellDto, RenderEditCellDto } from '@shared/ipc-types'
import {
  resolveMastersDir,
  resolveMasterFile,
  resolveTemplateFile,
  resolveSheet,
  applyProfileTokens,
  applyProfileLogo,
  cellText,
  norm,
  ALIASES
} from './form-export-engine'

// Office 기본 테마 팔레트 (theme 인덱스 → RGB). xlsx 스펙 순서: lt1,dk1,lt2,dk2,accent1~6.
const THEME_RGB = [
  'FFFFFF', '000000', 'E7E6E6', '44546A',
  '4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47'
]

// tint 적용: >0 은 흰색 쪽으로, <0 은 검정 쪽으로 선형 보간
function applyTint(hex: string, tint: number): string {
  const n = parseInt(hex, 16)
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff
  if (tint > 0) {
    r = Math.round(r + (255 - r) * tint)
    g = Math.round(g + (255 - g) * tint)
    b = Math.round(b + (255 - b) * tint)
  } else if (tint < 0) {
    r = Math.round(r * (1 + tint))
    g = Math.round(g * (1 + tint))
    b = Math.round(b * (1 + tint))
  }
  const to2 = (x: number): string => x.toString(16).padStart(2, '0')
  return `${to2(r)}${to2(g)}${to2(b)}`
}

// ExcelJS 색 객체 → CSS 색 (#rrggbb). 해석 불가 시 undefined.
function toCss(color?: Partial<ExcelJS.Color> & { theme?: number; tint?: number }): string | undefined {
  if (!color) return undefined
  if (color.argb && color.argb.length === 8) {
    if (color.argb.startsWith('00')) return undefined // 완전투명
    return `#${color.argb.slice(2)}`
  }
  if (typeof color.theme === 'number') {
    const base = THEME_RGB[color.theme] ?? '000000'
    return `#${applyTint(base, color.tint ?? 0)}`
  }
  return undefined
}

// 테두리 스타일 → CSS
function borderCss(b?: Partial<ExcelJS.Border>): string | undefined {
  if (!b || !b.style) return undefined
  const color = toCss(b.color as Parameters<typeof toCss>[0]) ?? '#333'
  switch (b.style) {
    case 'hair':
    case 'thin': return `1px solid ${color}`
    case 'medium': return `2px solid ${color}`
    case 'thick': return `3px solid ${color}`
    case 'double': return `3px double ${color}`
    case 'dotted': return `1px dotted ${color}`
    case 'dashed':
    case 'dashDot':
    case 'dashDotDot': return `1px dashed ${color}`
    case 'mediumDashed':
    case 'mediumDashDot':
    case 'mediumDashDotDot': return `2px dashed ${color}`
    default: return `1px solid ${color}`
  }
}

// A1 표기 → (row, col). 예: 'AA12' → {r:12, c:27}
export function a1ToRc(addr: string): { r: number; c: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(addr.trim().toUpperCase())
  if (!m) return null
  let c = 0
  for (const ch of m[1]) c = c * 26 + (ch.charCodeAt(0) - 64)
  return { r: parseInt(m[2], 10), c }
}

const MAX_ROWS = 250
const MAX_COLS = 80 // 65~66열 양식(A5100-02·F2100-02·L3100-04) 수용. 오염시트(만단위 열)만 잘림.

// 세션 메모리 캐시 (마스터는 불변 취급 — 앱 재시작 시 리셋)
const cache = new Map<string, FormRenderModelDto>()
// 리뷰(8/23): 표준팩 템플릿은 회사 칸이 {{companyName}} 토큰 — 화면 미리보기도 치환해야 하고, 프로파일이 바뀌면 캐시가 낡는다.
// 캐시 키에 프로파일 서명(전 키 값의 해시)을 섞어 프로파일 변경 즉시 재구성.
function profileSig(db: Database.Database): string {
  try {
    const rows = db.prepare('SELECT key, value FROM company_profile ORDER BY key').all() as Array<{ key: string; value: string | null }>
    return rows.map((x) => `${x.key}=${x.value ?? ''}`).join('|')
  } catch {
    return ''
  }
}

export async function buildRenderModel(
  db: Database.Database,
  formCode: string
): Promise<FormRenderModelDto> {
  const cacheKey = `${formCode}::${profileSig(db)}`
  const hit = cache.get(cacheKey)
  if (hit) return hit

  const form = db.prepare('SELECT reg_code, template_path FROM forms WHERE code = ?').get(formCode) as
    | { reg_code: string; template_path: string | null }
    | undefined
  if (!form) return { ...empty(formCode), error: `양식 없음: ${formCode}` }

  // 소스 해소 = export 엔진과 동일 순서(7/28): ①template_path(신규 설계본) ②마스터 규정집
  const tpl = form.template_path ? resolveTemplateFile(form.template_path) : null
  const src = tpl ?? resolveMasterFile(form.reg_code, resolveMastersDir(db))
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(src)
  const ws = resolveSheet(wb, formCode, { allowFirstSheetFallback: tpl != null })
  // 표준팩 토큰 → 회사 프로파일. export 엔진과 **같은 순서로** 부른다(리뷰 8/25):
  // applyProfileLogo 가 먼저 {{companyLogo}} 표식을 걷어내야, 화면에서도 출력과 똑같이
  // 그 칸이 빈칸이 된다. 순서가 바뀌면 토큰 치환이 표식을 ''로 지워 두 경로가 갈라진다.
  // ⚠ 로고 **그림 자체는 출력(xlsx) 전용**이다 — 이 화면 모델은 셀 값만 읽으므로
  //   워크시트에 꽂힌 이미지를 그리지 않는다(화면에도 띄울지는 미결 판단 사안).
  applyProfileLogo(ws, wb, db)
  applyProfileTokens(ws, db)

  const rowCount = Math.min(ws.rowCount || 1, MAX_ROWS)
  const colCount = Math.min(ws.columnCount || 1, MAX_COLS)

  // 병합 맵: 마스터(r,c) → span, 슬레이브 좌표 집합
  const spans = new Map<string, { rs: number; cs: number; r2: number; c2: number }>()
  const slaves = new Set<string>()
  for (const range of (ws.model?.merges || []) as string[]) {
    const [a, b] = range.split(':')
    const p1 = a1ToRc(a), p2 = a1ToRc(b)
    if (!p1 || !p2) continue
    spans.set(`${p1.r},${p1.c}`, { rs: p2.r - p1.r + 1, cs: p2.c - p1.c + 1, r2: p2.r, c2: p2.c })
    for (let r = p1.r; r <= p2.r; r++)
      for (let c = p1.c; c <= p2.c; c++)
        if (!(r === p1.r && c === p1.c)) slaves.add(`${r},${c}`)
  }

  const cells: RenderCellDto[] = []
  for (let r = 1; r <= rowCount; r++) {
    for (let c = 1; c <= colCount; c++) {
      if (slaves.has(`${r},${c}`)) continue
      const cell = ws.getCell(r, c)
      const span = spans.get(`${r},${c}`)
      const text = cellText(cell.value).trim()

      const font = cell.font || {}
      const fill = cell.fill as ExcelJS.FillPattern | undefined
      const alignment = cell.alignment || {}
      const border = cell.border || {}

      const dto: RenderCellDto = {
        r, c, text,
        rowspan: span?.rs ?? 1,
        colspan: span?.cs ?? 1
      }
      const bg = fill?.type === 'pattern' && fill.pattern !== 'none'
        ? toCss(fill.fgColor as Parameters<typeof toCss>[0])
        : undefined
      if (bg && bg !== '#FFFFFF' && bg !== '#ffffff') dto.bg = bg
      const fg = toCss(font.color as Parameters<typeof toCss>[0])
      if (fg && fg !== '#000000') dto.color = fg
      if (font.bold) dto.bold = true
      if (font.size && font.size !== 11) dto.fontSize = Math.round(font.size * (96 / 72))
      if (alignment.horizontal === 'center' || alignment.horizontal === 'right' || alignment.horizontal === 'left')
        dto.align = alignment.horizontal
      if (alignment.vertical === 'top' || alignment.vertical === 'bottom') dto.valign = alignment.vertical
      else dto.valign = 'middle'
      if (alignment.wrapText) dto.wrap = true

      // 테두리: 자기 변 + (병합이면) 우하단 가장자리 셀의 변을 합성
      dto.bt = borderCss(border.top)
      dto.bl = borderCss(border.left)
      let right = border.right, bottom = border.bottom
      if (span) {
        const edgeR = ws.getCell(r, span.c2).border?.right
        const edgeB = ws.getCell(span.r2, c).border?.bottom
        right = right?.style ? right : (edgeR?.style ? edgeR : right)
        bottom = bottom?.style ? bottom : (edgeB?.style ? edgeB : bottom)
      }
      dto.br = borderCss(right)
      dto.bb = borderCss(bottom)

      cells.push(dto)
    }
  }

  // 열너비(문자단위)→px, 행높이(pt)→px
  const colWidthsPx: number[] = []
  for (let c = 1; c <= colCount; c++) {
    const w = ws.getColumn(c).width
    colWidthsPx.push(w ? Math.round(w * 7 + 5) : 64)
  }
  const rowHeightsPx: number[] = []
  for (let r = 1; r <= rowCount; r++) {
    const h = ws.getRow(r).height
    rowHeightsPx.push(h ? Math.round((h * 96) / 72) : 22)
  }

  // 입력 셀: form_cell_map ↔ form_fields 브리지 (출력엔진과 동일 규칙, 값 유무 무관)
  const cellMap = db
    .prepare('SELECT field_key, label, cell, type FROM form_cell_map WHERE form_code = ? ORDER BY sort_order')
    .all(formCode) as Array<{ field_key: string; label: string | null; cell: string; type: string }>
  const fields = db
    .prepare('SELECT field_key, label, type FROM form_fields WHERE form_code = ? ORDER BY sort_order')
    .all(formCode) as Array<{ field_key: string; label: string; type: string }>

  const lut = new Map<string, { cell: string; type: string }>()
  for (const m of cellMap) {
    lut.set(norm(m.field_key), { cell: m.cell, type: m.type })
    if (m.label) lut.set(norm(m.label), { cell: m.cell, type: m.type })
  }
  const editCells: RenderEditCellDto[] = []
  const usedCells = new Set<string>()
  for (const f of fields) {
    if (f.type === 'grid') continue // 격자형은 캔버스 v2
    const key = norm(f.label)
    const aliased = ALIASES[key] ? norm(ALIASES[key]) : key
    const row = lut.get(aliased) || lut.get(key) || lut.get(norm(f.field_key))
    if (!row) continue
    const rc = a1ToRc(row.cell)
    if (!rc || rc.r > rowCount || rc.c > colCount) continue
    if (usedCells.has(row.cell)) continue
    usedCells.add(row.cell)
    editCells.push({
      cell: row.cell, r: rc.r, c: rc.c,
      fieldKey: f.field_key, label: f.label,
      type: f.type || row.type || 'text'
    })
  }

  const model: FormRenderModelDto = {
    formCode,
    sheetName: ws.name,
    rowCount, colCount, colWidthsPx, rowHeightsPx,
    cells, editCells
  }
  cache.set(cacheKey, model)
  return model
}

function empty(formCode: string): FormRenderModelDto {
  return {
    formCode, sheetName: '', rowCount: 0, colCount: 0,
    colWidthsPx: [], rowHeightsPx: [], cells: [], editCells: []
  }
}
