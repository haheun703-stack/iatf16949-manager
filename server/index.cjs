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

// ── POST /api/{channel} 디스패처 (W1b 에서 홈 핸들러 등록) ──
// 채널→핸들러 맵. registerAllIpcHandlers 를 shim 으로 재사용하는 방식은 W1b 에서 결정/구현.
const routes = new Map()
app.post('/api/:channel', (req, res) => {
  const ch = req.params.channel
  const fn = routes.get(ch)
  if (!fn) return res.status(404).json({ error: `미구현 채널: ${ch}` })
  try {
    Promise.resolve(fn(req.body)).then((result) => res.json(result))
      .catch((e) => res.status(500).json({ error: String(e && e.message || e) }))
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) })
  }
})

// ── 정적 서빙 (renderer 빌드) — W1b 에서 out/renderer + window.api 폴리필 ──
const RENDERER_DIR = path.join(__dirname, '..', 'out', 'renderer')
if (fs.existsSync(RENDERER_DIR)) {
  app.use(express.static(RENDERER_DIR))
}

const PORT = Number(process.env.PORT) || 8080
const HOST = process.env.HOST || '127.0.0.1' // 사내망 한정(§1.5) — 외부 노출 금지
app.listen(PORT, HOST, () => {
  console.log(`[server] IATF QMS (W1 골격) → http://${HOST}:${PORT}`)
  console.log(`[server] DB=${DB_PATH} (readonly)`)
})

module.exports = { app, db, routes }
