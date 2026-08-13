// ============================================================
// scripts/e2e-tvboard-poll.mjs — 전광판 렌더러 폴링 계수 프로브 (2026-08-13)
//
// 근거 = 35호 검수 회신 §2(코워크): tvBoard 폴링이 60초 계약 대신 초당 100건+ 재발사
// (useSeqGuard 매 렌더 새 객체 → load 재생성 → useEffect 재발사 루프). HTTP 축 E2E 는
// 렌더러 폴링 루프를 경유하지 않아 못 잡았다 — 이 프로브가 그 구멍을 메운다:
// **헤드리스 Chrome 으로 :8081 프로덕션 번들을 실제 마운트해, 창(기본 70초) 안의
// semimes:tvBoard 호출 수를 단언한다** — 코워크 재검(네트워크 계수)과 같은 축.
//
// ⚠️웹 모드 전용: 데스크톱 preload(contextBridge)는 window.api 동결이라 계수 래핑 불가
//   (dev-CDP 1차 시도가 0건 무음 실패 — 8/13 실증). 웹 polyfill 은 일반 객체라 래핑이 든다.
// 전제: :8081 검수 서버 가동(오늘자 복사본) + Chrome 설치.
// 사용: node scripts/e2e-tvboard-poll.mjs [--sec 70] [--base http://127.0.0.1:8081]
//       [--login 서규하] [--pw 2222] [--port 9223]
// 합격 = 창 내 호출 1~⌊sec/60⌋+2건(마운트 1 + 60초 틱 ± 경계) · invoke-storm 0건 ·
//        복귀 후 5초 0건. (폭주 재현 시 ~sec×100건 — 자릿수로 갈린다.)
// ============================================================
import { spawn } from 'child_process'
import { existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const args = process.argv.slice(2)
const getArg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const SEC = Number(getArg('--sec', 70))
const BASE = getArg('--base', 'http://127.0.0.1:8081')
const LOGIN = getArg('--login', '서규하')
const PW = getArg('--pw', '2222')
const PORT = Number(getArg('--port', 9223))

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
]
const chrome = getArg('--chrome', CHROME_CANDIDATES.find((p) => existsSync(p)))
if (!chrome) { console.error('Chrome 미발견 — --chrome <경로> 지정'); process.exit(1) }

let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ── 헤드리스 크롬 기동(격리 프로필 — 세션·쿠키 오염 0) ──
const profile = mkdtempSync(join(tmpdir(), 'qms-tvpoll-'))
const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-extensions', 'about:blank'
], { stdio: 'ignore' })
const cleanup = () => { try { proc.kill() } catch { /* 이미 종료 */ } try { rmSync(profile, { recursive: true, force: true }) } catch { /* 잠금 잔여 무시 */ } }
process.on('exit', cleanup)

// CDP 접속(기동 대기 최대 15초)
let page = null
for (let i = 0; i < 30 && !page; i++) {
  await sleep(500)
  try {
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    page = targets.find((t) => t.type === 'page')
  } catch { /* 기동 중 */ }
}
if (!page) { console.error('CDP 페이지 없음 — 크롬 기동 실패'); process.exit(1) }

const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })
let msgId = 0
const pending = new Map()
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
}
const send = (method, params) => new Promise((res) => {
  const id = ++msgId
  pending.set(id, res)
  ws.send(JSON.stringify({ id, method, params }))
})
const evalJs = async (expression, awaitPromise = false) => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })
  if (r.result && r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.text + ' :: ' + expression.slice(0, 80))
  return r.result && r.result.result ? r.result.result.value : undefined
}
await send('Runtime.enable')
await send('Page.enable')

// 0단 — 로그인(쿠키 세션) → 앱 진입 → TopBar 확인
await send('Page.navigate', { url: `${BASE}/` })
await sleep(2500)
const loginOk = await evalJs(`fetch('/api/auth:login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '${LOGIN}', password: '${PW}' }) }).then((r) => r.ok)`, true)
check('0단 로그인(웹 세션)', loginOk === true)
await send('Page.navigate', { url: `${BASE}/` })
let appUp = false
for (let i = 0; i < 30 && !appUp; i++) {
  await sleep(1000)
  appUp = (await evalJs(`!!document.querySelector('[aria-label="TV현황판"]')`)) === true
}
check('0단 앱 마운트(TopBar TV현황판 존재)', appUp)

// 1단 — 계수기 설치(웹 polyfill = 일반 객체 — 래핑 실효 단언) → 전광판 진입
const wrapped = await evalJs(`(() => {
  const api = window.api
  const orig = api.invoke.bind(api)
  window.__tvPollCount = 0
  api.invoke = (...a) => { if (String(a[0]) === 'semimes:tvBoard') window.__tvPollCount++; return orig(...a) }
  return api.invoke !== orig && typeof window.__tvPollCount === 'number'
})()`)
check('1단 계수기 설치(래핑 실효 — 동결 아님)', wrapped === true)
await evalJs(`document.querySelector('[aria-label="TV현황판"]').click()`)
await sleep(1500)
check('1단 전광판 마운트', (await evalJs(`!!document.querySelector('[data-testid="tv-board"]')`)) === true)

// 2단 — 창(SEC초) 계수: 60초 계약(마운트 1 + 틱 ⌊sec/60⌋ + 경계 1)
console.log(`   ${SEC}초 창 계수 중...`)
await sleep(SEC * 1000)
const n = await evalJs(`window.__tvPollCount`)
const expectMax = Math.floor(SEC / 60) + 2
check(`2단 ${SEC}초 창 tvBoard 호출 = 60초 계약(1~${expectMax}건)`, typeof n === 'number' && n >= 1 && n <= expectMax, `${n}건`)

// 3단 — perfWatch 계측 관통: invoke-storm 0건 + __invokeRate 도구 존재(웹 모드 실효)
const storms = await evalJs(`JSON.parse(localStorage.getItem('perfwatch.log.v1') || '[]').filter((e) => e.kind === 'invoke-storm').length`)
check('3단 invoke-storm 마크 0건', storms === 0, `${storms}건`)
check('3단 __invokeRate 재검 도구 노출', (await evalJs(`typeof window.__invokeRate`)) === 'function')

// 4단 — ESC 복귀 → 폴링 정지(5초 0건)
await evalJs(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`)
await sleep(800)
check('4단 ESC 복귀(전광판 언마운트)', (await evalJs(`!!document.querySelector('[data-testid="tv-board"]')`)) === false)
const before = await evalJs(`window.__tvPollCount`)
await sleep(5000)
const after = await evalJs(`window.__tvPollCount`)
check('4단 복귀 후 폴링 정지(5초 0건)', after === before, `+${after - before}건`)

ws.close()
cleanup()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
