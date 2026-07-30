// 공정 FMEA 신판 → 마스터 J-1101 '공정 FMEA 4판 SHEET (J1101-01)' 시트에 값 주입 → 공식 xlsx.
// 데이터 그리드(B~AD, R10 시작, 병합없음) + 헤더(L3/G3/L4/C5/C6/G6). AP는 부표4로 자동산출 후 기입.
// 마스터는 정본 폴더 하위에 중첩돼 있어 재귀 탐색.
import ExcelJS from 'exceljs'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type Database from 'better-sqlite3'
import { computeActionPriority } from '@shared/fmea-ap'
import { resolveMastersDir } from './form-export-engine'

const SHEET_NAME = '공정 FMEA 4판 SHEET (J1101-01)'
const DATA_START_ROW = 10
const LAST_TEMPLATE_ROW = 21 // 템플릿 가이던스 행 끝(빈 데이터행은 정리)

// fmea_rows 컬럼 → 시트 열
const GRID: Array<[string, string]> = [
  ['B', 'proc_item'], ['C', 'proc_step'], ['D', 'proc_element'],
  ['E', 'func_item'], ['F', 'func_step'], ['G', 'func_element'],
  ['H', 'failure_effect'], ['I', 'severity'], ['J', 'failure_mode'], ['K', 'failure_cause'],
  ['L', 'prevention_ctrl'], ['M', 'occurrence'], ['N', 'detection_ctrl'], ['O', 'detection'],
  ['P', '__ap'], ['Q', 'special_char'],
  ['R', 'prevention_action'], ['S', 'detection_action'], ['T', 'responsible'],
  ['U', 'due_date'], ['V', 'action_status'], ['W', 'evidence'], ['X', 'completed_date'],
  ['Y', 're_severity'], ['Z', 're_occurrence'], ['AA', 're_detection'],
  ['AB', 'special_prod_char'], ['AC', '__re_ap'], ['AD', 'note']
]

function findMaster(dir: string): string | null {
  if (!existsSync(dir)) return null
  const stack = [dir]
  let depth = 0
  while (stack.length && depth < 5000) {
    depth++
    const cur = stack.pop() as string
    let entries: string[]
    try {
      entries = readdirSync(cur)
    } catch {
      continue
    }
    for (const e of entries) {
      const full = join(cur, e)
      let st
      try {
        st = statSync(full)
      } catch {
        continue
      }
      if (st.isDirectory()) stack.push(full)
      else if (/\.xlsx$/i.test(e) && !e.startsWith('~$') && /J-?1101/i.test(e) && /FMEA/i.test(e)) {
        return full
      }
    }
  }
  return null
}

export interface FmeaExportResult {
  success: boolean
  filePath?: string
  rows?: number
  dropped?: number // 템플릿 행 수(R10~R21) 초과로 기입하지 않은 행 — 검수 M-8
  guardSkips?: string[] // 수식 보존을 위해 주입하지 않은 셀 — 검수 C-7
  error?: string
}

export async function exportFmeaXlsx(
  db: Database.Database,
  docId: number,
  outPath: string
): Promise<FmeaExportResult> {
  // 정본 폴더 해소는 폼 출력엔진과 동일(환경변수→DB설정→번들→폴백). 단일 출처.
  const dir = resolveMastersDir(db)
  const master = findMaster(dir)
  if (!master) {
    return {
      success: false,
      error: `J-1101 공정FMEA 마스터 .xlsx 를 찾지 못함 — 사이드바에서 '정본 폴더'를 지정하세요. (검색: ${dir})`
    }
  }

  const doc = db.prepare('SELECT * FROM fmea_documents WHERE id = ?').get(docId) as
    | Record<string, unknown>
    | undefined
  if (!doc) return { success: false, error: '문서 없음' }
  const rows = db
    .prepare('SELECT * FROM fmea_rows WHERE doc_id = ? ORDER BY seq ASC, id ASC')
    .all(docId) as Array<Record<string, unknown>>

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(master)
  const ws = wb.worksheets.find((w) => w.name.includes('J1101-01') && w.name.includes('4판'))
    || wb.getWorksheet(SHEET_NAME)
  if (!ws) return { success: false, error: `시트 없음: ${SHEET_NAME}` }

  // 헤더 주입 (라벨 다음 값셀).
  // 검수 C-7·C-8(2026-07-30): 폼 엔진과 같은 가드 — 병합 비앵커는 앵커로, 수식 셀은 주입 금지.
  const isFormula = (v: unknown): boolean =>
    !!v && typeof v === 'object' && !!((v as { formula?: unknown }).formula || (v as { sharedFormula?: unknown }).sharedFormula)
  const guardSkips: string[] = []
  const writeCell = (addr: string, v: string | number | null): void => {
    let cell = ws.getCell(addr)
    if (cell.isMerged && cell.master && cell.master.address !== cell.address) cell = cell.master
    if (isFormula(cell.value)) {
      guardSkips.push(cell.address)
      return
    }
    cell.value = v
  }
  const put = (addr: string, v: unknown): void => {
    if (v != null && String(v).trim()) writeCell(addr, String(v))
  }
  put('L3', doc.fmea_no)
  put('G3', doc.part_name)
  put('L4', doc.proc_owner)
  put('C6', doc.model)
  put('G6', doc.team_members)
  put('G5', doc.mp_date)
  put('C5', doc.customer)
  // 회사명(C3)은 company_profile 에서
  try {
    const cp = db.prepare("SELECT value FROM company_profile WHERE key='companyName'").get() as
      | { value: string }
      | undefined
    if (cp?.value) put('C3', cp.value)
  } catch {
    /* 무시 */
  }

  // 데이터 그리드 주입.
  // 검수 M-8: 종전엔 행 상한이 없어 12행(R10~R21) 초과분이 템플릿 밖 무서식 영역에 기입됐다
  // → LAST_TEMPLATE_ROW 까지만 쓰고 초과분은 dropped 로 정직 보고.
  const capacity = Math.max(0, LAST_TEMPLATE_ROW - DATA_START_ROW + 1)
  const writable = rows.slice(0, capacity)
  const dropped = rows.length - writable.length
  writable.forEach((r, i) => {
    const row = DATA_START_ROW + i
    const ap = computeActionPriority(
      r.severity as number | null,
      r.occurrence as number | null,
      r.detection as number | null
    )
    const reAp = computeActionPriority(
      r.re_severity as number | null,
      r.re_occurrence as number | null,
      r.re_detection as number | null
    )
    for (const [col, key] of GRID) {
      let val: unknown
      if (key === '__ap') val = ap
      else if (key === '__re_ap') val = reAp
      else val = r[key]
      writeCell(`${col}${row}`, val == null || val === '' ? null : (val as string | number))
    }
  })

  // 남은 템플릿 가이던스 행 정리 (데이터보다 아래 행의 B~AD 비움)
  for (let row = DATA_START_ROW + writable.length; row <= LAST_TEMPLATE_ROW; row++) {
    for (const [col] of GRID) writeCell(`${col}${row}`, null)
  }

  await wb.xlsx.writeFile(outPath)
  return { success: true, filePath: outPath, rows: writable.length, dropped, guardSkips }
}
