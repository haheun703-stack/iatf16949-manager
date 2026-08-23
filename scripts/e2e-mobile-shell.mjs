#!/usr/bin/env node
// ============================================================
// scripts/e2e-mobile-shell.mjs — M3 현장 폰 입력 E2E (2026-08-23)
//
// 41호 M3 완료 판정의 E2E 축: 폰 셸 `/m` 이 쓰는 채널 흐름을 그대로 — 스캔/품번 [조회](scanResolve) → 실적 [저장](prodRecordCreate)
// → 검사 [저장](inspRecordCreate, **시료 복수** sampleNo 1..n) → 홈 [조회](todayRecords) → **⑥-1 확인 서명**(inspConfirm: 자기확인 금지·
// 타인 1회) → 번들에 /m 셸 청크 + 시트명 데이터 실재. 서버는 빈 폴더 클린 설치(:8097 · IATF_REVIEW_COPY=1) — 라이브 무접촉.
// 준비: 마법사로 관리자(검사자) 생성 → 품목·라우팅·불량유형은 서버 내린 사이 temp DB 직접 시드(품목 마스터 생성 채널 없음 — pop_item 수입 경로)
//       → 재기동 → 검사기준(specSave, 시료 3) → 확인자 = E2E봇(seed-local-passwords 와 같은 방식으로 직접 시드).
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-mobile-shell.mjs
// ============================================================
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mkCheck } from './lib/e2e.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.E2E_PORT || 8097)
if ([8080, 8081, 8083].includes(PORT)) { console.error('[e2e-guard] 운영 포트 거부'); process.exit(1) }
const BASE = `http://127.0.0.1:${PORT}`
const { check, done } = mkCheck()
const dataDir = mkdtempSync(join(tmpdir(), 'iatf-m3-e2e-'))
const electron = join(repo, 'node_modules', 'electron', 'dist', 'electron.exe')
const ITEM = 'M3-TEST-001'

function startServer(extra) {
  const child = spawn(electron, [join(repo, 'server', 'index.cjs')], {
    cwd: repo, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(PORT), IATF_DATA_DIR: dataDir, IATF_INSTALL_PACKS: 'standard', IATF_REVIEW_COPY: '1', ...extra }, stdio: 'ignore', windowsHide: true
  })
  return child
}
async function waitUp() { for (let i = 0; i < 80; i++) { await new Promise((r) => setTimeout(r, 500)); try { if ((await fetch(`${BASE}/api/health`)).ok) return true } catch { /* */ } } return false }
const stop = async (c) => { try { c.kill() } catch { /* */ } await new Promise((r) => setTimeout(r, 1200)) }
const post = (p, b, cookie = '') => fetch(`${BASE}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(b || {}) })
const j = async (r) => { try { return await r.json() } catch { return null } }
const login = async (name, password) => { const r = await post('/api/auth:login', { name, password }); return r.ok ? (r.headers.get('set-cookie') || '').split(';')[0] : null }

let child = null
try {
  // ── 1) 클린 설치 + 마법사(관리자 = 검사자 A) ──
  child = startServer({ IATF_INIT_DB: '1' })
  check('① 클린 설치 서버 기동', await waitUp())
  const w = await post('/api/setup:complete', { companyName: '주식회사 현장테스트', adminName: '현장관리자', adminPassword: 'm31234', iatfAddon: false })
  check('② 마법사 완료(관리자 A)', w.ok)
  await stop(child); child = null

  // ── 2) temp DB 직접 시드: 품목 1 · 라우팅 2공정 · 불량유형 1 · 확인자 B(E2E봇) ──
  {
    const db = new Database(join(dataDir, 'iatf16949.db'))
    db.prepare("INSERT OR IGNORE INTO item_master (item_code, item_name, item_type, active) VALUES (?, ?, '완제품/조립', 1)").run(ITEM, 'M3 테스트 파이프')
    db.prepare("INSERT OR IGNORE INTO process_master (proc_code, proc_name, active) VALUES ('P10', '절단', 1)").run()
    db.prepare("INSERT OR IGNORE INTO process_master (proc_code, proc_name, active) VALUES ('P20', '용접', 1)").run()
    db.prepare("INSERT INTO routing_step (item_code, seq, proc_code, active) VALUES (?, 10, 'P10', 1), (?, 20, 'P20', 1)").run(ITEM, ITEM)
    db.prepare("INSERT OR IGNORE INTO defect_type (code, name, active) VALUES ('D01', '치수불량', 1)").run()
    db.prepare("INSERT OR IGNORE INTO app_users (name, team_dept, role, active, sort_order, password_hash, must_change_pw) VALUES ('E2E봇', '검수', 'manager', 1, 99, ?, 0)").run(bcrypt.hashSync('qms1234', 10))
    db.close()
  }
  child = startServer({})
  check('③ 시드 후 재기동(IATF_REVIEW_COPY=1)', await waitUp())
  const ckA = await login('현장관리자', 'm31234')
  const ckB = await login('E2E봇', 'qms1234')
  check('④ 검사자 A · 확인자 B(E2E봇) 로그인', !!ckA && !!ckB)

  // ── 3) 검사기준(시료 3) 등록 — 사무실 화면 채널 ──
  const sp = await j(await post('/api/semimes:specSave', { itemCode: ITEM, inspKind: '자주', inspItem: '외경', unit: 'mm', sl: 9.9, su: 10.1, nominal: 10, sampleCnt: 3 }, ckA))
  check(`⑤ 검사기준 등록(외경 9.9~10.1 · 시료 3) rev ${sp?.revision}`, sp?.success === true)

  // ── 4) 폰 [조회] = scanResolve ──
  const ctx = await j(await post('/api/semimes:scanResolve', { query: ITEM }, ckA))
  check(`⑥ 스캔 조회 — found ${ctx?.found} · 라우팅 ${ctx?.routing?.length} · 자주 스펙 ${ctx?.specs?.['자주']?.length} · sampleCnt ${ctx?.specs?.['자주']?.[0]?.sampleCnt}`, ctx?.found === true && ctx?.routing?.length === 2 && ctx?.specs?.['자주']?.[0]?.sampleCnt === 3)
  const miss = await j(await post('/api/semimes:scanResolve', { query: 'NO-SUCH-ITEM' }, ckA))
  check('⑦ 없는 품번 → found=false(마스터 실존 코드만)', miss?.found === false)

  // ── 5) 폰 실적 [저장] ──
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10)
  const pr0 = await j(await post('/api/semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, procCode: 'P10', lotNo: null, okQty: 120, ngQty: 2, defectCode: null, worker: '위조' }, ckA))
  check('⑧-0 불량 2 + 유형 없음 → 거부(0101 계약)', pr0?.success === false)
  const pr = await j(await post('/api/semimes:prodRecordCreate', { recordDate: today, itemCode: ITEM, procCode: 'P10', lotNo: null, okQty: 120, ngQty: 2, defectCode: 'D01', worker: '위조' }, ckA))
  check(`⑧ 실적 저장 #${pr?.id} (양품 120·불량 2·D01)`, pr?.success === true, pr?.success ? '' : JSON.stringify(pr))

  // ── 6) 폰 검사 [저장] — 시료 복수 3값 ──
  const specId = ctx.specs['자주'][0].id
  const ir = await j(await post('/api/semimes:inspRecordCreate', { inspDate: today, inspKind: '자주', itemCode: ITEM, procCode: 'P10', samplePhase: '초품', judgment: '합격', values: [1, 2, 3].map((n) => ({ specId, inspItem: '외경', sampleNo: n, value: 10 + n * 0.01 })) }, ckA))
  check(`⑨ 검사 저장 #${ir?.id} — 시료 3값 · 자동제안 ${ir?.suggestion} · spec rev ${ir?.specRevision}`, ir?.success === true)
  const noVal = await j(await post('/api/semimes:inspRecordCreate', { inspDate: today, inspKind: '자주', itemCode: ITEM, samplePhase: '초품', judgment: '합격', values: [] }, ckA))
  check('⑩ 측정값 0개 → 거부(실측값 강제)', noVal?.success === false)
  const vals = await j(await post('/api/semimes:inspValues', { id: ir.id }, ckA))
  check(`⑪ 저장된 시료 값 ${vals?.length}개 · sampleNo ${vals?.map((v) => v.sampleNo).join(',')}`, Array.isArray(vals) && vals.length === 3 && vals.map((v) => v.sampleNo).join(',') === '1,2,3')

  // ── 7) 홈 [조회] + ⑥-1 확인 서명 ──
  const td = await j(await post('/api/semimes:todayRecords', {}, ckA))
  const mine = td?.insp?.find((r) => r.id === ir.id)
  check(`⑫ 오늘 기록 — 실적 ${td?.prod?.length} · 검사 ${td?.insp?.length} · 검사자 "${mine?.inspector}" (세션 각인 — '위조' 무시)`, td?.prod?.length >= 1 && mine?.inspector === '현장관리자' && td.prod[0]?.worker === '현장관리자')
  const self = await j(await post('/api/semimes:inspConfirm', { id: ir.id }, ckA))
  check(`⑬ 자기확인 거부 — "${String(self?.error || '').slice(0, 28)}…"`, self?.success === false)
  const conf = await j(await post('/api/semimes:inspConfirm', { id: ir.id }, ckB))
  check('⑭ 확인자 B 서명 성공', conf?.success === true)
  const conf2 = await j(await post('/api/semimes:inspConfirm', { id: ir.id }, ckB))
  check('⑮ 2회째 서명 거부(1회 규칙)', conf2?.success === false)
  const td2 = await j(await post('/api/semimes:todayRecords', {}, ckB))
  check(`⑯ 확인자 기록 = "${td2?.insp?.find((r) => r.id === ir.id)?.confirmer}"`, td2?.insp?.find((r) => r.id === ir.id)?.confirmer === 'E2E봇')

  // ── 8) /m 셸 제공 + 번들 청크 ──
  const m = await fetch(`${BASE}/m`, { headers: { cookie: ckA } })
  check(`⑰ GET /m → index.html(SPA) ${m.status}`, m.ok && (await m.text()).includes('<div id="root"'))
  const assets = join(repo, 'out', 'renderer', 'assets')
  const chunk = existsSync(assets) ? readdirSync(assets).find((f) => /^MobileShell-.*\.js$/.test(f)) : null
  const src = chunk ? readFileSync(join(assets, chunk), 'utf-8') : ''
  check(`⑱ 번들 MobileShell 청크 ${chunk ?? '없음'} — 실적/검사/확인 서명/BarcodeDetector 포함`, !!chunk && src.includes('실적 넣기') && src.includes('검사 넣기') && src.includes('확인 서명') && src.includes('BarcodeDetector'))
} catch (e) {
  check(`예외 ${e.message}`, false)
} finally {
  if (child) await stop(child)
  try { rmSync(dataDir, { recursive: true, force: true }) } catch { /* */ }
}
done()
