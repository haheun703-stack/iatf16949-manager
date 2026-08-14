// ============================================================
// scripts/m1-attach-check.mjs — M-1 확인(접속 전용) (2026-08-13)
//
// 사장님이 m1-launch.bat 으로 띄운 재빌드 앱(진단 포트 9223)에 **접속만** 해서
// 사용자 미선택 저장 2종의 거부를 실측한다(실행은 사람 손 — 이 스크립트는 프로브만).
// 전부 거부 경로 = DB 쓰기 0. 스크린샷 = captures/ 실행 증거. 앱 종료는 하지 않는다.
// 실행: node scripts/m1-attach-check.mjs  (앱이 떠 있을 때까지 최대 180초 대기)
// ============================================================
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 9223
let pass = 0, fail = 0
const check = (n, ok, d) => { console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`); ok ? pass++ : fail++ }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 접속 대기(사장님 더블클릭 타이밍 여유 — 최대 180초)
let page = null
for (let i = 0; i < 360 && !page; i++) {
  await sleep(500)
  try {
    const targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()
    page = targets.find((t) => t.type === 'page' && !/devtools/.test(t.url))
  } catch { /* 아직 안 뜸 */ }
}
check('0단 재빌드 앱 접속(진단 포트 9223)', !!page, page ? page.url.slice(0, 50) : '180초 내 미기동')
if (!page) { console.log('\n결과: 실패 — m1-launch.bat 으로 앱을 먼저 띄워 주세요'); process.exit(1) }

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

let apiUp = false
for (let i = 0; i < 30 && !apiUp; i++) {
  await sleep(1000)
  try { apiUp = (await evalJs(`typeof window.api !== 'undefined' && !!window.api.channels`)) === true } catch { /* 로딩 중 */ }
}
check('1단 렌더러 + preload 브리지(window.api)', apiUp)

const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10)
const ITEM = '28236-2MAA0'

// M-1 본문 — 사용자 미선택 payload(주체 필드 부재) 저장 시도 = 거부.
// 실사용 저장 버튼과 같은 renderer→preload→ipcMain→핸들러 전 사슬. 거부라 DB 쓰기 0.
{
  const r = await evalJs(`window.api.invoke('semimes:workOrderUpsert', { itemCode: '${ITEM}', orderQty: 1 })`, true)
  check("2단 작업지시 저장(미선택) = 거부 '사용자를 선택하세요'", r && r.success === false && /사용자를 선택/.test(r.error ?? ''), r && r.error)
}
{
  const r = await evalJs(`window.api.invoke('semimes:prodRecordCreate', { recordDate: '${today}', itemCode: '${ITEM}', okQty: 1, ngQty: 0 })`, true)
  check('2단 생산실적 저장(미선택) = 거부(작업자 이름 없음)', r && r.success === false && /작업자 이름|기록주체/.test(r.error ?? ''), r && r.error)
}

// 실행 증거 스크린샷 — S-1(8/13 검수): 고정 파일명이 기존 인용 증거(배치C 문서의
// M1_desktop_reject_260813.png)를 덮어쓰던 것 → 실행 시각 스탬프로 분리(증거 불변성)
{
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  const dir = join(repo, 'captures')
  mkdirSync(dir, { recursive: true })
  const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(2, 16).replace(/[-:]/g, '').replace('T', '_')
  const name = `M1_desktop_reject_${stamp}.png`
  const file = join(dir, name)
  if (shot.result && shot.result.data) {
    writeFileSync(file, Buffer.from(shot.result.data, 'base64'))
    check('3단 실행 증거 스크린샷 저장', true, `captures/${name}`)
  } else {
    check('3단 실행 증거 스크린샷 저장', false)
  }
}

ws.close()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과 (앱은 그대로 떠 있음 — 닫으셔도 됩니다)'}`)
process.exit(fail ? 1 : 0)
