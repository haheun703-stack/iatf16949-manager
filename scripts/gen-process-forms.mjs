// 0.6 기준 process_forms 재생성 SQL 생성기 (form→reg→process 합성)
// 실행: node scripts/gen-process-forms.mjs  → _demo_output/0026_remap_process_forms.sql + 변경요약
import fs from 'node:fs'

import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 프로젝트 루트 = scripts/ 의 두 단계 위 — 드라이브 문자(D/E/H) 무관
const PROJECT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const CSV06 = path.join(PROJECT, 'iatf16949-manager', '_demo_output', '매트릭스_0.6프로세스 매트릭스_부서_.csv')
const SQL   = path.join(PROJECT, 'iatf16949-manager', 'resources', 'migrations', '0014_seed_all_forms.sql')
const OUT   = path.join(PROJECT, 'iatf16949-manager', '_demo_output', '0026_remap_process_forms.sql')

function parseCSV(text){
  const rows=[]; let row=[]; let cur=''; let q=false
  for(let i=0;i<text.length;i++){ const c=text[i]
    if(q){ if(c==='"'){ if(text[i+1]==='"'){cur+='"';i++} else q=false } else cur+=c }
    else { if(c==='"')q=true
      else if(c===','){ row.push(cur); cur='' }
      else if(c==='\r'){}
      else if(c==='\n'){ row.push(cur); rows.push(row); row=[]; cur='' }
      else cur+=c } }
  if(cur!==''||row.length){ row.push(cur); rows.push(row) }
  return rows
}
const PROCS = {'영업관리':'CP-01','개발':'CP-02','생산관리':'CP-03','경영관리':'MP-01','리스크관리':'MP-02','인적자원관리':'MP-03','구매업무':'SP-01','검사및시험':'SP-02','지속적개선':'SP-03'}
const REG = /^[A-Z]-\d{4}$/
const BOUND = 25
const eq=(a,b)=>a.size===b.size&&[...a].every(x=>b.has(x))

// 1) 정본 0.6 → reg -> Set(process)
const rows = parseCSV(fs.readFileSync(CSV06,'utf8'))
const regToProc = {}
let lastL=null,lastR=null
for(const row of rows){
  for(let idx=0; idx<row.length; idx++){
    const raw=(row[idx]||'').trim(); const norm=raw.replace(/\s/g,''); const block=idx<BOUND?'L':'R'
    if(PROCS[norm]!==undefined){ if(block==='L')lastL=PROCS[norm]; else lastR=PROCS[norm] }
    else if(REG.test(raw)){ const p=block==='L'?lastL:lastR; if(p){ if(!regToProc[raw])regToProc[raw]=new Set(); regToProc[raw].add(p) } }
  }
}

// 2) forms code -> reg
const sql = fs.readFileSync(SQL,'utf8')
const cut = sql.indexOf('INSERT OR IGNORE INTO process_forms')
const formsBlock = sql.slice(0,cut), pfBlock = sql.slice(cut)
const forms = {}
const formRe = /\(\s*'([A-Z]\d{4}-\d+)'\s*,\s*'(?:[^']|'')*'\s*,\s*'([A-Z]-\d{4})'/g
let fm; while((fm=formRe.exec(formsBlock))){ forms[fm[1]]=fm[2] }

// 3) 현 process_forms
const curMap={}
const pfRe=/\('((?:CP|MP|SP)-\d+)',\s*'([A-Z]\d{4}-\d+)'/g
let pm; while((pm=pfRe.exec(pfBlock))){ if(!curMap[pm[2]])curMap[pm[2]]=new Set(); curMap[pm[2]].add(pm[1]) }

// 4) 신규 합성 form -> Set(process)
const newMap={}, unresolved=[]
for(const form in forms){
  const procs=regToProc[forms[form]]
  if(procs&&procs.size){ newMap[form]=new Set(procs) }
  else unresolved.push(form)
}

// 5) 변경 분석
let changed=0, same=0
const changes=[]
for(const form in newMap){
  const cur=curMap[form]||new Set(), nw=newMap[form]
  if(eq(cur,nw)) same++
  else { changed++; changes.push({form, reg:forms[form], from:[...cur].join('/')||'(없음)', to:[...nw].join('/')}) }
}

// 6) SQL 생성
const reassign=Object.keys(newMap).sort()
const pairs=[]
for(const form of reassign){ for(const p of [...newMap[form]].sort()) pairs.push(`  ('${p}','${form}',0)`) }
let out =`-- 0026_remap_process_forms.sql\n`
out+=`-- 정본 0.6 매트릭스(프로세스 매트릭스/부서) 기준으로 process_forms 재생성.\n`
out+=`-- form_code -> forms.reg_code -> 0.6의 프로세스 로 합성. 0.6에 매핑된 ${reassign.length}개 양식만 재배치.\n`
out+=`-- 0.6에 reg 없는 ${unresolved.length}개 양식은 기존 매핑 유지(건드리지 않음).\n`
out+=`-- migrate.ts가 각 마이그레이션을 db.transaction()으로 감싸므로 BEGIN/COMMIT 불필요.\n`
out+=`DELETE FROM process_forms WHERE form_code IN (\n  ${reassign.map(f=>`'${f}'`).join(',\n  ')}\n);\n`
out+=`INSERT OR IGNORE INTO process_forms (process_code, form_code, sort_order) VALUES\n${pairs.join(',\n')};\n`
// COMMIT 제거 — migrate.ts 트랜잭션이 커밋 담당
fs.writeFileSync(OUT,out,'utf8')

// 7) 요약
console.log('=== 0.6 기준 process_forms 재생성 (미리보기) ===')
console.log(`정본 0.6 규정수 ${Object.keys(regToProc).length} · forms ${Object.keys(forms).length}`)
console.log(`재배치 대상(0.6에 reg 존재): ${reassign.length} 양식  → 매핑쌍 ${pairs.length}건`)
console.log(`  변경됨 ${changed} · 그대로 ${same}`)
console.log(`미해결(0.6에 reg 없음, 기존 유지): ${unresolved.length} 양식`)
const unResRegs=[...new Set(unresolved.map(f=>forms[f]))].sort()
console.log(`  미해결 규정: ${unResRegs.join(', ')}`)
console.log(`\n=== 프로세스 이동 (앞 30건) ===`)
changes.sort((a,b)=>a.form<b.form?-1:1).slice(0,30).forEach(c=>console.log(`  ${c.form} [${c.reg}]  ${c.from} → ${c.to}`))
console.log(`\nSQL 출력: ${OUT}`)
