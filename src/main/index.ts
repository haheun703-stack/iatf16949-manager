import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { runMigrations } from './database/migrate'
import { seedDatabase } from './database/seed'
import { registerAllIpcHandlers } from './ipc/register'
import { closeDatabase } from './database/connection'
import { reindexKb } from './ai/kb'

// userData 고정: 패키징 시 productName("IATF16949 품질경영시스템")이 app.name 이 되어
// userData 폴더가 바뀌면 dev 에서 쌓아온 DB(%APPDATA%/iatf16949-manager)와 어긋난다.
// 설치판·dev 모두 같은 데이터 폴더를 보도록 최우선으로 고정한다.
app.setPath('userData', join(app.getPath('appData'), 'iatf16949-manager'))

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'IATF 16949 품질경영시스템',
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
