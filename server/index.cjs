// ============================================================
// server/index.cjs — 웹 전환(사내 서버형) W1 서버 골격 (2026-07-23)
//
// 구동: ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe server/index.cjs
//   (better-sqlite3 가 Electron ABI 125 라 시스템 node 불가 — §0.5 실증. electron-node 로 구동.)
//
// W1 목표: 홈(관제탑) 한 화면이 브라우저에서 뜨는 것. 이 파일은 그 골격 —
//   ① 정적 서빙(renderer 빌드)  ② POST /api/{channel} 디스패처  ③ DB(better-sqlite3, 라이브 파일)
// 인증·권한·쓰기검증은 W3, 파일 업/다운로드는 W2. 지금은 홈 수직 관통만.
// ============================================================
const express = require('express')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const auth = require('./auth.cjs')

// ── DB 연결 (env 로 데이터 루트 외부화 — 서버엔 userData 개념 없음) ──
const DATA_DIR = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || '', 'iatf16949-manager')
const DB_PATH = path.join(DATA_DIR, 'iatf16949.db')
// 39호 S2(8/19): 클린 설치 = 명시 옵트인(IATF_INIT_DB=1)일 때만 빈 DB 를 만들고 스키마 스냅샷+팩으로 초기화.
// 옵트인 없이 DB 가 없으면 종전대로 즉시 종료 — IATF_DATA_DIR 오타로 라이브 옆에 빈 DB 가 생기는 사고 방지.
const INIT_DB = process.env.IATF_INIT_DB === '1'
if (!fs.existsSync(DB_PATH)) {
  if (!INIT_DB) {
    console.error(`[server] DB 없음: ${DB_PATH} — IATF_DATA_DIR 로 지정하세요. (신규 설치는 IATF_INIT_DB=1 명시)`)
    process.exit(1)
  }
  fs.mkdirSync(DATA_DIR, { recursive: true })
  console.log(`[server] 신규 설치: ${DB_PATH} 생성(IATF_INIT_DB=1)`)
}
// 인증용 R/W 연결(auth 는 password_hash UPDATE 필요) — 마이그레이션 주체. 읽기 연결은 마이그 뒤에 연다.
const authDb = new Database(DB_PATH)
authDb.pragma('busy_timeout = 4000')
authDb.pragma('journal_mode = WAL')

// ── 서버 기동 시 pending 마이그 적용(설치판/dev 와 동일 체인) ──
// 러너 정본 = server/migrate-core.cjs (39호 S2): 레거시 DB 는 종전과 같은 번호순 적용,
// 빈 DB(IATF_INIT_DB=1)는 resources/core/schema.sql 스냅샷 + resources/packs/<pack>/ 로 클린 설치.
// 설치 팩 = IATF_INSTALL_PACKS(csv, 클린 설치 시) → app_config install.packs → 레거시 기본 standard,tpc.
// _migrations 에 기록하므로 설치판이 나중에 같은 마이그를 봐도 스킵 = 충돌 없음(마이그 체인 보존).
const migrateCore = require('./migrate-core.cjs')
const RESOURCES_DIR = path.join(__dirname, '..', 'resources')
// M-7(8/13 전수 검수 — 조용한 fail-open 차단): 마이그 적용 실패 = 기동 중단.
// 종전엔 "계속 진행"이라 0142 실패 시 screenRuleOf 의 catch 가 "규칙 없음 = 허용"으로
// 해석해 권한 매트릭스가 통째로 꺼진 채 조용히 서빙됐다. 런처 bat 이 [FAIL]+로그 꼬리를
// 남기므로(8/13 보강) 중단이 곧 발견이다 — 가짜 가동보다 정직한 정지.
try {
  const r = migrateCore.runAll(authDb, {
    resourcesDir: RESOURCES_DIR,
    allowClean: INIT_DB,
    packs: migrateCore.parsePacksEnv(process.env.IATF_INSTALL_PACKS),
    log: (m) => console.log(m.replace('[migrate]', '[server]'))
  })
  if (r.applied.length === 0 && r.mode === 'legacy') console.log('[server] migrations up-to-date')
  console.log(`[server] install.packs=${r.packs.join(',')} (${r.mode})`)
} catch (e) {
  console.error('[server] 마이그 적용 실패 — 기동 중단(M-7 fail-open 금지):', (e && e.message) || e)
  console.error('[server] DB 와 resources/migrations 상태를 확인한 뒤 다시 기동하세요.')
  process.exit(1)
}
// health/조회용 읽기 연결(별도) — 마이그 완료 뒤 개방
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
db.pragma('busy_timeout = 4000')

// M-7 부팅 후 검증: 권한 매트릭스 테이블(0142)이 실재해야 기동 — 마이그 체인이 어긋난
// DB(수동 복원본 등)로 뜨면 매트릭스 없는 서버가 정상인 척 서빙되는 것을 막는다.
{
  const t = authDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='screen_permission'").get()
  if (!t) {
    console.error('[server] screen_permission 테이블 없음(0142 미적용 DB) — 기동 중단(M-7)')
    process.exit(1)
  }
}

const app = express()
// 한도 = 수집함 사진 핸들러 상한(base64 9M자 ≈ 9MB) + JSON 오버헤드 여유 — 핸들러의 친절한
// 크기 안내가 express 413 원시 응답에 가려지지 않도록 게이트를 핸들러보다 넓게 둔다(8/6 검수 Minor).
app.use(express.json({ limit: '12mb' }))

// ── 헬스체크 ──
// W4-A(37호 ④, P1 보류 청산): 비로그인 = {ok:true} 만 — 런처/자동시작의 생존 확인(200)용.
// DB 경로·건수·런타임 등 상세는 세션이 있을 때만(사내망이라도 무인증 정보 노출 금지).
// copy = 검수 복사본 서버 표식. 렌더러의 "검수 복사본" 표지(8/13 E2E 오인 사고 후속)와
// E2E 하네스 게이트(scripts/lib/e2e.mjs loginBot)가 이 값 하나를 믿고 쓰기까지 진행한다.
// N-6(8/14 검수 2차): 종전 `!!IATF_DATA_DIR` 은 env 존재만 봐서 **env 가 라이브 폴더를 가리켜도**
//   copy=true(거짓 안심)였다. 이제 "env 지정" + "실제로 연 DB 가 라이브 DB 가 아님"을 함께 요구한다.
//   정션·subst 우회 차단 위해 realpath(native) 실경로 비교 + 동일 파일(dev·ino) 비교를 병행하고,
//   판별 불능(APPDATA 미설정 등)이면 copy=false = fail-closed(하네스 즉시 중단 — M-7 원칙).
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
const LIVE_DB_PATH = process.env.APPDATA
  ? path.join(process.env.APPDATA, 'iatf16949-manager', 'iatf16949.db')
  : null
// M2(8/23, 42호 D 코워크 소견 채택): 복사본 판정 = **명시 플래그 `IATF_REVIEW_COPY=1` 하나**가 ①빨간 표지(health.copy)
// ②E2E봇 로그인 허용을 여는 유일 스위치. "IATF_DATA_DIR 지정 = 복사본" 추론 제거 — 고객사 설치(IATF_DATA_DIR 로 경로만
// 바꾼 경우)가 검수 표지를 달거나 E2E봇이 열리는 일이 없다(fail-closed). 플래그가 켜졌는데 연 DB 가 라이브면 기동 거부.
const REVIEW_FLAG = process.env.IATF_REVIEW_COPY === '1'
const OPENED_LIVE = !!LIVE_DB_PATH && isSameFile(DB_PATH, LIVE_DB_PATH)
if (REVIEW_FLAG && OPENED_LIVE) {
  console.error('[server] IATF_REVIEW_COPY=1 인데 라이브 DB 를 열었습니다 — 검수 복사본 플래그는 라이브에 금지(fail-closed). 기동 중단.')
  process.exit(1)
}
const IS_COPY_SERVER = REVIEW_FLAG
// M-12(8/13 전수 검수): 무인증에도 신원 아닌 "식별자"(pid·기동시각)는 노출한다 —
// 재기동 스크립트가 응답 중인 서버가 구판인지 신판인지 구분할 유일한 근거
// (배치A 슬림화가 이를 없애 8/13 무음 실패 사고 형태가 재현 가능했다).
// DB 경로·건수·런타임 상세는 여전히 세션 전용(무인증 정보 노출 금지 유지).
const STARTED_AT = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' })
app.get('/api/health', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.json({ ok: true, pid: process.pid, startedAt: STARTED_AT })
  const forms = db.prepare('SELECT COUNT(*) AS c FROM forms').get().c
  const obl = db.prepare('SELECT COUNT(*) AS c FROM recurring_obligations WHERE active=1').get().c
  const users = db.prepare('SELECT COUNT(*) AS c FROM app_users WHERE active=1').get().c
  res.json({ ok: true, pid: process.pid, startedAt: STARTED_AT, db: DB_PATH, forms, obligations: obl, users, runtime: `electron-node ${process.versions.modules}`, copy: IS_COPY_SERVER })
})

// ══ W3 인증 (로그인·세션·권한) — 아래 라우트는 인증 미들웨어 앞(미인증 허용) ══
// ── M2 설치 마법사(8/23, 41호 M2 "설치 첫날 경험"): 활성 사용자 0명 = 방금 설치된 빈 시스템 → /setup 으로 유도 ──
// 마법사 1회 = 회사 프로파일(회사명·대표·주소·전화) + 관리자 1계정(executive) + 팩 선택(IATF 애드온 언락 플래그).
// fail-closed: 사용자가 1명이라도 있으면 /setup·/api/setup:* 전부 닫힘(409/redirect) — 운영 중 시스템에서 재실행 불가.
// 쓰기는 authDb(쓰기 핸들) — `db` 는 읽기 전용 핸들(8/13 배치A).
function setupNeeded() {
  try {
    return db.prepare('SELECT COUNT(*) AS c FROM app_users WHERE active = 1').get().c === 0
  } catch {
    return false
  }
}
app.get('/setup', (_req, res) => {
  if (!setupNeeded()) return res.redirect('/login')
  res.type('html').sendFile(path.join(__dirname, 'setup.html'))
})
app.get('/api/setup\\:status', (_req, res) => res.json({ setupNeeded: setupNeeded() }))
app.post('/api/setup\\:complete', (req, res) => {
  if (!setupNeeded()) return res.status(409).json({ error: '이미 설치가 완료된 시스템입니다.' })
  const b = req.body || {}
  const companyName = String(b.companyName || '').trim()
  const adminName = String(b.adminName || '').trim()
  const adminPassword = String(b.adminPassword || '')
  if (companyName.length < 2) return res.status(400).json({ error: '회사명을 2자 이상 입력하세요.' })
  if (adminName.length < 2) return res.status(400).json({ error: '관리자 이름을 2자 이상 입력하세요.' })
  if (adminName === 'E2E봇') return res.status(400).json({ error: '사용할 수 없는 이름입니다.' })
  if (adminPassword.length < 4) return res.status(400).json({ error: '비밀번호는 4자 이상이어야 합니다.' })
  const iatfAddon = b.iatfAddon === true || b.iatfAddon === 'on'
  const profile = {
    companyName,
    companyNameShort: String(b.companyNameShort || '').trim(),
    ceoName: String(b.ceoName || '').trim(),
    address: String(b.address || '').trim(),
    phone: String(b.phone || '').trim()
  }
  try {
    const tx = authDb.transaction(() => {
      const up = authDb.prepare('INSERT INTO company_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      for (const [k, v] of Object.entries(profile)) up.run(k, v)
      const cfg = authDb.prepare('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      cfg.run('license.iatf_addon', iatfAddon ? 'on' : 'off')
      cfg.run('install.setup_done', new Date().toISOString())
      const hash = require('bcryptjs').hashSync(adminPassword, 10)
      authDb.prepare('INSERT INTO app_users (name, team_dept, role, active, sort_order, password_hash, must_change_pw) VALUES (?, ?, ?, 1, 0, ?, 0)').run(
        adminName,
        String(b.adminDept || '경영').trim() || '경영',
        'executive',
        hash
      )
    })
    tx()
  } catch (e) {
    return res.status(500).json({ error: `설치 저장 실패: ${e.message}` })
  }
  const r = auth.login(authDb, adminName, adminPassword)
  if (r.error) return res.status(500).json({ error: r.error })
  res.setHeader('Set-Cookie', auth.sessionCookie(r.sid))
  console.log(`[server] 설치 마법사 완료 — 회사 "${companyName}" · 관리자 "${adminName}" · IATF 애드온 ${iatfAddon ? 'on' : 'off'}`)
  res.json({ success: true, user: r.user })
})

app.get('/login', (_req, res) => {
  if (setupNeeded()) return res.redirect('/setup')
  res.type('html').sendFile(path.join(__dirname, 'login.html'))
})

// ⚠ 경로의 ':' 는 express 에서 파라미터 표식 — '/api/auth:login' 은 '/api/auth' + 파라미터라 'auth:logout'·'auth:changePassword'
// POST 가 전부 login 핸들러로 빨려 들어갔다(M2 8/23 발견: 로그아웃이 서버 세션을 안 지우고 400 "이름을 입력하세요" 반환).
// '\:' 로 이스케이프해 글자 그대로 매칭(9개 라우트 전부). /api/:channel 디스패처는 그대로.
app.post('/api/auth\\:login', (req, res) => {
  const { name, password } = req.body || {}
  if (!name) return res.status(400).json({ error: '이름을 입력하세요.' })
  // M2: E2E봇은 검수 복사본(IATF_REVIEW_COPY=1)에서만 — 고객사·라이브에서는 계정이 있어도 거부(42호 D ②)
  if (String(name) === 'E2E봇' && !IS_COPY_SERVER) return res.status(401).json({ error: '검수 복사본 전용 계정입니다.' })
  const r = auth.login(authDb, String(name), String(password || ''))
  if (r.error) return res.status(401).json({ error: r.error })
  res.setHeader('Set-Cookie', auth.sessionCookie(r.sid))
  res.json({ success: true, user: r.user })
})

app.post('/api/auth\\:logout', (req, res) => {
  const s = auth.sessionOf(req)
  if (s) auth.logout(s.sid)
  res.setHeader('Set-Cookie', auth.clearCookie())
  res.json({ success: true })
})

// ── M2 라이선스(IATF 애드온 1키 — 32/33호 상품 구조): app_config 'license.iatf_addon' on/off ──
// 키 = "IATF-XXXX-XXXX-XXXX-XXXX" — 회사명(company_profile.companyName)에 묶인 HMAC(v1 오프라인 검증).
// 발급 = scripts/gen-license-key.mjs <회사명> (같은 함수). 정식 발급·회수 절차는 M4(판매 v1 패키지)에서 확정.
const LICENSE_SALT = 'dailyq-iatf-addon-v1'
function licenseKeyFor(companyName) {
  const h = require('crypto').createHmac('sha256', LICENSE_SALT).update(String(companyName || '').trim()).digest('hex').toUpperCase().slice(0, 16)
  return `IATF-${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`
}
function licenseState() {
  try {
    const r = db.prepare("SELECT value FROM app_config WHERE key = 'license.iatf_addon'").get()
    return { iatfAddon: !!r && r.value === 'on' }
  } catch {
    return { iatfAddon: false }
  }
}
app.get('/api/auth\\:me', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.status(401).json({ error: '로그인이 필요합니다.' })
  res.json({ id: s.userId, name: s.name, role: s.role, teamDept: s.teamDept, license: licenseState() })
})
app.get('/api/license\\:state', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.status(401).json({ error: '로그인이 필요합니다.' })
  res.json(licenseState())
})
app.post('/api/license\\:unlock', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.status(401).json({ error: '로그인이 필요합니다.' })
  if (s.role !== 'executive') return res.status(403).json({ error: '라이선스 키 입력은 최종관리자(executive)만 할 수 있습니다.' })
  const key = String((req.body && req.body.key) || '').trim().toUpperCase().replace(/\s+/g, '')
  if (!/^IATF-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(key)) return res.status(400).json({ error: '키 형식이 아닙니다. 예: IATF-1A2B-3C4D-5E6F-7A8B' })
  let companyName = ''
  try { companyName = (db.prepare("SELECT value FROM company_profile WHERE key = 'companyName'").get() || {}).value || '' } catch { /* noop */ }
  if (!companyName) return res.status(400).json({ error: '회사명이 설정되지 않았습니다. 설정 → 회사 프로파일에서 회사명을 먼저 입력하세요.' })
  if (key !== licenseKeyFor(companyName)) return res.status(400).json({ error: `이 키는 "${companyName}" 용이 아닙니다. 발급받은 회사명과 등록된 회사명이 같은지 확인하세요.` })
  const cfg = authDb.prepare('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
  cfg.run('license.iatf_addon', 'on')
  cfg.run('license.iatf_key', key)
  cfg.run('license.iatf_unlocked_at', new Date().toISOString())
  console.log(`[server] IATF 애드온 언락 — ${s.name} · 회사 "${companyName}"`)
  res.json({ success: true, ...licenseState() })
})
app.post('/api/license\\:lock', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.status(401).json({ error: '로그인이 필요합니다.' })
  if (s.role !== 'executive') return res.status(403).json({ error: '최종관리자(executive)만 할 수 있습니다.' })
  authDb.prepare('INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run('license.iatf_addon', 'off')
  res.json({ success: true, ...licenseState() })
})
module.exports.licenseKeyFor = licenseKeyFor

app.post('/api/auth\\:changePassword', (req, res) => {
  const s = auth.sessionOf(req)
  if (!s) return res.status(401).json({ error: '로그인이 필요합니다.' })
  const r = auth.changePassword(authDb, s.userId, String((req.body && req.body.newPassword) || ''))
  if (r.error) return res.status(400).json({ error: r.error })
  res.json(r)
})

// ── 브랜딩(무인증): 로그인 파티클 회사명 — 화면에 그려지는 값이라 비밀 아님(39호 S1). ──
// health 슬림 계약(37호 ④ · M-12 · e2e-w4a 0단)은 불변 — 별도 라우트로 분리.
// 인증 미들웨어보다 앞에 등록 → PUBLIC_PREFIX 무수정. 단일 필드만 노출(DB 상세 노출 금지 유지).
app.get('/api/brand', (_req, res) => {
  let companyName = ''
  try {
    const r = db.prepare("SELECT value FROM company_profile WHERE key = 'companyName'").get()
    companyName = (r && r.value) || ''
  } catch (e) {
    /* company_profile 없으면 '' */
  }
  res.json({ companyName })
})

// ── 인증 미들웨어: 이 지점 이후의 /api/* 와 SPA(/) 는 세션 필수 ──
// 권한(누가)은 아래 디스패처의 PROTECTED 로. 여기서는 "로그인 여부"만 본다.
// 로그인 페이지·인증 라우트는 이 미들웨어보다 앞에 등록됨 → 여기 도달 안 함.
// 나머지(정적 자산·폴리필·SPA·디스패처)는 전부 인증 필요(자산은 인증 후 index.html 이 요청).
const PUBLIC_PREFIX = ['/login', '/setup', '/api/setup:']
app.use((req, res, next) => {
  if (req.path === '/api/health') return next()
  const s = auth.sessionOf(req)
  if (s) {
    req.session = s
    return next()
  }
  if (PUBLIC_PREFIX.some((p) => req.path.startsWith(p))) return next()
  // API 는 401 JSON, 화면 요청은 로그인 페이지로
  if (req.path.startsWith('/api/') || req.path.startsWith('/download/')) {
    return res.status(401).json({ error: '로그인이 필요합니다.' })
  }
  return res.redirect('/login')
})

// ── 채널 맵: main/ipc 핸들러를 electron shim 위에서 등록해 그대로 재사용(W1b, 소스 무수정) ──
// bridge.cjs = esbuild 번들(electron → server/electron-shim.cjs alias). 빌드: npm run build:server
let routes = new Map()
let setPendingSave = () => {}
try {
  const bridge = require('./dist/bridge.cjs')
  routes = bridge.buildRoutes()
  setPendingSave = bridge.setPendingSave || setPendingSave
  console.log(`[server] 채널 ${routes.size}개 등록 (main/ipc 재사용)`)
} catch (e) {
  console.error('[server] bridge 로드 실패 — /api 는 404 로 응답합니다:', (e && e.message) || e)
}

// ── G1 수집함 사진 스트리밍 (검수 소견 A, 8/5) ──
// base64 JSON(채널) 방식은 멀티-백KB 문자열이 JS 힙·DOM(data URL)에 3중 복사돼 렌더러가
// 얼어붙는다(실사진 검수 실증). 인증 미들웨어 뒤 = 세션 필수 · id 스코프 · receipt kind 한정
// — 정적 노출이 아니라 로그인 가드 스트림. 파일은 append-only(불변)라 캐시 허용.
// Electron 데스크톱은 기존 semimes:captureImage 채널 폴백을 그대로 쓴다(렌더러 onError 폴백).
app.get('/api/capture-image/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'id 필요' })
  let row = null
  try {
    row = db
      .prepare("SELECT attached_path FROM raw_captures WHERE id = ? AND kind IN ('receipt_in','receipt_out')")
      .get(id)
  } catch {
    row = null
  }
  if (!row || !row.attached_path || !fs.existsSync(row.attached_path)) {
    return res.status(404).json({ error: '사진 없음' })
  }
  const mime = String(row.attached_path).toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'
  res.setHeader('Content-Type', mime)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  fs.createReadStream(row.attached_path)
    .on('error', () => {
      if (!res.headersSent) res.status(500)
      res.end()
    })
    .pipe(res)
})

// ── 파일 다운로드(W2 3착): 저장 다이얼로그 채널 → 서버 temp 생성 → 스트림 다운로드 ──
// 핸들러 소스 무수정: 서버가 showSaveDialog 반환 경로를 주입하면 핸들러가 그 경로에 파일을 만든다.
// 응답에 download URL 을 실어 보내면 폴리필(web-api)이 브라우저 다운로드를 트리거한다.
const EXPORT_DIR = path.join(DATA_DIR, 'exports')
mkdirSafe(EXPORT_DIR)
const downloadTokens = new Map() // token → { filePath, name, createdAt }

// 8/6 검수 Minor: 미수령 토큰·파일 무만료 → 30분 TTL(10분 주기 청소) + 기동 시 고아 파일 정리(24h)
const DOWNLOAD_TTL_MS = 30 * 60 * 1000
setInterval(() => {
  const now = Date.now()
  for (const [t, info] of downloadTokens) {
    if (now - (info.createdAt || 0) > DOWNLOAD_TTL_MS) {
      try { fs.unlinkSync(info.filePath) } catch { continue } // 잠김 — 토큰 유지, 다음 주기 재시도(8/11 검수)
      downloadTokens.delete(t)
    }
  }
}, 10 * 60 * 1000).unref()
try {
  for (const f of fs.readdirSync(EXPORT_DIR)) {
    const p = path.join(EXPORT_DIR, f)
    try {
      if (Date.now() - fs.statSync(p).mtimeMs > 24 * 3600 * 1000) fs.unlinkSync(p)
    } catch { /* 개별 파일 실패 무시 */ }
  }
} catch { /* EXPORT_DIR 미존재 등 */ }
// 저장 다이얼로그를 쓰는 채널 → 다운로드 확장자
// M-1/S-5(8/13 전수 검수): 종전 키 3개가 실존하지 않는 채널명이었다('fmea:export'·
// 'report:export'·'sqReport:export') — 그 결과 웹에서 FMEA 신판·양식채점 리포트·SQ 평가
// 엑셀이 전부 무음 취소(shim 미주입 = canceled)였다. 실채널명으로 정정 = 다운로드 소생.
const SAVE_DIALOG_CHANNELS = {
  'form:exportXlsx': 'xlsx',
  'fmea:exportXlsx': 'xlsx',
  'report:exportScores': 'xlsx',
  'sq:assessExport': 'xlsx',
  'docgen:saveDialog': 'xlsx',
  // PB2 ⓔ-2 — KPI 그리드 엑셀 다운로드
  'kpi:exportXlsx': 'xlsx'
}
function mkdirSafe(d) {
  try {
    fs.mkdirSync(d, { recursive: true })
  } catch {
    /* 존재 */
  }
}
function randToken() {
  // Minor 10(D군, 8/18): Math.random → crypto 난수. 토큰이 세션에 바인딩되지만(아래) 추측
  // 자체도 막는 이중화 — 비용 0.
  return crypto.randomBytes(16).toString('hex')
}

// ── 등록된 채널 목록(W2 스모크 리스트용) ──
app.get('/api/__channels', (_req, res) => {
  res.json({ count: routes.size, channels: [...routes.keys()].sort() })
})

// ── 채널별 필수 payload 가드 (W2 2착 2순위) ──
// 프레임워크 아님 — DTO(shared/ipc-types)가 `{ id: number }` 로 못박은 채널만 넣는다(추측 금지,
// 오차단 방지). W2 1착 스모크에서 빈 payload 로 삭제/수정/조회가 통과하던 것을 400 으로 거부한다.
// 권한(누가 부를 수 있나)은 여전히 W3 범위 — 여기서는 "형태"만 본다.
const REQUIRED_FIELDS = {
  'appUser:delete': ['id'],
  'appUser:resetPassword': ['id', 'newPassword'],
  'case:distribute': ['id'],
  'case:get': ['id'],
  'case:update': ['id'],
  'fmea:rowDelete': ['id'],
  'form:revisionGet': ['id'],
  'form:submissionDelete': ['id'],
  'form:submissionGet': ['id'],
  'msa:delete': ['id'],
  'obligation:complete': ['id'],
  'obligation:delete': ['id'],
  'obligation:triggerComplete': ['issueId'],
  'schedule:delete': ['id'],
  // G1 수집함 (마이그 0136 — 쓰기 2채널)
  'semimes:captureCreate': ['kind', 'imageBase64'],
  'semimes:captureTag': ['captureId', 'kind', 'docDate', 'partnerCode'],
  'semimes:captureImage': ['id'],
  // PC 기록 쓰기 (29번 §4 — 마이그 0137)
  'semimes:scanResolve': ['query'],
  'semimes:lotIssue': ['itemCode'],
  'semimes:prodRecordCreate': ['recordDate', 'itemCode'],
  'semimes:inspRecordCreate': ['inspDate', 'inspKind', 'itemCode', 'judgment'],
  'semimes:recordCancel': ['kind', 'id', 'reason'],
  'semimes:inspConfirm': ['id'],
  // W4-B(#19) — 권한 매트릭스 저장(0142)
  'perm:save': ['subjectKind', 'subjectKey', 'pageIds']
}

// 권한 가드(W3-4): 채널 → 허용 role. 없는 채널은 "로그인만"(미들웨어가 이미 보장).
// 스모크 표에서 무인증 응답하던 관리성 채널 — 지시서 §3(도래일=exec/manager, 사용자관리=manager+).
const PROTECTED = {
  'obligation:resetDue': ['executive', 'manager'],
  // C-1(8/13 전수 검수 — 권한 승격 봉쇄, TODO 정본 8/13 도장): 사용자 관리 = 조직 설계 행위 →
  // executive 전용. manager+ 로 두면 팀장이 클릭 4번으로 자기 role 을 경영진으로 승격해
  // 판정①(권한 배분 = 사장님 고유)이 무력화된다. 7/25 "관리팀이 비번 재설정" 운용은
  // 이 봉쇄와 충돌 — 사장님 전용으로 좁힘(manager 재확대는 안정 후 재론 1줄 자리).
  'appUser:resetPassword': ['executive'],
  'appUser:upsert': ['executive'],
  'appUser:delete': ['executive'],
  // W4-A(37호 배치A — 관리성 채널 점검): 경영지표·공유 분모의 정비는 manager+ 로.
  // 현장 쓰기 채널(실적·검사·LOT·지시·설비 등록 = 생산팀 주체 8/12 판정)은 member 유지 —
  // 화면×7종 정밀 통제는 배치B(#19 권한 매트릭스)의 몫, 여기는 명백 관리성 3종만.
  'semimes:workCalendarSave': ['manager', 'executive'], // 조업달력 = 도넛·심사·지표 공유 분모(0139)
  'kpi:indicatorSave': ['manager', 'executive'], // KPI 기준정보(목표·방향 = 착색·목표선 원천)
  'semimes:ppmTargetSave': ['manager', 'executive'], // PPM 목표선
  // W4-B(#19) 판정 ①(사장님 확정 8/13 — 코워크 권고 수용): 권한 배분 = 조직 설계 행위 →
  // executive 전용. manager 확대는 안정 후 재론(1줄 수정 자리). 조회(perm:list)는 로그인만.
  'perm:save': ['executive']
}

// C-1 — 사용자 관리 쓰기 3종: 디스패처가 세션 주체(actorName/actorRole)를 주입하는 대상.
const APP_USER_WRITE = new Set(['appUser:upsert', 'appUser:delete', 'appUser:resetPassword'])

// 세션 기록주체 강제 주입(W3-3, 2착 봉쇄 해소): 클라가 보낸 값은 무시하고 세션 사용자로 덮어쓴다.
// → created_by/done_by 가 항상 로그인 사용자로 스탬프되어 "작성자 불명" 우회가 불가능해진다.
//   (defaultAuthor 폴백 금지 원칙 유지 — 세션이 유일한 기록 주체.)
// M-9 처분(8/17): 이 채널들은 **필드의 유무 자체가 의미를 갖는다**(있음 = 완료 저장 의도).
// 그래서 "무조건 주입"이 아니라 "보냈을 때만 세션 값으로 덮어쓰기"다. 나머지 채널은 종전대로
// 무조건 주입 — 거기서는 유무가 의미를 갖지 않고, 빠지면 REQUIRED_FIELDS 가 400 으로 잡는다.
const STAMP_ONLY_IF_PRESENT = new Set(['form:submissionCreate', 'form:submissionUpdate'])

const STAMP_FIELDS = {
  'form:submissionCreate': ['createdBy'],
  'form:submissionUpdate': ['createdBy'],
  'obligation:complete': ['doneBy'],
  'obligation:triggerComplete': ['doneBy'],
  // G1 수집함 — 촬영자·태깅자 = 세션 사용자(29번 §2 STAMP 실명 기록)
  'semimes:captureCreate': ['createdBy'],
  'semimes:captureTag': ['createdBy'],
  // PB2 ⓔ-2 — KPI 실적 기입 주체 세션 강제(그리드 신설 편승 — 기존 화면도 동일 혜택)
  'kpi:save': ['enteredBy'],
  'kpi:save-batch': ['enteredBy'],
  // PC 기록 쓰기 — 기록주체 전부 세션 강제(29번 §2 STAMP · defaultAuthor 폴백 금지)
  'semimes:lotIssue': ['createdBy'],
  'semimes:prodRecordCreate': ['worker'],
  'semimes:inspRecordCreate': ['inspector'],
  'semimes:workOrderUpsert': ['createdBy'],
  'semimes:recordCancel': ['canceledBy'],
  'semimes:inspConfirm': ['confirmer'],
  // 34호 배치⑴ — SPEC 개정 주체·PPM 목표 기입 주체 세션 강제
  'semimes:specSave': ['createdBy'],
  'semimes:ppmTargetSave': ['savedBy'],
  // 34호 배치⑵ — 마스터 정비 주체 세션 강제
  'semimes:itemUpdate': ['updatedBy'],
  'semimes:partnerUpdate': ['updatedBy'],
  // 34호 배치⑶ — 조업달력 기입 주체 세션 강제(분모의 원천 = 누가 적었는지 각인)
  'semimes:workCalendarSave': ['updatedBy'],
  // 34호 배치⑷ — 설비·금형·KPI 기준정보 정비 주체 세션 강제
  'semimes:equipSave': ['updatedBy'],
  'semimes:moldSave': ['updatedBy'],
  'kpi:indicatorSave': ['updatedBy'],
  // W4-B(#19) — 매트릭스 저장 주체 세션 강제 + effective 는 세션 사용자 자신만 조회
  'perm:save': ['updatedBy'],
  'perm:effective': ['userName']
}

// ══ W4-B(37호 배치B — 34호 #19): 화면×7종 권한 매트릭스 강제(서버가 정본) ══
// 0142 screen_permission — 규칙이 있는 (주체, 화면)에만 효력. 규칙 부재 = 현행 허용
// (PROTECTED role 가드는 그대로 바닥 — 두 관문 모두 통과해야 실행).
// 매핑 원칙 = REQUIRED_FIELDS 와 동일: 채널→화면 귀속이 DTO 수준으로 명백한 것만 넣는다
// (추측 금지·오차단 방지 — 여러 화면이 공유하는 조회·완료 채널은 매핑하지 않음).
// 읽기·프린트 축은 렌더러 화면 숨김(보조)만 — 조회 채널은 화면 합성 공유가 많아 단사상이
// 아니므로 서버 차단 시 무관 화면이 깨진다(범위·근거는 검수요청 문서 명기).
// page 가 함수면 payload 로 화면 판별(recordCancel 의 kind 축).
const SCREEN_GUARD = {
  // 쓰기(write)
  'semimes:workOrderUpsert': { page: 'work-order', act: 'write' },
  'semimes:lotIssue': { page: 'prod-entry', act: 'write' },
  'semimes:prodRecordCreate': { page: 'prod-entry', act: 'write' },
  'semimes:inspRecordCreate': { page: 'insp-entry', act: 'write' },
  'semimes:captureCreate': { page: 'receipt-inbox', act: 'write' },
  'semimes:captureTag': { page: 'receipt-inbox', act: 'write' },
  'semimes:workCalendarSave': { page: 'work-calendar', act: 'write' },
  'semimes:specSave': { page: 'insp-spec', act: 'write' },
  'semimes:equipSave': { page: 'equip-master', act: 'write' },
  'semimes:moldSave': { page: 'mold-master', act: 'write' },
  'semimes:ppmTargetSave': { page: 'ppm-dash', act: 'write' },
  'kpi:save': { page: 'kpi-grid', act: 'write' },
  'kpi:save-batch': { page: 'kpi-grid', act: 'write' },
  'kpi:indicatorSave': { page: 'kpi-indicators', act: 'write' },
  // 수정(edit)
  'semimes:itemUpdate': { page: 'item-master', act: 'edit' },
  'semimes:partnerUpdate': { page: 'partner-master', act: 'edit' },
  'semimes:inspConfirm': { page: 'insp-entry', act: 'edit' },
  // 삭제(delete) — append-only 취소 = 삭제 축. kind 로 화면 판별
  'semimes:recordCancel': {
    page: (body) => (body.kind === 'insp' ? 'insp-entry' : body.kind === 'receipt' ? 'mat-receipts' : 'prod-entry'),
    act: 'delete'
  },
  // 엑셀(excel) — 내보내기 채널 중 화면 귀속 명백 3종
  // M-1(8/13 검수): 'fmea:export' 는 실존하지 않는 채널명 — 가드가 죽어 있었다. 실채널로 정정.
  'kpi:exportXlsx': { page: 'kpi-grid', act: 'excel' },
  'fmea:exportXlsx': { page: 'fmea', act: 'excel' },
  'form:exportXlsx': { page: 'form-builder', act: 'excel' }
}
const ACT_COL = { write: 'can_write', edit: 'can_edit', delete: 'can_delete', excel: 'can_excel' }
const ACT_LABEL = { write: '쓰기', edit: '수정', delete: '삭제', excel: '엑셀' }

// 세션 사용자의 (화면) 유효 규칙: 개인 행이 팀 행을 통째로 대체(그림33 오버라이드).
// executive = 최종관리자 전권(규칙 무시). 0142 미적용 등 조회 불능 = 현행 유지(가짜 차단 금지).
function screenRuleOf(session, pageId) {
  if (!session || session.role === 'executive') return null
  try {
    const u = db
      .prepare("SELECT * FROM screen_permission WHERE subject_kind = 'user' AND subject_key = ? AND page_id = ?")
      .get(String(session.userId), pageId)
    if (u) return u
    if (!session.teamDept) return null
    return (
      db
        .prepare("SELECT * FROM screen_permission WHERE subject_kind = 'team' AND subject_key = ? AND page_id = ?")
        .get(session.teamDept, pageId) || null
    )
  } catch (e) {
    // 조회 불능 = 현행 유지(가짜 차단 금지) — 단 무음 금지(8/13 검수 Minor): 로그 1줄.
    console.error('[perm] screen_permission 조회 실패 — 현행 유지로 통과:', (e && e.message) || e)
    return null
  }
}

// ── POST /api/{channel} 디스패처 ──
// IPC 핸들러 시그니처 (event, payload) 를 그대로 호출한다(event 미사용 — §0.5 대조로 확인).
app.post('/api/\:channel', (req, res) => {
  const ch = req.params.channel
  const fn = routes.get(ch)
  if (!fn) return res.status(404).json({ error: `미구현 채널: ${ch}` })

  // 권한 가드(W3-4): 로그인은 미들웨어가 이미 보장 — 여기서는 role 확인.
  const allowedRoles = PROTECTED[ch]
  if (allowedRoles && !(req.session && allowedRoles.includes(req.session.role))) {
    return res.status(403).json({ error: `권한 부족: '${ch}' 는 ${allowedRoles.join('/')} 전용입니다.` })
  }

  // 화면×7종 매트릭스(W4-B — 0142): role 바닥 통과 후 화면 규칙 확인(서버가 정본).
  const guard = SCREEN_GUARD[ch]
  if (guard) {
    const pageId = typeof guard.page === 'function' ? guard.page(req.body || {}) : guard.page
    const rule = pageId ? screenRuleOf(req.session, pageId) : null
    if (rule && rule[ACT_COL[guard.act]] !== 1) {
      return res.status(403).json({
        error: `권한 매트릭스: '${pageId}' 화면의 ${ACT_LABEL[guard.act]} 권한이 없습니다 — 관리자(권한 매트릭스 화면)에 문의하세요.`
      })
    }
  }

  // 세션 기록주체 강제 주입(W3-3): 클라 값 무시, 세션 사용자로 덮어씀.
  // ★M-9(8/13 검수 · 라이브 데이터 소실 — 8/17 처분): 양식 저장 2채널만은 **값을 보냈을 때만**
  //   덮어쓴다. 핸들러가 `createdBy` 의 **존재 여부**를 "완료 저장" 신호로 쓰는데(form-handlers
  //   §W2 2착), STAMP 가 무조건 채우는 바람에 **초안 저장·자동저장까지 완료 저장으로 오인**돼
  //   fact 공란 검사에 걸려 500 이 났다. 그 예외를 자동저장 catch 가 삼켜 **작성 중 내용이
  //   말없이 사라졌다**(라이브 현존 결함).
  //   ⚠위조 방어는 그대로다 — 값을 보내면 **언제나 세션 이름으로 덮어쓴다**. 클라가 통제하는
  //   것은 "값"이 아니라 "완료 의도(필드 유무)"뿐이고, 그건 종전에도 클라의 몫이었다.
  //   폴백 금지 원칙도 유지된다(서버가 주체를 지어내지 않는다 — 없으면 없는 채로 초안).
  const stamp = STAMP_FIELDS[ch]
  if (stamp && req.session) {
    req.body = req.body || {}
    const onlyIfPresent = STAMP_ONLY_IF_PRESENT.has(ch)
    for (const fld of stamp) {
      const v = req.body[fld]
      if (onlyIfPresent && (v === undefined || v === null || v === '')) continue
      req.body[fld] = req.session.name
    }
  }

  // C-1(8/13 전수 검수): 사용자 관리 쓰기 = 실행 주체(누가·어떤 role)를 세션에서 강제 주입.
  // 클라가 보낸 actor* 값은 무시된다(STAMP 와 동일 원칙). 핸들러가 actorRole 로
  // "manager 는 executive 를 만들 수도 건드릴 수도 없다"를 2중 방어하고, actor 빈 값
  // (데스크톱 bridge 직행 = 세션 없음)은 거부한다 — W4-C 데스크톱 방어선과 동일 계약.
  if (APP_USER_WRITE.has(ch) && req.session) {
    req.body = req.body || {}
    req.body.actorName = req.session.name
    req.body.actorRole = req.session.role
  }

  const required = REQUIRED_FIELDS[ch]
  if (required) {
    const body = req.body || {}
    const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length > 0) {
      return res.status(400).json({ error: `필수 값 누락: ${missing.join(', ')} — 채널 ${ch}` })
    }
  }

  // M-6(D군, 8/18): 권한 원천(app_users) 변경 채널은 실행 전 role/active 스냅샷을 떠 둔다 —
  // 성공 후 실변경 여부를 대조해 대상 사용자의 세션을 무효화(role 은 로그인 시점 스냅샷이라
  // 변경이 기존 세션에 반영될 길이 없었다). 신설(before 없음)은 세션 자체가 없어 해당 없음.
  let permBefore = null
  if (ch === 'appUser:upsert') {
    const b = req.body || {}
    try {
      permBefore =
        b.id != null
          ? db.prepare('SELECT id, role, active FROM app_users WHERE id = ?').get(b.id)
          : db.prepare('SELECT id, role, active FROM app_users WHERE name = ?').get(String(b.name || '').trim())
    } catch (e) {
      permBefore = null
    }
  }

  // 저장 다이얼로그 채널 → 서버 temp 경로 주입(핸들러가 그 경로에 파일 생성)
  const ext = SAVE_DIALOG_CHANNELS[ch]
  let token = null
  if (ext) {
    token = randToken()
    const raw = (req.body && (req.body.defaultName || req.body.fileName)) || `${ch.replace(/:/g, '_')}.${ext}`
    const name = String(raw).endsWith('.' + ext) ? String(raw) : `${raw}.${ext}`
    const filePath = path.join(EXPORT_DIR, `${token}.${ext}`)
    // Minor 10(D군, 8/18): 토큰을 발급 세션(sid)에 바인딩 — 다른 로그인자의 선취(30분 창) 차단.
    downloadTokens.set(token, { filePath, name, createdAt: Date.now(), sid: req.session && req.session.sid })
    setPendingSave(filePath)
  }

  ;(async () => {
    try {
      const result = await Promise.resolve(fn(null, req.body))

      // M-6(D군): 성공한 권한 원천 변경 → 대상 사용자 세션 즉시 무효화.
      // delete/resetPassword = 무조건(삭제·비번 교체는 그 자체가 변경), upsert = role/active 실변경 시만
      // (이름·팀 등 무해 편집으로 남을 로그아웃시키지 않는다). 대상 = 본인이어도 동일 적용(정직 효력).
      if (result && result.success === true) {
        try {
          if ((ch === 'appUser:delete' || ch === 'appUser:resetPassword') && req.body && req.body.id != null) {
            const n = auth.invalidateUserSessions(Number(req.body.id))
            if (n) console.log(`[m6] ${ch} → 세션 무효화 ${n}건 (user ${req.body.id})`)
          } else if (ch === 'appUser:upsert' && permBefore) {
            const after = db.prepare('SELECT role, active FROM app_users WHERE id = ?').get(permBefore.id)
            if (after && (after.role !== permBefore.role || after.active !== permBefore.active)) {
              const n = auth.invalidateUserSessions(Number(permBefore.id))
              if (n) console.log(`[m6] appUser:upsert role/active 변경 → 세션 무효화 ${n}건 (user ${permBefore.id})`)
            }
          }
        } catch (e) {
          console.error('[m6] 세션 무효화 실패(응답은 정상 진행):', (e && e.message) || e)
        }
      }

      if (token) {
        setPendingSave(null)
        const info = downloadTokens.get(token)
        const ok = result && result.success !== false && info && fs.existsSync(info.filePath)
        if (ok) {
          result.download = `/download/${token}` // 폴리필이 브라우저 다운로드 트리거
          result.canceled = false
        } else {
          downloadTokens.delete(token)
        }
      }
      res.json(result === undefined ? null : result)
    } catch (e) {
      if (token) {
        setPendingSave(null)
        downloadTokens.delete(token)
      }
      res.status(500).json({ error: String((e && e.message) || e) })
    }
  })()
})

// ── GET /download/:token — 서버가 생성한 파일 스트림(Content-Disposition) ──
app.get('/download/:token', (req, res) => {
  const info = downloadTokens.get(req.params.token)
  if (!info || !fs.existsSync(info.filePath)) return res.status(404).send('다운로드 만료 또는 없음')
  // Minor 10(D군, 8/18): 발급 세션만 수령 가능 — 미들웨어가 로그인은 보장하지만 "누구의
  // 토큰인가"는 여기서만 판정할 수 있다. sid 미기록 토큰(이론상 없음)은 fail-closed.
  if (!info.sid || !req.session || req.session.sid !== info.sid) {
    return res.status(403).send('다운로드 소유 세션이 아닙니다 — 내보내기를 다시 실행하세요.')
  }
  res.download(info.filePath, info.name, (err) => {
    if (!err) {
      // 1회 전달 후 정리(temp 누적 방지)
      try {
        fs.unlinkSync(info.filePath)
      } catch {
        /* 잠김 등 — 다음 기회 */
      }
      downloadTokens.delete(req.params.token)
    }
  })
})

// ── 정적 서빙 (renderer 빌드) + window.api 폴리필 주입 ──
// 렌더러 산출물은 무수정. 서버가 index.html <head> 에 폴리필 <script> 를 끼워 넣어 서빙한다
// (Electron 의 preload 자리 = 브라우저에선 이 스크립트). 지시서 §1.1 "어댑터 한 겹".
const RENDERER_DIR = path.join(__dirname, '..', 'out', 'renderer')
const INDEX_HTML = path.join(RENDERER_DIR, 'index.html')
const POLYFILL_JS = path.join(__dirname, 'dist', 'web-api.js')

app.get('/__web-api.js', (_req, res) => {
  if (!fs.existsSync(POLYFILL_JS)) return res.status(404).send('// 폴리필 미빌드: npm run build:server')
  res.type('application/javascript').send(fs.readFileSync(POLYFILL_JS, 'utf-8'))
})

if (fs.existsSync(RENDERER_DIR)) {
  // index.html 은 아래 주입 라우트가 담당 → static 의 자동 index 서빙은 끈다
  app.use(express.static(RENDERER_DIR, { index: false }))
}

function sendInjectedIndex(res) {
  if (!fs.existsSync(INDEX_HTML)) {
    return res.status(404).send('renderer 빌드 없음 — npm run build 후 다시 시도하세요.')
  }
  const html = fs.readFileSync(INDEX_HTML, 'utf-8')
  const tag = '<script src="/__web-api.js"></script>'
  const injected = html.includes(tag) ? html : html.replace(/<head([^>]*)>/i, `<head$1>\n    ${tag}`)
  res.type('html').send(injected)
}

// SPA 라우팅 — /api 외 모든 GET 은 주입된 index.html
app.get(/^\/(?!api\/|__web-api\.js).*/, (_req, res) => sendInjectedIndex(res))

const PORT = Number(process.env.PORT) || 8080

// ⚠️⚠️ 바인딩 가드레일 — W3(로그인·권한) 완료 전까지 127.0.0.1 고정. **해제 금지**.
// 사유: 현재 서버에는 권한 가드가 0이다. 스모크(W2 1착)에서 확인된 대로
//   obligation:resetDue(경영진 전용 도래일 재설정)·appUser:upsert/delete 같은 채널이
//   무인증 빈 payload 호출에도 응답한다. 사내망(0.0.0.0)에 열면 누구나 호출 가능해진다.
// 해제 조건: W3 로그인 세션 + role 가드(executive/manager) 적용 후에만 HOST 를 개방한다.
// (코워크 지시 2026-07-24 — env 로도 못 바꾸도록 하드코딩)
const HOST = '127.0.0.1'
app.listen(PORT, HOST, () => {
  console.log(`[server] IATF QMS (W1 골격) → http://${HOST}:${PORT}`)
  console.log(`[server] DB=${DB_PATH} (readonly)`)
  // N-6: 기동 로그로도 라이브/복사본을 못 박는다(health 를 못 보는 재기동 창에서의 오인 방지)
  console.log(`[server] 대상 = ${IS_COPY_SERVER ? '검수 복사본(copy=true)' : '★라이브(copy=false)'}`)
})

module.exports = { app, db, routes }
