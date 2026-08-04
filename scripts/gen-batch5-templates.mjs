// ============================================================
// scripts/gen-batch5-templates.mjs — 5배치 템플릿 + 정비 (2026-07-29)
//
// A. B2300 추출 6종 — 마스터 시트명이 한 자리 코드("B2300-2" 등)라 resolveSheet
//    (name.includes(formCode)) 매칭 불가 실측 → 시트 추출 + 시트명 2자리 코드 정정.
//    마스터 원본 무변경. 실기록 없음 확인(빈 틀) — 클리어 대상 0.
// B. F1101-03/04 신규 설계 2종 — 원본 부재 실측(마스터 F-1101 은 F1101-01/02 뿐).
//    A-2 조건(양식번호·Rev.0·제정일 블록). 체크 항목 콘텐츠는 관리팀 몫(창작 0) —
//    항목 열도 입력 가능한 빈 틀로 설계.
// C. B2200-05 0065 설계본 정비 — 예시행(1월 시드) 클리어(수식 보존)·(제안) 꼬리표 정정.
// D. (1배치 검수 발견 편승) 05_금형·04_지그 보조 시트 A2 구코드 잔존 정정
//    (L1100-20→L1100-25 · L1200-03→L1200-12 — 주 시트는 기정정, 보조 시트 누락분).
//
// 멱등: 재실행 = 동일 결과. 실행: node scripts/gen-batch5-templates.mjs (IATF_MASTERS_DIR 지정 가능)
// ============================================================
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER =
  process.env.IATF_MASTERS_DIR ||
  join(root, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501')
const OUT_B5 = join(root, 'resources', 'templates', 'batch5')
const OUT_SQ = join(root, 'resources', 'templates', 'sq_gap_forms')
mkdirSync(OUT_B5, { recursive: true })

const F_B2300 = 'B-2300 정성품질 운영 지침 (25년8월1일_REV.1)_품질보증.xlsx'

const colLetter = (n) => { let s = ''; while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) } return s }
const colNum = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)

async function extractSheet(masterFile, sheetName, newName, keepRows, maxCol) {
  const src = new ExcelJS.Workbook()
  await src.xlsx.readFile(join(MASTER, masterFile))
  const ws = src.worksheets.find((w) => w.name === sheetName)
  if (!ws) throw new Error(`마스터 시트 없음: ${sheetName}`)
  const out = new ExcelJS.Workbook()
  const tw = out.addWorksheet(newName)
  for (let c = 1; c <= maxCol; c++) { const w = ws.getColumn(c).width; if (w) tw.getColumn(c).width = w }
  for (let r = 1; r <= keepRows; r++) {
    const srow = ws.getRow(r)
    if (srow.height) tw.getRow(r).height = srow.height
    for (let c = 1; c <= maxCol; c++) {
      const sc = srow.getCell(c), tc = tw.getRow(r).getCell(c)
      tc.value = sc.value
      tc.style = JSON.parse(JSON.stringify(sc.style || {}))
    }
  }
  for (const m of ws.model?.merges || []) {
    const [, , r1c, c2, r2c] = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (+r2c <= keepRows && colNum(c2) <= maxCol) { try { tw.mergeCells(m) } catch { /* */ } }
  }
  return out
}

// ── A. B2300-02~07 추출(시트명 2자리 코드 정정 — 마스터 무변경) ──
const B2300 = [
  ['정성품질 취합 대장(B2300-2)', '정성품질 취합 대장(B2300-02)', 18, 'AY', 'B2300-02_취합대장'],
  ['정성품질 점검 체크시트(B2300-3)', '정성품질 점검 체크시트(B2300-03)', 113, 'AY', 'B2300-03_점검체크시트'],
  ['문제점 및 개선 제안서(B2300-4)', '문제점 및 개선 제안서(B2300-04)', 27, 'AY', 'B2300-04_개선제안서'],
  ['정성품질 개선 타당성 검토(B2300-5)', '정성품질 개선 타당성 검토(B2300-05)', 29, 'AY', 'B2300-05_타당성검토'],
  ['유효성 평가 보고서(B2300-6)', '유효성 평가 보고서(B2300-06)', 29, 'BE', 'B2300-06_유효성평가'],
  ['인라인 공정불량 사례 시트(B2300-7)', '인라인 공정불량 사례 시트(B2300-07)', 25, 'AV', 'B2300-07_공정불량사례'],
]
for (const [srcName, newName, rows, lastCol, fname] of B2300) {
  const out = await extractSheet(F_B2300, srcName, newName, rows, colNum(lastCol))
  await out.xlsx.writeFile(join(OUT_B5, `${fname}.xlsx`))
  console.log(`✓ ${newName} 추출(${rows}행)`)
}

// ── B. F1101-03/04 신규 설계 2종(0065 스캐폴드 — 항목 콘텐츠 = 관리팀 몫) ──
async function scaffoldOnboarding(code, title, fileName) {
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('양식')
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } }
  const cols = [
    { label: '순', w: 5 }, { label: '구분', w: 12 }, { label: '확인 항목', w: 46 },
    { label: '확인일', w: 11 }, { label: '확인자', w: 10 }, { label: '비고', w: 16 }
  ]
  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = title
  ws.getCell('A1').font = { size: 14, bold: true }
  ws.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 26
  ws.mergeCells('A2:C2'); ws.mergeCells('D2:F2')
  ws.getCell('A2').value = `양식번호: ${code} (신규 설계본 — 실물 대사 전)`
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF6B7280' } }
  const rv = ws.getCell('D2')
  rv.value = 'Rev.0 · 제정일: 2026-07-29'
  rv.font = { size: 9, color: { argb: 'FF6B7280' } }
  rv.alignment = { horizontal: 'right' }
  // 대상자 헤더(r3)
  const hdr = [['A3', '성명'], ['B3', null], ['C3', '입사일'], ['D3', null], ['E3', '배치 부서'], ['F3', null]]
  for (const [addr, label] of hdr) { const c = ws.getCell(addr); if (label) { c.value = label; c.fill = headFill; c.font = { size: 10, bold: true } } c.border = border; c.alignment = { horizontal: 'center', vertical: 'middle' } }
  ws.getCell('A4').value = '멘토(담당 선임)'; ws.getCell('A4').fill = headFill; ws.getCell('A4').font = { size: 10, bold: true }
  ;['A4','B4','C4','D4','E4','F4'].forEach(a => { ws.getCell(a).border = border; ws.getCell(a).alignment = { horizontal: 'center', vertical: 'middle' } })
  ws.mergeCells('B4:F4')
  // 체크 그리드 헤더(r5) + 빈 30행(r6~35)
  cols.forEach((c, i) => {
    const cell = ws.getCell(5, i + 1)
    cell.value = c.label; cell.fill = headFill; cell.font = { size: 10, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }; cell.border = border
    ws.getColumn(i + 1).width = c.w
  })
  ws.getRow(5).height = 24
  for (let r = 6; r <= 35; r++) for (let c = 1; c <= 6; c++) {
    const cell = ws.getCell(r, c); cell.border = border
    cell.alignment = { horizontal: c === 3 ? 'left' : 'center', vertical: 'middle', wrapText: true }
  }
  ws.getCell('A36').value = '※ 확인 항목의 표준 목록은 관리팀이 확정한다(봇 창작 0 — 틀만 제공). 확정 시 form_examples 시드로 모범 작성본 등록 권장.'
  ws.getCell('A36').font = { size: 9, color: { argb: 'FF6B7280' } }
  await wb.xlsx.writeFile(join(OUT_SQ, fileName))
  console.log(`✓ ${code} 신규 설계본(${fileName})`)
}
await scaffoldOnboarding('F1101-03', '신규입사자 온보딩 체크리스트 (오퍼레이터)', '21_온보딩체크_오퍼레이터_F1101-03.xlsx')
await scaffoldOnboarding('F1101-04', '신규입사자 온보딩 체크리스트 (관리자)', '22_온보딩체크_관리자_F1101-04.xlsx')

// ── C. B2200-05 정비 — 예시행(1월) 값 클리어(수식 보존) + (제안) 꼬리표 정정 ──
{
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(join(OUT_SQ, '11_품질실적_월보_B2200-05.xlsx'))
  const ws = wb.worksheets.find((w) => w.name === '양식')
  let cleared = 0
  for (const col of ['B', 'C', 'E', 'F', 'H', 'I', 'L', 'M', 'N']) {
    const cell = ws.getCell(`${col}5`)
    if (cell.value != null && !(typeof cell.value === 'object' && cell.value.formula !== undefined)) { cell.value = null; cleared++ }
  }
  const a2 = ws.getCell('A2'); const s = String(a2.value || '')
  if (s.includes('(제안)')) a2.value = s.replace('B2200-05(제안)', 'B2200-05')
  await wb.xlsx.writeFile(join(OUT_SQ, '11_품질실적_월보_B2200-05.xlsx'))
  console.log(`✓ B2200-05 예시행 클리어 ${cleared}셀 + (제안) 꼬리표 정정`)
}

// ── D. 1배치 발견 편승 — 보조 시트 A2 구코드 정정(richText 대응) ──
async function fixAuxSheets(file, oldCode, newCode, auxSheets) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(join(OUT_SQ, file))
  let fixed = 0
  for (const name of auxSheets) {
    const ws = wb.worksheets.find((w) => w.name === name)
    if (!ws) continue
    const a2 = ws.getCell('A2')
    const v = a2.value
    if (v && typeof v === 'object' && v.richText) {
      let hit = false
      const rt = v.richText.map((run) => {
        if (run.text.includes(oldCode)) { hit = true; return { ...run, text: run.text.replace(`${oldCode}(제안)`, newCode).replace(oldCode, newCode) } }
        return run
      })
      if (hit) { a2.value = { richText: rt }; fixed++ }
    } else if (typeof v === 'string' && v.includes(oldCode)) {
      a2.value = v.replace(`${oldCode}(제안)`, newCode).replace(oldCode, newCode); fixed++
    }
  }
  if (fixed) await wb.xlsx.writeFile(join(OUT_SQ, file))
  console.log(`✓ ${file} 보조 시트 양식번호 정정 ${fixed}건(${oldCode}→${newCode})`)
}
await fixAuxSheets('05_금형_점검체크시트_L1100-20.xlsx', 'L1100-20', 'L1100-25', ['정기점검·타발수', '보관 현황판'])
await fixAuxSheets('04_지그치공구_점검체크시트_L1200-03.xlsx', 'L1200-03', 'L1200-12', ['정기점검(기준핀)'])

console.log('완료 — batch5 추출 6 + 신규 설계 2 + 0065 정비 1 + 1배치 편승 정정 2')
