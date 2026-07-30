// ============================================================
// scripts/gen-m4200-am.mjs — M4200-01 AM 변형 시트 추출 (2026-07-30 사무실)
//
// 검수회신_6배치 판정3 반전 이행: 0113의 "마스터 직접(정밀인발(인발) 첫 매치)" 매핑을
// 기각하고 AM 변형 시트를 추출 채택한다(1배치 L2100 "AM 실사용 기준" 선례 직적용).
// AM 시트는 M-4200 변형 8종 중 7번째라 resolveSheet 첫 매치가 불가 → 추출 경로.
//
// 구조(실측): 갑지(1~25행 = 결재란 + 1.공정 LAY-OUT 도면 2장) + 을지-1(26~50행,
// 공정 1~57) + 을지-2(51~75행, 공정 58~106) — 3열 그룹(순|공정명|분류|범위|측정값),
// 측정값 앵커 = O/AE/AU. 공정명·조도분류·범위(최저/표준/최대)는 시트 프리셋.
//
// gen-batch6 extractSheet 와 달리 **이미지 동반 복사**(로고 3 + LAY-OUT 도면 2 =
// 양식 실체). J1100-14 추출은 이미지 의도 배제(우면 예시 소속)라 공용화하지 않고
// 본 스크립트 한정 보강. 멱등: 재실행 = 동일 결과. 실행: node scripts/gen-m4200-am.mjs
// ============================================================
import ExcelJS from 'exceljs'
import { mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MASTER =
  process.env.IATF_MASTERS_DIR ||
  'D:/IATF16949,SQ 자동작성 봇/IATF 전체 자료모음_김권표이사_260501/3.IATF16949 규정&지침 _230501'
const OUT_B6 = join(root, 'resources', 'templates', 'batch6')
mkdirSync(OUT_B6, { recursive: true })

const SHEET = 'AM_조도측정 체크시트(M4200-01)'
const KEEP_ROWS = 75
const MAX_COL = 48 // AV

const colNum = (s) => s.split('').reduce((a, c) => a * 26 + c.charCodeAt(0) - 64, 0)
const isFormula = (v) => v && typeof v === 'object' && (v.formula || v.sharedFormula)

const src = new ExcelJS.Workbook()
await src.xlsx.readFile(join(MASTER, 'M-4200 조도(Lux) 관리 지침 (23년5월1일_REV.0)_품질보증.xlsx'))
const ws = src.worksheets.find((w) => w.name === SHEET)
if (!ws) throw new Error(`마스터 시트 없음: ${SHEET}`)

const out = new ExcelJS.Workbook()
const tw = out.addWorksheet(SHEET)
for (let c = 1; c <= MAX_COL; c++) { const w = ws.getColumn(c).width; if (w) tw.getColumn(c).width = w }
for (let r = 1; r <= KEEP_ROWS; r++) {
  const srow = ws.getRow(r)
  if (srow.height) tw.getRow(r).height = srow.height
  for (let c = 1; c <= MAX_COL; c++) {
    const sc = srow.getCell(c), tc = tw.getRow(r).getCell(c)
    tc.value = sc.value
    tc.style = JSON.parse(JSON.stringify(sc.style || {}))
  }
}
for (const m of ws.model?.merges || []) {
  const [, , , c2, r2c] = m.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)
  if (+r2c <= KEEP_ROWS && colNum(c2) <= MAX_COL) { try { tw.mergeCells(m) } catch { /* */ } }
}

// 이미지 복사(로고 A1·을지 타이틀 ×2 + LAY-OUT 도면 좌/우) — imageId 재사용 대응
const idMap = new Map()
let imgs = 0
for (const im of ws.getImages()) {
  const media = src.media[im.imageId]
  if (!media?.buffer) continue
  if (!idMap.has(im.imageId)) idMap.set(im.imageId, out.addImage({ buffer: media.buffer, extension: media.extension }))
  const tl = { col: im.range.tl.nativeCol, row: im.range.tl.nativeRow }
  const br = im.range.br
  const pos = br && br.nativeCol !== undefined
    ? { tl, br: { col: br.nativeCol, row: br.nativeRow } }
    : { tl, ext: im.range.ext || { width: 120, height: 40 } }
  tw.addImage(idMap.get(im.imageId), pos)
  imgs++
}

// 측정값 기록칸 안전 클리어(마스터 실측 = 전량 공란이나 멱등 보장) — 프리셋·수식 보존
function clearRange(r1, r2, c1, c2) {
  let n = 0
  for (let r = r1; r <= r2; r++)
    for (let c = c1; c <= c2; c++) {
      const cell = tw.getRow(r).getCell(c)
      if (cell.value != null && !isFormula(cell.value)) { cell.value = null; n++ }
    }
  return n
}
let cleared = 0
cleared += clearRange(32, 50, colNum('O'), colNum('P'))
cleared += clearRange(32, 50, colNum('AE'), colNum('AF'))
cleared += clearRange(32, 50, colNum('AU'), colNum('AV'))
cleared += clearRange(57, 75, colNum('O'), colNum('P'))
cleared += clearRange(57, 75, colNum('AE'), colNum('AF'))
cleared += clearRange(57, 67, colNum('AU'), colNum('AV'))

const outFile = join(OUT_B6, 'M4200-01_AM조도측정체크시트.xlsx')
await out.xlsx.writeFile(outFile)
console.log(`✓ M4200-01 AM 시트 추출(75행×AV) — 이미지 ${imgs}장 동반 · 측정칸 클리어 ${cleared}셀 → ${outFile}`)
