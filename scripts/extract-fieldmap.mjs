// 셀맵 자동 추출기 — 양식 시트를 읽어 "라벨↔입력칸"을 휴리스틱으로 짝지어 매핑 CSV 초안 생성
// 실행: node scripts/extract-fieldmap.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'D:\\IATF16949,SQ 자동작성 봇\\IATF 전체 자료모음_김권표이사_260501\\3.IATF16949 규정&지침 _230501\\B-2100 시정조치 규정 (25년8월18일_REV.6)_품질보증.xlsx'
const SHEET_RE = /B2100-01/
const REG_CODE = 'B2100-01'
const OUT = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager\\_demo_output\\B2100-01_매핑_자동초안.csv'

// 내가 손으로 정의한 정답(대조용)
const MANUAL = { F4:'발행번호', V4:'발행일자', F5:'수신처', V5:'발행자', A8:'부적합사항', F13:'관련문서', AA12:'회신요구일', AA13:'피감사자', AA14:'감사자', V28:'완료예정일' }

function colNum(s) { let n = 0; for (const c of s) n = n * 26 + (c.charCodeAt(0) - 64); return n }
function parseAddr(a) { const m = a.match(/^([A-Z]+)(\d+)$/); return { col: colNum(m[1]), row: +m[2] } }
function cellText(ws, addr) {
  let v = ws.getCell(addr).value
  if (v == null) return ''
  if (typeof v === 'object') {
    if (v.richText) v = v.richText.map(t => t.text).join('')
    else if (v.formula) v = v.result ?? ''
    else if (v.text) v = v.text
    else v = ''
  }
  return String(v).replace(/\s+/g, ' ').trim()
}
function guessType(label) {
  if (/일자|날짜|일$/.test(label)) return 'date'
  if (/사항|원인|대책|내용|결과/.test(label)) return 'textarea'
  return 'text'
}
function slug(label) { return label.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '') }

// 직급/제목/체크박스 등 입력 라벨이 아닌 것 제외
const NOT_LABEL = /^(담\s*당|팀\s*장|사업부장|부사장|대표이사|발\s*행\s*부\s*서|조치 요구서|조치 결과)$/
const isLabel = t => t && t.length <= 20 && !/□/.test(t) && !NOT_LABEL.test(t)

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile(SRC)
const ws = wb.worksheets.find(w => SHEET_RE.test(w.name))
const merges = ws.model.merges || []

const regions = merges.map(r => {
  const [a, b] = r.split(':')
  return { range: r, master: a, tl: parseAddr(a), br: parseAddr(b), text: cellText(ws, a) }
})
const labels = regions.filter(r => isLabel(r.text))
const blanks = regions.filter(r => !r.text)

const rows = []
for (const inp of blanks) {
  // ① 왼쪽 인접 라벨 (가로형: 라벨 | 입력)
  let lab = labels.find(l => l.tl.row === inp.tl.row && l.br.col === inp.tl.col - 1)
  let dir = '←라벨'
  // ② 위 인접 라벨 (세로형: 라벨 위, 입력 아래)
  if (!lab) { lab = labels.find(l => l.tl.col === inp.tl.col && l.br.row === inp.tl.row - 1); dir = '↑라벨' }
  if (lab) rows.push({ label: lab.text, cell: inp.master, type: guessType(lab.text), dir })
}

// CSV 작성 (UTF-8 BOM)
const header = 'reg_code,field_key,label,cell,type'
const lines = rows.map(r => `${REG_CODE},${slug(r.label)},${r.label},${r.cell},${r.type}`)
fs.writeFileSync(OUT, '﻿' + [header, ...lines].join('\n'), 'utf8')

// 콘솔 요약 + 정답 대조
console.log(`병합영역 ${regions.length} → 라벨후보 ${labels.length}, 빈칸 ${blanks.length} → 자동매칭 ${rows.length}건\n`)
console.log('=== 자동 추출 결과 ===')
rows.forEach(r => console.log(`  ${r.cell}\t${r.dir}\t${r.label} (${r.type})`))

console.log('\n=== 손으로 만든 정답과 대조 ===')
let hit = 0
for (const [cell, label] of Object.entries(MANUAL)) {
  const got = rows.find(r => r.cell === cell)
  if (got) { hit++; console.log(`  OK  ${cell} = ${label}`) }
  else console.log(`  누락 ${cell} = ${label}  (자동추출 못함)`)
}
console.log(`\n정밀도: 정답 ${Object.keys(MANUAL).length}개 중 ${hit}개 자동 적중`)
console.log('CSV 초안:', OUT)
