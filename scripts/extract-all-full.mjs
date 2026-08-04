// 갭1① — IATF 전체자료 72 xlsx의 폼형 양식 전체에서 셀맵 대량추출 + 품질분포
// 폼형(병합 있고 대장/매트릭스 아닌 것)만 추출. 격자·대장은 스킵.
// 실행: node scripts/extract-all-full.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'
import path from 'node:path'

import { fileURLToPath } from 'node:url'

// 프로젝트 루트 = scripts/ 의 두 단계 위 — 드라이브 문자(D/E/H) 무관
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const ROOT = path.join(PROJECT, 'IATF 전체 자료모음_김권표이사_260501')
const OUT  = path.join(PROJECT, 'iatf16949-manager', '_demo_output', '전체_폼형_셀맵.csv')

function walk(dir){ let r=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){ const p=path.join(dir,e.name)
  if(e.isDirectory()) r=r.concat(walk(p)); else if(e.name.endsWith('.xlsx') && !e.name.startsWith('~$')) r.push(p) } return r }
function colNum(s){ let n=0; for(const c of s) n=n*26+(c.charCodeAt(0)-64); return n }
function parseAddr(a){ const m=a.match(/^([A-Z]+)(\d+)$/); return m?{col:colNum(m[1]),row:+m[2]}:null }
function cellText(ws,addr){ let v=ws.getCell(addr).value; if(v==null)return ''
  if(typeof v==='object'){ if(v.richText)v=v.richText.map(t=>t.text).join(''); else if(v.formula)v=v.result??''; else if(v.text)v=v.text; else v='' }
  return String(v).replace(/\s+/g,' ').trim() }
function guessType(l){ if(/일자|날짜|일$/.test(l))return 'date'; if(/사항|원인|대책|내용|결과/.test(l))return 'textarea'; return 'text' }
function slug(l){ return l.replace(/\s+/g,'').replace(/[^\w가-힣]/g,'') }
const NOT_LABEL=/^(담\s*당|팀\s*장|사업부장|부사장|대표이사|발\s*행\s*부\s*서|조치 요구서|조치 결과)$/
const isLabel=t=>t&&t.length<=20&&!/□/.test(t)&&!NOT_LABEL.test(t)

const files=walk(ROOT)
const allRows=[]
const stats={form:0, skipGrid:0, skipBig:0, formEmpty:0}
const perForm=[]
for(const f of files){
  let wb; try{ wb=new ExcelJS.Workbook(); await wb.xlsx.readFile(f) }catch{ continue }
  const reg=(path.basename(f).match(/^([A-Za-z]-?\d+)/)||[])[1]||''
  wb.eachSheet(ws=>{
    const fm=ws.name.match(/([A-Z]\d{4}-\d{2})/); if(!fm)return
    const formCode=fm[1]
    const merges=ws.model.merges||[]
    const rowsN=ws.rowCount||0
    if(merges.length===0){ stats.skipGrid++; return }
    if(rowsN>80 || merges.length>400){ stats.skipBig++; return }
    stats.form++
    const regions=merges.map(r=>{ const[a,b]=r.split(':'); return {master:a,tl:parseAddr(a),br:parseAddr(b),text:cellText(ws,a)} }).filter(r=>r.tl&&r.br)
    const labels=regions.filter(r=>isLabel(r.text))
    const blanks=regions.filter(r=>!r.text)
    let n=0
    for(const inp of blanks){
      let lab=labels.find(l=>l.tl.row===inp.tl.row && l.br.col===inp.tl.col-1)
      if(!lab) lab=labels.find(l=>l.tl.col===inp.tl.col && l.br.row===inp.tl.row-1)
      if(lab){ allRows.push({formCode,reg,sheet:ws.name,field:slug(lab.text),label:lab.text,cell:inp.master,type:guessType(lab.text)}); n++ }
    }
    if(n===0) stats.formEmpty++
    perForm.push({formCode,mappings:n})
  })
}
const header='form_code,reg,sheet,field_key,label,cell,type'
const lines=allRows.map(r=>`${r.formCode},${r.reg},"${r.sheet.replace(/"/g,'')}",${r.field},"${r.label.replace(/"/g,'')}",${r.cell},${r.type}`)
fs.writeFileSync(OUT,'﻿'+[header,...lines].join('\n'),'utf8')

console.log('=== 갭1① 폼형 셀맵 대량추출 ===')
console.log(`파일 ${files.length} · 폼형 ${stats.form} · 스킵(격자 ${stats.skipGrid} / 대장·매트릭스 ${stats.skipBig})`)
console.log(`총 셀맵 ${allRows.length}건 · 폼형당 평균 ${stats.form?(allRows.length/stats.form).toFixed(1):0}`)
console.log(`매핑 0 폼형(휴리스틱 실패): ${stats.formEmpty}/${stats.form} (${stats.form?Math.round(stats.formEmpty/stats.form*100):0}%)`)
const dist={'0':0,'1-4':0,'5-9':0,'10-19':0,'20+':0}
for(const p of perForm){ const n=p.mappings; if(n===0)dist['0']++; else if(n<5)dist['1-4']++; else if(n<10)dist['5-9']++; else if(n<20)dist['10-19']++; else dist['20+']++ }
console.log('폼형별 매핑수 분포:', JSON.stringify(dist))
console.log(`CSV → ${OUT}`)
