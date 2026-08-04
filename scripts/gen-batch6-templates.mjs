// ============================================================
// scripts/gen-batch6-templates.mjs — 6배치 템플릿 생성·정비 (2026-07-29 사무실)
//
// A. 추출 4종 (마스터 무변경 — 시트/면 잘라내기)
//  · A8100-01 RISK 분석표 — 시트명 한 자리 코드("A8100-1"+"_") 정정 + 예시 기록
//    클리어(헤더 C2/G2/M2 + 1행 예시, 위험지수 수식 J/Q열 보존). B2300 선례.
//  · B2300-08 정성품질 순회 점검 시트 — 5배치 발견 코드 중복 별개 양식의 신규
//    등록분(사용자 결정 ⓐ, 검수회신_4_5배치 §4). 시트명 B2300-3→B2300-08 정정.
//  · J1100-14 고객 접수 도면 검토서 — 실측 반전: 시트가 좌면(A~AV)=빈 양식 틀,
//    우면(AZ~CU)=작성 예시 기록의 2면 나란히 배치 → 좌면만 추출(예시·도면
//    이미지 자연 분리). 5페이지(123행) 전체 보존.
//  · A1100-01 개인별 업무 분장표 — 첫 블록(1~26행)=빈 틀, 27행~=경영관리실 등
//    실기록 사례 → 첫 블록만 추출(B2100-04 추출 선례 연장).
// B. 정비 2종 (리포 파일 in-place, 멱등)
//  · J3100-08 4M 변경 마스터리스트 — 0065 설계본(파일명 구코드 09_..._J3100-05)
//    양식번호 A2 "J3100-05(제안)"→"J3100-08" 정정 + 예시행 2행 클리어.
//    B1100-12/13 코드충돌 재부여 잔재 선례.
//  · L-4101-01 SPC 평가표 — .xls 원본은 엔진 판독 불가(구형 포맷) → LibreOffice
//    변환본(batch6/, 원본 무변경)의 실기록 클리어(헤더 C2~C17·측정일자 G17~AJ17·
//    측정 데이터 G19~AJ23), 통계/판정/관리한계 수식 전 보존. 계산기형(L4102-02)
//    + 실기록 추출(B2100-04) 선례 조합. ⚠️Excel COM 저장 불가 실측(문서 미저장
//    오류 반복)이라 LibreOffice 경로 채택 — 차트/개체 표현 차이 가능(검수요청 명기).
//
// 멱등: 재실행 = 동일 결과(클리어 0셀·정정 0건). 실행: node scripts/gen-batch6-templates.mjs
// ============================================================
import ExcelJS from 'exceljs'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER =
  process.env.IATF_MASTERS_DIR ||
  join(root, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501')
const OUT_B6 = join(root, 'resources', 'templates', 'batch6')
const OUT_SQ = join(root, 'resources', 'templates', 'sq_gap_forms')
mkdirSync(OUT_B6, { recursive: true })

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

const isFormula = (v) => v && typeof v === 'object' && (v.formula || v.sharedFormula)
function clearRange(ws, r1, r2, c1, c2) {
  let n = 0
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) {
      const cell = ws.getRow(r).getCell(c)
      if (cell.value != null && !isFormula(cell.value)) { cell.value = null; n++ }
    }
  return n
}

// ── A-1. A8100-01 RISK 분석표 — 시트명 정정 추출 + 예시 클리어 ──
{
  const out = await extractSheet(
    'A-8100 리스크 관리 규정 (23년5월1일_REV.5)_품질경영.xlsx',
    'RISK 분석표(A8100-1)_', 'RISK 분석표(A8100-01)', 23, colNum('Q')
  )
  const ws = out.worksheets[0]
  let cleared = 0
  cleared += clearRange(ws, 2, 2, colNum('C'), colNum('D'))   // 부서명 예시
  cleared += clearRange(ws, 2, 2, colNum('G'), colNum('K'))   // 프로세스명 예시
  cleared += clearRange(ws, 2, 2, colNum('M'), colNum('Q'))   // 작성일자 예시(44237)
  cleared += clearRange(ws, 5, 5, colNum('A'), colNum('I'))   // 예시행(수입검사) — J/Q 수식은 보존
  cleared += clearRange(ws, 5, 5, colNum('K'), colNum('P'))
  await out.xlsx.writeFile(join(OUT_B6, 'A8100-01_RISK분석표.xlsx'))
  console.log(`✓ A8100-01 추출(23행) — 예시 클리어 ${cleared}셀`)
}

// ── A-2. B2300-08 순회 점검 시트 — 신규 등록분 추출(시트명 정정) ──
{
  const out = await extractSheet(
    'B-2300 정성품질 운영 지침 (25년8월1일_REV.1)_품질보증.xlsx',
    '정성품질 순회 점검 시트(B2300-3)', '정성품질 순회 점검 시트(B2300-08)', 23, colNum('AY')
  )
  await out.xlsx.writeFile(join(OUT_B6, 'B2300-08_순회점검시트.xlsx'))
  console.log('✓ B2300-08 추출(23행) — 빈 틀(순번 수식 보존)')
}

// ── A-3. J1100-14 도면 검토서 — 좌면(빈 틀)만 추출 ──
{
  const out = await extractSheet(
    'J-1100 개발업무 규정 (24년3월29일_REV.7)_개발.xlsx',
    '고객 접수 도면 검토서 (J1100-14)', '고객 접수 도면 검토서 (J1100-14)', 123, colNum('AV')
  )
  await out.xlsx.writeFile(join(OUT_B6, 'J1100-14_도면검토서.xlsx'))
  console.log('✓ J1100-14 좌면 추출(123행×A~AV) — 우면 기록 예시·도면 이미지 분리')
}

// ── A-4. A1100-01 업무 분장표 — 첫 블록(빈 틀)만 추출 ──
{
  const out = await extractSheet(
    'A-1100 조직 및 업무분장 규정 (25년6월27일_REV.6)_총무.xlsx',
    '(   )사업부 개인별 업무 분장표 (A1100-01)', '(   )사업부 개인별 업무 분장표 (A1100-01)', 26, colNum('AU')
  )
  await out.xlsx.writeFile(join(OUT_B6, 'A1100-01_업무분장표.xlsx'))
  console.log('✓ A1100-01 첫 블록 추출(26행) — 27행~ 실기록 사례 분리')
}

// ── B-1. J3100-08 — 0065 설계본 양식번호 정정 + 예시행 클리어 (멱등) ──
{
  const f = join(OUT_SQ, '09_4M변경_마스터리스트_J3100-05.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(f)
  const ws = wb.worksheets[0]
  let fixed = 0
  const a2 = ws.getCell('A2')
  const t = typeof a2.value === 'string' ? a2.value : ''
  if (t.includes('J3100-05(제안)')) { a2.value = t.replace('J3100-05(제안)', 'J3100-08'); fixed++ }
  const cleared = clearRange(ws, 4, 5, 1, colNum('M'))
  if (fixed || cleared) await wb.xlsx.writeFile(f)
  console.log(`✓ J3100-08 정비 — 양식번호 정정 ${fixed}건 · 예시행 클리어 ${cleared}셀`)
}

// ── B-2. L-4101-01 SPC 평가표 — 변환본 실기록 클리어 (멱등) ──
{
  const f = join(OUT_B6, 'L-4101-01_SPC평가표.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(f)
  const ws = wb.worksheets[0]
  let cleared = 0
  cleared += clearRange(ws, 2, 17, colNum('C'), colNum('E'))    // 헤더 기록(고객사~작성자)
  cleared += clearRange(ws, 17, 18, colNum('G'), colNum('AJ'))  // 측정일자 헤더 기록
  cleared += clearRange(ws, 19, 23, colNum('G'), colNum('AJ'))  // 측정 데이터 — 수식(24행~)은 보존
  if (cleared) await wb.xlsx.writeFile(f)
  console.log(`✓ L-4101-01 변환본 정비 — 기록 클리어 ${cleared}셀 (수식 보존)`)
}

console.log('완료: templates/batch6 4종 + 정비 2종')
