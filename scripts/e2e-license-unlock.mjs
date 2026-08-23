#!/usr/bin/env node
// ============================================================
// scripts/e2e-license-unlock.mjs — M2 IATF 애드온 라이선스 언락 E2E (2026-08-23)
// 빈 폴더 클린 설치 → 마법사(애드온 OFF) → auth:me.license.iatfAddon=false → 틀린 키 400 · 형식 오류 400 → 맞는 키(회사명 HMAC)
// → 200 + license on → auth:me true → 번들 index.html 이 잠금 패널 코드를 포함 → lock → false. :8097·mkdtemp·라이브 무접촉.
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-license-unlock.mjs
// ============================================================
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createHmac } from 'node:crypto'
import { mkCheck } from './lib/e2e.mjs'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.E2E_PORT || 8097)
if ([8080, 8081, 8083].includes(PORT)) { console.error('[e2e-guard] 운영 포트 거부'); process.exit(1) }
const BASE = `http://127.0.0.1:${PORT}`
const { check, done } = mkCheck()
const dataDir = mkdtempSync(join(tmpdir(), 'iatf-lic-e2e-'))
const COMPANY = '주식회사 라이선스테스트'
const keyFor = (name) => { const h = createHmac('sha256', 'dailyq-iatf-addon-v1').update(name).digest('hex').toUpperCase().slice(0, 16); return `IATF-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}` }

const child = spawn(join(repo, 'node_modules', 'electron', 'dist', 'electron.exe'), [join(repo, 'server', 'index.cjs')], {
  cwd: repo, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT), IATF_DATA_DIR: dataDir, IATF_INIT_DB: '1', IATF_INSTALL_PACKS: 'standard' }, stdio: 'ignore', windowsHide: true
})
const post = (p, b, cookie = '') => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(b || {}) })
const j = async (r) => { try { return await r.json() } catch { return null } }
try {
  let up = false
  for (let i = 0; i < 80 && !up; i++) { await new Promise((r) => setTimeout(r, 500)); try { up = (await fetch(`${BASE}/api/health`)).ok } catch { /* */ } }
  check('① 클린 설치 서버 기동', up)
  const ok = await post('/api/setup:complete', { companyName: COMPANY, adminName: '라이선스관리자', adminPassword: 'lic1234', iatfAddon: false })
  const cookie = (ok.headers.get('set-cookie') || '').split(';')[0]
  check('② 마법사 완료(애드온 OFF)', ok.ok && !!cookie)
  const me0 = await j(await fetch(`${BASE}/api/auth:me`, { headers: { cookie } }))
  check(`③ auth:me.license.iatfAddon = ${me0?.license?.iatfAddon} (잠김)`, me0?.license?.iatfAddon === false)
  const bad1 = await post('/api/license:unlock', { key: 'hello' }, cookie)
  check(`④ 형식 오류 키 400 (${bad1.status})`, bad1.status === 400)
  const bad2 = await post('/api/license:unlock', { key: keyFor('다른회사') }, cookie)
  const bad2J = await j(bad2)
  check(`⑤ 다른 회사 키 400 — "${String(bad2J?.error || '').slice(0, 30)}…"`, bad2.status === 400)
  const noauth = await post('/api/license:unlock', { key: keyFor(COMPANY) })
  check(`⑥ 비로그인 401 (${noauth.status})`, noauth.status === 401)
  const good = await post('/api/license:unlock', { key: keyFor(COMPANY).toLowerCase() }, cookie)
  const goodJ = await j(good)
  check(`⑦ 맞는 키(소문자 입력도 허용) → 200 · iatfAddon=${goodJ?.iatfAddon}`, good.ok && goodJ?.iatfAddon === true)
  const me1 = await j(await fetch(`${BASE}/api/auth:me`, { headers: { cookie } }))
  check(`⑧ auth:me 재조회 iatfAddon = ${me1?.license?.iatfAddon} (열림)`, me1?.license?.iatfAddon === true)
  const lock = await post('/api/license:lock', {}, cookie)
  const lockJ = await j(lock)
  if (!lock.ok) console.log('lock resp', lock.status, JSON.stringify(lockJ))
  check(`⑨ lock → iatfAddon=${lockJ?.iatfAddon}`, lock.ok && lockJ?.iatfAddon === false)
  // 렌더러 번들에 잠금 패널·🔒 표시 코드 포함(빌드 반영 확인)
  const assets = join(repo, 'out', 'renderer', 'assets')
  const js = readdirSync(assets).filter((f) => /^index-.*\.js$/.test(f)).map((f) => readFileSync(join(assets, f), 'utf-8')).join('')
  check('⑩ 번들에 잠금 패널(IATF 16949 애드온 화면)·🔒 애드온·license:unlock 포함', js.includes('IATF 16949 애드온 화면') && js.includes('🔒 애드온') && js.includes('license:unlock'))
} catch (e) {
  check(`예외 ${e.message}`, false)
} finally {
  try { child.kill() } catch { /* */ }
  await new Promise((r) => setTimeout(r, 1000))
  try { rmSync(dataDir, { recursive: true, force: true }) } catch { /* */ }
}
done()
