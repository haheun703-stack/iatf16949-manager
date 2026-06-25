// Step 0 진단 — B2100-01 원본 엑셀의 구조 파악 + open→save 라운드트립 보존 검사
// 실행: node scripts/probe-b2100.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SRC = 'D:\\IATF16949,SQ 자동작성 봇\\IATF 전체 자료모음_김권표이사_260501\\3.IATF16949 규정&지침 _230501\\B-2100 시정조치 규정 (25년8월18일_REV.6)_품질보증.xlsx'

function fmt(n) { return n.toLocaleString() }

async function main() {
  if (!fs.existsSync(SRC)) {
    console.log('!! 원본 파일 없음:', SRC)
    process.exit(1)
  }
  const srcStat = fs.statSync(SRC)
  console.log('원본 파일:', path.basename(SRC))
  console.log('원본 크기:', fmt(srcStat.size), 'bytes')

  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(SRC)

  const media = wb.media || []
  console.log('\n=== 워크북 전체 미디어(이미지) 개수:', media.length, '===')
  media.forEach((m, i) => console.log(`  media[${i}] type=${m.type} ext=${m.extension}`))

  console.log('\n=== 시트 목록 ===')
  wb.eachSheet((ws, id) => {
    const merges = ws.model?.merges || []
    let images = []
    try { images = ws.getImages() || [] } catch (e) { images = ['ERR:' + e.message] }
    console.log(`[${id}] "${ws.name}"  rows=${ws.rowCount} cols=${ws.columnCount} merges=${merges.length} images=${images.length}`)
  })

  // B2100-01 요구서 시트 정확히 타겟
  let target = null
  wb.eachSheet((ws) => {
    if (!target && /B2100-01/.test(ws.name)) target = ws
  })
  if (!target) {
    console.log('\n!! 2100 포함 시트 못 찾음. 시트명을 위 목록에서 직접 확인 필요.')
  } else {
    console.log(`\n=== 타겟 시트 상세: "${target.name}" ===`)
    const merges = target.model?.merges || []
    console.log('병합셀:', merges.length, '개')
    console.log(merges.slice(0, 40).join('  '))
    let images = []
    try { images = target.getImages() || [] } catch {}
    console.log('\n시트 이미지:', images.length, '개')
    images.forEach((img, i) => {
      const r = img.range
      console.log(`  img[${i}] tl=(${r.tl?.nativeCol},${r.tl?.nativeRow}) br=(${r.br?.nativeCol},${r.br?.nativeRow}) imageId=${img.imageId}`)
    })

    // 텍스트가 있는 셀 전부 덤프 (셀 매핑 정의용)
    console.log('\n=== 텍스트 있는 셀 (주소 → 값) ===')
    target.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell({ includeEmpty: false }, (cell, colNum) => {
        let v = cell.value
        if (v == null) return
        if (typeof v === 'object') {
          if (v.richText) v = v.richText.map(t => t.text).join('')
          else if (v.formula) v = '=' + v.formula
          else if (v.result != null) v = v.result
          else v = JSON.stringify(v)
        }
        const s = String(v).replace(/\s+/g, ' ').trim()
        if (s) console.log(`  ${cell.address}\t${s.slice(0, 60)}`)
      })
    })
  }

  // === Step 0: open → save 라운드트립 보존 검사 ===
  const OUT = path.join(os.tmpdir(), 'b2100_roundtrip.xlsx')
  await wb.xlsx.writeFile(OUT)
  const outStat = fs.statSync(OUT)

  // 재읽기 후 미디어/시트/병합 개수 비교
  const wb2 = new ExcelJS.Workbook()
  await wb2.xlsx.readFile(OUT)
  let sheets1 = 0, sheets2 = 0, merges1 = 0, merges2 = 0
  wb.eachSheet((ws) => { sheets1++; merges1 += (ws.model?.merges || []).length })
  wb2.eachSheet((ws) => { sheets2++; merges2 += (ws.model?.merges || []).length })

  console.log('\n========================================')
  console.log('Step 0 — 라운드트립(open→save→reopen) 보존 검사')
  console.log('========================================')
  console.log('저장 위치:', OUT)
  console.log(`파일 크기:   원본 ${fmt(srcStat.size)} → 재저장 ${fmt(outStat.size)} (${((outStat.size / srcStat.size) * 100).toFixed(1)}%)`)
  console.log(`시트 개수:   원본 ${sheets1} → 재저장 ${sheets2}  ${sheets1 === sheets2 ? 'OK' : '✗ 불일치'}`)
  console.log(`병합셀 합계: 원본 ${merges1} → 재저장 ${merges2}  ${merges1 === merges2 ? 'OK' : '✗ 불일치'}`)
  console.log(`미디어 개수: 원본 ${media.length} → 재저장 ${(wb2.media || []).length}  ${media.length === (wb2.media || []).length ? 'OK' : '✗ 손실!'}`)
  console.log('\n>> 위 OUT 경로를 엑셀로 열어 원본과 육안 비교하세요 (결재란/로고/레이아웃).')
}

main().catch(e => { console.error('ERR', e); process.exit(1) })
