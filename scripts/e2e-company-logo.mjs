#!/usr/bin/env node
// ============================================================
// scripts/e2e-company-logo.mjs — 회사 로고 등록·출력 실증 (도장 2026-08-24)
//
// 대상 = :8083 표준팩 클린설치 검수 서버(copy=true · E2E봇). 라이브 무접촉(:8080 거부).
// 무엇을 증명하나:
//   ① 로고 미등록 상태에서 company:logoGet = null
//   ② 형식 위반(이미지 아님)·용량 초과(2MB 초과)는 **사유와 함께 거부**(무음 실패 금지, 35호)
//   ③ PNG 업로드 성공 → logoGet 이 dataUrl 반환 · 파일이 userData/branding 에 1개
//   ④ 표식 보유 양식 출력 = 이미지 1장 삽입 · 원본 비율 보존 · '{{companyLogo}}' 글자 잔존 0
//   ⑤ 표식 없는 양식 = 이미지 0(오삽입 없음)
//   ⑥ company:logoClear → 파일 삭제 · logoGet null · 출력 이미지 0 · 표식 잔존 0(빈칸)
//
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-company-logo.mjs
// ============================================================
import ExcelJS from 'exceljs'
import { mkdirSync, existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import zlib from 'node:zlib'
import { mkCheck } from './lib/e2e.mjs'

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8083'
if (/:8080(\/|$)/.test(BASE)) {
  console.error('[e2e-guard] 라이브(:8080) 거부')
  process.exit(1)
}
const LOGIN = 'E2E봇'
const PW = process.env.E2E_PW || 'qms1234'
// 표식 보유 양식 / 표식 없는 양식 — 생성 리포트 기준(238종 중 150종 보유). 인자로 교체 가능.
const WITH_LOGO = process.argv[2] || 'B1100-01'
const NO_LOGO = process.argv[3] || 'M1200-11'
const BRANDING = join(process.env.LOCALAPPDATA || tmpdir(), 'iatf-standard-review', 'branding')
const OUT = join(tmpdir(), 'iatf-logo-e2e')
const { check, done } = mkCheck()
mkdirSync(OUT, { recursive: true })

// ── 시험용 PNG 생성(외부 자산 0) — 240x80 = 3:1 ─────────────────────────────
function crc32(buf) {
  let c
  let crc = 0xffffffff
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    crc = c ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function makePng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h)
  let o = 0
  for (let y = 0; y < h; y++) {
    raw[o++] = 0 // 필터 바이트
    for (let x = 0; x < w; x++) {
      raw[o++] = 21
      raw[o++] = 94
      raw[o++] = 179
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4)
    len.writeUInt32BE(data.length)
    const td = Buffer.concat([Buffer.from(type, 'ascii'), data])
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(td))
    return Buffer.concat([len, td, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0))
  ])
}

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
const cellStr = (v) =>
  v == null
    ? ''
    : typeof v === 'string'
      ? v
      : typeof v === 'object' && 'richText' in v
        ? v.richText.map((t) => t.text).join('')
        : String(v)

/** 양식 하나를 출력받아 { 이미지수, 표식잔존, 가로세로비 } 를 돌려준다. */
async function exportAndInspect(code, tag) {
  const form = await api('form:getDefinition', { code }).catch(() => null)
  const fields = (form && form.fields) || []
  // M-9 저장 관문: fact 칸 공란 = 거부 → 전 칸을 채운다(기존 하네스와 동일 규약)
  const today = new Date().toISOString().slice(0, 10)
  const values = {}
  for (const f of fields) {
    if (f.type === 'grid') continue
    if (f.type === 'checkbox') {
      values[f.fieldKey] = true
      continue
    }
    values[f.fieldKey] = f.type === 'date' || /일자|날짜|date/i.test(f.label || '') ? today : `E2E-${code}`
  }
  const created = await api('form:submissionCreate', { formCode: code, values, createdBy: LOGIN })
  const exp = await api('form:exportXlsx', { submissionId: created.id })
  if (!exp || !exp.download) throw new Error(`${code} export 실패: ${JSON.stringify(exp).slice(0, 120)}`)
  const buf = Buffer.from(await (await fetch(`${BASE}${exp.download}`, { headers: { cookie } })).arrayBuffer())
  writeFileSync(join(OUT, `${tag}_${code}.xlsx`), buf)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buf)
  const ws = wb.worksheets.find((w) => w.name.includes(code)) || wb.worksheets[0]
  let imgs = []
  try {
    imgs = ws.getImages()
  } catch {
    imgs = []
  }
  let left = 0
  ws.eachRow({ includeEmpty: false }, (r) =>
    r.eachCell({ includeEmpty: false }, (c) => {
      if (/companyLogo/i.test(cellStr(c.value))) left++
    })
  )
  const ext = imgs[0] && imgs[0].range && imgs[0].range.ext
  return { n: imgs.length, left, ratio: ext ? ext.width / ext.height : null }
}

// ── 시작 ────────────────────────────────────────────────────────────────────
const health = await (await fetch(`${BASE}/api/health`)).json()
const lr = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
check(`로그인 E2E봇 @ ${BASE} (pid ${health.pid})`, lr.ok)
if (!lr.ok) {
  done()
  process.exit(1)
}
cookie = (lr.headers.get('set-cookie') || '').split(';')[0]
const h2 = await (await fetch(`${BASE}/api/health`, { headers: { cookie } })).json()
check(`검수 복사본 게이트 (copy=${h2.copy})`, h2.copy === true)
if (h2.copy !== true) {
  done()
  process.exit(1)
}

// 사전 정리 — 이전 시험 잔재 제거(재실행 가능성)
await api('company:logoClear', {}).catch(() => null)

// ① 미등록
const g0 = await api('company:logoGet', {})
check('① 미등록 상태 logoGet = null', g0 && g0.dataUrl === null)

// ② 거부 2종 — 사유를 반드시 돌려줘야 한다(무음 실패 금지)
const bad1 = await api('company:logoSet', { dataUrl: 'data:text/plain;base64,QUJD', fileName: 'x.txt' })
check(`② 이미지 아닌 형식 거부 + 사유 ("${bad1 && bad1.error}")`, bad1 && bad1.success === false && !!bad1.error)
const big = Buffer.alloc(2 * 1024 * 1024 + 1024, 1).toString('base64')
const bad2 = await api('company:logoSet', { dataUrl: `data:image/png;base64,${big}`, fileName: 'big.png' })
check(`② 2MB 초과 거부 + 사유 ("${bad2 && bad2.error}")`, bad2 && bad2.success === false && !!bad2.error)

// ③ 정상 업로드
const png = makePng(240, 80)
const ok = await api('company:logoSet', {
  dataUrl: `data:image/png;base64,${png.toString('base64')}`,
  fileName: '회사로고.png'
})
check('③ PNG 업로드 성공', ok && ok.success === true)
const files = existsSync(BRANDING) ? readdirSync(BRANDING).filter((n) => /^logo[.]/i.test(n)) : []
check(`③ branding 폴더에 로고 파일 1개 (${files.join(',')})`, files.length === 1)
const g1 = await api('company:logoGet', {})
check('③ logoGet 이 dataUrl 반환', !!(g1 && g1.dataUrl && g1.dataUrl.startsWith('data:image/png;base64,')))

// ④⑤ 출력 실증
const a = await exportAndInspect(WITH_LOGO, 'on')
check(`④ ${WITH_LOGO} 출력에 로고 1장 (이미지 ${a.n})`, a.n === 1)
check('④ 표식 글자 잔존 0', a.left === 0)
check(`④ 원본 비율 3:1 보존 (${a.ratio ? a.ratio.toFixed(2) : '-'})`, a.ratio !== null && Math.abs(a.ratio - 3) < 0.25)
const b = await exportAndInspect(NO_LOGO, 'on')
check(`⑤ ${NO_LOGO}(표식 없음) 오삽입 0 (이미지 ${b.n})`, b.n === 0)

// ⑥ 삭제 → 빈칸으로 돌아가야 한다
const cl = await api('company:logoClear', {})
check('⑥ logoClear 성공', cl && cl.success === true)
const files2 = existsSync(BRANDING) ? readdirSync(BRANDING).filter((n) => /^logo[.]/i.test(n)) : []
check('⑥ 로고 파일 삭제됨', files2.length === 0)
const g2 = await api('company:logoGet', {})
check('⑥ logoGet 다시 null', g2 && g2.dataUrl === null)
const c = await exportAndInspect(WITH_LOGO, 'off')
check('⑥ 삭제 후 출력 이미지 0 · 표식 잔존 0(빈칸)', c.n === 0 && c.left === 0)

rmSync(OUT, { recursive: true, force: true })
done()
