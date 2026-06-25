// 갭1 — 워크북의 모든 양식 시트에서 셀맵 자동 추출 (extract-fieldmap 다중시트 일반화)
// 실행: node scripts/extract-all.mjs
import ExcelJS from 'exceljs'
import fs from 'node:fs'

const SRC = 'D:\\IATF16949,SQ 자동작성 봇\\IATF 전체 자료모음_김권표이사_260501\\3.IATF16949 규정&지침 _230501\\B-2100 시정조치 규정 (25년8월18일_REV.6)_품질보증.xlsx'
const OUT = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager\\_demo_output\\B2100_전체_셀맵.csv'

function colNum(s){ let n=0; for(const c of s) n=n*26+(c.charCodeAt(0)-64); return n }
function parseAddr(a){ const m=a.match(/^([A-Z]+)(\d+)$/); return m?{col:colNum(m[1]),row:+m[2]}:null }
function cellText(ws,addr){ let v=ws.getCell(addr).value; if(v==null)return ''
  if(typeof v==='object'){ if(v.richText)v=v.richText.map(t=>t.text).join(''); else if(v.formula)v=v.result??''; else if(v.text)v=v.text; else v='' }
  return String(v).replace(/\s+/g,' ').trim() }
function guessType(l){ if(/일자|날짜|일$/.test(l))return 'date'; if(/사항|원인|대책|내용|결과/.test(l))return 'textarea'; return 'text' }
function slug(l){ return l.replace(/\s+/g,'').replace(/[^\w가-힣]/g,'') }
const NOT_LABEL=/^(담\s*당|팀\s*장|사업부장|부사장|대표이사|발\s*행\s*부\s*서|조치 요구서|조치 결과)$/
const isLabel=t=>t&&t.length<=20&&!/□/.test(t)&&!NOT_LABEL.test(t)

const wb=new ExcelJS.Workbook()
await wb.xlsx.readFile(SRC)
const allRows=[], summary=[]
wb.eachSheet(ws=>{
  const fm=ws.name.match(/([A-Z]\d{4}-\d{2})/)   // 양식코드 들어간 시트만(양식 시트)
  if(!fm) { summary.push(`(skip) ${ws.name.slice(0,30)}`); return }
  const formCode=fm[1]
  const merges=ws.model.merges||[]
  const regions=merges.map(r=>{ const[a,b]=r.split(':'); return {master:a,tl:parseAddr(a),br:parseAddr(b),text:cellText(ws,a)} }).filter(r=>r.tl&&r.br)
  const labels=regions.filter(r=>isLabel(r.text))
  const blanks=regions.filter(r=>!r.text)
  let n=0
  for(const inp of blanks){
    let lab=labels.find(l=>l.tl.row===inp.tl.row && l.br.col===inp.tl.col-1)   // 왼쪽 인접
    if(!lab) lab=labels.find(l=>l.tl.col===inp.tl.col && l.br.row===inp.tl.row-1) // 위 인접
    if(lab){ allRows.push({formCode,sheet:ws.name,field:slug(lab.text),label:lab.text,cell:inp.master,type:guessType(lab.text)}); n++ }
  }
  summary.push(`${formCode} | 병합 ${merges.length} · 라벨 ${labels.length} · 빈칸 ${blanks.length} → 매핑 ${n}  (${ws.name.slice(0,24)})`)
})
const header='form_code,sheet,field_key,label,cell,type'
const lines=allRows.map(r=>`${r.formCode},"${r.sheet}",${r.field},"${r.label}",${r.cell},${r.type}`)
fs.writeFileSync(OUT,'﻿'+[header,...lines].join('\n'),'utf8')
console.log('=== B-2100 워크북 — 양식별 셀맵 자동추출 ===')
summary.forEach(s=>console.log('  '+s))
console.log(`\n총 ${allRows.length} 매핑 (양식 ${new Set(allRows.map(r=>r.formCode)).size}종) → ${OUT}`)
