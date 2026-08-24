import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { writeFileSync, readFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { join as joinPath, extname } from 'path'
import type {
  CompanyProfile,
  DocGenRequest,
  DocGenResult,
  AppInfo
} from '@shared/ipc-types'
import { generateQualityManual } from '../docgen/quality-manual-generator'
import { registerFormHandlers } from './form-handlers'
import { registerProcessHandlers } from './process-handlers'
import { registerBomHandlers } from './bom-handlers'
import { registerScoringHandlers } from './scoring-handlers'
import { registerDashboardHandlers } from './dashboard-handlers'
import { registerScheduleHandlers } from './schedule-handlers'
import { registerObligationHandlers, registerTriggerIssueHandlers, registerObligationMatrixHandler } from './obligation-handlers'
import { registerPpapHandlers } from './ppap-handlers'
import { registerFmeaHandlers } from './fmea-handlers'
import { registerApqpHandlers } from './apqp-handlers'
import { registerTeamHandlers } from './team-handlers'
import { registerKpiHandlers } from './kpi-handlers'
import { registerSqGuideHandlers } from './sq-guide-handlers'
import { registerSqAssessHandlers } from './sq-assess-handlers'
import { registerSqTrackHandlers } from './sqtrack-handlers'
import { registerMsaHandlers } from './msa-handlers'
import { registerReportHandlers } from './report-handlers'
import { registerSqHandlers } from './sq-handlers'
import { registerCaseHandlers } from './case-handlers'
import { registerAiHandlers } from './ai-handlers'
import { registerIsirHandlers } from './isir-handlers'
import { registerIntegrityHandlers } from './integrity-handlers'
import { registerMesTraceHandlers } from './mes-trace-handlers'
import { registerMesRecordsHandlers } from './mes-records-handlers'
import { registerAppUsersHandlers } from './app-users-handlers'
import { registerPermHandlers } from './perm-handlers'
import { registerSemimesHandlers } from './semimes-handlers'
import { registerSemimesWriteHandlers } from './semimes-write-handlers'
import { registerSemimesQueryHandlers } from './semimes-query-handlers'
import { registerProcessFlowHandlers } from './process-flow-handlers'

export function registerAllIpcHandlers(): void {
  registerAiHandlers()
  registerIsirHandlers()
  registerFormHandlers()
  registerProcessHandlers()
  registerBomHandlers()
  registerScoringHandlers()
  registerDashboardHandlers()
  registerScheduleHandlers()
  registerObligationHandlers()
  registerTriggerIssueHandlers()
  registerObligationMatrixHandler()
  registerPpapHandlers()
  registerFmeaHandlers()
  registerApqpHandlers()
  registerTeamHandlers()
  registerKpiHandlers()
  registerSqGuideHandlers()
  registerSqAssessHandlers()
  registerSqTrackHandlers()
  registerMsaHandlers()
  registerReportHandlers()
  registerSqHandlers()
  registerCaseHandlers()
  registerIntegrityHandlers()
  registerMesTraceHandlers()
  registerMesRecordsHandlers()
  registerAppUsersHandlers()
  registerPermHandlers()
  registerSemimesHandlers()
  registerSemimesWriteHandlers()
  registerSemimesQueryHandlers()
  registerProcessFlowHandlers()
  const db = getSqlite()

  // ──── Company Profile Handlers ────

  // ⚠ 39호 S1: 새 프로파일 키는 반드시 ①이 목록 ②아래 GET 의 map.get ③CompanyProfile DTO
  //   3곳에 동시 등재할 것 — 하나라도 빠지면 SAVE(전체 객체 라운드트립)가 그 키를 '' 로 와이프한다.
  const PROFILE_KEYS: (keyof CompanyProfile)[] = [
    'companyName', 'ceoName', 'address', 'phone', 'fax',
    'factoryName', 'revisionNumber', 'revisionDate', 'defaultAuthor', 'mastersDir', 'auditDate',
    'companyNameEn', 'companyNameShort', 'divisionLabel', 'processes', 'products', 'plant'
  ]

  // ──── 제품(앱) 정보 — 버전·런타임 (UI P3 제품 정보 화면) ────
  ipcMain.handle(IPC_CHANNELS.APP_INFO, (): AppInfo => {
    return {
      // electron-builder.yml 과 일치하는 제품 식별자(개인·TPC 브랜딩 아님, 안전)
      productName: 'IATF16949 품질경영시스템',
      version: app.getVersion(),
      copyright: 'Copyright © 2026',
      electron: process.versions.electron,
      chrome: process.versions.chrome,
      node: process.versions.node,
      v8: process.versions.v8,
      platform: process.platform,
      arch: process.arch
    }
  })

  ipcMain.handle(IPC_CHANNELS.COMPANY_PROFILE_GET, () => {
    const rows = db.prepare('SELECT key, value FROM company_profile').all() as Array<{ key: string; value: string }>
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const profile: CompanyProfile = {
      companyName: map.get('companyName') || '',
      ceoName: map.get('ceoName') || '',
      address: map.get('address') || '',
      phone: map.get('phone') || '',
      fax: map.get('fax') || '',
      factoryName: map.get('factoryName') || '',
      revisionNumber: map.get('revisionNumber') || '',
      revisionDate: map.get('revisionDate') || '',
      defaultAuthor: map.get('defaultAuthor') || '',
      mastersDir: map.get('mastersDir') || '',
      auditDate: map.get('auditDate') || '',
      companyNameEn: map.get('companyNameEn') || '',
      companyNameShort: map.get('companyNameShort') || '',
      divisionLabel: map.get('divisionLabel') || '',
      processes: map.get('processes') || '',
      products: map.get('products') || '',
      plant: map.get('plant') || ''
    }
    return profile
  })

  // ──── 정본(마스터 양식) 폴더 선택 → company_profile.mastersDir 저장 ────
  ipcMain.handle(IPC_CHANNELS.COMPANY_PICK_MASTERS_DIR, async () => {
    const win = BrowserWindow.getFocusedWindow()
    const res = win
      ? await dialog.showOpenDialog(win, {
          title: '정본(마스터 양식) 폴더 선택',
          properties: ['openDirectory']
        })
      : await dialog.showOpenDialog({
          title: '정본(마스터 양식) 폴더 선택',
          properties: ['openDirectory']
        })
    if (res.canceled || !res.filePaths?.[0]) return { filePath: null, canceled: true }
    const dir = res.filePaths[0]
    db.prepare(
      "INSERT INTO company_profile (key, value) VALUES ('mastersDir', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    ).run(dir)
    return { filePath: dir }
  })

  // ──── 회사 로고 (2026-08-24 도장) ────────────────────────────────────────
  // 왜 dataUrl 인가: 사장님은 **브라우저(:8080)** 로 쓴다. dialog.showOpenDialog 는 웹 셸에서
  //   동작하지 않으므로(server/electron-shim.cjs), 화면의 <input type="file"> 이 읽은
  //   dataUrl 을 그대로 받는다 — 데스크톱·웹 한 경로.
  // 어디에 두나: userData/branding/ (= 웹에서는 IATF_DATA_DIR). DB 밖에 두는 이유는
  //   xlsx 삽입이 파일 경로를 요구하고, DB 백업 크기를 이미지가 키우지 않게 하려는 것.
  const LOGO_DIR = joinPath(app.getPath('userData'), 'branding')
  const LOGO_MIME: Record<string, string> = {
    'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp'
  }
  const LOGO_MAX_BYTES = 2 * 1024 * 1024 // 2MB — 양식 머리글에 들어갈 그림에 충분

  /** 저장된 로고 파일 경로(없으면 null). 확장자는 업로드 때 정해지므로 폴더를 훑는다. */
  const findLogoFile = (): string | null => {
    try {
      if (!existsSync(LOGO_DIR)) return null
      const f = readdirSync(LOGO_DIR).find((n) => /^logo[.](png|jpg|gif|webp)$/i.test(n))
      return f ? joinPath(LOGO_DIR, f) : null
    } catch {
      return null
    }
  }

  ipcMain.handle(IPC_CHANNELS.COMPANY_LOGO_GET, () => {
    const p = findLogoFile()
    if (!p) return { dataUrl: null, fileName: null, updatedAt: null }
    const ext = extname(p).toLowerCase()
    const mime = Object.entries(LOGO_MIME).find(([, e]) => e === ext)?.[0] || 'image/png'
    const row = db
      .prepare("SELECT value FROM company_profile WHERE key = 'logoUpdatedAt'")
      .get() as { value?: string } | undefined
    const orig = db
      .prepare("SELECT value FROM company_profile WHERE key = 'logoFileName'")
      .get() as { value?: string } | undefined
    return {
      dataUrl: `data:${mime};base64,${readFileSync(p).toString('base64')}`,
      fileName: orig?.value || null,
      updatedAt: row?.value || null
    }
  })

  ipcMain.handle(IPC_CHANNELS.COMPANY_LOGO_SET, (_event, { dataUrl, fileName }: { dataUrl: string; fileName?: string }) => {
    // 무음 실패 금지(35호) — 형식·크기 위반은 사유를 돌려준다.
    const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl || '')
    if (!m) return { success: false, error: '이미지 데이터를 읽지 못했습니다.' }
    const ext = LOGO_MIME[m[1].toLowerCase()]
    if (!ext) return { success: false, error: 'PNG · JPG · GIF · WEBP 만 넣을 수 있습니다.' }
    const buf = Buffer.from(m[2], 'base64')
    if (buf.length === 0) return { success: false, error: '빈 파일입니다.' }
    if (buf.length > LOGO_MAX_BYTES) {
      return { success: false, error: `파일이 너무 큽니다(${Math.round(buf.length / 1024)}KB) — 2MB 이하로 줄여 주세요.` }
    }
    mkdirSync(LOGO_DIR, { recursive: true })
    // 확장자가 바뀔 수 있으므로 옛 로고를 먼저 지운다(logo.png + logo.jpg 동시 존재 방지).
    const prev = findLogoFile()
    if (prev) rmSync(prev, { force: true })
    writeFileSync(joinPath(LOGO_DIR, `logo${ext}`), buf)
    const upsert = db.prepare(
      'INSERT INTO company_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    upsert.run('logoFileName', fileName || `logo${ext}`)
    upsert.run('logoUpdatedAt', new Date().toISOString().slice(0, 19).replace('T', ' '))
    return { success: true, fileName: fileName || `logo${ext}` }
  })

  ipcMain.handle(IPC_CHANNELS.COMPANY_LOGO_CLEAR, () => {
    const p = findLogoFile()
    if (p) rmSync(p, { force: true })
    db.prepare("DELETE FROM company_profile WHERE key IN ('logoFileName','logoUpdatedAt')").run()
    return { success: true }
  })

  // ──── 현재 창을 PDF로 인쇄(저장) — @media print 의 .print-document 영역만 출력 ────
  ipcMain.handle(
    IPC_CHANNELS.PRINT_TO_PDF,
    async (_event, { defaultName }: { defaultName?: string } = {}) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: '활성 창을 찾을 수 없습니다.' }
      try {
        const data = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4'
        })
        const saveRes = await dialog.showSaveDialog(win, {
          title: '양식 PDF 저장',
          defaultPath: defaultName || '양식.pdf',
          filters: [{ name: 'PDF 파일', extensions: ['pdf'] }]
        })
        if (saveRes.canceled || !saveRes.filePath) return { success: false, canceled: true }
        writeFileSync(saveRes.filePath, data)
        return { success: true, filePath: saveRes.filePath }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMPANY_PROFILE_SAVE, (_event, profile: CompanyProfile) => {
    const upsert = db.prepare(
      'INSERT INTO company_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    const saveAll = db.transaction(() => {
      for (const key of PROFILE_KEYS) {
        upsert.run(key, profile[key] || '')
      }
    })
    saveAll()
    return { success: true }
  })

  // ──── Document Generation Handlers ────

  ipcMain.handle(IPC_CHANNELS.DOCGEN_SAVE_DIALOG, async (_event, { defaultName }: { defaultName: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { filePath: null }

    const result = await dialog.showSaveDialog(win, {
      title: '문서 저장 위치 선택',
      defaultPath: defaultName,
      filters: [
        { name: 'Excel 파일', extensions: ['xlsx'] }
      ]
    })
    return { filePath: result.canceled ? null : result.filePath || null }
  })

  ipcMain.handle(IPC_CHANNELS.DOCGEN_GENERATE, async (_event, req: DocGenRequest): Promise<DocGenResult> => {
    try {
      if (req.templateId === 'quality-manual') {
        return await generateQualityManual(req, db)
      }
      return { success: false, error: `Unknown template: ${req.templateId}` }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
