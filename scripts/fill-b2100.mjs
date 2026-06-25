// Step 1 — B2100-01 요구서에 실제 값 주입 → 공식 양식 그대로 출력 + 자동 재검증
// 실행: node scripts/fill-b2100.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'D:\\IATF16949,SQ 자동작성 봇\\IATF 전체 자료모음_김권표이사_260501\\3.IATF16949 규정&지침 _230501\\B-2100 시정조치 규정 (25년8월18일_REV.6)_품질보증.xlsx'
const OUT_DIR = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager\\_demo_output'
const OUT = path.join(OUT_DIR, 'B2100-01_작성예시.xlsx')

// 앱 입력값 (실제로는 form_submissions.values_json s1~s10 에서 옴)
const demo = {
  F4: 'B2100-01-2026-001',                                                          // 발행번호
  V4: '2026-06-25',                                                                 // 발행일자
  F5: '고성정밀',                                                                    // 수신처
  V5: '하헌',                                                                        // 발행자
  A8: '브레이징 조인트 누유 발생 — LOT 26-0612, 기밀시험 불합격(규정 누설량 초과). 출하 전 전수검사에서 3건 검출됨.', // 부적합사항
  F13: 'B-2100 시정조치 규정, 작업표준서 WI-BRZ-03, 기밀시험 기준서',                    // 관련규격/문서
  AA12: '2026-07-05',                                                               // 회신요구일
  AA13: '김품질',                                                                    // 피감사자
  AA14: '이심사',                                                                    // 감사자
}

async function main() {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(SRC)
  const ws = wb.worksheets.find(w => /B2100-01/.test(w.name))
  if (!ws) { console.log('!! B2100-01 시트 없음'); process.exit(1) }

  // 주입 전 보존 기준 측정
  const mediaBefore = (wb.media || []).length
  let mergesBefore = 0
  wb.eachSheet(s => { mergesBefore += (s.model?.merges || []).length })

  // 값 주입 (value만 교체 → 셀 스타일/폰트/정렬은 원본 유지)
  for (const [addr, val] of Object.entries(demo)) {
    ws.getCell(addr).value = val
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  await wb.xlsx.writeFile(OUT)
  console.log('✅ 작성본 생성:', OUT)
  console.log('   크기:', fs.statSync(OUT).size.toLocaleString(), 'bytes')

  // === 자동 재검증: 작성본을 다시 열어 값·보존 확인 ===
  const v = new ExcelJS.Workbook()
  await v.xlsx.readFile(OUT)
  const vws = v.worksheets.find(w => /B2100-01/.test(w.name))

  console.log('\n=== 주입값 재확인 (작성본을 다시 읽음) ===')
  let okVals = 0
  for (const [addr, val] of Object.entries(demo)) {
    let got = vws.getCell(addr).value
    if (got && typeof got === 'object' && got.richText) got = got.richText.map(t => t.text).join('')
    const ok = String(got ?? '').trim() === String(val).trim()
    if (ok) okVals++
    console.log(`  ${ok ? 'OK ' : '✗  '}${addr} = ${String(got ?? '').slice(0, 40)}`)
  }

  let mediaAfter = (v.media || []).length
  let mergesAfter = 0
  v.eachSheet(s => { mergesAfter += (s.model?.merges || []).length })

  console.log('\n=== 보존 재확인 ===')
  console.log(`  주입값 일치:   ${okVals}/${Object.keys(demo).length} ${okVals === Object.keys(demo).length ? 'OK' : '✗'}`)
  console.log(`  미디어(이미지): ${mediaBefore} → ${mediaAfter} ${mediaBefore === mediaAfter ? 'OK' : '✗ 손실!'}`)
  console.log(`  병합셀 합계:   ${mergesBefore} → ${mergesAfter} ${mergesBefore === mergesAfter ? 'OK' : '✗'}`)
  console.log('\n>> 파일을 엑셀로 열어 육안 확인:', OUT)
}

main().catch(e => { console.error('ERR', e); process.exit(1) })
