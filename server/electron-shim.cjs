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

/** 채널 → 핸들러. ipcMain.handle 이 여기에 쌓고, 서버가 읽어 디스패치한다. */
const routes = new Map()

// 데이터 루트: 서버엔 userData 개념이 없으므로 env 로 외부화(§0.5 난관2).
const DATA_DIR = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || os.homedir(), 'iatf16949-manager')

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
  getName: () => 'iatf16949-manager',
  getVersion: () => process.env.APP_VERSION || '1.0.0',
  getAppPath: () => path.join(__dirname, '..'),
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

// ── 서버에서 의미 없는 데스크톱 UI — 안전 스텁(호출되면 취소/무동작). W2 에서 HTTP 로 대체 ──
const dialog = {
  showSaveDialog: async () => ({ canceled: true, filePath: undefined }),
  showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
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
  __dataDir: DATA_DIR
}
