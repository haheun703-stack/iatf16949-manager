#!/usr/bin/env node
// ============================================================
// scripts/e2e-setup-wizard.mjs — M2 "빈 PC 설치 → 우리 회사로 로그인" E2E (2026-08-23)
//
// 41호 M2 완료 판정 그대로: 빈 데이터 폴더 → 클린 설치(표준팩) → /login 이 /setup 으로 유도 → 마법사 완료(회사·관리자·IATF 애드온)
// → 자동 로그인 → 관리자 재로그인 → 회사명이 브랜드/프로파일에 박힘 → 표준팩 양식 294 → 마법사 재진입 차단(409/redirect).
// + 42호 D(IATF_REVIEW_COPY 단일 스위치): 플래그 없음 = copy=false + E2E봇 401(검수 전용) / 플래그 = copy=true + E2E봇 관문 통과.
//
// 안전: %TEMP% mkdtemp 전용 · 포트 8097(라이브/검수 포트 거부) · 서버는 이 스크립트가 띄우고 끝에 내린다. 라이브 무접촉.
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-setup-wizard.mjs
// ============================================================
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mkCheck } from './lib/e2e.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const { licenseKeyFor: keyFor } = require('../server/license.cjs')
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.E2E_PORT || 8097)
if (PORT === 8080 || PORT === 8081 || PORT === 8083) { console.error('[e2e-guard] 운영 포트 거부'); process.exit(1) }
const BASE = `http://127.0.0.1:${PORT}`
const { check, done } = mkCheck()
const dataDir = mkdtempSync(join(tmpdir(), 'iatf-setup-e2e-'))
const electron = join(repo, 'node_modules', 'electron', 'dist', 'electron.exe')

function startServer(extraEnv) {
  const child = spawn(electron, [join(repo, 'server', 'index.cjs')], {
    cwd: repo,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT), IATF_DATA_DIR: dataDir, IATF_INSTALL_PACKS: 'standard', ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  })
  let log = ''
  child.stdout.on('data', (d) => (log += d))
  child.stderr.on('data', (d) => (log += d))
  return { child, log: () => log }
}
async function waitHealth(ms = 40000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(`${BASE}/api/health`)
      if (r.ok) return await r.json()
    } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500))
  }
  return null
}
function stop(s) {
  try { s.child.kill() } catch { /* noop */ }
  return new Promise((r) => setTimeout(r, 1200))
}
const post = (path, body, cookie = '') =>
  fetch(`${BASE}${path}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {}) })
const jsonOf = async (r) => { try { return await r.json() } catch { return null } }

const COMPANY = '주식회사 설치테스트정밀'
const ADMIN = '설치관리자'
const PW = 'setup1234'
let s = null
try {
  // ── 1) 빈 폴더 → 클린 설치(표준팩) · 플래그 없음 = 고객사 설치 형태 ──
  s = startServer({ IATF_INIT_DB: '1' })
  const h0 = await waitHealth()
  check(`① 클린 설치 서버 기동 :${PORT} (pid ${h0?.pid})`, !!h0, h0 ? '' : s.log().slice(-300))
  if (!h0) throw new Error('server down')

  const rLogin = await fetch(`${BASE}/login`, { redirect: 'manual' })
  check(`② /login → /setup 유도 (활성 사용자 0명) — ${rLogin.status} ${rLogin.headers.get('location') || ''}`, rLogin.status === 302 && rLogin.headers.get('location') === '/setup')
  const rRoot = await fetch(`${BASE}/`, { redirect: 'manual' })
  check(`③ / (미로그인) → /login 리다이렉트 ${rRoot.status}`, rRoot.status === 302 && rRoot.headers.get('location') === '/login')
  const rSetup = await fetch(`${BASE}/setup`)
  const html = await rSetup.text()
  check('④ /setup 페이지 제공(마법사 HTML)', rSetup.ok && html.includes('처음 설정') && html.includes('setup:complete'))
  const st = await jsonOf(await fetch(`${BASE}/api/setup:status`))
  check('⑤ setup:status setupNeeded=true', st?.setupNeeded === true)

  // 입력 검증(fail-closed)
  const bad1 = await post('/api/setup:complete', { companyName: COMPANY, adminName: ADMIN, adminPassword: '12' })
  check(`⑥ 비번 4자 미만 거부 ${bad1.status}`, bad1.status === 400)
  const bad2 = await post('/api/setup:complete', { companyName: COMPANY, adminName: 'E2E봇', adminPassword: PW })
  check(`⑦ 관리자명 'E2E봇' 거부 ${bad2.status}`, bad2.status === 400)
  const bad3 = await post('/api/setup:complete', { companyName: 'A', adminName: ADMIN, adminPassword: PW })
  check(`⑧ 회사명 2자 미만 거부 ${bad3.status}`, bad3.status === 400)
  const bad4 = await post('/api/setup:complete', { companyName: COMPANY, adminName: ADMIN, adminPassword: PW, iatfAddon: true, licenseKey: 'IATF-0000-0000-0000-0000' })
  check(`⑧-1 애드온 체크 + 틀린 키 → 거부 ${bad4.status} (리뷰: 체크박스만으로 열리던 구멍)`, bad4.status === 400)
  const rNoAuth = await fetch(`${BASE}/setup/anything`, { redirect: 'manual' })
  check(`⑧-2 /setup/anything 비인증 → 로그인 벽 ${rNoAuth.status} (접두 매칭 구멍 봉합)`, rNoAuth.status === 302)
  const rM = await fetch(`${BASE}/m`, { redirect: 'manual' })
  check(`⑧-3 /m 비인증 → ${rM.headers.get('location')} (next 보존)`, rM.status === 302 && rM.headers.get('location') === '/login?next=%2Fm')

  // 마법사 완료 → 자동 로그인
  const ok = await post('/api/setup:complete', { companyName: COMPANY, companyNameShort: '설치테스트', ceoName: '홍길동', address: '경기도 어딘가 1', phone: '031-000-0000', adminName: ADMIN, adminDept: '품질', adminPassword: PW, iatfAddon: true, licenseKey: keyFor(COMPANY) })
  const okJ = await jsonOf(ok)
  const cookie = (ok.headers.get('set-cookie') || '').split(';')[0]
  check(`⑨ 마법사 완료 200 + 세션 쿠키 + user.role=executive (${okJ?.user?.role})`, ok.ok && !!cookie && okJ?.user?.role === 'executive' && okJ?.user?.name === ADMIN)
  const h1 = await jsonOf(await fetch(`${BASE}/api/health`, { headers: { cookie } }))
  check(`⑩ 설치 결과 health — copy=${h1?.copy} · forms ${h1?.forms} · users ${h1?.users}`, h1?.copy === false && h1?.forms >= 290 && h1?.users === 1)
  const brand = await jsonOf(await fetch(`${BASE}/api/brand`))
  check(`⑪ /api/brand companyName = "${brand?.companyName}"`, brand?.companyName === COMPANY)
  const prof = await jsonOf(await post('/api/company:profileGet', {}, cookie))
  check(`⑫ 프로파일 저장(ceo ${prof?.ceoName} · short ${prof?.companyNameShort})`, prof?.companyName === COMPANY && prof?.ceoName === '홍길동' && prof?.companyNameShort === '설치테스트')

  // 재진입 차단
  const again = await post('/api/setup:complete', { companyName: 'X회사', adminName: '다른사람', adminPassword: PW })
  check(`⑬ 마법사 재실행 차단 ${again.status} (409)`, again.status === 409)
  const rSetup2 = await fetch(`${BASE}/setup`, { redirect: 'manual' })
  check(`⑭ /setup → /login (설치 완료 후) ${rSetup2.status}`, rSetup2.status === 302 && rSetup2.headers.get('location') === '/login')
  const rLogin2 = await fetch(`${BASE}/login`)
  check('⑮ /login 정상 페이지 제공', rLogin2.ok && (await rLogin2.text()).includes('auth:login'))

  // 관리자 재로그인 + E2E봇 차단(플래그 없음)
  const lr = await post('/api/auth:login', { name: ADMIN, password: PW })
  const lrJ = await jsonOf(lr)
  check(`⑯ 관리자 로그인 (mustChangePw=${lrJ?.user?.mustChangePw})`, lr.ok && lrJ?.user?.mustChangePw === false)
  // M2 발견 버그 회귀: express 경로 ':' 파라미터 오인으로 logout/changePassword POST 가 login 핸들러로 빨려 들어갔다(400 "이름을 입력하세요")
  const ckA = (lr.headers.get('set-cookie') || '').split(';')[0]
  const cp = await post('/api/auth:changePassword', { newPassword: PW + 'x' }, ckA)
  check(`⑯-1 비밀번호 변경 라우트 도달 ${cp.status} (라우트 ':' 이스케이프 회귀)`, cp.ok)
  const lo = await post('/api/auth:logout', {}, ckA)
  const meAfter = await fetch(`${BASE}/api/auth:me`, { headers: { cookie: ckA } })
  check(`⑯-2 로그아웃 → 세션 무효 (logout ${lo.status} · me ${meAfter.status})`, lo.ok && meAfter.status === 401)
  const lrB = await post('/api/auth:login', { name: ADMIN, password: PW + 'x' })
  check(`⑯-3 변경된 비번으로 재로그인 ${lrB.status}`, lrB.ok)
  const bot = await post('/api/auth:login', { name: 'E2E봇', password: 'qms1234' })
  const botJ = await jsonOf(bot)
  check(`⑰ 플래그 없음 → E2E봇 401 "${botJ?.error}"`, bot.status === 401 && /검수 복사본 전용/.test(botJ?.error || ''))
  await stop(s)
  s = null

  // DB 직접 확인(서버 내린 뒤)
  const db = new Database(join(dataDir, 'iatf16949.db'), { readonly: true })
  const lic = db.prepare("SELECT value FROM app_config WHERE key='license.iatf_addon'").get()?.value
  const doneAt = db.prepare("SELECT value FROM app_config WHERE key='install.setup_done'").get()?.value
  const u = db.prepare('SELECT name, role, must_change_pw, active FROM app_users').all()
  db.close()
  check(`⑱ DB — license.iatf_addon=${lic} · setup_done=${!!doneAt} · users=${JSON.stringify(u)}`, lic === 'on' && !!doneAt && u.length === 1 && u[0].role === 'executive' && u[0].must_change_pw === 0)

  // ── 2) 같은 폴더를 IATF_REVIEW_COPY=1 로 다시 띄움 = 검수 복사본 형태 ──
  s = startServer({ IATF_REVIEW_COPY: '1' })
  const h2 = await waitHealth()
  check(`⑲ 복사본 플래그 재기동 (pid ${h2?.pid})`, !!h2)
  const lr2 = await post('/api/auth:login', { name: ADMIN, password: PW + 'x' })
  const ck2 = (lr2.headers.get('set-cookie') || '').split(';')[0]
  const h3 = await jsonOf(await fetch(`${BASE}/api/health`, { headers: { cookie: ck2 } }))
  check(`⑳ 플래그 → health.copy=${h3?.copy}`, h3?.copy === true)
  const bot2 = await post('/api/auth:login', { name: 'E2E봇', password: 'qms1234' })
  const bot2J = await jsonOf(bot2)
  check(`㉑ 플래그 → E2E봇 관문 통과(계정 부재 사유로만 실패: "${bot2J?.error}")`, bot2.status === 401 && !/검수 복사본 전용/.test(bot2J?.error || ''))
  const rSetup3 = await fetch(`${BASE}/setup`, { redirect: 'manual' })
  check(`㉒ 복사본에서도 /setup 닫힘 ${rSetup3.status}`, rSetup3.status === 302)
} catch (err) {
  check(`예외: ${err.message}`, false, s ? s.log().slice(-400) : '')
} finally {
  if (s) await stop(s)
  try { rmSync(dataDir, { recursive: true, force: true }) } catch { /* 잠김 — 무해 */ }
}
done()
