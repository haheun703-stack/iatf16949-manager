// ============================================================
// server/electron-shim.cjs — 웹 전환 W1b: electron 모듈 대체 스텁
//
// 목적: main/ipc 핸들러 **소스를 수정하지 않고** 서버에서 그대로 재사용한다(지시서 §1 "이사").
//   번들 시 `electron` import 를 이 파일로 alias → 핸들러의 `ipcMain.handle(ch, fn)` 이
//   실제 IPC 대신 라우트 맵에 등록되고, Express 가 그 맵으로 POST /api/{channel} 을 디스패치한다.
//
// 대조 근거(§0.5): 홈 핸들러 체인(team·kpi·app-users·obligation·sq)의 electron 의존은 `ipcMain`
//   뿐이고, DB 는 connection.ts 의 `app.getPath('userData')` 하나 → 아래 두 개만으로 관통된다.
//   나머지(dialog·shell·BrowserWindow)는 W2 의 파일 업/다운로드 API 로 대체될 자리라 안전 스텁.
// ============================================================
const path = require('path')
const os = require('os')
const fs = require('fs')

/** 채널 → 핸들러. ipcMain.handle 이 여기에 쌓고, 서버가 읽어 디스패치한다. */
const routes = new Map()

// 데이터 루트: 서버엔 userData 개념이 없으므로 env 로 외부화(§0.5 난관2).
const DATA_DIR = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || os.homedir(), 'iatf16949-manager')

// 앱 루트(= resources/ 를 품은 폴더). N-12(8/15 A′ 실증 중 발견): 종전 `join(__dirname,'..')` 은
//   **번들 후** __dirname 이 server/dist 라 <root>/server 를 가리켰다 → getAppPath 소비처
//   (sq-report-exporter 템플릿)가 없는 폴더를 봐서 웹 SQ 리포트 내보내기가 항상 "템플릿 없음" 실패.
//   번들 위치에 의존하지 않도록 resources/migrations 를 품은 조상 폴더를 찾아 올라간다.
function findAppRoot(start) {
  let dir = start
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'resources', 'migrations'))) return dir
    const up = path.dirname(dir)
    if (up === dir) break
    dir = up
  }
  return path.join(start, '..') // 못 찾으면 종전 동작 보존
}
const APP_ROOT = findAppRoot(__dirname)

const app = {
  getPath(name) {
    switch (name) {
      case 'userData':
        return DATA_DIR
      case 'appData':
        return path.dirname(DATA_DIR)
      case 'temp':
        return os.tmpdir()
      case 'downloads':
        return path.join(os.homedir(), 'Downloads')
      default:
        return DATA_DIR
    }
  },
  setPath() {
    /* 서버는 경로 고정(env) — no-op */
  },
  isPackaged: false,
  // N-1(8/14 검수 2차): 핸들러가 "지금은 웹(서버)"임을 알 유일한 표식. 실제 Electron 의 app 엔 없다.
  // 웹의 dialog 경로는 서버가 주입한 **임시 토큰 경로**(1회 다운로드 or 30분 TTL 후 삭제)라
  // DB 에 각인하면 안 되는 자리가 있다 → 핸들러가 이 값으로 분기한다(sq-report-exporter).
  __webShim: true,
  getName: () => 'iatf16949-manager',
  getVersion: () => process.env.APP_VERSION || '1.0.0',
  getAppPath: () => APP_ROOT,
  whenReady: () => Promise.resolve(),
  on() {},
  once() {},
  quit() {},
  requestSingleInstanceLock: () => true,
  commandLine: { appendSwitch() {} }
}

const ipcMain = {
  handle(channel, fn) {
    routes.set(channel, fn)
  },
  handleOnce(channel, fn) {
    routes.set(channel, fn)
  },
  removeHandler(channel) {
    routes.delete(channel)
  },
  on() {},
  removeAllListeners() {}
}

// ── 데스크톱 파일 UI 대체(W2 3착) ──
// 서버가 요청 처리 직전 "이번 저장/열기 경로"를 주입하면, 핸들러의 dialog 호출이 그 경로를 반환한다.
// → 핸들러 소스 무수정으로 파일이 서버 경로에 생성/사용되고, 서버가 그 파일을 스트림 다운로드/업로드 처리.
// 미주입 상태(주입 없이 호출)면 canceled 반환 = 데스크톱과 동일한 "취소" 동작(안전).
let pendingSave = null // { filePath } | null
let pendingOpen = null // { filePaths: string[] } | null
const dialog = {
  showSaveDialog: async () => {
    if (pendingSave) {
      const r = { canceled: false, filePath: pendingSave.filePath }
      pendingSave = null // 1회 소비
      return r
    }
    return { canceled: true, filePath: undefined }
  },
  showOpenDialog: async () => {
    if (pendingOpen) {
      const r = { canceled: false, filePaths: pendingOpen.filePaths }
      pendingOpen = null // 1회 소비
      return r
    }
    return { canceled: true, filePaths: [] }
  },
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox() {}
}
const shell = {
  openExternal: async () => {},
  openPath: async () => '',
  showItemInFolder() {}
}
class BrowserWindowStub {}
BrowserWindowStub.getFocusedWindow = () => null
BrowserWindowStub.getAllWindows = () => []
BrowserWindowStub.fromWebContents = () => null

const webFrame = { setZoomFactor() {}, getZoomFactor: () => 1 }
const nativeImage = { createFromPath: () => ({ isEmpty: () => true }) }

module.exports = {
  app,
  ipcMain,
  dialog,
  shell,
  webFrame,
  nativeImage,
  BrowserWindow: BrowserWindowStub,
  /** 서버가 읽는 채널 맵(shim 전용 확장) */
  __routes: routes,
  __dataDir: DATA_DIR,
  /** 다음 showSaveDialog 가 반환할 저장 경로 주입(1회 소비). null 이면 취소 동작. */
  __setPendingSave(filePath) {
    pendingSave = filePath ? { filePath } : null
  },
  /** 다음 showOpenDialog 가 반환할 열기 경로 주입(1회 소비, 업로드용). */
  __setPendingOpen(filePaths) {
    pendingOpen = filePaths && filePaths.length ? { filePaths } : null
  }
}
