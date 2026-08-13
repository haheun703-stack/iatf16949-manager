// ============================================================
// scripts/m1-desktop-check.mjs — M-1 데스크톱 실물 확인의 기계 실측 (2026-08-13)
//
// 대상 = 재빌드 산출물 실물(dist/win-unpacked — Setup 1.0.0 의 내용물과 동일 바이너리).
// 절차 등가: 패키징된 앱을 실제 기동 → 렌더러 IPC(preload contextBridge 경유 = 실사용
// 저장 버튼과 같은 채널·같은 payload 형태)로 "사용자 미선택" 저장 시도 → 거부 문구 확인.
// 전부 거부 경로 = DB 쓰기 0. 스크린샷 = captures/ 에 실행 증거 저장.
// ⚠️앱은 라이브 userData(%APPDATA%\iatf16949-manager)를 연다 — 사장님 수동 M-1 과 동일
//   환경(마이그 pending 0 = 무변). 실행: node scripts/m1-desktop-check.mjs (시스템 node 가능)
// ============================================================
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const EXE = join(repo, 'dist', 'win-unpacked', 'IATF16949 품질경영시스템.exe')
const PORT = 9223
if (!existsSync(EXE)) { console.error(`산출물 없음: ${EXE} — npm run build:win 선행`); process.exit(1) }

let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const proc = spawn(EXE, [`--remote-debugging-port=${PORT}`], { stdio: 'ignore', detached: false })
const cleanup = () => { try { proc.kill() } catch { /* 이미 종료 */ } }
process.on('exit', cleanup)

// CDP 접속(패키지 앱 기동 대기 최대 30초)
let page = null
for (let i = 0; i < 60 && !page; i++) {
  await sleep(500)
  try {
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    page = targets.find((t) => t.type === 'page' && !/devtools/.test(t.url))
  } catch { /* 기동 중 */ }
}
check('0단 패키지 앱 기동 + CDP 창 발견', !!page, page && page.url.slice(0, 60))
if (!page) { console.log('\n결과: 실패'); process.exit(1) }

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
  if (r.result && r.result.exceptionDetails) throw new Error((r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text) + '')
  return r.result && r.result.result ? r.result.result.value : undefined
}
await send('Runtime.enable')
await send('Page.enable')

// 렌더러 마운트 + preload 브리지(window.api) 대기
let apiUp = false
for (let i = 0; i < 30 && !apiUp; i++) {
  await sleep(1000)
  try { apiUp = (await evalJs(`typeof window.api !== 'undefined' && !!window.api.channels`)) === true } catch { /* 로딩 중 */ }
}
check('1단 렌더러 마운트 + preload 브리지(window.api)', apiUp)

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const ITEM = '28236-2MAA0'

// 2단 — M-1 본문: 사용자 미선택(주체 필드 부재 = UI 미선택 시 renderer 가 보내는 형태)
//        저장 시도 → 거부. 실사용과 같은 renderer→preload→ipcMain→핸들러 전 사슬.
{
  const r = await evalJs(
    `window.api.invoke('semimes:workOrderUpsert', { itemCode: '${ITEM}', orderQty: 1 })`, true)
  check("2단 작업지시 저장(사용자 미선택) = 거부 '사용자를 선택하세요'",
    r && r.success === false && /사용자를 선택/.test(r.error ?? ''), r && r.error)
}
{
  const r = await evalJs(
    `window.api.invoke('semimes:prodRecordCreate', { recordDate: '${today}', itemCode: '${ITEM}', okQty: 1, ngQty: 0 })`, true)
  check('2단 생산실적 저장(사용자 미선택) = 거부(작업자 이름 없음)',
    r && r.success === false && /작업자 이름|기록주체/.test(r.error ?? ''), r && r.error)
}

// 3단 — 실행 증거 스크린샷(captures/)
{
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const dir = join(repo, 'captures')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'M1_desktop_reject_260813.png')
  if (shot.result && shot.result.data) {
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'))
    check('3단 실행 증거 스크린샷 저장', true, file)
  } else {
    check('3단 실행 증거 스크린샷 저장', false, JSON.stringify(shot).slice(0, 80))
  }
}

ws.close()
cleanup()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
