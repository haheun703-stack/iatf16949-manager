// ============================================================
// scripts/lib/e2e.mjs — E2E 하네스 공용 안전 계층 (2026-08-14)
//
// 8/13 전수 검수 처분(C-2 · M-13 · M-17 · S-2): 방어가 "헤더 규약뿐"이던 것을 코드로 실장.
// 3중 게이트 — 모든 하네스는 이 모듈을 경유한다(신규 하네스 규약):
//   ① assertCopyDb()   : E2E_DB 가 라이브 경로(%APPDATA%\iatf16949-manager)면 즉시 거부
//                         — 쓰기 연결·무조건 DELETE 하네스가 라이브를 여는 사고 원천 차단
//   ② loginBot()       : 로그인 후 health.copy === true 확인 — :8081 이 IATF_DATA_DIR 없이
//                         (= 라이브 DB로) 떠 있으면 즉시 중단(M-13, w4a 에만 있던 게이트의 공용화)
//   ③ guardLoginName() : argv 로그인 계정은 'E2E봇'만 — 실무자 이름 STAMP 각인(8/13 오인
//                         사고 조건) 차단. executive 검증은 loginExec()(규칙 자체 정리 규약)만.
// 부가: BASE 가 :8080(라이브)면 거부 · KST 날짜식 공용(슬러지 5벌 복제 회수).
// ============================================================
import path from 'path'
import fs from 'fs'
import os from 'os'

export const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081'

function die(msg) {
  console.error(`[e2e-guard] ${msg}`)
  process.exit(1)
}

// ── N-5(8/14 검수 2차) — 경로 비교를 실경로·동일파일 축으로 ────────────────────
// 종전 assertCopyDb 는 **프리픽스 문자열 비교뿐**이라 두 갈래로 뚫렸다:
//   ⓐ 정션(`mklink /J`)·subst 드라이브로 라이브 폴더를 다른 경로명으로 가리키면 통과
//   ⓑ `APPDATA` 미설정 환경에선 라이브 거부가 **아예 수행되지 않음**(조용한 무방비)
// A′ 의 서버 측 N-6 과 같은 기법으로 통일한다 — realpath(native) + dev/ino 동일파일 비교,
// 그리고 **판별 불능이면 통과가 아니라 중단**(fail-closed · M-7 원칙).
function realPathOf(p) {
  try {
    return fs.realpathSync.native(p)
  } catch {
    return path.resolve(p) // 미존재·권한 등 — 정규화만 하고 문자열 비교로 진행
  }
}
function isSameFile(a, b) {
  if (realPathOf(a).toLowerCase() === realPathOf(b).toLowerCase()) return true
  try {
    const sa = fs.statSync(a)
    const sb = fs.statSync(b)
    return sa.ino !== 0 && sa.ino === sb.ino && sa.dev === sb.dev // 하드링크·잔여 우회
  } catch {
    return false
  }
}
/** child 가 parent 안인가 — 경계 단위 비교(`...-manager-copy` 오탐 방지) */
function withinDir(child, parent) {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}
/** 라이브 데이터 루트 후보 — APPDATA 가 없어도 표준 경로로 판정을 살린다(ⓑ) */
function liveRootCandidates() {
  const roots = []
  if (process.env.APPDATA) roots.push(path.join(process.env.APPDATA, 'iatf16949-manager'))
  const home = process.env.USERPROFILE || os.homedir()
  if (home) roots.push(path.join(home, 'AppData', 'Roaming', 'iatf16949-manager'))
  return [...new Set(roots.map((p) => path.resolve(p)))]
}

/** ① 라이브 DB 거부(실경로·동일파일) + 존재 확인. 반환 = 정규화된 복사본 DB 경로 */
export function assertCopyDb(dbPath = process.env.E2E_DB) {
  if (!dbPath) die('E2E_DB=<복사본.db> 필수 — 라이브 보호(기본 경로 폴백 금지)')
  const resolved = path.resolve(String(dbPath))
  if (!fs.existsSync(resolved)) die(`복사본 DB 없음: ${resolved}`)

  const roots = liveRootCandidates()
  if (roots.length === 0) {
    die('라이브 경로를 판별할 수 없습니다(APPDATA·USERPROFILE 모두 미설정) — 판별 불능 = 중단(fail-closed)')
  }
  const real = realPathOf(resolved)
  for (const root of roots) {
    const rootReal = realPathOf(root)
    if (withinDir(real, rootReal)) {
      die(`라이브 DB 경로 거부: ${resolved}\n        (실경로 ${real} ⊂ ${rootReal}) — 검증은 복사본(%TEMP%\\qms-e2e-*)으로`)
    }
    if (isSameFile(resolved, path.join(root, 'iatf16949.db'))) {
      die(`라이브 DB 거부(동일 파일): ${resolved} ≡ ${path.join(root, 'iatf16949.db')} — 정션·하드링크 우회`)
    }
  }
  return resolved
}

/**
 * BASE 사전 필터 — 라이브(:8080)·외부 호스트 거부.
 * Minor 9(8/14 검수 2차): 종전 정규식 `/:8080(\/|$)/` 은 `:8080?x`·`:8080#x` 를 놓쳤다.
 * URL 파싱으로 포트를 정확히 본다. 다만 **비표준 포트로 뜬 라이브는 포트만으로 알 수 없다** —
 * 복사본 여부의 정본은 `assertCopyServer()`(health.copy)이며, 여기는 값싼 1차 관문이다.
 */
export function assertBaseNotLive(base = BASE) {
  let u
  try {
    u = new URL(base)
  } catch {
    die(`E2E_BASE 형식 오류: ${base}`)
  }
  if (u.port === '8080') die(`라이브(:8080) 대상 금지: ${base} — 검증은 :8081 복사본 서버로`)
  const LOOPBACK = ['127.0.0.1', 'localhost', '::1', '[::1]']
  if (!LOOPBACK.includes(u.hostname)) {
    die(`루프백 외 대상 금지: ${base} — E2E 는 이 PC 의 복사본 서버(:8081)만 대상으로 한다`)
  }
  return base
}

/**
 * ★복사본 서버 하드 게이트 — 쓰기 이전에 반드시 통과해야 한다.
 * N-4(8/14 검수 2차): w4a 는 이 확인을 `check()` 로만 해서 **실패해도 계속 진행**,
 * 3단에서 조업달력 쓰기까지 갔다(나머지 9종은 하드 중단이었다). 공용 API 로 못 박는다.
 */
export async function assertCopyServer(base, cookie) {
  const h = await (await fetch(`${base}/api/health`, { headers: { cookie } })).json().catch(() => null)
  if (!h || h.copy !== true) {
    die(`복사본 서버 아님(health.copy=${h && h.copy}) — 대상 서버가 라이브 DB 로 떠 있습니다. 즉시 중단.`)
  }
  return h
}

/** ③ argv 로그인 계정 강제: 'E2E봇' 외 거부(빈 값 = E2E봇). 반환 = 확정 계정명 */
export function guardLoginName(argvName) {
  const name = (argvName || '').trim() || 'E2E봇'
  if (name !== 'E2E봇') {
    die(`E2E 로그인은 'E2E봇'만 허용 — '${name}' 거부(8/13 STAMP 오인 사고 방지). ` +
      `executive 검증은 loginExec() 사용(규칙 자체 정리 규약).`)
  }
  return name
}

async function rawLogin(base, name, pw) {
  const r = await fetch(`${base}/api/auth:login`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, password: pw })
  })
  if (!r.ok) die(`로그인 실패: ${name} (status ${r.status})`)
  return (r.headers.get('set-cookie') || '').split(';')[0]
}

/** ② E2E봇 로그인 + 복사본 서버 게이트(health.copy). 반환 = 세션 쿠키 */
export async function loginBot(base = BASE, pw = 'qms1234') {
  assertBaseNotLive(base)
  const cookie = await rawLogin(base, 'E2E봇', pw)
  await assertCopyServer(base, cookie)
  return cookie
}

/**
 * executive 검증 로그인(명시 API) — perm:save 등 executive 전용 계약 검증에만.
 * 규약: 이 세션으로 만든 규칙·행은 하네스 종료 전 전량 정리(실기록 STAMP 금지).
 */
export async function loginExec(base, execName, pw = 'qms1234') {
  assertBaseNotLive(base)
  if (!execName) die('loginExec: executive 계정명 필요(복사본 DB 에서 조회해 전달)')
  return rawLogin(base, execName, pw)
}

/**
 * ★복사본 프리플라이트 — 하네스의 자체 로그인 흐름을 건드리지 않고 대상 서버가 복사본인지
 * 먼저 못 박는다(E2E봇으로 1회 로그인해 health.copy 확인 후 세션 폐기).
 * N-11(8/14 검수 2차) 구세대 하네스 처분용: 그 7종은 자체 login/api 를 갖고 있어
 * loginBot 으로 갈아끼우려면 파일마다 흐름을 뜯어야 했다 — 한 줄로 같은 보장을 얻는다.
 */
export async function assertCopyPreflight(base = BASE, pw = 'qms1234') {
  assertBaseNotLive(base)
  const cookie = await rawLogin(base, 'E2E봇', pw)
  await assertCopyServer(base, cookie)
  await fetch(`${base}/api/auth:logout`, { method: 'POST', headers: { cookie } }).catch(() => {})
  return true
}

/** 일반 계정 로그인(음성 검증용 — member 403 단언 등 읽기·거부 경로 전용) */
export async function loginProbe(base, name, pw = 'qms1234') {
  assertBaseNotLive(base)
  return rawLogin(base, name, pw)
}

/** POST /api/{ch} 헬퍼 */
export function mkApi(base = BASE) {
  return async (cookie, ch, body) => {
    const r = await fetch(`${base}/api/${ch}`, {
      method: 'POST', headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify(body || {})
    })
    return { status: r.status, json: await r.json().catch(() => null) }
  }
}

/** 체크 카운터(✓/✗ 출력 + 종료 코드) */
export function mkCheck() {
  let pass = 0, fail = 0
  const check = (n, ok, d) => {
    console.log(`${ok ? '✓' : '✗'} ${n}${d ? ' — ' + d : ''}`)
    ok ? pass++ : fail++
  }
  const done = () => {
    console.log(`\n결과: ${pass}/${pass + fail}${fail ? ' — 실패 ' + fail : ' 전건 통과'}`)
    process.exit(fail ? 1 : 0)
  }
  return { check, done }
}

/** KST 오늘(YYYY-MM-DD). offsetDays 로 가감 — 하네스 5벌 복제(슬러지) 회수 */
export function ymdKST(offsetDays = 0) {
  return new Date(Date.now() + (9 * 3600 + offsetDays * 86400) * 1000).toISOString().slice(0, 10)
}
