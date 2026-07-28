// ============================================================
// scripts/gen-gap-b-templates.mjs — 갭B 신규 설계본 템플릿 3종 생성 (2026-07-28, 1배치 선두)
//
// 원본이 어디에도 없는 3종(K1200-07·M1200-10·M1200-11)의 정본 xlsx 를 0065 갭양식 문법으로
// 신규 설계한다(코워크 승인 A-2 조건: 문서번호·개정번호·제정일 블록 + '신규 설계본' 표기 —
// 배치 검수 때 담당 팀 실물 대사로 교정, 실물 출현 시 실물 기준 교정).
// 실행: node scripts/gen-gap-b-templates.mjs  → resources/templates/sq_gap_forms/14~16_*.xlsx
// ============================================================
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'resources', 'templates', 'sq_gap_forms')

const thin = { style: 'thin', color: { argb: 'FF9AA1AB' } }
const border = { top: thin, left: thin, bottom: thin, right: thin }
const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF3FF' } }

/** 공통 골격: r1 제목 / r2 문서 블록(양식번호·Rev·제정일) / r3 헤더 / r4~ 데이터 행 */
function scaffold(ws, { title, code, cols, dataRows }) {
  const n = cols.length
  const last = ws.getColumn(n).letter
  ws.mergeCells(`A1:${last}1`)
  const t = ws.getCell('A1')
  t.value = title
  t.font = { size: 14, bold: true }
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells(`A2:${ws.getColumn(Math.ceil(n / 2)).letter}2`)
  ws.getCell('A2').value = `양식번호: ${code} (신규 설계본 — 실물 대사 전)`
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF6B7280' } }
  ws.mergeCells(`${ws.getColumn(Math.ceil(n / 2) + 1).letter}2:${last}2`)
  const rv = ws.getCell(`${ws.getColumn(Math.ceil(n / 2) + 1).letter}2`)
  rv.value = 'Rev.0 · 제정일: 2026-07-28'
  rv.font = { size: 9, color: { argb: 'FF6B7280' } }
  rv.alignment = { horizontal: 'right' }

  cols.forEach((c, i) => {
    const cell = ws.getCell(3, i + 1)
    cell.value = c.label
    cell.fill = headFill
    cell.font = { size: 10, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = border
    ws.getColumn(i + 1).width = c.w
  })
  ws.getRow(3).height = 26
  for (let r = 4; r < 4 + dataRows; r++)
    for (let c = 1; c <= n; c++) {
      const cell = ws.getCell(r, c)
      cell.border = border
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
}

// ── 14. K1200-07 외주 ISIR·검사협정 접수대장 (대장형) ──────────
{
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('양식')
  scaffold(ws, {
    title: '외주 ISIR·검사협정 접수대장',
    code: 'K1200-07',
    cols: [
      { label: 'No', w: 5 },
      { label: '접수일자', w: 11 },
      { label: '외주사', w: 14 },
      { label: '품번', w: 15 },
      { label: 'ISIR 번호', w: 13 },
      { label: '접수유형', w: 11 },
      { label: '검토결과', w: 11 },
      { label: '담당자', w: 9 },
      { label: '비고', w: 18 }
    ],
    dataRows: 30
  })
  await wb.xlsx.writeFile(join(OUT, '14_외주ISIR·검사협정_접수대장_K1200-07.xlsx'))
  console.log('✓ 14 K1200-07')
}

// ── 15. M1200-10 공정 자주검사 CHECK SHEET (헤더+검사항목 행) ──
{
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('양식')
  // 헤더 블록: r4(검사일자·품번), r5(설비명·근무조) — 라벨/값 셀 분리
  scaffold(ws, {
    title: '공정 자주검사 CHECK SHEET',
    code: 'M1200-10',
    cols: [
      { label: 'No', w: 5 },
      { label: '검사항목', w: 22 },
      { label: '기준규격', w: 16 },
      { label: '측정치', w: 12 },
      { label: '판정(○/×)', w: 10 },
      { label: '비고', w: 16 }
    ],
    dataRows: 0
  })
  // scaffold 의 r3 헤더를 r6 으로 내리는 대신, 헤더 블록을 r3~4 로 넣고 표를 r5 헤더/r6~ 데이터로 재구성
  ws.spliceRows(3, 1) // scaffold 표 헤더 제거 후 수동 구성
  const put = (addr, label, mergeTo) => {
    if (mergeTo) ws.mergeCells(`${addr}:${mergeTo}`)
    const c = ws.getCell(addr)
    c.value = label
    c.fill = headFill
    c.font = { size: 10, bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = border
  }
  const box = (addr, mergeTo) => {
    if (mergeTo) ws.mergeCells(`${addr}:${mergeTo}`)
    ws.getCell(addr).border = border
    ws.getCell(addr).alignment = { horizontal: 'center', vertical: 'middle' }
  }
  put('A3', '검사일자'); box('B3'); put('C3', '품번'); box('D3', 'F3')
  put('A4', '설비명'); box('B4'); put('C4', '근무조'); box('D4', 'F4')
  ;['No', '검사항목', '기준규격', '측정치', '판정(○/×)', '비고'].forEach((h, i) => put(ws.getCell(5, i + 1).address, h))
  for (let r = 6; r <= 17; r++) for (let c = 1; c <= 6; c++) box(ws.getCell(r, c).address)
  put('A18', '검사자'); box('B18'); put('C18', '특이사항'); box('D18', 'F18')
  await wb.xlsx.writeFile(join(OUT, '15_공정자주검사_CHECK_SHEET_M1200-10.xlsx'))
  console.log('✓ 15 M1200-10')
}

// ── 16. M1200-11 브레이징 조건관리 CHECK SHEET ──────────────
{
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('양식')
  scaffold(ws, {
    title: '브레이징 조건관리 CHECK SHEET',
    code: 'M1200-11',
    cols: [
      { label: 'No', w: 5 },
      { label: '조건항목', w: 22 },
      { label: '설정값(기준)', w: 16 },
      { label: '실측값', w: 12 },
      { label: '판정(○/×)', w: 10 },
      { label: '비고', w: 16 }
    ],
    dataRows: 0
  })
  ws.spliceRows(3, 1)
  const put = (addr, label, mergeTo) => {
    if (mergeTo) ws.mergeCells(`${addr}:${mergeTo}`)
    const c = ws.getCell(addr)
    c.value = label
    c.fill = headFill
    c.font = { size: 10, bold: true }
    c.alignment = { horizontal: 'center', vertical: 'middle' }
    c.border = border
  }
  const box = (addr, mergeTo) => {
    if (mergeTo) ws.mergeCells(`${addr}:${mergeTo}`)
    ws.getCell(addr).border = border
    ws.getCell(addr).alignment = { horizontal: 'center', vertical: 'middle' }
  }
  put('A3', '일자'); box('B3'); put('C3', '설비명'); box('D3', 'F3')
  put('A4', '근무조'); box('B4', 'F4')
  ;['No', '조건항목', '설정값(기준)', '실측값', '판정(○/×)', '비고'].forEach((h, i) => put(ws.getCell(5, i + 1).address, h))
  for (let r = 6; r <= 15; r++) for (let c = 1; c <= 6; c++) box(ws.getCell(r, c).address)
  put('A16', '확인자'); box('B16'); put('C16', '특이사항'); box('D16', 'F16')
  await wb.xlsx.writeFile(join(OUT, '16_브레이징_조건관리_CHECK_SHEET_M1200-11.xlsx'))
  console.log('✓ 16 M1200-11')
}
// ── 01 수입검사 관리대장(0065 정본) 예시행 클리어 ─────────────
// r4 에 기입 예시(동링·CR-2.0…)가 남아 있으면 export 출력물에 예시가 오염됨(부분 잔존).
// 예시 설명은 '작성요령' 시트가 정본이므로 양식 시트의 예시 데이터만 제거(멱등 — 재실행 무해).
{
  const p = join(OUT, '01_수입검사_관리대장_L2100-10.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)
  const ws = wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
  let cleared = 0
  for (let c = 1; c <= 15; c++) {
    const cell = ws.getCell(4, c)
    if (cell.value != null && String(cell.value) !== '') {
      cell.value = null
      cleared++
    }
  }
  if (cleared > 0) await wb.xlsx.writeFile(p)
  console.log(`✓ 01 L2100-07 예시행 클리어 (${cleared}셀)`)
}
console.log('완료 —', OUT)
