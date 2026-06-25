// 갭2 정밀검증 — 명시 reg_code 기반 재비교 + 환산오차 측정 + 문제 프로세스 raw + 미매핑 양식
// 실행: node scripts/compare-gap2.mjs
import fs from 'node:fs'

const CSV06 = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager\\_demo_output\\매트릭스_0.6프로세스 매트릭스_부서_.csv'
const SQL   = 'D:\\IATF16949,SQ 자동작성 봇\\iatf16949-manager\\resources\\migrations\\0014_seed_all_forms.sql'

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

// 1) 정본 0.6 → procCode -> Set(reg)
const rows = parseCSV(fs.readFileSync(CSV06,'utf8'))
const stdReg = {}
let lastL=null, lastR=null
for(const row of rows){
  for(let idx=0; idx<row.length; idx++){
    const raw=(row[idx]||'').trim()
    const norm=raw.replace(/\s/g,'')
    const block = idx<BOUND ? 'L' : 'R'
    if(PROCS[norm]!==undefined){ if(block==='L') lastL=PROCS[norm]; else lastR=PROCS[norm] }
    else if(REG.test(raw)){ const p = block==='L'?lastL:lastR; if(p){ if(!stdReg[p])stdReg[p]=new Set(); stdReg[p].add(raw) } }
  }
}

// 2) forms 명시 파싱: code -> {reg, name}
const sql = fs.readFileSync(SQL,'utf8')
const cut = sql.indexOf('INSERT OR IGNORE INTO process_forms')
const formsBlock = sql.slice(0, cut)
const pfBlock = sql.slice(cut)
const forms = {}
const formRe = /\(\s*'([A-Z]\d{4}-\d+)'\s*,\s*'((?:[^']|'')*)'\s*,\s*'([A-Z]-\d{4})'/g
let fm
while((fm=formRe.exec(formsBlock))){ forms[fm[1]] = { name: fm[2].replace(/''/g,"'"), reg: fm[3] } }

// 3) process_forms
const pf = []
const pfRe = /\('((?:CP|MP|SP)-\d+)',\s*'([A-Z]\d{4}-\d+)'/g
let pm
while((pm=pfRe.exec(pfBlock))){ pf.push({proc:pm[1], form:pm[2]}) }

// 4) 환산 vs 명시 차이 측정
const mismatch = []
for(const code in forms){
  const conv = code.replace(/^([A-Z])(\d{4})-.*/,'$1-$2')
  if(conv !== forms[code].reg) mismatch.push(`${code}: 환산 ${conv} ≠ 명시 ${forms[code].reg}`)
}

// 5) 앱 reg per process (명시 reg)
const appReg = {}, appForms = {}
for(const {proc,form} of pf){
  const reg = forms[form] ? forms[form].reg : code2reg(form)
  if(!appReg[proc]) appReg[proc]=new Set(); appReg[proc].add(reg)
  if(!appForms[proc]) appForms[proc]=[]; appForms[proc].push(form)
}
function code2reg(c){ return c.replace(/^([A-Z])(\d{4})-.*/,'$1-$2') }

// 6) 비교
const order=['CP-01','CP-02','CP-03','SP-01','SP-02','SP-03','MP-01','MP-02','MP-03']
const name=Object.fromEntries(Object.entries(PROCS).map(([k,v])=>[v,k]))
console.log('=== 갭2 정밀검증: 명시 reg_code 기반 ===')
console.log(`forms 파싱 ${Object.keys(forms).length}개 · process_forms ${pf.length}건 · 환산≠명시 ${mismatch.length}건`)
if(mismatch.length) mismatch.slice(0,15).forEach(x=>console.log('   '+x))
console.log()
let tStd=0,tMatch=0,tMiss=0,tExtra=0
for(const p of order){
  const std=stdReg[p]||new Set(), app=appReg[p]||new Set()
  const miss=[...std].filter(x=>!app.has(x)).sort()
  const extra=[...app].filter(x=>!std.has(x)).sort()
  const both=[...std].filter(x=>app.has(x))
  tStd+=std.size; tMatch+=both.length; tMiss+=miss.length; tExtra+=extra.length
  console.log(`■ ${p} ${name[p]} | 정본 ${std.size} · 앱 ${app.size} · 일치 ${both.length}`)
  if(miss.length)  console.log(`   ⚠ 정본에만: ${miss.join(', ')}`)
  if(extra.length) console.log(`   + 앱에만:   ${extra.join(', ')}`)
}
console.log(`\n── 합계: 정본 ${tStd} · 일치 ${tMatch} (${Math.round(tMatch/tStd*100)}%) · 앱누락 ${tMiss} · 앱추가 ${tExtra}`)

// 7) 문제 프로세스 raw
for(const p of ['SP-02','CP-03','MP-01']){
  console.log(`\n--- ${p} ${name[p]} 앱 실제 매핑 양식 (raw) ---`)
  for(const f of (appForms[p]||[])) console.log(`  ${f}  [${forms[f]?forms[f].reg:'?'}]  ${forms[f]?forms[f].name:'(forms에 없음)'}`)
}

// 8) 미매핑 양식
const mapped = new Set(pf.map(x=>x.form))
const unmapped = Object.keys(forms).filter(c=>!mapped.has(c))
console.log(`\n── forms ${Object.keys(forms).length}개 중 process_forms 미매핑: ${unmapped.length}개`)
const byReg={}
for(const c of unmapped){ const r=forms[c].reg; (byReg[r]=byReg[r]||[]).push(c) }
console.log('   미매핑 규정별:', Object.entries(byReg).map(([r,a])=>`${r}(${a.length})`).join(' '))

// 9) 정본 규정 중 앱 forms에 양식 자체가 없는 것
const allStdRegs=[...new Set(Object.values(stdReg).flatMap(s=>[...s]))]
const formRegs=new Set(Object.values(forms).map(f=>f.reg))
const noForm=allStdRegs.filter(r=>!formRegs.has(r)).sort()
console.log(`\n── 정본 규정 ${allStdRegs.length}개 중 앱 forms에 양식 자체가 없는 규정: ${noForm.length}개`)
if(noForm.length) console.log('   '+noForm.join(', '))
