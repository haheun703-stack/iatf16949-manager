// ============================================================
// scripts/gen-b4-templates.mjs — ⓑ 4종: 내부심사 AM용 빈 틀 (2026-07-28 밤)
//
// 코워크 판정2(7/28): A5100-03·A5100-04·A5200-03·A5200-04 = AM용 빈 틀 신규 설계본.
// 조건: ① A-2 전부(문서번호·Rev.0 마커·audit 신규설계 표시·실물 출현 시 교정)
//       ② 문항·평가 항목 구조는 마스터 원본 재사용, '기록값'만 비운다(창작 금지).
//
// 구현 = 마스터 시트 단독 추출(다른 시트 제거) 후:
//   · 기록값 클리어 — 명시 셀 목록 + 라벨 주도 규칙(라벨 우측 값 셀·서술 블록)
//   · 라벨에 기록이 섞인 셀은 라벨만 남기고 정규화(예: '2-2 개선권고사항 : 없음' → '2-2 개선권고사항 : ')
//   · 심사 사진 제거 — A5200 계열(과거 심사 기록 사진 24장씩). A5100 계열 이미지는 로고성 → 유지
//   · A-2 마커를 상단 빈 셀에 기입
// 시트명은 마스터 그대로(코드 포함 → resolveSheet 직접 매칭). 멱등: 재실행 = 동일 결과.
// 실행: node scripts/gen-b4-templates.mjs
// ============================================================
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'resources', 'templates', 'sq_gap_forms')
const MASTER = join(root, '..', 'IATF 전체 자료모음_김권표이사_260501', '3.IATF16949 규정&지침 _230501') + '/'

const F_A5100 = 'A-5100 내부심사 규정 (24년5월27일_REV.6)_품질경영.xlsx'
const F_A5200 = 'A-5200 공정 및 제품심사 규정 (23년5월1일_REV.5)_품질경영.xlsx'

const cellText = (v) => {
  if (v == null) return ''
  if (typeof v === 'object') return v.richText ? v.richText.map((t) => t.text).join('') : String(v.result ?? '')
  return String(v)
}

async function build({ srcFile, sheetFrag, outName, marker, dropImages, clearCells, normalize, rules, tag }) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(MASTER + srcFile)
  const keep = wb.worksheets.find((w) => w.name.includes(sheetFrag))
  if (!keep) throw new Error(`시트 없음: ${sheetFrag}`)
  for (const w of [...wb.worksheets]) if (w.id !== keep.id) wb.removeWorksheet(w.id)

  let cleared = 0
  const clr = (addr) => {
    const c = keep.getCell(addr)
    if (c.value != null && String(cellText(c.value)).trim() !== '') {
      c.value = null
      cleared++
    }
  }
  for (const a of clearCells) clr(a)
  for (const [addr, text] of Object.entries(normalize || {})) {
    keep.getCell(addr).value = text
    cleared++
  }
  if (rules) rules(keep, clr)

  // 심사 기록 사진 제거(A5200 계열) — ExcelJS 내부 _media 참조 비우기
  const imgBefore = keep.getImages().length
  if (dropImages) keep._media = []

  // A-2 마커(상단 우측 빈 셀)
  const mk = keep.getCell(marker.cell)
  mk.value = marker.text
  mk.font = { size: 8, color: { argb: 'FF6B7280' } }

  await wb.xlsx.writeFile(join(OUT, outName))
  // 재판독 검증
  const v = new ExcelJS.Workbook()
  await v.xlsx.readFile(join(OUT, outName))
  const ws2 = v.worksheets[0]
  console.log(
    `✓ ${tag}: 시트 1장("${ws2.name}") 클리어 ${cleared}건, 이미지 ${imgBefore}→${ws2.getImages().length}, 병합 ${(ws2.model.merges || []).length}`
  )
}

// ── 17. A5100-03 내부심사(갑·을) 보고서 ──────────────────────
await build({
  srcFile: F_A5100,
  sheetFrag: 'A5100-03',
  outName: '17_내부심사_갑을_보고서_A5100-03.xlsx',
  tag: 'A5100-03',
  dropImages: false,
  marker: { cell: 'AG2', text: '신규 설계본(AM용 빈 틀) Rev.0 · 2026-07-28 — 구조=정본 재사용, 기록값 클리어. 실물 대사 시 교정' },
  clearCells: [
    'G4', 'S4', 'G5', 'S5', 'S6', // 발행번호·작성일자·감사대상·심사일자·부적합NO
    'C17', 'C18', 'C19', 'C20', 'C21', 'C22', // 2-1 긍정적 측면 서술
    'C27', 'C28', 'C29', 'C30', 'C31', 'C32', 'C33', // 2-3 부적합 서술
    'F50', 'F52', 'F54', 'F55', 'F58', 'F60', 'F61', // 을지 사업부별 지적 서술
    'A64', 'A65', 'A66', 'A67', 'A68', 'A69', 'A70', 'A71', 'A72', 'A73', 'A74', 'A75', 'A76' // 4. 제품심사 서술
  ],
  normalize: {
    A24: '2-2 개선권고사항 : ',
    A26: '2-3 부적합사항 (품질    건 / 환경    건 / 안전    건)',
    I40: '1.  시정 조치 요구서     (    매)  각 1 부',
    A47: '1) 감사 대상 : ',
    A48: '2) 감사 기준 및 방법 : ',
    A49: '3) 부적합 발행 내용 : ',
    A63: '4. 제품심사 결과 : '
  }
})

// ── 18. A5100-04 내부심사(시스템) 체크리스트 ─────────────────
await build({
  srcFile: F_A5100,
  sheetFrag: 'A5100-04',
  outName: '18_내부심사_시스템_체크리스트_A5100-04.xlsx',
  tag: 'A5100-04',
  dropImages: false,
  marker: { cell: 'AG2', text: '신규 설계본(AM용 빈 틀) Rev.0 · 2026-07-28 — 문항 구조=정본 재사용, 기록값 클리어. 실물 대사 시 교정' },
  clearCells: [],
  rules: (ws, clr) => {
    // 상단 결과 매트릭스(사업부×팀 평점·지적) 기록값: r7~26·r28~31, I열 이후(라벨 A~H 보존, 헤더 r6·r27 보존)
    for (let r = 7; r <= 31; r++) {
      if (r === 27) continue
      for (let c = 9; c <= 32; c++) clr(ws.getRow(r).getCell(c).address)
    }
    // 팀별 평가서 블록: '심사일자'·'심사원' 라벨 행의 E열 값 클리어(전 블록 일괄)
    for (let r = 33; r <= 376; r++) {
      const a = cellText(ws.getCell(`A${r}`).value).replace(/\s/g, '')
      if (a.includes('심사일자') || a.includes('심사원')) clr(`E${r}`)
    }
  }
})

// ── 19. A5200-03 내부심사(제조) 체크리스트 ───────────────────
await build({
  srcFile: F_A5200,
  sheetFrag: 'A5200-03',
  outName: '19_내부심사_제조_체크리스트_A5200-03.xlsx',
  tag: 'A5200-03',
  dropImages: true, // 과거 심사 기록 사진 24장 = 기록값
  marker: { cell: 'AS2', text: '신규 설계본(AM용 빈 틀) Rev.0 · 2026-07-28 — 공정 항목 구조=정본 재사용, 기록값·심사 사진 클리어. 실물 대사 시 교정' },
  clearCells: [],
  rules: (ws, clr) => {
    for (let r = 1; r <= 141; r++) {
      // 헤더 라벨 우측 값 셀(평가 대상명 F·평가일 Q·평가팀 F·평가자 Q·품명 F·규격 Q)
      const a = cellText(ws.getCell(`A${r}`).value).replace(/\s/g, '')
      const l = cellText(ws.getCell(`L${r}`).value).replace(/\s/g, '')
      if (a === '평가대상명' || a === '평가팀' || a === '품명') clr(`F${r}`)
      if (l === '평가일' || l === '평가자' || l === '제품규격') clr(`Q${r}`)
      // 평가요약 서술(A열 '1.'~'9.' 시작 장문 = 기록)
      const av = cellText(ws.getCell(`A${r}`).value).trim()
      if (/^[0-9]\./.test(av) && av.length > 12) clr(`A${r}`)
      // 지적사항(AA열) — 헤더 라벨('지적사항') 제외 전부 기록
      const aa = cellText(ws.getCell(`AA${r}`).value).replace(/\s/g, '')
      if (aa && aa !== '지적사항') clr(`AA${r}`)
      // 합계 점수 값(W열 '합계점수' 행의 AA~ 이후는 위에서 클리어됨) — 점수 숫자 셀(AL~AS 영역)
      for (let c = 38; c <= 45; c++) {
        const cell = ws.getRow(r).getCell(c)
        const v = cellText(cell.value).trim()
        if (v && /^[0-9.]+$/.test(v)) clr(cell.address)
      }
    }
  }
})

// ── 20. A5200-04 내부심사(제품) 체크리스트 ───────────────────
await build({
  srcFile: F_A5200,
  sheetFrag: '체크리스트 A5200-04',
  outName: '20_내부심사_제품_체크리스트_A5200-04.xlsx',
  tag: 'A5200-04',
  dropImages: true, // 과거 심사 기록 사진 24장 = 기록값
  marker: { cell: 'AS2', text: '신규 설계본(AM용 빈 틀) Rev.0 · 2026-07-28 — 문항·배점 구조=정본 재사용, 기록값·심사 사진 클리어. 실물 대사 시 교정' },
  clearCells: [],
  rules: (ws, clr) => {
    for (let r = 1; r <= 289; r++) {
      const a = cellText(ws.getCell(`A${r}`).value).replace(/\s/g, '')
      // 헤더 값: 거래처 G · 평가대상 W · (고객사명/규격/품명/생산일자/수량) M·Z
      if (a === '거래처') { clr(`G${r}`); clr(`W${r}`) }
      if (['고객사명', '제품규격', '품명', '생산일자', '납품(출하)수량', '1차포장수량'].includes(a)) {
        clr(`M${r}`); clr(`Z${r}`)
      }
      // 중요 Dim's 기록 행: G열 '설비명' 라벨 행 다음의 값 행들(G/K/N/T/AD) —
      // 라벨 행(G='설비명')은 보존, 값 행은 G열이 라벨이 아니고 AD열이 점수숫자인 행
      const g = cellText(ws.getCell(`G${r}`).value).trim()
      const ad = cellText(ws.getCell(`AD${r}`).value).trim()
      if (g && g !== '설비명' && /^[0-9]+$/.test(ad) && a.replace(/\s/g, '').includes('Dim')) {
        clr(`G${r}`); clr(`K${r}`); clr(`N${r}`); clr(`T${r}`); clr(`AD${r}`)
      }
      // 문항별 채점 값(AI~AS 영역의 숫자·'-' 셀) — 배점 AD열(문항 고정)은 보존
      for (let c = 35; c <= 45; c++) {
        const cell = ws.getRow(r).getCell(c)
        const v = cellText(cell.value).trim()
        if (v && (/^[0-9.]+$/.test(v) || v === '-')) clr(cell.address)
      }
      // 지적사항 서술(AE열 '지적 사항' 라벨 아닌 장문)
      const ae = cellText(ws.getCell(`AE${r}`).value).trim()
      if (ae && ae.replace(/\s/g, '') !== '지적사항' && ae.length > 8) clr(`AE${r}`)
    }
  }
})

console.log('완료 —', OUT)
