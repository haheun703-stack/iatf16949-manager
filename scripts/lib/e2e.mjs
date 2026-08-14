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

export const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8081'

function die(msg) {
  console.error(`[e2e-guard] ${msg}`)
  process.exit(1)
}

/** ① 라이브 DB 경로 거부 + 존재 확인. 반환 = 정규화된 복사본 DB 경로 */
export function assertCopyDb(dbPath = process.env.E2E_DB) {
  if (!dbPath) die('E2E_DB=<복사본.db> 필수 — 라이브 보호(기본 경로 폴백 금지)')
  const resolved = path.resolve(String(dbPath))
  if (process.env.APPDATA) {
    const liveRoot = path.resolve(path.join(process.env.APPDATA, 'iatf16949-manager'))
    if (resolved.toLowerCase().startsWith(liveRoot.toLowerCase())) {
      die(`라이브 DB 경로 거부: ${resolved} — 검증은 복사본(%TEMP%\\qms-e2e-*)으로`)
    }
  }
  if (!fs.existsSync(resolved)) die(`복사본 DB 없음: ${resolved}`)
  return resolved
}

/** BASE 가 라이브(:8080)를 가리키면 거부 — 검증 서버는 :8081 복사본 전용 */
export function assertBaseNotLive(base = BASE) {
  if (/:8080(\/|$)/.test(base)) die(`라이브(:8080) 대상 금지: ${base} — 검증은 :8081 복사본 서버로`)
  return base
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
  const h = await (await fetch(`${base}/api/health`, { headers: { cookie } })).json().catch(() => null)
  if (!h || h.copy !== true) {
    die(`복사본 서버 아님(health.copy=${h && h.copy}) — :8081 이 IATF_DATA_DIR 없이(라이브 DB로) 떠 있음. 즉시 중단.`)
  }
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
