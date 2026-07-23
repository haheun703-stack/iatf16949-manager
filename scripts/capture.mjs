// ============================================================
// scripts/capture.mjs — CDP 캡처 파이프라인 (2026-07-23 재구축)
//
// 검수 스크린샷 정식 도구. Chrome DevTools Protocol 의 Page.captureScreenshot 을 써서
// 렌더러 픽셀을 그대로 캡처한다 — DPI 배율 무관, 창이 가려져도 정상(PrintWindow 의
// "낡은 프레임"·"우측 잘림 오탐" 문제가 원천적으로 없음). 순수 Node(내장 WebSocket/fetch,
// node 22+) 로 동작 — 외부 의존성 0.
//
// 전제: dev 가 떠 있어야 한다(main/index.ts 가 dev 한정으로 --remote-debugging-port=9222 개방).
//   1) (기존 dev/electron 좀비 정리 후) `npm run dev`
//   2) 창이 뜨면 이 스크립트 실행
// 네비게이션: renderer(main.tsx)가 dev 한정으로 window.__cap 노출 → 페이지 결정론적 전환.
//
// 사용법:
//   node scripts/capture.mjs                         # 기본 프리셋(대표 화면 일괄)
//   node scripts/capture.mjs --page doc-browse       # 단일 페이지
//   node scripts/capture.mjs --page form-builder --form L1100-04 --name l1100-04
//   node scripts/capture.mjs --config caps.json      # [{name,page,formCode?,waitMs?,full?}]
// 옵션: --out <dir>(기본 ./captures) --port <n>(9222) --wait <ms>(900) --full(전체페이지)
// ============================================================

import { writeFileSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { readFileSync } from 'fs'

// ── CLI 파싱 ────────────────────────────────────────────────
function parseArgs(argv) {
  const a = { out: 'captures', port: 9222, wait: 900, full: false }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--page') a.page = argv[++i]
    else if (k === '--name') a.name = argv[++i]
    else if (k === '--form') a.form = argv[++i]
    else if (k === '--config') a.config = argv[++i]
    else if (k === '--out') a.out = argv[++i]
    else if (k === '--port') a.port = Number(argv[++i])
    else if (k === '--wait') a.wait = Number(argv[++i])
    else if (k === '--full') a.full = true
    else console.warn('[capture] 알 수 없는 인자 무시:', k)
  }
  return a
}

// ── 기본 프리셋: 대표 화면 (인자 없을 때) ──────────────────────
const DEFAULT_PRESET = [
  { name: 'home', page: 'home' },
  { name: 'doc-browse', page: 'doc-browse' },
  { name: 'iatf-dashboard', page: 'iatf-dashboard' },
  { name: 'sq-dashboard', page: 'sq-dashboard' }
]

// ── 최소 CDP 클라이언트 (내장 WebSocket) ─────────────────────
class CDP {
  constructor(ws) {
    this.ws = ws
    this.id = 0
    this.pending = new Map()
    ws.addEventListener('message', (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)
        this.pending.delete(msg.id)
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)))
        else resolve(msg.result)
      }
    })
  }
  send(method, params = {}) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP timeout: ${method}`))
        }
      }, 30000)
    })
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// dev 가 뜰 때까지 target 목록을 재시도로 얻는다
async function findPageTarget(port, tries = 20) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`)
      const list = await res.json()
      // renderer 페이지: type==='page' 이고 devtools 내부 target 제외
      const page = list.find(
        (t) => t.type === 'page' && !String(t.url).startsWith('devtools://')
      )
      if (page && page.webSocketDebuggerUrl) return page
    } catch {
      /* 아직 안 뜸 */
    }
    await sleep(500)
  }
  throw new Error(
    `디버깅 포트 ${port} 에서 renderer 페이지를 못 찾음. dev 가 떠 있고 창이 로드됐는지 확인.`
  )
}

async function openCdp(wsUrl) {
  const ws = new WebSocket(wsUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', (e) => reject(new Error('WebSocket 연결 실패: ' + (e.message || ''))), {
      once: true
    })
  })
  return new CDP(ws)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  // 캡처 목록 결정: --config > 단일 --page > 기본 프리셋
  let shots
  if (args.config) {
    shots = JSON.parse(readFileSync(resolve(args.config), 'utf-8'))
  } else if (args.page) {
    shots = [
      {
        name: args.name || args.page,
        page: args.page,
        formCode: args.form,
        full: args.full
      }
    ]
  } else {
    shots = DEFAULT_PRESET.map((s) => ({ ...s, full: args.full }))
  }

  const outDir = resolve(args.out)
  mkdirSync(outDir, { recursive: true })

  console.log(`[capture] 포트 ${args.port} 에서 renderer 탐색…`)
  const target = await findPageTarget(args.port)
  console.log(`[capture] target: ${target.title || target.url}`)
  const cdp = await openCdp(target.webSocketDebuggerUrl)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  // window.__cap 준비 확인(렌더러가 dev 노출을 마쳤는지)
  const ready = await cdp.send('Runtime.evaluate', {
    expression: 'typeof window.__cap',
    returnByValue: true
  })
  if (ready.result.value !== 'object') {
    throw new Error('window.__cap 미노출 — dev 빌드(import.meta.env.DEV)인지, main.tsx 반영됐는지 확인.')
  }

  const saved = []
  for (const shot of shots) {
    const opts = {}
    if (shot.formCode != null) opts.formCode = shot.formCode
    if (shot.submissionId != null) opts.submissionId = shot.submissionId
    if (shot.team != null) opts.team = shot.team
    if (shot.processCode != null) opts.processCode = shot.processCode
    if (shot.clauseId != null) opts.clauseId = shot.clauseId

    // 결정론적 네비게이션
    await cdp.send('Runtime.evaluate', {
      expression: `window.__cap.goto(${JSON.stringify(shot.page)}, ${JSON.stringify(opts)})`,
      awaitPromise: true,
      returnByValue: true
    })
    await sleep(shot.waitMs ?? args.wait) // 렌더/데이터 로드 안정화

    // 캡처 — DPI 무관. full 이면 뷰포트 밖까지.
    const params = { format: 'png', captureBeyondViewport: !!shot.full }
    const { data } = await cdp.send('Page.captureScreenshot', params)
    const file = join(outDir, `${shot.name}.png`)
    writeFileSync(file, Buffer.from(data, 'base64'))
    saved.push(file)
    console.log(`[capture] ✓ ${shot.page} → ${file}`)
  }

  cdp.ws.close()
  console.log(`\n[capture] 완료 — ${saved.length}장 저장: ${outDir}`)
}

// 성공/실패 모두 명시적 종료 — 내장 WebSocket close 후에도 이벤트 루프가 남아 매달리는 것 방지.
main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[capture] 실패:', err.message)
    process.exit(1)
  })
