// ─────────────────────────────────────────────────────────────────────────────
// ISIR 워크북(.xlsx) 파서 — scripts/ingest-isir.py 의 TS 포팅(런타임 임포트용).
//   순수 함수: ExcelJS.Workbook → ParsedIsir. DB·electron 의존 없음(독립 테스트 가능).
//   도메인: ISIR = 부품 단위 통제 패키지. 워크북 24시트 중 3개를 척추로 추출.
//     · 표지         → part 메타 + 26종 제출 체크리스트(제출유형별 필수 + 보유여부)
//     · 검사협정서    → ire_risk / qa_manager / rev_code·rev_date(개정이력)
//     · 관리계획서(을) → control_plan_items(공정×관리항목×규격×확인방법×주기 …) — 행 그룹핑
//
//   ⚠ 인덱스: openpyxl iter_rows(values_only)는 0기반 튜플(idx 0 = A열).
//      ExcelJS row.values 는 1기반(values[1] = A열). 여기서는 0기반 배열로 변환해
//      Python 의 컬럼 인덱스를 그대로 재사용한다(idx N = (N+1)번째 열).
// ─────────────────────────────────────────────────────────────────────────────
import type ExcelJS from 'exceljs'

export interface ParsedIsirDoc {
  no: number
  name: string
  agree: number // 검사협정 필수(○=1)
  reqNew: number // ISIR 신규 필수
  change: number // ISIR 설변 필수
  present: number // 실제 보유
}

export interface ParsedCpItem {
  seq: number
  processNo: string
  processName: string
  equipment: string
  charKind: string // 제품|공정
  controlItem: string
  specialChar: string
  spec: string
  method: string
  frequency: string
  controlMethod: string
  respProduction: number
  respQa: number
  reaction: string
  note: string
}

export interface ParsedIsir {
  partNo: string
  partName: string
  model: string
  recipient: string // 수요자(삼보모터스 등)
  submittedAt: string
  submitType: 'agreement' | 'isir_new' | 'isir_change'
  revCode: string
  revDate: string
  ireRisk: string
  qaManager: string
  docs: ParsedIsirDoc[]
  items: ParsedCpItem[]
}

/** 개행 정규화(openpyxl 로직과 동일: \r·\n 각각 공백 치환, 내부 다중공백은 보존). */
function norm(s: string): string {
  return s.replace(/\r/g, ' ').replace(/\n/g, ' ').trim()
}

/** 셀 값 → 정규화 문자열(openpyxl S() 등가). richText/수식결과/하이퍼링크/날짜 처리. */
function S(v: ExcelJS.CellValue | undefined | null): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return norm(v)
  if (typeof v === 'number' || typeof v === 'boolean') return String(v).trim()
  if (v instanceof Date) {
    // ISIR 날짜는 대개 텍스트("25.08.05")이나, 실제 Date 면 YYYY.MM.DD 로.
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}.${m}.${d}`
  }
  if (typeof v === 'object') {
    const o = v as unknown as Record<string, unknown>
    if (Array.isArray(o.richText)) {
      return norm((o.richText as Array<{ text?: string }>).map((r) => r.text ?? '').join(''))
    }
    if ('result' in o) return S(o.result as ExcelJS.CellValue) // 수식 결과
    if ('text' in o) return S(o.text as ExcelJS.CellValue) // 하이퍼링크
  }
  return ''
}

/** 0기반 행 배열에서 idx 컬럼(0=A) 안전 추출. Python g(row, idx) 등가. */
function g(row: string[] | undefined, idx: number): string {
  return row && idx < row.length ? row[idx] ?? '' : ''
}

/** 워크시트를 0기반 행 배열(rows[r-1][c-1])로 변환. 빈 행은 hole(undefined)로 남김.
 *  ⚠ 병합셀: ExcelJS는 마스터 값을 병합된 모든 셀에 채우지만, openpyxl(원본 로직)은
 *  마스터(좌상단)에만 값을 둔다. 관리계획서의 세로 병합 H(항목NO)·공정명이 슬레이브 행마다
 *  채워지면 연속행이 새 항목으로 잘못 분리된다. 슬레이브 셀을 빈값 처리해 원본 동작을 복제. */
function sheetRows(ws: ExcelJS.Worksheet): string[][] {
  const rows: string[][] = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const arr: string[] = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const isMergeSlave = cell.isMerged && cell.master.address !== cell.address
      arr[colNumber - 1] = isMergeSlave ? '' : S(cell.value)
    })
    rows[rowNumber - 1] = arr
  })
  return rows
}

/** 시트명 정확 일치 → 부분 일치(포함) 순으로 탐색. */
function findSheet(wb: ExcelJS.Workbook, exact: string, contains?: string): ExcelJS.Worksheet | undefined {
  const byExact = wb.getWorksheet(exact)
  if (byExact) return byExact
  if (contains) return wb.worksheets.find((w) => w.name.replace(/\s/g, '').includes(contains))
  return undefined
}

/** 워크북 → ParsedIsir. 필수 시트(표지·관리계획서)가 없으면 throw. */
export function parseIsirWorkbook(wb: ExcelJS.Workbook): ParsedIsir {
  // ── 표지: part 메타 + 26종 체크리스트 ──────────────────────────────────────
  const coverWs = findSheet(wb, '표지', '표지')
  if (!coverWs) throw new Error("ISIR 형식이 아닙니다: '표지' 시트를 찾을 수 없습니다.")
  const cover = sheetRows(coverWs)

  // 라벨 스캔(행 위치 변동 견고): "품 번"/"품 명" 행
  let partNo = ''
  let partName = ''
  let model = ''
  let submittedAt = ''
  let recipient = ''
  for (const r of cover) {
    const b = g(r, 1).replace(/ /g, '')
    if (b === '품번') {
      partNo = g(r, 10)
      submittedAt = g(r, 36)
    } else if (b === '품명') {
      partName = g(r, 10)
      model = g(r, 36)
    }
  }
  // 수요자(삼보모터스 등) 스캔
  outer: for (const r of cover) {
    if (!r) continue
    for (let idx = 0; idx < r.length; idx++) {
      const val = g(r, idx)
      if (val.includes('모터스')) {
        recipient = val
        break outer
      }
    }
  }

  // 26종 체크리스트: B=no, E=name, AF(31)=검사협정, AJ(35)=신규, AN(39)=설변, AR(43)=보유
  const DOC_NO = 1
  const DOC_NAME = 4
  const C_AGREE = 31
  const C_NEW = 35
  const C_CHANGE = 39
  const C_PRESENT = 43
  const docs: ParsedIsirDoc[] = []
  for (const r of cover) {
    const no = g(r, DOC_NO)
    const name = g(r, DOC_NAME)
    if (/^\d+$/.test(no) && name) {
      const mk = (i: number): number => (g(r, i) === '○' ? 1 : 0)
      docs.push({
        no: parseInt(no, 10),
        name,
        agree: mk(C_AGREE),
        reqNew: mk(C_NEW),
        change: mk(C_CHANGE),
        present: mk(C_PRESENT)
      })
    }
  }

  // 제출유형 추정:
  //  도메인 규칙 우선 — 사양변경서가 제출되면(신규개발엔 변경할 사양이 없음) = 설계변경 ISIR.
  //  아니면 보유(present) 패턴과 가장 일치하는 필수열.
  const align = (key: 'agree' | 'reqNew' | 'change'): number =>
    docs.reduce((acc, d) => acc + ((d[key] === 1) === (d.present === 1) ? 1 : 0), 0)
  let submitType: ParsedIsir['submitType']
  if (docs.some((d) => d.name.includes('사양변경') && d.present)) {
    submitType = 'isir_change'
  } else {
    const cand: Array<[ParsedIsir['submitType'], 'agree' | 'reqNew' | 'change']> = [
      ['agreement', 'agree'],
      ['isir_new', 'reqNew'],
      ['isir_change', 'change']
    ]
    submitType = cand.reduce((best, t) => (align(t[1]) > align(best[1]) ? t : best))[0]
  }

  // ── 검사협정서: ire_risk / qa_manager / 최신 rev ────────────────────────────
  let ireRisk = ''
  let qaManager = ''
  let revCode = ''
  let revDate = ''
  const agrWs = findSheet(wb, '검사협정서', '검사협정')
  if (agrWs) {
    const agr = sheetRows(agrWs)
    for (const r of agr) {
      if (g(r, 7).replace(/ /g, '').startsWith('부품품질위험도')) ireRisk = g(r, 10) // K
      if (g(r, 18).replace(/ /g, '') === '품질보증책임자') qaManager = g(r, 20) // U
    }
    if (ireRisk.includes('■')) {
      const m = ireRisk.match(/■\s*([^□■]+)/)
      ireRisk = (m ? m[1] : ireRisk).trim()
    } else {
      ireRisk = ireRisk.trim()
    }
    qaManager = qaManager.replace(/\(인\)\s*$/, '').trim()
    // 개정이력 블록: 기호(B)=c/b/a/-, 개정일(D), 사양코드(G). 최신 = 기호 'c' 행(맨 위).
    for (const r of agr) {
      const sym = g(r, 1)
      const code = g(r, 6)
      if (['c', 'b', 'a', '-'].includes(sym) && code.startsWith('C2')) {
        revCode = code
        revDate = g(r, 3)
        break
      }
    }
  }

  // ── 관리계획서(을): control_plan_items (행 그룹핑) ──────────────────────────
  // 컬럼: F=공정명, G=설비명, H=항목NO, I=제품, J=공정, K=특별특성, L=규격,
  //       M=확인방법, N=주기, O=관리방안, Q=생산, R=QA, S=조치, W=비고
  const CF = 5
  const CG = 6
  const CH = 7
  const CI = 8
  const CJ = 9
  const CK = 10
  const CL = 11
  const CM = 12
  const CN = 13
  const CO = 14
  const CQ = 16
  const CR = 17
  const CS = 18
  const CW = 22
  const cpWs = findSheet(wb, '관리계획서(을)', '관리계획서')
  if (!cpWs) throw new Error("ISIR 형식이 아닙니다: '관리계획서(을)' 시트를 찾을 수 없습니다.")
  const cpRows = sheetRows(cpWs)

  const RESP = new Set(['●', '○', '◎', '◯'])
  const items: ParsedCpItem[] = []
  let cur: ParsedCpItem | null = null
  let curProc = ''
  let curEquip = ''
  let seq = 0
  for (let n = 0; n < cpRows.length; n++) {
    const rownum = n + 1
    if (rownum <= 4) continue // 헤더 2행 + 타이틀 2행
    const row = cpRows[n]
    const F = g(row, CF)
    const G = g(row, CG)
    const H = g(row, CH)
    const I = g(row, CI)
    const J = g(row, CJ)
    const K = g(row, CK)
    const L = g(row, CL)
    const M = g(row, CM)
    const N = g(row, CN)
    const O = g(row, CO)
    const Q = g(row, CQ)
    const R = g(row, CR)
    const Sx = g(row, CS)
    const W = g(row, CW)
    if (F) {
      curProc = F
      curEquip = G
    }
    const hasContent = !!(H || I || J || L || M || N || O)
    if (!hasContent && !F) continue // 완전 빈 행
    if (H) {
      // 새 관리항목(항목번호 등장)
      if (cur) items.push(cur)
      seq += 1
      const charKind = I ? '제품' : J ? '공정' : ''
      const controlItem = [I, J].filter(Boolean).join(' ')
      cur = {
        seq,
        processNo: H,
        processName: curProc,
        equipment: curEquip,
        charKind,
        controlItem,
        specialChar: K,
        spec: L,
        method: M,
        frequency: N,
        controlMethod: O,
        respProduction: RESP.has(Q) ? 1 : 0,
        respQa: RESP.has(R) ? 1 : 0,
        reaction: Sx,
        note: W
      }
    } else {
      // 연속행: 직전 항목에 부가
      if (cur === null) continue
      if (J) cur.controlItem = `${cur.controlItem} ${J}`.trim()
      if (L) cur.spec = cur.spec ? `${cur.spec} / ${L}`.replace(/^[ /]+|[ /]+$/g, '') : L
      if (M && !cur.method) cur.method = M
      if (N && !cur.frequency) cur.frequency = N
      if (O && !cur.controlMethod) cur.controlMethod = O
      if (Sx && !cur.reaction) cur.reaction = Sx
      if (W && !cur.note) cur.note = W
    }
  }
  if (cur) items.push(cur)

  if (!partNo) {
    throw new Error('ISIR 형식이 아닙니다: 표지에서 품번을 찾지 못했습니다.')
  }

  return {
    partNo,
    partName,
    model,
    recipient,
    submittedAt,
    submitType,
    revCode,
    revDate,
    ireRisk,
    qaManager,
    docs,
    items
  }
}
