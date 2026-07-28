// ============================================================
// scripts/gen-batch1-templates.mjs — 1배치 본체 템플릿 작업 (2026-07-28)
//
// 실측(7/28 오후 사무실)에 따른 세 갈래:
//  ① AM 실사용 추출 2종 — 수입검사(L2100-01)·공정패트롤(L2100-05).
//     마스터 규정집의 L2100-01-인 시트는 5행 스텁, -조 순회일지는 조관사업부 전용이라
//     AM사업부 실사용 MES 엑셀양식('양식' 시트)이 원본. 원본 워크북에서 '양식' 시트만
//     남기고 저장(품번별 실데이터 시트가 export 출력물에 실리는 것 방지).
//     → am_forms/ (sq_gap_forms 아님 = 신규 설계본 아니라 실물 채택본. audit newDesign=false)
//  ② 조도 실물 채택 — L2100-11. 기존 신규 설계본(12_조도관리)은 조명 조도(lux)로 도메인을
//     잘못 잡았고, AM 실물(조도측정 일지.xlsx)은 표면 거칠기 조도(조도팁 스타일러스).
//     실물 출현 시 실물 기준 교정(코워크 A-2 조건) → 실물 파일 그대로 복사(무손상).
//  ③ 신규 설계본 그리드형 재작업 2종 — 05_금형(L1100-25)·04_지그치공구(L1200-12).
//     기존 '일상점검' 시트는 일(日)-열 매트릭스라 grid 엔진(행 반복 주입)과 구조 불일치.
//     일자-행 전개 '양식' 시트로 재설계(Rev.1) + 0065 당시 구코드 라벨(L1100-20/L1200-03
//     '(제안)') 교정. 정기점검·보관·작성요령 시트는 보존.
//
// 실행: node scripts/gen-batch1-templates.mjs   (멱등 — 재실행 = 동일 결과)
// ============================================================
import ExcelJS from 'exceljs'
import { copyFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const AM_OUT = join(root, 'resources', 'templates', 'am_forms')
const GAP = join(root, 'resources', 'templates', 'sq_gap_forms')
mkdirSync(AM_OUT, { recursive: true })

const SRC_MES = join(
  'D:/IATF16949,SQ 자동작성 봇',
  '8. 자주검사 체크시트 및 설비일상점검 사내 자료',
  '12. 25450-07870 자주,수입검사,패트롤 MES엑셀자료 모음-240313'
)
const SRC_JODO = join(
  'D:/IATF16949,SQ 자동작성 봇',
  'TPC AM사업부 품질폴더',
  '5. 수입검수',
  '조도측정 일지.xlsx'
)

const thin = { style: 'thin', color: { argb: 'FF9AA1AB' } }
const border = { top: thin, left: thin, bottom: thin, right: thin }
const headFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDF3FF' } }

// ── ① AM 실사용 추출: '양식' 시트만 남긴다 ─────────────────────
async function extractYangsik(srcFile, outFile, tag) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(srcFile)
  const keep = wb.worksheets.find((w) => w.name === '양식')
  if (!keep) throw new Error(`'양식' 시트 없음: ${srcFile}`)
  const mergesBefore = (keep.model.merges || []).length
  const imagesBefore = keep.getImages().length
  for (const w of [...wb.worksheets]) {
    if (w.id !== keep.id) wb.removeWorksheet(w.id)
  }
  await wb.xlsx.writeFile(outFile)
  // 검증: 재판독 — 시트 1장·병합·이미지 보존
  const v = new ExcelJS.Workbook()
  await v.xlsx.readFile(outFile)
  const ws = v.worksheets[0]
  const ok =
    v.worksheets.length === 1 &&
    ws.name === '양식' &&
    (ws.model.merges || []).length === mergesBefore &&
    ws.getImages().length === imagesBefore
  console.log(
    `${ok ? '✓' : '✗'} ${tag}: 시트 ${v.worksheets.length}장, 병합 ${mergesBefore}→${(ws.model.merges || []).length}, 이미지 ${imagesBefore}→${ws.getImages().length}`
  )
  if (!ok) throw new Error(`${tag} 추출 검증 실패`)
}

await extractYangsik(
  join(SRC_MES, '수입검사 엑셀양식_품질팀_240313-07870 진행 完.xlsx'),
  join(AM_OUT, 'L2100-01_수입검사표준_AM.xlsx'),
  'L2100-01 수입검사표준(AM)'
)
await extractYangsik(
  join(SRC_MES, '공정패트롤 엑셀양식_개발팀_240313-07870 진행 完.xlsx'),
  join(AM_OUT, 'L2100-05_공정순회_패트롤_AM.xlsx'),
  'L2100-05 공정패트롤(AM)'
)
// M1200-10 실물 교체(코워크 승인 7/28 오후 — 조도 선례 "실물 출현 시 교정" 일관 적용).
// 조건 ⓑ: 구 신규설계본(15_공정자주검사)은 삭제하지 않고 sq_gap_forms 에 참고 보관.
await extractYangsik(
  join(SRC_MES, '자주검사체크시트 엑셀양식_개발팀_240313-07870 진행 完.xlsx'),
  join(AM_OUT, 'M1200-10_공정자주검사_AM.xlsx'),
  'M1200-10 공정자주검사(AM)'
)

// ── ①-b 추출본 시드값 클리어 ─────────────────────────────────
// AM '양식' 시트는 2M100 품번의 실값이 시드로 남아 있다(작성 관행: 시트 복사 후 덮어쓰기).
// 앱 export 는 사용자가 안 채운 셀을 못 덮으므로 시드가 가짜 데이터로 잔존 →
// "빈칸이 가짜보다 낫다"(0097) 원칙에 따라 매핑 대상 값 셀만 비운다.
// 유지: 라벨·병합·테두리·순번(C8/C11/C14/F8/F11)·도해/사진 이미지(품번별 교체는 수기 영역 — 검수 문서에 한계 명시).
async function clearSeedCells(file, cells, tag) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  const ws = wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
  let cleared = 0
  for (const addr of cells) {
    const cell = ws.getCell(addr)
    if (cell.value != null && String(cell.value) !== '') {
      cell.value = null
      cleared++
    }
  }
  if (cleared > 0) await wb.xlsx.writeFile(file)
  console.log(`✓ ${tag} 시드 클리어 (${cleared}셀)`)
}
const AM_SEED_CELLS = [
  'C2', 'F2', 'I2', 'C4', 'F4', 'I4', 'K3', 'K5', // 헤더 값(차종·품번·설비명·공정명·품명·원소재LOT·적입용기·1BOX수량)
  'D8', 'E8', 'G8', 'H8', 'D11', 'E11', 'G11', 'H11', 'D14', 'E14', // 검사부위·검사항목
  'G14' // 비고
]
await clearSeedCells(join(AM_OUT, 'L2100-01_수입검사표준_AM.xlsx'), AM_SEED_CELLS, 'L2100-01')
await clearSeedCells(join(AM_OUT, 'L2100-05_공정순회_패트롤_AM.xlsx'), AM_SEED_CELLS, 'L2100-05')
await clearSeedCells(join(AM_OUT, 'M1200-10_공정자주검사_AM.xlsx'), AM_SEED_CELLS, 'M1200-10')

// ── ② 조도 실물: 무손상 원본 복사 ────────────────────────────
copyFileSync(SRC_JODO, join(AM_OUT, 'L2100-11_조도측정_기록일지_AM.xlsx'))
console.log('✓ L2100-11 조도측정 기록일지(AM 실물 복사)')

// ── ③ 점검 체크시트 그리드형 재작업(일자-행 전개 '양식' 시트) ──
async function rebuildDailySheet(file, { code, title, items, headerCells }) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(file)
  // 멱등: 기존 '양식'·'일상점검' 시트 제거 후 재생성
  for (const name of ['양식', '일상점검']) {
    const w = wb.worksheets.find((x) => x.name === name)
    if (w) wb.removeWorksheet(w.id)
  }
  const ws = wb.addWorksheet('양식')
  const cols = ['일자', ...items.map((i) => i.short), '점검자', '비고']
  const last = ws.getColumn(cols.length).letter

  ws.mergeCells(`A1:${last}1`)
  const t = ws.getCell('A1')
  t.value = title
  t.font = { size: 14, bold: true }
  t.alignment = { horizontal: 'center', vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells(`A2:E2`)
  ws.getCell('A2').value = `양식번호: ${code} (신규 설계본 — 실물 대사 전)`
  ws.getCell('A2').font = { size: 9, color: { argb: 'FF6B7280' } }
  ws.mergeCells(`F2:${last}2`)
  const rv = ws.getCell('F2')
  rv.value = 'Rev.1 · 개정일: 2026-07-28 (일자-행 전개·양식번호 정정)'
  rv.font = { size: 9, color: { argb: 'FF6B7280' } }
  rv.alignment = { horizontal: 'right' }

  // r3: 식별 헤더(라벨:값 쌍) + 판정 기호 안내
  const put = (addr, label) => {
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
  headerCells(put, box, ws, last)

  // r4: 표 헤더 / r5~35: 31일 데이터 행
  cols.forEach((label, i) => {
    const cell = ws.getCell(4, i + 1)
    cell.value = label
    cell.fill = headFill
    cell.font = { size: 9, bold: true }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = border
  })
  ws.getRow(4).height = 34
  for (let r = 5; r <= 35; r++)
    for (let c = 1; c <= cols.length; c++) {
      const cell = ws.getCell(r, c)
      cell.border = border
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    }
  ws.getColumn(1).width = 11
  for (let c = 2; c <= 1 + items.length; c++) ws.getColumn(c).width = 12
  ws.getColumn(2 + items.length).width = 9
  ws.getColumn(3 + items.length).width = 16

  await wb.xlsx.writeFile(file)
  console.log(`✓ ${code} 재작업: 시트 [${wb.worksheets.map((w) => w.name).join(' | ')}]`)
}

await rebuildDailySheet(join(GAP, '05_금형_점검체크시트_L1100-20.xlsx'), {
  code: 'L1100-25',
  title: '금형 일상점검 체크시트 (월간)',
  items: [
    { short: '이물질 없음\n(상/하부)' },
    { short: '손상·크랙\n없음' },
    { short: '볼트 풀림\n없음' },
    { short: '도금상태\n양호' },
    { short: '마모 상태\n확인' },
    { short: '핀 유격\n없음' },
    { short: '스크랩\n취출상태' }
  ],
  headerCells: (put, box, ws) => {
    put('A3', '금형 번호')
    box('B3', 'C3')
    put('D3', '등급')
    box('E3')
    put('F3', '년/월')
    box('G3')
    box('H3', 'J3')
    const g = ws.getCell('H3')
    g.value = '판정 기호: ○ 적합 / × 부적합 / △ 조치요'
    g.font = { size: 9, color: { argb: 'FF6B7280' } }
  }
})

await rebuildDailySheet(join(GAP, '04_지그치공구_점검체크시트_L1200-03.xlsx'), {
  code: 'L1200-12',
  title: '지그·치공구 일상점검 체크시트 (월간)',
  items: [
    { short: '안착센서\nF/P 테스트' },
    { short: '기준핀\n마모·유격' },
    { short: '스패터\n제거' },
    { short: '클램프\n작동상태' },
    { short: '센서류\n작동·고정' },
    { short: '에어 누기\n없음' },
    { short: '배선·피복\n상태' }
  ],
  headerCells: (put, box, ws) => {
    put('A3', '지그 번호')
    box('B3', 'C3')
    put('D3', '년/월')
    box('E3')
    box('F3', 'J3')
    const g = ws.getCell('F3')
    g.value = '판정 기호: ○ 적합 / × 부적합(조치내용 비고 기록)'
    g.font = { size: 9, color: { argb: 'FF6B7280' } }
  }
})

// ── ④ 02 출하성적서(M3100-05) 예시행 클리어 — 0065 01 대장 선례와 동일 사유 ──
{
  const p = join(GAP, '02_완성품_출하검사_성적서_M3100-05.xlsx')
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)
  const ws = wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
  let cleared = 0
  for (let r = 5; r <= 6; r++)
    for (let c = 2; c <= 12; c++) {
      const cell = ws.getCell(r, c)
      if (cell.value != null && String(cell.value) !== '') {
        cell.value = null
        cleared++
      }
    }
  if (cleared > 0) await wb.xlsx.writeFile(p)
  console.log(`✓ 02 M3100-05 예시행 클리어 (${cleared}셀)`)
}

console.log('완료 —', AM_OUT, '+', GAP)
