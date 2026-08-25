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
import { mkdirSync, existsSync, readdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import zlib from 'node:zlib'
import { randomFillSync } from 'node:crypto'
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
/**
 * 유효한 PNG 를 만든다. noisy=true 면 픽셀을 무작위로 채워 압축이 먹지 않게 한다 —
 * **용량 초과 경로를 진짜로 검증**하기 위함(단색으로 크게 만들면 deflate 가 몇 KB 로 줄여
 * 2MB 관문에 닿지 못하고, 아무 바이트나 쓰면 형식 관문에 먼저 걸려 크기 검사가 안 돌아간다).
 */
function makePng(w, h, noisy = false) {
  const stride = w * 3 + 1
  const raw = Buffer.alloc(stride * h)
  if (noisy) {
    // 진짜 난수로 채운다 — 직접 만든 선형 난수는 JS 정수 정밀도를 넘겨 저엔트로피가 되고,
    // 그러면 deflate 가 30KB 로 줄여 버려 용량 관문에 닿지 못한다(실측).
    randomFillSync(raw)
    for (let y = 0; y < h; y++) raw[y * stride] = 0 // 행마다 필터 바이트는 0
  } else {
    let o = 0
    for (let y = 0; y < h; y++) {
      raw[o++] = 0 // 필터 바이트
      for (let x = 0; x < w; x++) {
        raw[o++] = 21
        raw[o++] = 94
        raw[o++] = 179
      }
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
// 리뷰 8/25: 라벨만 image/png 로 붙인 아무 바이트가 통과하면, 그 파일이 이후 모든 출력에 박혀
// 엑셀을 깨뜨린다. 실제 바이트로 판정하는지 본다.
const liar = await api('company:logoSet', {
  dataUrl: 'data:image/png;base64,' + Buffer.from('이건 그림이 아니라 그냥 글자입니다').toString('base64'),
  fileName: '가짜.png'
})
check(`② 라벨만 PNG 인 가짜 거부 ("${liar && liar.error}")`, liar && liar.success === false && !!liar.error)
// WEBP 는 출력 엔진이 담지 못하므로 업로드 단계에서 막아야 한다("올라갔는데 안 열림" 방지).
const webp = await api('company:logoSet', {
  dataUrl: 'data:image/webp;base64,' + Buffer.from('RIFF0000WEBPVP8 ').toString('base64'),
  fileName: 'x.webp'
})
check(`② WEBP 거부 ("${webp && webp.error}")`, webp && webp.success === false && !!webp.error)
// 용량 초과 — **형식 관문을 통과하는 진짜 PNG** 여야 크기 검사가 실제로 돌아간다.
const bigPng = makePng(900, 820, true)
check(`② (준비) 시험용 큰 PNG = ${(bigPng.length / 1024 / 1024).toFixed(2)}MB`, bigPng.length > 2 * 1024 * 1024)
const bad2 = await api('company:logoSet', {
  dataUrl: `data:image/png;base64,${bigPng.toString('base64')}`,
  fileName: 'big.png'
})
check(
  `② 2MB 초과 거부 + 크기 사유 ("${bad2 && bad2.error}")`,
  bad2 && bad2.success === false && /너무 큽니다/.test(bad2.error || '')
)

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

// ⑦ 권한 관문 — 로고는 한 번 올리면 이후 모든 출력에 박히는 회사 자산이라 manager+ 로 좁혀 두었다.
// 지금 로그인한 E2E봇이 manager 라 위 호출들이 통과한 것이고, 관문 자체가 사라지면
// member 도 올릴 수 있게 되므로 서버 소스에서 등재를 직접 확인한다(리뷰 8/25).
const serverSrc = readFileSync(join(process.cwd(), 'server', 'index.cjs'), 'utf-8')
const gated = (ch) => new RegExp(`'${ch}':\\s*\\[[^\\]]*'manager'`).test(serverSrc)
check('⑦ company:logoSet 이 PROTECTED(manager+) 에 등재', gated('company:logoSet'))
check('⑦ company:logoClear 이 PROTECTED(manager+) 에 등재', gated('company:logoClear'))

rmSync(OUT, { recursive: true, force: true })
done()
