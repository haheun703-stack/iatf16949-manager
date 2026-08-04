// ============================================================
// scripts/gen-batch4-templates.mjs — 4배치 템플릿 5건 (2026-07-29)
//
// A. 마스터 추출 3종(1배치 am_forms 추출 선례 — 기록 실보유 대장이라 마스터 직접 주입 불가):
//    · B2100-04 장기테마 — 마스터 시트에 19년~ 실기록 보유 → 헤더+빈 블록 10개만 추출, 기록 클리어
//    · B2100-05 즉실천항목 — 실기록 4,443행 보유(살아있는 대장) → 동일 추출
//    · F1100-04 지식 관리표 — 기록 144행 보유 → 헤더+빈 30행 추출
//    "빈칸이 가짜보다 낫다" — 기록값 전부 클리어, 구조·서식·병합은 보존.
// B. 0065 설계본 정비 2종(3배치 0065 설계본 4종 선례 — 예시행 클리어 + (제안) 양식번호 정정):
//    · B1100-12 리크·리워크 이력대장 (파일 = 03_..._B1100-10.xlsx, 코드충돌 재부여 잔재)
//    · B1100-13 부적합품 처리대장 (파일 = 10_..._B1100-11.xlsx) — N열 수량대사 수식은 보존
//
// 멱등: 재실행 = 동일 결과. 마스터 원본 무변경(읽기 전용).
// 실행: node scripts/gen-batch4-templates.mjs   (IATF_MASTERS_DIR 로 마스터 폴더 지정 가능)
// ============================================================
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER =
  process.env.IATF_MASTERS_DIR ||
  join(root, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501')
const OUT_B4 = join(root, 'resources', 'templates', 'batch4')
const OUT_SQ = join(root, 'resources', 'templates', 'sq_gap_forms')
mkdirSync(OUT_B4, { recursive: true })

const F_B2100 = 'B-2100 시정조치 규정 (25년8월18일_REV.6)_품질보증.xlsx'
const F_F1100 = 'F-1100 교육훈련 규정 (25년6월13일_REV.9)_총무.xlsx'

const colLetter = (n) => {
  let s = ''
  while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) }
  return s
}
const colNum = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)

// 마스터 시트 → 새 워크북 단일 시트 추출(행 범위 한정, 값·스타일·병합·폭·높이 보존)
async function extractSheet(masterFile, code, keepRows, maxCol) {
  const src = new ExcelJS.Workbook()
  await src.xlsx.readFile(join(MASTER, masterFile))
  const ws = src.worksheets.find((w) => w.name.includes(code))
  if (!ws) throw new Error(`마스터 시트 없음: ${code}`)
  const out = new ExcelJS.Workbook()
  const tw = out.addWorksheet(ws.name) // 시트명 그대로 → resolveSheet 직접 매칭
  for (let c = 1; c <= maxCol; c++) {
    const w = ws.getColumn(c).width
    if (w) tw.getColumn(c).width = w
  }
  for (let r = 1; r <= keepRows; r++) {
    const srow = ws.getRow(r)
    if (srow.height) tw.getRow(r).height = srow.height
    for (let c = 1; c <= maxCol; c++) {
      const sc = srow.getCell(c)
      const tc = tw.getRow(r).getCell(c)
      tc.value = sc.value
      tc.style = JSON.parse(JSON.stringify(sc.style || {}))
    }
  }
  for (const m of ws.model?.merges || []) {
    const [, c1, r1, c2, r2] = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
    if (+r2 <= keepRows && colNum(c2) <= maxCol) {
      try { tw.mergeCells(m) } catch { /* 중복 병합 무시 */ }
    }
  }
  return { out, tw, srcName: ws.name }
}

// 범위 기록 클리어(라벨 열 제외 목록 지원)
function clearRange(ws, r1, r2, c1, c2, keepCols = new Set(), keepFormula = false) {
  let n = 0
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) {
      if (keepCols.has(colLetter(c))) continue
      const cell = ws.getRow(r).getCell(c)
      if (cell.value == null) continue
      if (keepFormula && typeof cell.value === 'object' && cell.value.formula !== undefined) continue
      // 병합 종속 셀은 마스터 참조가 남지 않게 전부 클리어(값은 앵커에만 실린다)
      cell.value = null
      n++
    }
  return n
}

// ── A-1. B2100-04 장기테마 — 헤더 r1~11 + 빈 블록 10개(r12~51, stride 4) ──
{
  const { out, tw } = await extractSheet(F_B2100, 'B2100-04', 51, colNum('AF'))
  // 기록 클리어: 블록 영역(B~AB·AD~AF) — Q열 서브라벨(진행상태/목표일/완료일/담당자)은 보존
  let n = clearRange(tw, 12, 51, colNum('B'), colNum('AF'), new Set(['Q']))
  n += clearRange(tw, 4, 9, colNum('AF'), colNum('AF')) // 우측 메모(19년 아이템 목록 = 기록)
  await out.xlsx.writeFile(join(OUT_B4, 'B2100-04_장기테마_추출.xlsx'))
  console.log(`✓ B2100-04 추출(헤더 11행+블록 10개) 기록 클리어 ${n}셀`)
}

// ── A-2. B2100-05 즉실천항목 — 헤더 r1~9 + 빈 블록 10개(r10~49, stride 4) ──
{
  const { out, tw } = await extractSheet(F_B2100, 'B2100-05', 49, colNum('AB'))
  // A열 주차 라벨·P열 즉실천 구분도 기록 → 클리어. S열 서브라벨 보존
  const n = clearRange(tw, 10, 49, colNum('A'), colNum('AB'), new Set(['S']))
  await out.xlsx.writeFile(join(OUT_B4, 'B2100-05_즉실천항목_추출.xlsx'))
  console.log(`✓ B2100-05 추출(헤더 9행+블록 10개 — 원본 4,443행 기록 미포함) 클리어 ${n}셀`)
}

// ── A-3. F1100-04 지식 관리표 — 헤더 r1~5 + 빈 30행(r6~35) ──
{
  const { out, tw } = await extractSheet(F_F1100, 'F1100-04', 35, colNum('L'))
  // 데이터 영역(r6+) 세로 병합 해제 — 원본 A7:A13(프로세스 그룹 병합)이 남으면
  // grid 행 주입값이 병합 종속 셀에 가려짐(1행=1건 대장으로 정규화)
  for (const m of [...(tw.model?.merges || [])]) {
    const r1 = parseInt(m.match(/\d+/)[0])
    if (r1 >= 6) { try { tw.unMergeCells(m) } catch { /* */ } }
  }
  // 기록 클리어(A~L 전열 — B열 연번 수식도 기록행 소속이라 함께 클리어, 한계 명기)
  const n = clearRange(tw, 6, 35, colNum('A'), colNum('L'))
  await out.xlsx.writeFile(join(OUT_B4, 'F1100-04_지식관리표_추출.xlsx'))
  console.log(`✓ F1100-04 추출(헤더 5행+빈 30행 — 원본 기록 144행 미포함) 클리어 ${n}셀`)
}

// ── B. 0065 설계본 정비 2종 — 예시행 클리어 + 양식번호 정정 ──
async function fixSqGap(file, code, oldNo, exampleRow, keepFormulaCols) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(join(OUT_SQ, file))
  const ws = wb.worksheets.find((w) => w.name === '양식')
  let cleared = 0
  const row = ws.getRow(exampleRow)
  row.eachCell({ includeEmpty: false }, (cell) => {
    const col = cell.address.replace(/\d+/g, '')
    if (keepFormulaCols.has(col) && typeof cell.value === 'object' && cell.value?.formula !== undefined) return
    cell.value = null
    cleared++
  })
  // 내부 양식번호 정정: 구코드(제안) → 재부여 코드 (0110 M1200-05→09 선례)
  const a2 = ws.getCell('A2')
  const before = String(a2.value || '')
  if (before.includes(oldNo)) a2.value = before.replace(`${oldNo}(제안)`, code).replace(oldNo, code)
  await wb.xlsx.writeFile(join(OUT_SQ, file))
  console.log(`✓ ${code} 예시행 클리어 ${cleared}셀 + 양식번호 정정(${oldNo}→${code})`)
}
await fixSqGap('03_리크리워크_이력대장_B1100-10.xlsx', 'B1100-12', 'B1100-10', 4, new Set())
await fixSqGap('10_부적합품_처리대장_B1100-11.xlsx', 'B1100-13', 'B1100-11', 4, new Set(['N'])) // N열 수량대사 수식 보존

console.log('완료 — batch4 템플릿 3건 + sq_gap_forms 정비 2건')
