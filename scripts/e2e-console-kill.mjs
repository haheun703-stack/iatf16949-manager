// ============================================================
// scripts/e2e-console-kill.mjs — 콘솔·호스트 종료 시 서버 생존 실증 (2026-08-17)
//
// C′ 검수 회신 §3(코워크) 합격 조건. 쟁점:
//   봇 전제 = "electron 은 콘솔에서 분리되므로 호스트 cmd 를 죽여도 서버는 산다"
//             → restart-qms-server.bat 스윕에서 /t 를 뺀 근거.
//   코워크 반례 = "8/13 사장님이 검은 창을 X 로 닫자 라이브가 죽었다."
//   ★코워크 지적의 핵심: **부모 프로세스 사망 ≠ 콘솔 소멸**. 8/16 관찰(:8081 electron 이
//     부모가 죽은 뒤에도 생존)은 전자일 뿐, 후자를 증명하지 못한다. 맞는 지적이다.
//
// 그래서 두 사건을 **분리해서** 실측한다(같은 기동 구조 · 임시 포트 · 격리 복사본):
//   A. taskkill /f /pid <호스트 cmd>      (= restart.bat 이 실제로 하는 일, /t 없음)
//   B. 콘솔 창에 WM_CLOSE                  (= 사람이 X 를 누르는 일)
//   C. taskkill /f /t /pid <호스트 cmd>    (= 종전 /t 동작 — 대조군)
// 각 경우에 서버(포트 리스너)가 살아남는지 health 로 판정한다.
//
// ⚠안전: 라이브(:8080)·검수(:8081) 무접촉. 임시 포트 + **고유 창 제목**만 쓰고,
//   종료는 전부 **PID 지정**이다(WINDOWTITLE 필터는 이 파일 어디에도 없다 — 라이브 창과
//   제목이 겹칠 여지 자체를 만들지 않는다). 종료 시 자기 산물 전량 정리.
// 사용: node scripts/e2e-console-kill.mjs [--port 8099] [--copy <복사본폴더>]
// ============================================================
import { spawnSync, spawn } from 'child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const argv = process.argv.slice(2)
const getArg = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}
const SRC_COPY = getArg('--copy', process.env.IATF_DATA_DIR || '')
const PORT0 = Number(getArg('--port', 8099))

if (!SRC_COPY || !existsSync(join(SRC_COPY, 'iatf16949.db'))) {
  console.error('사용법: IATF_DATA_DIR=<복사본폴더> node scripts/e2e-console-kill.mjs')
  process.exit(1)
}
if (PORT0 === 8080 || PORT0 === 8081) {
  console.error('[guard] 8080(라이브)·8081(검수) 포트 사용 금지 — 임시 포트를 쓰세요')
  process.exit(1)
}

let pass = 0
let fail = 0
const check = (n, ok, d) => {
  console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`)
  ok ? pass++ : fail++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const work = mkdtempSync(join(tmpdir(), 'qms-conskill-'))
const cleanupPaths = [work]
function cleanupAll() {
  for (const p of cleanupPaths) {
    try { rmSync(p, { recursive: true, force: true }) } catch { /* 잠금 잔여 */ }
  }
}
process.on('exit', cleanupAll)

/** 포트를 LISTEN 중인 PID (없으면 null) */
function listenerPid(port) {
  const r = spawnSync('cmd', ['/c', `netstat -ano | findstr LISTENING | findstr :${port} `], { encoding: 'utf8', windowsHide: true })
  const m = (r.stdout || '').trim().split(/\r?\n/)[0]
  if (!m) return null
  const cols = m.trim().split(/\s+/)
  const pid = Number(cols[cols.length - 1])
  return Number.isFinite(pid) ? pid : null
}
async function healthOk(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: AbortSignal.timeout(2500) })
    return r.ok
  } catch {
    return false
  }
}
/**
 * PID 로 프로세스 생존 확인.
 * ⚠2차 실증 무효 원인: `spawnSync('cmd', ['/c', 'tasklist /fi "PID eq N" /nh'])` 는 Node 가
 *   인자의 큰따옴표를 이스케이프해 cmd 가 필터를 못 읽는다 → 항상 "죽음"으로 읽혀
 *   대상 확보 단계에서 전 회차가 무효 처리됐다(같은 명령을 셸에 직접 치면 정상 출력).
 *   parentOf 와 동일하게 CIM 으로 통일한다.
 */
function alive(pid) {
  if (!pid) return false
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
    `if (Get-CimInstance Win32_Process -Filter "ProcessId=${pid}" -ErrorAction SilentlyContinue) { 'YES' } else { 'NO' }`],
    { encoding: 'utf8', windowsHide: true })
  return /YES/.test(r.stdout || '')
}

/**
 * restart.bat 과 **같은 중첩**으로 서버를 띄운다:
 *   start "<제목>" /min cmd /c "<inner.bat>"  →  inner.bat 이 electron 실행
 * 반환 = { title, port, dataDir, cmdPid, electronPid }
 */
async function startServer(tag, port) {
  const dataDir = join(work, `data-${tag}`)
  mkdirSync(dataDir, { recursive: true })
  copyFileSync(join(SRC_COPY, 'iatf16949.db'), join(dataDir, 'iatf16949.db'))

  const title = `QMS CONSOLE PROBE ${tag} 260817` // 라이브 창 제목과 절대 겹치지 않는 고유 제목
  const inner = join(work, `run-${tag}.bat`)
  writeFileSync(inner,
    '@echo off\r\n' +
    `title ${title}\r\n` +
    `cd /d "${ROOT}"\r\n` +
    'set ELECTRON_RUN_AS_NODE=1\r\n' +
    `set PORT=${port}\r\n` +
    `set IATF_DATA_DIR=${dataDir}\r\n` +
    `"node_modules\\electron\\dist\\electron.exe" "server\\index.cjs" >> "${join(work, `log-${tag}.txt`)}" 2>&1\r\n`,
    'utf8')

  // restart.bat 과 동일한 중첩을 **런처 bat 안에서** 만든다.
  // (Node 의 인자 이스케이프를 거치면 `start "제목" /min cmd /c ...` 의 따옴표가 깨진다 — 첫 시도 실패 원인)
  const launcher = join(work, `launch-${tag}.bat`)
  writeFileSync(launcher,
    '@echo off\r\n' +
    `start "${title}" /min cmd /c "${inner}"\r\n`, 'utf8')

  spawn('cmd', ['/c', launcher], { cwd: ROOT, windowsHide: false, detached: true, stdio: 'ignore' }).unref()

  for (let i = 0; i < 40; i++) {
    await sleep(500)
    if (await healthOk(port)) break
  }
  const electronPid = listenerPid(port)
  if (!electronPid) {
    const logPath = join(work, `log-${tag}.txt`)
    if (existsSync(logPath)) {
      console.log(`   [기동 로그 ${tag}] ${readFileSync(logPath, 'utf8').trim().split('\n').slice(-6).join(' | ')}`)
    } else {
      console.log(`   [기동 로그 ${tag}] 로그 파일 없음 — electron 이 시작조차 못 함(${inner})`)
    }
    return null
  }

  // 호스트 cmd = electron 의 부모(= `start` 가 만든 콘솔의 주인).
  // ⚠1차 실증 무효 원인: `wmic` 는 최신 Windows(11 26200)에서 제거돼 항상 빈 값을 냈고,
  //   그 결과 cmdPid=null → taskkill 이 아무것도 죽이지 않은 채 "생존"으로 읽혔다. CIM 으로 교체.
  const cmdPid = parentOf(electronPid)
  cleanupPaths.push(dataDir)
  return { title, port, dataDir, cmdPid, electronPid }
}

/** 부모 PID (CIM — wmic 대체) */
function parentOf(pid) {
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
    `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").ParentProcessId`],
    { encoding: 'utf8', windowsHide: true })
  const n = Number((r.stdout || '').trim())
  return Number.isFinite(n) && n > 0 ? n : null
}

function killPid(pid, tree = false) {
  spawnSync('cmd', ['/c', `taskkill /f ${tree ? '/t ' : ''}/pid ${pid}`], { encoding: 'utf8', windowsHide: true })
}

/**
 * 콘솔 창에 WM_CLOSE — 사람이 X 를 누르는 것과 동등.
 * ⚠1차 실증 무효 원인 2: FindWindow(제목)이 최소화된 콘솔을 못 찾아 'NOWINDOW' 였다
 *   (아무 것도 안 닫고 "생존"으로 읽힘). **PID 로 창 핸들을 직접** 얻는다.
 */
function closeConsoleWindow(cmdPid) {
  const ps = `
$ErrorActionPreference='Stop'
$sig = '[DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);'
$t = Add-Type -MemberDefinition $sig -Name W2 -Namespace P2 -PassThru
$p = Get-Process -Id ${cmdPid} -ErrorAction SilentlyContinue
if (-not $p) { Write-Output 'NOPROC'; exit }
$h = $p.MainWindowHandle
if ($h -eq [IntPtr]::Zero) { Write-Output 'NOHANDLE'; exit }
$null = $t::PostMessage($h, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output 'SENT'`
  const r = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { encoding: 'utf8', windowsHide: true })
  return `${(r.stdout || '').trim()}${(r.stderr || '').trim() ? ' / err:' + r.stderr.trim().slice(0, 60) : ''}`
}

console.log('── 쟁점: 호스트 cmd 종료 vs 콘솔 소멸 — 서버는 어느 쪽에 죽는가 ──\n')

/** 실증 전제: 죽일 대상이 실제로 잡혔는가. 못 잡으면 그 회차는 **무효**로 실패 처리한다. */
function targetOk(tag, s) {
  const ok = !!(s && s.cmdPid && alive(s.cmdPid))
  check(`${tag} 대상 확보(호스트 cmd PID 실재) — 실증 유효성 전제`, ok,
    s ? `cmd=${s.cmdPid}` : '기동 실패')
  return ok
}

// ── A. taskkill /f /pid <호스트 cmd> (= restart.bat 이 실제로 하는 일) ──
let survivedA = null
{
  const s = await startServer('A', PORT0)
  check('A 서버 기동(임시 포트)', !!s, s ? `port=${s.port} electron=${s.electronPid} cmd=${s.cmdPid}` : '기동 실패')
  if (s && targetOk('A', s)) {
    killPid(s.cmdPid, false)
    await sleep(2500)
    check('A 호스트 cmd 가 실제로 종료됨', !alive(s.cmdPid))
    survivedA = await healthOk(s.port)
    check('A ★호스트 cmd 를 /t 없이 죽였을 때 — 서버 생존?', true,
      survivedA ? '생존 → 봇 전제 성립(/t 제거가 서버를 죽이지 않음)'
        : '사망 → 봇 전제 반증(/t 제거만으로는 부족)')
    if (survivedA) killPid(s.electronPid, false)
    await sleep(500)
  }
}

// ── B. 콘솔 창 X 닫기(WM_CLOSE) — 코워크 반례의 재현 ──
let survivedB = null
{
  const s = await startServer('B', PORT0 + 1)
  check('B 서버 기동(임시 포트)', !!s, s ? `port=${s.port} electron=${s.electronPid} cmd=${s.cmdPid}` : '기동 실패')
  if (s && targetOk('B', s)) {
    const sent = closeConsoleWindow(s.cmdPid)
    check('B 콘솔 창 핸들 확보 + WM_CLOSE 전송 — 실증 유효성 전제', sent.startsWith('SENT'), sent)
    if (sent.startsWith('SENT')) {
      await sleep(3000)
      // ★유효성 전제: WM_CLOSE 를 "보냈다"만으로는 부족하다 — 콘솔이 **실제로 닫혔는지**
      //   (= 호스트 cmd 가 종료됐는지) 확인해야 "닫아도 살더라"가 성립한다.
      //   확인 없이 통과시키면 "창이 안 닫혀서 살아 있는 것"을 생존으로 오독한다.
      const consoleGone = !alive(s.cmdPid)
      check('B 콘솔이 실제로 닫힘(호스트 cmd 종료) — 실증 유효성 전제', consoleGone,
        consoleGone ? 'cmd 종료 확인' : '⚠cmd 가 아직 살아 있음 — 이 회차는 무효')
      if (consoleGone) {
        survivedB = await healthOk(s.port)
        check('B ★콘솔 창을 X 로 닫았을 때 — 서버 생존?', true,
          survivedB ? '생존 → 8/13 메모(창 닫기 ≠ 종료)와 일치'
            : '사망 → ★코워크 반례 성립(콘솔 소멸은 부모 사망과 다르다)')
      }
      killPid(s.electronPid, false)
    } else {
      killPid(s.electronPid, false)
    }
    await sleep(500)
  }
}

// ── C. taskkill /f /t (대조군 — 종전 동작) ──
{
  const s = await startServer('C', PORT0 + 2)
  check('C 서버 기동(임시 포트)', !!s, s ? `port=${s.port} electron=${s.electronPid} cmd=${s.cmdPid}` : '기동 실패')
  if (s && targetOk('C', s)) {
    killPid(s.cmdPid, true)
    await sleep(2500)
    const up = await healthOk(s.port)
    check('C 대조군 /t 트리킬 = 서버 사망(종전 동작 확인)', !up,
      up ? '생존(예상 밖 — 트리킬이 electron 에 닿지 않음)' : '사망 — /t 가 :8081 을 위협했던 이유')
    if (up) killPid(s.electronPid, false)
  }
}

console.log('\n── 판정 ──')
console.log(`  A 호스트 cmd 종료(/t 없음) → 서버 ${survivedA === null ? '미측정' : survivedA ? '생존' : '사망'}`)
console.log(`  B 콘솔 창 X 닫기          → 서버 ${survivedB === null ? '미측정' : survivedB ? '생존' : '사망'}`)
if (survivedA === true && survivedB === false) {
  console.log('  ⇒ 두 사건은 다르다. /t 제거는 "스윕이 서버를 죽이지 않게" 하는 데 유효하지만,')
  console.log('     사람이 창을 닫는 경로는 여전히 서버를 죽인다(운용 문구 유지 필요).')
} else if (survivedA === false) {
  console.log('  ⇒ ★봇 전제 반증. /t 제거만으로는 :8081 을 못 지킨다 — PID 기반 스윕이 필수.')
}

cleanupAll()
console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
console.log('※ A·B 의 생존 여부가 restart.bat 스윕 설계의 근거다(검수요청 §Minor12 참조).')
process.exit(fail ? 1 : 0)
