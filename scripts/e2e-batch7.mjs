// ============================================================
// scripts/e2e-batch7.mjs — 7차 트랙(레거시 셀맵 교정) E2E (2026-07-30 사무실)
//
// 방식 = e2e-batch6.mjs 와 동일(웹서버·복사본 DB). 라이브 서버(:8080)와 병행을 위해
// BASE 를 env E2E_BASE 로 가변화(기본 8080 — 검증 복사본 서버는 8081 권장).
// 실행: E2E_BASE=http://127.0.0.1:8081 node scripts/e2e-batch7.mjs <로그인이름> [비번]
// 케이스는 교정 진행분만큼 누적한다. 1호 = K2100-06(0115).
// ============================================================
import ExcelJS from 'exceljs'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'captures')
mkdirSync(OUT, { recursive: true })

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080'
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN) { console.error('사용법: node scripts/e2e-batch7.mjs <로그인이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const CASES = [
  {
    // 0115 교정(260730): 기준 grid(3행 병합 2블록) + 도식화 textarea + 작성자 AN2
    code: 'K2100-06',
    values: {
      rows: [
        { 순: '1', 시기: '입고 시', 장소: '자재 창고', 관리기준: '입고일자 순 적치 — 선입고분 전면 배치', 담당부서: '구매팀' },
        { 순: '2', 시기: '출고 시', 장소: '자재 창고', 관리기준: '식별표 입고일자 확인 후 선입고분부터 불출', 담당부서: '구매팀' }
      ],
      도식화: '입고(후열 적치) → 보관(입고일자 표기) → 출고(전열부터 불출)',
      작성자: LOGIN
    },
    expect: [['A16', '1'], ['C16', '입고 시'], ['I16', '자재 창고'], ['O16', '선입고분'], ['AQ16', '구매팀'],
      ['A19', '2'], ['C19', '출고 시'], ['O19', '불출'], ['C22', '전열부터'], ['AN2', LOGIN]]
  }
]

function cellText(v) {
  if (v == null) return ''
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('')
    if (v.result !== undefined) return String(v.result)
    if (v.text) return String(v.text)
    if (v instanceof Date) return v.toISOString()
    return JSON.stringify(v)
  }
  return String(v)
}

const loginRes = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
if (!loginRes.ok) { console.error('로그인 실패:', await loginRes.text()); process.exit(1) }
cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0]
console.log(`로그인: ${LOGIN} ✓ (${BASE})`)

let totalOk = 0, totalChecks = 0, passForms = 0
for (const c of CASES) {
  try {
    const created = await api('form:submissionCreate', { formCode: c.code, values: c.values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download) throw new Error(`export 실패: ${JSON.stringify(exp).slice(0, 200)}`)
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const outFile = join(OUT, `batch7_e2e_${c.code}.xlsx`)
    writeFileSync(outFile, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(c.code)) ?? wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    let ok = 0
    const bad = []
    for (const [addr, want] of c.expect) {
      const got = cellText(ws.getCell(addr).value)
      if (got.includes(want)) ok++
      else bad.push(`${addr}: 기대 "${want}" ↔ 실제 "${got.slice(0, 30)}"`)
    }
    totalOk += ok; totalChecks += c.expect.length
    if (bad.length === 0) passForms++
    const verify = exp.verify ? ` engine=${exp.verify.values} media:${exp.verify.mediaOk ? 'OK' : 'NG'} merges:${exp.verify.mergesOk ? 'OK' : 'NG'}` : ''
    console.log(`${bad.length === 0 ? '✓' : '✗'} ${c.code} [시트 "${ws.name}"] 셀 ${ok}/${c.expect.length}${verify} → ${outFile}`)
    if (exp.unmapped && exp.unmapped.length) console.log(`   unmapped: ${exp.unmapped.join(', ')}`)
    for (const b of bad) console.log(`   ✗ ${b}`)
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${passForms}/${CASES.length} 통과`)
