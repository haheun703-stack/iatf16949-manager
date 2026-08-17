/* eslint-disable */
// ============================================================
// scripts/smoke-grid-export.cjs — grid 전용 양식 export 일괄 스모크 (2026-07-28)
//
// 7/28 새벽 "grid 전용 8종 스모크 8/8"을 재실행 가능한 스크립트로 정식화.
// 검증 = export 무오류 · 파일 열림 · 앵커 행(데이터 시작행 첫 컬럼) 주입 · 시트명.
// 대상 폼의 grid 스펙을 DB에서 읽어 제네릭 레코드를 만들어 제출→export→재판독한다.
//
// 선행: 웹서버(:8080)가 검증 대상 DB로 떠 있을 것.
// 실행(electron-node — better-sqlite3 ABI):
//   IATF_DATA_DIR=<복사본> ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe \
//     scripts/smoke-grid-export.cjs <로그인이름> [비번] [폼코드들...]
//   폼코드 생략 시 기본 = grid 전용 8종(B2100-06~11 · J3100-03 · L1100-15)
// ============================================================
'use strict'
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const ExcelJS = require('exceljs')

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081' // 기본=검증(8081). 라이브(8080)는 명시 지정 시에만 — 오염 방지(검수 7/31 M-8)
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
const codes = process.argv.slice(4)
const TARGETS = codes.length
  ? codes
  : ['B2100-06', 'B2100-07', 'B2100-08', 'B2100-09', 'B2100-10', 'B2100-11', 'J3100-03', 'L1100-15']
if (!LOGIN) {
  console.error('사용법: ... smoke-grid-export.cjs <로그인이름> [비번] [폼코드들]')
  process.exit(1)
}

// C′(8/17 · 2차 검수 Minor 9) — env 가 없으면 **라이브 DB 를 그냥 열던** 폴백 제거.
// readonly 라 파괴적이진 않지만, 라이브 통계를 검증 산물로 오인한 8/13 사고와 같은 축이다.
// (.cjs 라 scripts/lib/e2e.mjs(ESM)를 못 쓴다 — 같은 계약을 인라인으로 둔다.)
if (!process.env.IATF_DATA_DIR) {
  console.error('[e2e-guard] IATF_DATA_DIR=<복사본폴더> 필수 — 라이브 폴백 금지(검증은 복사본으로)')
  process.exit(1)
}
const dir = path.resolve(process.env.IATF_DATA_DIR)
{
  const real = (p) => {
    try { return fs.realpathSync.native(p) } catch { return path.resolve(p) }
  }
  const home = process.env.USERPROFILE || require('os').homedir()
  const roots = [
    process.env.APPDATA && path.join(process.env.APPDATA, 'iatf16949-manager'),
    home && path.join(home, 'AppData', 'Roaming', 'iatf16949-manager')
  ].filter(Boolean)
  if (roots.length === 0) {
    console.error('[e2e-guard] 라이브 경로 판별 불능(APPDATA·USERPROFILE 미설정) — 중단(fail-closed)')
    process.exit(1)
  }
  for (const root of roots) {
    const rel = path.relative(real(root), real(dir))
    if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) {
      console.error(`[e2e-guard] 라이브 데이터 폴더 거부: ${dir} (실경로 ⊂ ${real(root)})`)
      process.exit(1)
    }
  }
}
const db = new Database(path.join(dir, 'iatf16949.db'), { readonly: true })
const OUT = path.join(__dirname, '..', 'captures')
fs.mkdirSync(OUT, { recursive: true })

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

;(async () => {
  const lr = await fetch(`${BASE}/api/auth:login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: LOGIN, password: PW })
  })
  if (!lr.ok) throw new Error('로그인 실패: ' + (await lr.text()))
  cookie = (lr.headers.get('set-cookie') || '').split(';')[0]

  let pass = 0
  for (const code of TARGETS) {
    try {
      const gridFields = db
        .prepare(`SELECT field_key FROM form_fields WHERE form_code=? AND type='grid' ORDER BY sort_order`)
        .all(code)
      if (!gridFields.length) throw new Error('grid 필드 없음')
      const values = {}
      const anchors = []
      for (const g of gridFields) {
        const spec = db
          .prepare(`SELECT data_start_row, stride FROM form_grid_spec WHERE form_code=? AND grid_key=?`)
          .get(code, g.field_key)
        const cols = db
          .prepare(
            `SELECT col_key, sheet_col, type FROM form_grid_columns WHERE form_code=? AND grid_key=? ORDER BY sort_order`
          )
          .all(code, g.field_key)
        if (!spec || !cols.length) throw new Error(`spec/columns 없음: ${g.field_key}`)
        const rec = {}
        for (const c of cols) rec[c.col_key] = c.type === 'date' ? '2026-07-28' : '스모크'
        values[g.field_key] = [rec]
        anchors.push(`${cols[0].sheet_col}${spec.data_start_row}`)
      }
      const created = await api('form:submissionCreate', { formCode: code, values, createdBy: LOGIN })
      const exp = await api('form:exportXlsx', { submissionId: created.id })
      if (!exp || exp.success === false || !exp.download) throw new Error('export 실패: ' + JSON.stringify(exp).slice(0, 150))
      const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
      if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
      const buf = Buffer.from(await dl.arrayBuffer())
      const file = path.join(OUT, `grid_smoke_${code}.xlsx`)
      fs.writeFileSync(file, buf)
      const wb = new ExcelJS.Workbook()
      await wb.xlsx.load(buf)
      const ws =
        wb.worksheets.find((w) => w.name.includes(code)) ??
        wb.worksheets.find((w) => w.name === '양식') ??
        wb.worksheets[0]
      const anchorVals = anchors.map((a) => {
        const v = ws.getCell(a).value
        return v == null ? '' : String(v.result ?? v)
      })
      const ok = anchorVals.every((v) => v !== '')
      console.log(
        `${ok ? '✓' : '✗'} ${code} [시트 "${ws.name}"] 앵커 ${anchors.map((a, i) => `${a}="${anchorVals[i]}"`).join(' ')}`
      )
      if (ok) pass++
    } catch (e) {
      console.log(`✗ ${code} 실패: ${e.message}`)
    }
  }
  console.log(`\n스모크: ${pass}/${TARGETS.length} 통과`)
  process.exit(pass === TARGETS.length ? 0 : 1)
})()
