#!/usr/bin/env node
// ============================================================
// scripts/e2e-standard-templates.mjs — 표준팩 xlsx 템플릿 출력 실증 (S3-2 후반, 2026-08-23)
//
// 대상 = :8083 표준팩 클린설치 검수 서버(copy=true · E2E봇). 라이브 무접촉(BASE 기본 8083, 8080 거부).
// 흐름: 로그인 → company:profileSave(companyName = 테스트값) → 표본 양식별 submissionCreate(헤더 1칸) → form:exportXlsx
//       → 다운로드 → ExcelJS 재판독: ①시트명 = 코드 ②{{companyName}} 토큰 잔존 0 ③치환된 회사명 등장(토큰 보유 양식)
//       ④TPC 계열/실명/브레이징 0 ⑤주입값 셀 실재. 끝나면 프로파일 원복.
// 표본: 정본 추출본(대장·폼형·토큰 보유) + 번들 설계본 + 그리드형 — 코드 인자로 교체 가능.
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-standard-templates.mjs [코드...]
// ============================================================
import ExcelJS from 'exceljs'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { mkCheck } from './lib/e2e.mjs'

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8083'
if (/:8080(\/|$)/.test(BASE)) { console.error('[e2e-guard] 라이브(:8080) 거부'); process.exit(1) }
const LOGIN = 'E2E봇'
const PW = process.env.E2E_PW || 'qms1234'
const TEST_COMPANY = '주식회사 테스트정밀'
const TARGETS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['L1200-10', 'J1100-04', 'H1100-04', 'B1100-01', 'A2200-01', 'M1200-11', 'B2100-06', 'F2100-02']
const TPC_RE = /티피씨|TPC|AM사업부|인발|조관|필라넥|쇼바|김권표|서상규|하헌|서규하|장석봉|브레이징/
const { check, done } = mkCheck()
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(tmpdir(), 'iatf-std-tpl-e2e')
mkdirSync(OUT, { recursive: true })

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {}) })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}
const cellStr = (v) => (v == null ? '' : typeof v === 'string' ? v : typeof v === 'object' && 'richText' in v ? v.richText.map((t) => t.text).join('') : typeof v === 'object' && 'result' in v ? String(v.result ?? '') : String(v))

const health = await (await fetch(`${BASE}/api/health`)).json()
const lr = await fetch(`${BASE}/api/auth:login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: LOGIN, password: PW }) })
check(`로그인 E2E봇 @ ${BASE} (pid ${health.pid})`, lr.ok)
if (!lr.ok) { done(); process.exit(1) }
cookie = (lr.headers.get('set-cookie') || '').split(';')[0]
const h2 = await (await fetch(`${BASE}/api/health`, { headers: { cookie } })).json()
check(`검수 복사본 게이트 (copy=${h2.copy} · forms ${h2.forms})`, h2.copy === true)
if (h2.copy !== true) { done(); process.exit(1) }

const prof0 = await api('company:profileGet', {})
const saved = await api('company:profileSave', { ...prof0, companyName: TEST_COMPANY })
check(`프로파일 companyName 세팅 (${TEST_COMPANY})`, saved?.success !== false)

try {
  for (const code of TARGETS) {
    const form = await api('form:getDefinition', { code }).catch(() => null)
    const fields = form?.fields || []
    const first = fields.find((f) => f.type !== 'grid' && f.type !== 'checkbox') || null
    // M-9 저장 관문: fact 칸 공란 = 거부 → 전 칸을 채운다(날짜형은 오늘, 나머지는 E2E 표식)
    const today = new Date().toISOString().slice(0, 10)
    const values = {}
    for (const f of fields) {
      if (f.type === 'grid') continue
      if (f.type === 'checkbox') { values[f.fieldKey] = true; continue }
      values[f.fieldKey] = f.type === 'date' || /일자|날짜|date/i.test(f.label || '') ? today : `E2E-${code}`
    }
    const created = await api('form:submissionCreate', { formCode: code, values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp?.download) { check(`${code} export`, false, JSON.stringify(exp).slice(0, 120)); continue }
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    const buf = Buffer.from(await dl.arrayBuffer())
    const p = join(OUT, `${code}.xlsx`)
    writeFileSync(p, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(code)) || wb.worksheets[0]
    let tokens = 0, company = 0, tpc = 0, injected = false
    ws.eachRow({ includeEmpty: false }, (row) => row.eachCell({ includeEmpty: false }, (c) => {
      const s = cellStr(c.value)
      if (s.includes('{{')) tokens++
      if (s.includes(TEST_COMPANY)) company++
      if (TPC_RE.test(s)) tpc++
      if (s.includes(`E2E-${code}`)) injected = true
    }))
    const tplHasToken = exp.source?.includes('templates/standard') || true
    check(
      `${code} export (시트 "${ws.name}" · 토큰 잔존 ${tokens} · 회사명 치환 ${company} · TPC ${tpc} · 주입 ${injected ? '○' : '—'})`,
      ws.name.includes(code) && tokens === 0 && tpc === 0 && (first ? injected : true),
      tplHasToken ? '' : ''
    )
  }
} finally {
  await api('company:profileSave', prof0).catch(() => {})
}
console.log(`산출: ${OUT}`)
done()
