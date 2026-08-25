import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { runMigrations } from './database/migrate'
import { seedDatabase } from './database/seed'
import { registerAllIpcHandlers } from './ipc/register'
import { closeDatabase } from './database/connection'
import { reindexKb } from './ai/kb'

// userData 고정: 패키징 시 productName("데일리Q")이 app.name 이 되어
// userData 폴더가 바뀌면 dev 에서 쌓아온 DB(%APPDATA%/iatf16949-manager)와 어긋난다.
// 설치판·dev 모두 같은 데이터 폴더를 보도록 최우선으로 고정한다.
app.setPath('userData', join(app.getPath('appData'), 'iatf16949-manager'))

// 검증용 데이터 폴더 오버라이드(dev 전용) — 복사본 DB로 앱을 띄워 E2E 검증할 때 사용.
// 예: IATF_USERDATA_DIR=<복사본 폴더> npm run dev  (M3 E2E — 라이브 무손상 검증, 15번)
if (!app.isPackaged && process.env.IATF_USERDATA_DIR) {
  app.setPath('userData', process.env.IATF_USERDATA_DIR)
}

// CDP 캡처 파이프라인(scripts/capture.mjs)용 원격 디버깅 포트 — dev 전용.
// Page.captureScreenshot 은 DPI 무관·가려진 창도 렌더러 픽셀 그대로 캡처(PrintWindow 불필요).
// ⚠️ 반드시 dev(!isPackaged)에서만: 설치판에서 열면 임의 프로세스가 렌더러를 제어 가능해 보안 위험.
// 127.0.0.1 바인딩(외부 노출 X). app ready 전에 appendSwitch 해야 적용된다.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
  app.commandLine.appendSwitch('remote-debugging-address', '127.0.0.1')
}

let mainWindow: BrowserWindow | null = null

// 단일 인스턴스 잠금(설치판만): 아이콘 더블클릭 2번 등으로 같은 DB(userData)를
// 두 프로세스가 동시에 쓰는 것을 차단. 두 번째 실행은 기존 창을 앞으로 가져온다.
// dev 는 잠금을 요청하지 않으므로 "설치판+dev 병행 확인" 워크플로우는 그대로 유지.
// 잠금 키가 userData 경로라서 반드시 setPath 이후에 호출해야 한다.
const gotSingleInstanceLock = !app.isPackaged || app.requestSingleInstanceLock()
if (!gotSingleInstanceLock) {
  app.quit()
} else if (app.isPackaged) {
  app.on('second-instance', () => {
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  })
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: '데일리Q',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Dev-only: surface renderer warnings/errors + load failures to main stdout
  if (!app.isPackaged) {
    mainWindow.webContents.on(
      'console-message',
      (_e, level: number, message: string, line: number, sourceId: string) => {
        if (level >= 2) console.log(`[renderer:${level}] ${message}  (${sourceId}:${line})`)
      }
    )
    mainWindow.webContents.on('did-fail-load', (_e, code, desc, url) => {
      console.error(`[renderer:did-fail-load] code=${code} ${desc} url=${url}`)
    })
    mainWindow.webContents.on('render-process-gone', (_e, details) => {
      console.error(`[renderer:gone] ${JSON.stringify(details)}`)
    })
  }

  // Dev server URL or production file
  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // 잠금 실패로 종료 중인 프로세스가 DB를 건드리지 않도록 방어
  if (!gotSingleInstanceLock) return

  // Initialize database
  runMigrations()
  seedDatabase()

  // AI 지식 인덱스(FTS5) 재색인 — 코퍼스가 작아 기동 시 전체 재색인. 실패해도 앱은 계속.
  try {
    const { chunks } = reindexKb()
    console.log(`[kb] reindexed ${chunks} chunks`)
  } catch (err) {
    console.warn('[kb] reindex 실패(검색 비활성):', (err as Error).message)
  }

  // Register IPC handlers
  registerAllIpcHandlers()

  // Create window
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
