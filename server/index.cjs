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

// ── DB 연결 (env 로 데이터 루트 외부화 — 서버엔 userData 개념 없음) ──
const DATA_DIR = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || '', 'iatf16949-manager')
const DB_PATH = path.join(DATA_DIR, 'iatf16949.db')
if (!fs.existsSync(DB_PATH)) {
  console.error(`[server] DB 없음: ${DB_PATH} — IATF_DATA_DIR 로 지정하세요.`)
  process.exit(1)
}
// W1 은 읽기 위주(홈). 쓰기(obligation:complete 등)는 W1b/W2 에서 readonly 해제.
const db = new Database(DB_PATH, { readonly: true, fileMustExist: true })
db.pragma('busy_timeout = 4000')

const app = express()
app.use(express.json({ limit: '8mb' }))

// ── 헬스체크(골격 실증) ──
app.get('/api/health', (_req, res) => {
  const forms = db.prepare('SELECT COUNT(*) AS c FROM forms').get().c
  const obl = db.prepare('SELECT COUNT(*) AS c FROM recurring_obligations WHERE active=1').get().c
  const users = db.prepare('SELECT COUNT(*) AS c FROM app_users WHERE active=1').get().c
  res.json({ ok: true, db: DB_PATH, forms, obligations: obl, users, runtime: `electron-node ${process.versions.modules}` })
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

// ── 파일 다운로드(W2 3착): 저장 다이얼로그 채널 → 서버 temp 생성 → 스트림 다운로드 ──
// 핸들러 소스 무수정: 서버가 showSaveDialog 반환 경로를 주입하면 핸들러가 그 경로에 파일을 만든다.
// 응답에 download URL 을 실어 보내면 폴리필(web-api)이 브라우저 다운로드를 트리거한다.
const EXPORT_DIR = path.join(DATA_DIR, 'exports')
mkdirSafe(EXPORT_DIR)
const downloadTokens = new Map() // token → { filePath, name }
// 저장 다이얼로그를 쓰는 채널 → 다운로드 확장자
const SAVE_DIALOG_CHANNELS = {
  'form:exportXlsx': 'xlsx',
  'fmea:export': 'xlsx',
  'report:export': 'xlsx',
  'sqReport:export': 'xlsx',
  'docgen:saveDialog': 'xlsx'
}
function mkdirSafe(d) {
  try {
    fs.mkdirSync(d, { recursive: true })
  } catch {
    /* 존재 */
  }
}
function randToken() {
  // Math.random 사용(파일 토큰용, 보안 토큰 아님). 시간+랜덤.
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
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
  'schedule:delete': ['id']
}

// ── POST /api/{channel} 디스패처 ──
// IPC 핸들러 시그니처 (event, payload) 를 그대로 호출한다(event 미사용 — §0.5 대조로 확인).
app.post('/api/:channel', (req, res) => {
  const ch = req.params.channel
  const fn = routes.get(ch)
  if (!fn) return res.status(404).json({ error: `미구현 채널: ${ch}` })

  const required = REQUIRED_FIELDS[ch]
  if (required) {
    const body = req.body || {}
    const missing = required.filter((k) => body[k] === undefined || body[k] === null || body[k] === '')
    if (missing.length > 0) {
      return res.status(400).json({ error: `필수 값 누락: ${missing.join(', ')} — 채널 ${ch}` })
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
    downloadTokens.set(token, { filePath, name })
    setPendingSave(filePath)
  }

  ;(async () => {
    try {
      const result = await Promise.resolve(fn(null, req.body))
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
})

module.exports = { app, db, routes }
