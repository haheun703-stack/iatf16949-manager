// ============================================================
// scripts/e2e-bprime-ui.mjs — 8/14 검수 2차 처분 B′ 표적 프로브 (2026-08-16)
//
// B′ 는 **렌더러 한정** 배치라 HTTP 축 E2E(하네스 10종)로는 한 줄도 검증되지 않는다
// (8/13 tvBoard 폭주가 같은 사각에서 새어나간 선례 — e2e-tvboard-poll.mjs 참조).
// 그래서 두 축으로 나눈다:
//
//   1부 계약 대조(노드 · 서버 무접촉) — N-10 의 원천인 shared/screen-perm-pages 의
//      SERVER_ENFORCED_ACTS 가 server/index.cjs 의 SCREEN_GUARD 와 (화면 × 행위)까지
//      정확히 같은지 소스에서 파싱해 대조한다. 어긋나면 화면이 거짓말을 한다 = tripwire.
//   2부 렌더러 실측(헤드리스 Chrome ↔ :8081 프로덕션 번들) — N-7 로컬 role 우회 봉쇄와
//      N-2 표시 전용 전환을 실제 마운트된 화면에서 단언한다.
//
// ⚠안전: **복사본 서버에만 붙는다**(health.copy 하드 게이트) · **쓰기 채널 0회 호출** ·
//   거부 경로(403)만 관찰한다. 라이브(:8080) 는 어떤 단계에서도 건드리지 않는다.
// 사용: node scripts/e2e-bprime-ui.mjs [--base http://127.0.0.1:8081] [--port 9224]
//       [--bot E2E봇] [--pw qms1234]
// ============================================================
import { spawn } from 'child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

const args = process.argv.slice(2)
const getArg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const BASE = getArg('--base', 'http://127.0.0.1:8081')
const PORT = Number(getArg('--port', 9224))
const BOT = getArg('--bot', 'E2E봇')
const BOT_PW = getArg('--pw', 'qms1234')

let pass = 0
let fail = 0
const check = (n, ok, d) => {
  console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`)
  ok ? pass++ : fail++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ════════════════ 1부 — 계약 대조 (서버 무접촉) ════════════════
console.log('── 1부 계약 대조: SERVER_ENFORCED_ACTS ↔ server SCREEN_GUARD ──')

const shared = readFileSync(join(ROOT, 'src/shared/screen-perm-pages.ts'), 'utf8')
const serverSrc = readFileSync(join(ROOT, 'server/index.cjs'), 'utf8')

/** shared 의 SERVER_ENFORCED_ACTS 블록에서 page → acts 를 뽑는다(주석 무시) */
function parseSharedActs(src) {
  const start = src.indexOf('export const SERVER_ENFORCED_ACTS')
  if (start < 0) throw new Error('SERVER_ENFORCED_ACTS 블록 미발견')
  const body = src.slice(start, src.indexOf('\n}', start))
  const out = {}
  for (const m of body.matchAll(/^\s*'?([a-z-]+)'?:\s*\[([^\]]*)\]/gm)) {
    out[m[1]] = m[2]
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/g, ''))
      .filter(Boolean)
      .sort()
  }
  return out
}

/** server/index.cjs 의 SCREEN_GUARD 블록에서 page → acts 를 뽑는다(kind 분기 포함) */
function parseServerGuard(src) {
  const start = src.indexOf('const SCREEN_GUARD = {')
  if (start < 0) throw new Error('SCREEN_GUARD 블록 미발견')
  const body = src.slice(start, src.indexOf('\n}', start))
  const out = {}
  const add = (page, act) => {
    out[page] = out[page] || new Set()
    out[page].add(act)
  }
  // 단순형: 'channel': { page: 'x', act: 'y' }
  for (const m of body.matchAll(/page:\s*'([a-z-]+)',\s*act:\s*'(\w+)'/g)) add(m[1], m[2])
  // 함수형(recordCancel): page 가 삼항 — 결과 화면 전부 × 뒤따르는 act.
  // ⚠비교 피연산자(`body.kind === 'insp'`)는 화면 id 가 아니다 — 먼저 지우고 결과만 남긴다
  //   (첫 실행에서 'insp'·'receipt' 를 화면으로 오독해 프로브가 스스로 걸렸다).
  for (const m of body.matchAll(/page:\s*\(body\)\s*=>([\s\S]*?)act:\s*'(\w+)'/g)) {
    const act = m[2]
    const results = m[1].replace(/===\s*'[^']*'/g, '')
    for (const p of results.matchAll(/'([a-z-]+)'/g)) add(p[1], act)
  }
  const norm = {}
  for (const [k, v] of Object.entries(out)) norm[k] = [...v].sort()
  return norm
}

const sharedActs = parseSharedActs(shared)
const guardActs = parseServerGuard(serverSrc)

check('1-1 shared 맵 파싱', Object.keys(sharedActs).length > 0, `${Object.keys(sharedActs).length}화면`)
check('1-2 server SCREEN_GUARD 파싱', Object.keys(guardActs).length > 0, `${Object.keys(guardActs).length}화면`)

const onlyShared = Object.keys(sharedActs).filter((p) => !guardActs[p])
const onlyServer = Object.keys(guardActs).filter((p) => !sharedActs[p])
check('1-3 화면 집합 일치(shared ⊇⊆ server)', onlyShared.length === 0 && onlyServer.length === 0,
  onlyShared.length || onlyServer.length ? `shared 단독=[${onlyShared}] server 단독=[${onlyServer}]` : `${Object.keys(guardActs).length}화면 동일`)

const mismatched = Object.keys(guardActs).filter(
  (p) => (sharedActs[p] || []).join('·') !== guardActs[p].join('·')
)
check('1-4 화면별 행위 축 일치(N-10 정직 표기의 원천)', mismatched.length === 0,
  mismatched.length ? mismatched.map((p) => `${p}: shared[${sharedActs[p]}] ≠ server[${guardActs[p]}]`).join(' / ') : '전 화면 일치')

// 축 과장이 실제로 사라졌는지 — 검수 지적 4건을 낱개로 못 박는다
check('1-5 fmea = 엑셀만(쓰기·수정·삭제 아님)', (sharedActs.fmea || []).join() === 'excel', `[${sharedActs.fmea}]`)
check('1-6 item-master = 수정만', (sharedActs['item-master'] || []).join() === 'edit', `[${sharedActs['item-master']}]`)
check('1-7 partner-master = 수정만', (sharedActs['partner-master'] || []).join() === 'edit', `[${sharedActs['partner-master']}]`)
check('1-8 mat-receipts = 삭제만', (sharedActs['mat-receipts'] || []).join() === 'delete', `[${sharedActs['mat-receipts']}]`)

// Minor 7 — form-builder 는 화이트리스트에 있고(저장 가능) 트리에도 노출돼야 한다
const permPage = readFileSync(join(ROOT, 'src/renderer/src/presentation/components/screen-perm/ScreenPermPage.tsx'), 'utf8')
check('1-9 Minor7 form-builder 화이트리스트 등재', /'form-builder'/.test(shared))
check('1-10 Minor7 form-builder 트리 노출(메뉴 밖 묶음)', /_offmenu[\s\S]{0,240}form-builder/.test(permPage))

// ════════════════ 2부 — 렌더러 실측 (헤드리스 ↔ 복사본) ════════════════
console.log('\n── 2부 렌더러 실측: N-7 우회 봉쇄 · N-2 표시 전용 ──')

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe')
]
const chrome = getArg('--chrome', CHROME_CANDIDATES.find((p) => existsSync(p)))
if (!chrome) {
  console.error('Chrome 미발견 — --chrome <경로> 지정')
  process.exit(1)
}

const profile = mkdtempSync(join(tmpdir(), 'qms-bprime-'))
const proc = spawn(chrome, [
  '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--disable-extensions', 'about:blank'
], { stdio: 'ignore' })
const cleanup = () => {
  try { proc.kill() } catch { /* 이미 종료 */ }
  try { rmSync(profile, { recursive: true, force: true }) } catch { /* 잠금 잔여 무시 */ }
}
process.on('exit', cleanup)

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

const waitApp = async () => {
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    if ((await evalJs(`!!document.querySelector('[aria-label="TV현황판"]')`)) === true) return true
  }
  return false
}

// 0단 — 복사본 하드 게이트(라이브 오접속 차단) + 로그인
await send('Page.navigate', { url: `${BASE}/` })
await sleep(2000)
const loginOk = await evalJs(
  `fetch('/api/auth:login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'${BOT}',password:'${BOT_PW}'})}).then(r=>r.ok)`, true)
check(`0단 ${BOT} 로그인`, loginOk === true)
if (loginOk !== true) { ws.close(); cleanup(); console.log(`\n결과: ${pass}/${pass + fail} — 로그인 실패로 중단`); process.exit(1) }

const health = await evalJs(`fetch('/api/health').then(r=>r.json())`, true)
check('0단 ★복사본 게이트(health.copy === true)', health && health.copy === true,
  `copy=${health && health.copy} pid=${health && health.pid}`)
if (!health || health.copy !== true) {
  console.error('  ✗ 라이브(또는 판별 불능) 서버 — 프로브 중단(라이브 무접촉 원칙)')
  ws.close(); cleanup(); process.exit(1)
}

const me = await evalJs(`fetch('/api/auth:me').then(r=>r.json())`, true)
check('0단 세션 role = manager(비 executive 축)', me && me.role === 'manager', `role=${me && me.role}`)

await send('Page.navigate', { url: `${BASE}/` })
check('0단 앱 마운트', (await waitApp()) === true)

// 1단 — N-7: 세션이 manager 면 execOnly 메뉴가 안 보인다
const menuHidden = await evalJs(`!Array.from(document.querySelectorAll('button,a')).some(el => (el.textContent||'').includes('화면별 권한관리'))`)
check('1단 N-7 기준선: manager 세션 = 권한관리 메뉴 미표출', menuHidden === true)

// 2단 — ★N-7 핵심: 검수가 지적한 그 동선 그대로 재현한다 —
//   "웹에서 비 executive 가 **비번 없이 UserSwitcher 클릭 1회로 '경영진' 선택** → 매트릭스 열람".
//   ⚠ localStorage 직접 주입 + 새로고침은 재현이 안 된다: loadUsers 가 마운트 때 활성 사용자를
//     세션 id 로 되돌려 놓기 때문(첫 실행에서 이 방식으로 짰다가 프로브가 스스로 걸렸다).
//     그래서 **마운트 후 실제 스위처 UI 를 클릭**하는 경로로 바꿨다 = 보고된 공격 경로 그 자체.
const execUser = await evalJs(
  `fetch('/api/appUser:list',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
     .then(r=>r.json()).then(us => { const e = (us||[]).find(u => u.role === 'executive' && u.active); return e ? { id: e.id, name: e.name } : null })`, true)
check('2단 복사본에 executive 계정 존재(우회 재료)', !!(execUser && execUser.id), `id=${execUser && execUser.id}`)
if (execUser && execUser.id) {
  const opened = await evalJs(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => (x.getAttribute('title')||'').includes('사용자 전환'))
    if (!b) return false
    b.click(); return true
  })()`)
  await sleep(500)
  check('2단 UserSwitcher 팝오버 열림', opened === true)
  const clicked = await evalJs(`(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').includes(${JSON.stringify(execUser.name)}) && !(x.getAttribute('title')||'').includes('사용자 전환'))
    if (!b) return false
    b.click(); return true
  })()`)
  await sleep(900)
  check('2단 경영진으로 전환 클릭(비번 0회)', clicked === true, `대상=${execUser.name}`)
  const switched = await evalJs(`Number(localStorage.getItem('active_user_id')) === ${execUser.id}`)
  check('2단 ★우회 시도 성립: 활성 사용자 = 경영진으로 실제 전환됨', switched === true)
  const stillHidden = await evalJs(`!Array.from(document.querySelectorAll('button,a')).some(el => (el.textContent||'').includes('화면별 권한관리'))`)
  check('2단 ★N-7 우회 봉쇄: 경영진으로 전환해도 권한관리 메뉴 여전히 미표출', stillHidden === true)
  const stillMe = await evalJs(`fetch('/api/auth:me').then(r=>r.json())`, true)
  check('2단 세션 role 불변(manager) — 판정 근거가 로컬이 아닌 세션임을 확인', stillMe && stillMe.role === 'manager', `role=${stillMe && stillMe.role}`)
  // 사용자 관리 모달도 같은 세션 판정을 써야 한다(로컬만 보면 여기서 편집 UI 가 열린다)
  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.getAttribute('title')||'').includes('설정') || (x.getAttribute('aria-label')||'').includes('설정')); if (b) b.click() })()`)
  await sleep(500)
  await evalJs(`(() => { const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === '사용자 관리'); if (b) b.click() })()`)
  await sleep(800)
  const stillReadOnly = await evalJs(`document.body.innerText.includes('표시 전용')
    && !Array.from(document.querySelectorAll('input')).some(i => (i.getAttribute('placeholder')||'') === '새 사용자 이름')`)
  check('2단 ★N-7 우회 봉쇄: 전환 상태에서도 사용자 관리 = 표시 전용 유지', stillReadOnly === true)
  // 원상 복구(다음 단이 기준 상태에서 돌도록)
  await send('Page.navigate', { url: `${BASE}/` })
  await waitApp()
}

// 3단 — N-2: 사용자 관리 모달이 비 executive 에게 표시 전용으로 열린다
const opened = await evalJs(`(() => {
  const btns = Array.from(document.querySelectorAll('button'))
  const gear = btns.find(b => (b.getAttribute('title')||'').includes('설정') || (b.getAttribute('aria-label')||'').includes('설정'))
  if (gear) { gear.click(); return 'gear' }
  return 'none'
})()`)
await sleep(600)
const userBtnClicked = await evalJs(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent||'').trim() === '사용자 관리')
  if (!b) return false
  b.click(); return true
})()`)
await sleep(900)
check('3단 사용자 관리 모달 진입', userBtnClicked === true, `설정 진입=${opened}`)
if (userBtnClicked === true) {
  const banner = await evalJs(`document.body.innerText.includes('표시 전용') && document.body.innerText.includes('최종관리자')`)
  check('3단 ★N-2 ①② 표시 전용 배너 표출(최종관리자 전용 고지)', banner === true)
  const noAdd = await evalJs(`!Array.from(document.querySelectorAll('input')).some(i => (i.getAttribute('placeholder')||'') === '새 사용자 이름')`)
  check('3단 N-2 ② 신규 추가 UI 미표출(항상 403 날 입력칸 제거)', noAdd === true)
  const locked = await evalJs(`(() => {
    const sels = Array.from(document.querySelectorAll('select'))
    const btns = Array.from(document.querySelectorAll('button[title*="최종관리자 전용"]'))
    const names = Array.from(document.querySelectorAll('input[readonly]'))
    return { sel: sels.length, selDisabled: sels.filter(s => s.disabled).length, lockBtns: btns.length, ro: names.length }
  })()`)
  check('3단 N-2 ② 행 편집 잠금(select 전량 disabled)', locked && locked.sel > 0 && locked.sel === locked.selDisabled, JSON.stringify(locked))
  check('3단 N-2 ② 이름 input readOnly · 행 버튼 최종관리자 전용 표기', locked && locked.ro > 0 && locked.lockBtns > 0, JSON.stringify(locked))
}

// 4단 — N-2 ③④: 403 이 "서버 안내문"으로 화면에 닿는 형태인지(invokeErrText 입력 계약)
//   쓰기는 서버가 PROTECTED 로 막으므로 **핸들러 도달 0 = 실제 쓰기 0**. 거부 라벨만 관찰한다.
const denied = await evalJs(`window.api.invoke('appUser:upsert', { name: '__probe_never_saved__', role: 'member', active: true, sortOrder: 999 })
  .then(() => ({ name: 'NO_THROW' }))
  .catch(e => ({ name: e && e.name, msg: (e && e.message) || '' }))`, true)
check('4단 N-2 ③ 403 이 PermissionError 로 이름표를 달고 온다(invokeErrText 정본 경로)',
  denied && denied.name === 'PermissionError', `name=${denied && denied.name}`)
check('4단 N-2 ④ 안내문 = 서버 문구(‘이미 있는 이름’ 단정 아님)',
  denied && typeof denied.msg === 'string' && denied.msg.includes('권한') && !denied.msg.includes('이미 있는 이름'),
  `msg=${(denied && denied.msg || '').slice(0, 60)}`)

// 5단 — 쓰기 0 검산: 프로브가 만든 계정이 실제로 없어야 한다(거부 경로만 탔다는 증거)
const leaked = await evalJs(
  `fetch('/api/appUser:list',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
     .then(r=>r.json()).then(us => (us||[]).filter(u => u.name === '__probe_never_saved__').length)`, true)
check('5단 쓰기 0 검산(프로브 계정 미생성)', leaked === 0, `${leaked}건`)

ws.close()
cleanup()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
