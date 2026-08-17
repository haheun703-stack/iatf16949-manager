// ============================================================
// scripts/e2e-cprime-gates.mjs — C′ 게이트 음성 실증 (2026-08-17)
//
// 8/14 전수 검수 2차 처분 C′(N-3·N-4·N-5·N-11 + Minor 8·9·12)의 핵심은
// "검증 자산이 라이브를 겨누지 못하게 한다"이다. 그런데 **게이트는 양성(통과)만으로는
// 검증되지 않는다** — 막아야 할 때 실제로 막는지(exit 1)를 봐야 한다.
// 이 하네스는 각 우회 시나리오를 **자식 프로세스로 실행해 종료 코드와 안내문**을 단언한다.
// (8/14 C군의 "음성 4종 exit 1" 방식을 상설 자산으로 승격 — 회귀에 편입한다.)
//
// 자신은 서버·DB 를 건드리지 않는다(자식만 띄운다) — 라이브 접촉 0.
// 사용: node(electron) scripts/e2e-cprime-gates.mjs [--copy <복사본폴더>]
// ============================================================
import { spawnSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const ELECTRON = join(ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')

const argv = process.argv.slice(2)
const getArg = (k, d) => {
  const i = argv.indexOf(k)
  return i >= 0 ? argv[i + 1] : d
}

const LIVE_DIR = process.env.APPDATA
  ? join(process.env.APPDATA, 'iatf16949-manager')
  : join(os.homedir(), 'AppData', 'Roaming', 'iatf16949-manager')
const COPY_DIR = getArg('--copy', process.env.IATF_DATA_DIR || '')

if (!COPY_DIR || !existsSync(join(COPY_DIR, 'iatf16949.db'))) {
  console.error('사용법: IATF_DATA_DIR=<복사본폴더> node(electron) scripts/e2e-cprime-gates.mjs')
  console.error('  (양성 대조 1건에 복사본이 필요합니다 — 음성 7건은 복사본 없이도 돌지만 함께 봅니다)')
  process.exit(1)
}

let pass = 0
let fail = 0
const check = (n, ok, d) => {
  console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`)
  ok ? pass++ : fail++
}

/** 자식 실행 — 부모 env 를 물려주되 지정 키는 덮고, 빈 문자열이면 삭제한다 */
function run(script, env = {}, args = []) {
  const childEnv = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
  for (const [k, v] of Object.entries(env)) {
    if (v === null) delete childEnv[k]
    else childEnv[k] = v
  }
  const r = spawnSync(ELECTRON, [join('scripts', script), ...args], {
    cwd: ROOT, env: childEnv, encoding: 'utf8', windowsHide: true
  })
  return { code: r.status, out: `${r.stdout || ''}${r.stderr || ''}` }
}

/** 음성 단언 — 반드시 exit≠0 이고 안내문이 기대대로여야 한다 */
function denies(name, script, env, pattern, args = []) {
  const { code, out } = run(script, env, args)
  const ok = code !== 0 && pattern.test(out)
  check(name, ok, `exit=${code}${ok ? '' : ' · out=' + out.trim().slice(0, 160).replace(/\s+/g, ' ')}`)
}

const COPY_DB = join(COPY_DIR, 'iatf16949.db')
const LIVE_DB = join(LIVE_DIR, 'iatf16949.db')
const baseEnv = { IATF_DATA_DIR: COPY_DIR, E2E_DB: COPY_DB, E2E_BASE: null }

console.log('── N-5 라이브 DB 식별(실경로·동일파일) ──')
denies('1 라이브 DB 경로 직접 지정 = 거부', 'e2e-w4b.mjs',
  { ...baseEnv, E2E_DB: LIVE_DB }, /라이브 DB 경로 거부/)

// 정션(mklink /J)으로 라이브를 다른 이름으로 가리켜도 실경로 비교로 잡힌다
const junction = join(os.tmpdir(), 'qms-gate-junction-260817')
spawnSync('cmd', ['/c', 'rmdir', junction], { windowsHide: true })
const mk = spawnSync('cmd', ['/c', 'mklink', '/J', junction, LIVE_DIR], { encoding: 'utf8', windowsHide: true })
if (mk.status === 0 && existsSync(join(junction, 'iatf16949.db'))) {
  denies('2 정션 우회(mklink /J) = 거부', 'e2e-w4b.mjs',
    { ...baseEnv, E2E_DB: join(junction, 'iatf16949.db') }, /라이브 DB/)
  spawnSync('cmd', ['/c', 'rmdir', junction], { windowsHide: true })
} else {
  check('2 정션 우회(mklink /J) = 거부', false, '정션 생성 실패 — 관리자 권한/보안정책 확인')
}

console.log('\n── Minor 9 BASE 사전 필터(URL 파싱) ──')
denies('3 :8080?x 우회 = 거부(종전 정규식이 놓치던 형태)', 'e2e-w4b.mjs',
  { ...baseEnv, E2E_BASE: 'http://127.0.0.1:8080?x' }, /라이브\(:8080\) 대상 금지/)
denies('4 :8080#x 우회 = 거부', 'e2e-w4b.mjs',
  { ...baseEnv, E2E_BASE: 'http://127.0.0.1:8080#x' }, /라이브\(:8080\) 대상 금지/)
denies('5 루프백 외 호스트 = 거부', 'e2e-w4b.mjs',
  { ...baseEnv, E2E_BASE: 'http://192.168.0.10:8081' }, /루프백 외 대상 금지/)

console.log('\n── N-11 구세대 하네스(기본 :8080 · 실무자 이름) ──')
denies('6 구세대 batch1 이 라이브를 명시해도 = 거부', 'e2e-batch1.mjs',
  { ...baseEnv, E2E_BASE: 'http://127.0.0.1:8080' }, /라이브\(:8080\) 대상 금지/)
denies('7 구세대 batch1 실무자 이름 로그인 = 거부', 'e2e-batch1.mjs',
  baseEnv, /E2E봇.*만 허용/, ['서규하'])
denies('8 구세대 b4 라이브 명시 = 거부', 'e2e-b4.mjs',
  { ...baseEnv, E2E_BASE: 'http://127.0.0.1:8080' }, /라이브\(:8080\) 대상 금지/)

console.log('\n── Minor 9 smoke-grid-export(.cjs 인라인 계약) ──')
denies('9 env 없으면 라이브 폴백 = 거부(폴백 제거)', 'smoke-grid-export.cjs',
  { IATF_DATA_DIR: null, E2E_DB: null, E2E_BASE: null }, /IATF_DATA_DIR.*필수/, ['E2E봇'])
denies('10 라이브 폴더 명시 = 거부', 'smoke-grid-export.cjs',
  { IATF_DATA_DIR: LIVE_DIR, E2E_DB: null, E2E_BASE: null }, /라이브 데이터 폴더 거부/, ['E2E봇'])

console.log('\n── 양성 대조(게이트가 정상 경로까지 막지는 않는가) ──')
{
  const { code } = run('e2e-w4b.mjs', baseEnv)
  check('11 정상 env = 통과(exit 0)', code === 0, `exit=${code}`)
}

// ── Minor 12 — 스윕 설계의 전제 실증 + PID 기반 스윕 판정 (C′ 검수 회신 §3 합격 조건) ──
// 코워크가 "전제(콘솔 소멸해도 산다)에 반례가 있다"며 실증을 요구했다. 상설 단언으로 편입한다.
// `--skip-console` 로 건너뛸 수 있다(서버를 3회 띄우므로 ~90초).
if (!argv.includes('--skip-console')) {
  console.log('\n── Minor 12 스윕 전제 실증(서버 3회 기동 — 임시 포트) ──')
  const r = run('e2e-console-kill.mjs', { IATF_DATA_DIR: COPY_DIR, E2E_DB: null, E2E_BASE: null })
  const survivedA = /A 호스트 cmd 종료\(\/t 없음\)\s*→ 서버 생존/.test(r.out)
  const survivedB = /B 콘솔 창 X 닫기\s*→ 서버 생존/.test(r.out)
  const treeKills = /C 대조군 \/t 트리킬[^\n]*사망/.test(r.out)
  check('12 콘솔·호스트 종료 실증 전건 통과(유효성 전제 포함)', r.code === 0, `exit=${r.code}`)
  check('12-A 호스트 cmd 종료(/t 없음) = 서버 생존', survivedA)
  check('12-B 콘솔 창 소멸 = 서버 생존(코워크 반례 미재현)', survivedB)
  check('12-C 대조군 /t 트리킬 = 서버 사망(/t 가 위험했던 이유)', treeKills)
} else {
  console.log('\n── Minor 12 스윕 전제 실증 — 건너뜀(--skip-console) ──')
}

// PID 기반 스윕이 "살아 있는 서버의 런처 창"을 실제로 보호하는가(파괴 없이 WhatIf 로 판정)
{
  const r = spawnSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File',
    join(ROOT, 'scripts', 'sweep-orphan-consoles.ps1'), '-WhatIfOnly'], { encoding: 'utf8', windowsHide: true })
  const out = `${r.stdout || ''}${r.stderr || ''}`
  const noBlindSweep = !/WOULD SWEEP/.test(out) || /KEEP pid/.test(out)
  check('13 PID 기반 스윕 = 리스닝 서버의 런처 창 보호(WhatIf)', r.status === 0 && noBlindSweep,
    out.trim().split('\n').slice(-1)[0])
}

console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
process.exit(fail ? 1 : 0)
