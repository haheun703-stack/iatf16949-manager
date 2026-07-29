// ============================================================
// scripts/gen-batch3-templates.mjs — 3배치 템플릿 작업 (2026-07-29)
//
// 3배치(공정·물류·식별) 실측 결과, 신규 템플릿 제작 0건 — 마스터 시트 15종 실존
// (갭B 때의 "원본 부재" 반전과 반대). 이 스크립트는 0065 설계본 4종의 정리만 한다:
//  ① 예시행 클리어 — "빈칸이 가짜보다 낫다"(0097, 01 대장·02 출하성적서 선례).
//     설계본 시드 예시(25410-XXXXX·박작업 등)가 export 출력물에 실데이터처럼 남는 것 방지.
//  ② 양식번호 라벨 정정 — '(제안)' 꼬리표 제거(0104 구코드 라벨 정정 선례) +
//     13_공정이동전표 내부 표기 'M1200-05' → 'M1200-09' (0065 코드충돌 재부여 잔재.
//     파일명은 유지 — forms.template_path 경로 불변 원칙, 05_금형 선례).
//  ※ 수식 보존: 13_ 부자재 대사 F/I/J(기말재고·이론사용량·차이) 열은 건드리지 않는다.
//
// 실행: node scripts/gen-batch3-templates.mjs   (멱등 — 재실행 = 동일 결과)
// ============================================================
import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const GAP = join(root, 'resources', 'templates', 'sq_gap_forms')

// 시트별 (예시행 클리어 셀 목록, 양식번호 정정) 정의
const JOBS = [
  {
    file: '06_LOT추적성_대장_M2100-10.xlsx',
    sheets: [
      { name: '양식', clear: rc('A4', 'O4') } // 예시행 1행(브레이징 로#1 시드)
    ]
  },
  {
    file: '07_자재보관장_점검표_K2100-10.xlsx',
    sheets: [
      { name: '월간점검', clear: rc('A4', 'K4') },
      { name: '창고 Lay-Out 등록표', clear: rc('A4', 'G4') }
    ]
  },
  {
    file: '08_용기적재_표준화기준표_M3100-06.xlsx',
    sheets: [{ name: '양식', clear: rc('A4', 'L4') }]
  },
  {
    file: '13_공정이동전표_부자재대사_M1200-05.xlsx',
    recode: ['M1200-05', 'M1200-09'], // 내부 양식번호 정정(코드 재부여 잔재)
    sheets: [
      { name: '공정이동 전표', clear: rc('B5', 'H5') }, // A5 공정순서 프리셋 '1'은 유지
      // 부자재 대사: F/I/J 수식 보존 — 값 셀만
      { name: '부자재 수불 대사', clear: ['A4', 'B4', 'C4', 'D4', 'E4', 'G4', 'H4', 'K4', 'L4', 'M4'] }
    ]
  }
]

// A1-스타일 범위 → 셀 배열 (단일 행 전용)
function rc(from, to) {
  const col = (a) => a.match(/^([A-Z]+)/)[1]
  const row = (a) => a.match(/(\d+)$/)[1]
  const colNum = (c) => c.split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)
  const colStr = (n) => {
    let s = ''
    while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26) }
    return s
  }
  const out = []
  for (let c = colNum(col(from)); c <= colNum(col(to)); c++) out.push(colStr(c) + row(from))
  return out
}

for (const job of JOBS) {
  const p = join(GAP, job.file)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(p)
  let touched = 0
  for (const s of job.sheets) {
    const ws = wb.worksheets.find((w) => w.name === s.name)
    if (!ws) throw new Error(`시트 없음: ${job.file} :: ${s.name}`)
    for (const addr of s.clear) {
      const cell = ws.getCell(addr)
      if (cell.value != null && String(cell.value) !== '' && cell.formula == null) {
        cell.value = null
        touched++
      }
    }
    // 양식번호 라벨(r2) 정정: '(제안)' 제거 + 코드 재부여 반영
    const r2 = ws.getCell('A2')
    if (typeof r2.value === 'string') {
      let v = r2.value.replace(/\(제안\)/g, '')
      if (job.recode) v = v.replaceAll(job.recode[0], job.recode[1])
      if (v !== r2.value) { r2.value = v; touched++ }
    }
  }
  if (touched > 0) await wb.xlsx.writeFile(p)
  console.log(`✓ ${job.file} — 정리 ${touched}셀${touched === 0 ? ' (이미 적용됨)' : ''}`)
}

// 검증 재판독: 예시행 공란 + 양식번호 정정 확인
for (const job of JOBS) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(join(GAP, job.file))
  for (const s of job.sheets) {
    const ws = wb.worksheets.find((w) => w.name === s.name)
    const left = s.clear.filter((a) => {
      const c = ws.getCell(a)
      return c.value != null && String(c.value) !== '' && c.formula == null && !(typeof c.value === 'object' && c.value.formula)
    })
    const r2 = String(ws.getCell('A2').value || '')
    const badLabel = r2.includes('(제안)') || (job.recode && r2.includes(job.recode[0]))
    console.log(`${left.length === 0 && !badLabel ? '✓' : '✗'} 검증 ${job.file} :: ${s.name} — 잔여 ${left.length}셀${badLabel ? ' · 라벨 미정정' : ''}`)
    if (left.length || badLabel) process.exitCode = 1
  }
}
console.log('완료 —', GAP)
