// 갭1 범위확정 — IATF 전체자료 72 xlsx의 모든 양식 시트를 구조로 유형 분류
// 유형: form(폼형) / grid(병합0 격자) / big(대장·매트릭스) / 분류
// 실행: node scripts/classify-forms.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

import { fileURLToPath } from 'node:url'

// 프로젝트 루트 = scripts/ 의 두 단계 위 — 드라이브 문자(D/E/H) 무관
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOT = path.join(PROJECT, 'IATF 전체 자료모음_김권표이사_260501')
const OUT  = path.join(PROJECT, 'iatf16949-manager', '_demo_output', '양식유형분류.csv')

function walk(dir){ let r=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name)
  if(e.isDirectory()) r=r.concat(walk(p)); else if(e.name.endsWith('.xlsx') && !e.name.startsWith('~$')) r.push(p) } return r }

const files = walk(ROOT)
const out = []
const counts = { form:0, grid:0, big:0 }
let done=0
for(const f of files){
  let wb
  try { wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(f) } catch { continue }
  const reg = (path.basename(f).match(/^([A-Za-z]-?\d+)/)||[])[1]||''
  wb.eachSheet(ws=>{
    const fm = ws.name.match(/([A-Z]\d{4}-\d{2})/)
    if(!fm) return
    const merges=(ws.model.merges||[]).length
    const rowsN=ws.rowCount||0
    let kind
    if(merges===0) kind='grid'
    else if(rowsN>80 || merges>400) kind='big'
    else kind='form'
    counts[kind]++
    out.push({form:fm[1], reg, kind, merges, rows:rowsN, sheet:ws.name.replace(/"/g,'')})
  })
  done++
}
const header='form_code,reg,kind,merges,rows,sheet'
const lines=out.map(r=>`${r.form},${r.reg},${r.kind},${r.merges},${r.rows},"${r.sheet}"`)
fs.writeFileSync(OUT,'﻿'+[header,...lines].join('\n'),'utf8')

console.log(`스캔 완료: ${done}/${files.length} 파일 · 양식시트 ${out.length}개`)
console.log('유형 집계:', JSON.stringify(counts))
console.log(`  form(폼형, 자동추출 가능): ${counts.form}`)
console.log(`  grid(격자표, 병합0): ${counts.grid}`)
console.log(`  big(대장·매트릭스): ${counts.big}`)
// 규정별 폼형 개수 상위
const byReg={}
for(const r of out){ if(r.kind==='form'){ byReg[r.reg]=(byReg[r.reg]||0)+1 } }
const top=Object.entries(byReg).sort((a,b)=>b[1]-a[1]).slice(0,12)
console.log('\n폼형 많은 규정 상위:', top.map(([r,n])=>`${r}(${n})`).join(' '))
console.log(`\nCSV → ${OUT}`)
