#!/usr/bin/env node
// ============================================================
// scripts/e2e-dgroup.mjs — D군 승격분 E2E (2026-08-18)
//
// 검증 대상(38호 §4 · 도장 ⑤ 8/17 · code-review-2026-08-14 §3):
//   Minor 10 — 다운로드 토큰: crypto 난수 + 발급 세션(sid) 바인딩(타 로그인 선취 403) ·
//              1회 소진(404) 회귀 유지
//   M-6     — 권한 원천(app_users) 변경 시 대상 사용자 세션 즉시 무효화:
//              upsert 는 role/active "실변경"만(무해 편집은 로그아웃 없음) ·
//              delete/resetPassword 는 무조건
//   (Minor 11 busy_timeout = connection.ts 1줄 — 정적 Read 검증 · Minor 3 window.prompt
//    = 렌더러 축이라 본 하네스 범위 밖, 화면 프로브/육안)
// 대상 = 검증 웹서버(:8081 복사본). 잔여물 0 계약: role·비번 전량 원상(try/finally 아님 —
//   순서 자체가 원상 복귀 흐름. 비번은 동일값 재설정이라 원상 불변).
//   IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> ELECTRON_RUN_AS_NODE=1 \
//     node_modules\electron\dist\electron.exe scripts\e2e-dgroup.mjs [비번]
// ============================================================
import { createRequire } from 'module'
import { BASE, assertCopyDb, loginBot, loginExec, mkApi, mkCheck } from './lib/e2e.mjs'
const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const PW = process.argv[2] || 'qms1234'
if (!process.env.IATF_DATA_DIR) {
  console.error('사용법: IATF_DATA_DIR=<복사본폴더> E2E_DB=<복사본.db> ... [비번] (라이브 보호 — 필수)')
  process.exit(1)
}
const DB_PATH = assertCopyDb(process.env.E2E_DB)

const { check, done } = mkCheck()
const api = mkApi(BASE)
const meStatus = async (cookie) => (await fetch(`${BASE}/api/auth:me`, { headers: { cookie } })).status

const dbr = new Database(DB_PATH, { readonly: true })
const execName = dbr.prepare("SELECT name FROM app_users WHERE role='executive' AND active=1 LIMIT 1").get()?.name
const botRow = dbr.prepare("SELECT id, name, team_dept, role, active, sort_order FROM app_users WHERE name='E2E봇'").get()
const fmeaDoc = dbr.prepare('SELECT id FROM fmea_documents ORDER BY id LIMIT 1').get()
const usersBefore = dbr.prepare('SELECT COUNT(*) c FROM app_users').get().c
if (!execName || !botRow) {
  console.error('픽스처 계정 부족(executive/E2E봇) — seed-local-passwords.cjs 선행 필요')
  process.exit(1)
}
// upsert 페이로드 = 현재 행 그대로(변경 필드만 바꿔 보낸다 — 무관 필드 오염 방지)
const botPayload = (over = {}) => ({
  id: botRow.id,
  name: botRow.name,
  teamDept: botRow.team_dept,
  role: botRow.role,
  active: botRow.active === 1,
  sortOrder: botRow.sort_order ?? 0,
  ...over
})

// ── 0단 — 이중 세션(같은 E2E봇, 다른 sid): Minor 10 의 "로그인자 간" 등가 재현 ──
const A = await loginBot(BASE, PW)
const B = await loginBot(BASE, PW)
check('0단 이중 세션 준비(sid 상이·둘 다 유효)', !!A && !!B && A !== B && (await meStatus(A)) === 200 && (await meStatus(B)) === 200)

// ── 1단 — Minor 10: 토큰 = crypto + 발급 세션 소유 ──
if (!fmeaDoc) {
  console.log('… 1단 skip — 복사본에 fmea_documents 0건(다운로드 발급 불가를 명시)')
} else {
  const rdl = await api(A, 'fmea:exportXlsx', { docId: fmeaDoc.id })
  const okDl = rdl.status === 200 && rdl.json?.success !== false && typeof rdl.json?.download === 'string'
  check('1단 세션A 내보내기 = 다운로드 토큰 발급', okDl, okDl ? rdl.json.download : JSON.stringify(rdl.json)?.slice(0, 80))
  if (okDl) {
    const token = rdl.json.download.split('/').pop()
    check('1단 토큰 형식 = crypto 32hex(Math.random 형식 아님)', /^[0-9a-f]{32}$/.test(token), token)
    const rB = await fetch(`${BASE}${rdl.json.download}`, { headers: { cookie: B } })
    check('1단 타 세션(B) 수령 = 403(선취 차단)', rB.status === 403, `status ${rB.status}`)
    const rA = await fetch(`${BASE}${rdl.json.download}`, { headers: { cookie: A } })
    const buf = await rA.arrayBuffer()
    check('1단 발급 세션(A) 수령 = 200 실물', rA.status === 200 && buf.byteLength > 1000, `${rA.status} · ${buf.byteLength}B`)
    const rAgain = await fetch(`${BASE}${rdl.json.download}`, { headers: { cookie: A } })
    check('1단 재수령 = 404(1회 소진 회귀 유지)', rAgain.status === 404, `status ${rAgain.status}`)
  }
}

// ── 2단 — M-6: upsert 는 실변경만 무효화 ──
const ex = await loginExec(BASE, execName, PW)
{
  const r0 = await api(ex, 'appUser:upsert', botPayload())
  check('2단 무변경 upsert 성공(동일값 재저장)', r0.status === 200 && r0.json?.success === true, r0.json?.error)
  check('2단 무변경 → 세션 생존(무해 편집은 로그아웃 없음)', (await meStatus(B)) === 200)

  const r1 = await api(ex, 'appUser:upsert', botPayload({ role: 'member' }))
  check('2단 role 실변경(manager→member) 성공', r1.status === 200 && r1.json?.success === true, r1.json?.error)
  check('2단 실변경 → 대상 세션 전량 무효화(B=401)', (await meStatus(B)) === 401)
  check('2단 실변경 → A 도 무효화(사용자 단위)', (await meStatus(A)) === 401)

  const r2 = await api(ex, 'appUser:upsert', botPayload({ role: botRow.role }))
  check('2단 role 원상 복귀(→manager)', r2.status === 200 && r2.json?.success === true, r2.json?.error)
}

// ── 3단 — M-6: resetPassword 는 무조건 무효화 ──
// 채널이 4자리 숫자 정책을 강제(관리팀 대장)하므로 '0000' 으로 재설정 → 무효화 단언 →
// **원 해시를 바이트 그대로 원복**(RW 1회 — 복사본 한정·E2E봇 행만·must_change_pw 포함).
{
  const C = await loginBot(BASE, PW)
  check('3단 세션C 재로그인(원상 확인 겸)', (await meStatus(C)) === 200)
  const before = dbr.prepare('SELECT password_hash, must_change_pw FROM app_users WHERE id = ?').get(botRow.id)
  const rp = await api(ex, 'appUser:resetPassword', { id: botRow.id, newPassword: '0000' })
  check('3단 resetPassword 성공(4자리 정책 준수)', rp.status === 200 && rp.json?.success === true, rp.json?.error)
  check('3단 resetPassword → 대상 세션 무효화(C=401)', (await meStatus(C)) === 401)
  const dbw = new Database(DB_PATH)
  dbw.pragma('busy_timeout = 4000')
  dbw.prepare('UPDATE app_users SET password_hash = ?, must_change_pw = ? WHERE id = ?')
    .run(before.password_hash, before.must_change_pw, botRow.id)
  dbw.close()
  const D = await loginBot(BASE, PW)
  check('3단 해시 원복 + 재로그인 정상(원상)', (await meStatus(D)) === 200)
  await fetch(`${BASE}/api/auth:logout`, { method: 'POST', headers: { cookie: D } }).catch(() => {})
}

// ── 종료 — 잔여물 0 ──
{
  const usersAfter = dbr.prepare('SELECT COUNT(*) c FROM app_users').get().c
  const roleNow = dbr.prepare('SELECT role FROM app_users WHERE id = ?').get(botRow.id)?.role
  check('종료 app_users 행수 원상 + E2E봇 role 원상', usersAfter === usersBefore && roleNow === botRow.role, `${usersBefore}→${usersAfter} · role=${roleNow}`)
}
dbr.close()
done()
