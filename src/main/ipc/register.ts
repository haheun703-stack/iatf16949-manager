import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { writeFileSync } from 'fs'
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
import { registerObligationHandlers, registerTriggerIssueHandlers } from './obligation-handlers'
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
import { registerSemimesHandlers } from './semimes-handlers'

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
  registerSemimesHandlers()
  const db = getSqlite()

  // ──── Company Profile Handlers ────

  const PROFILE_KEYS: (keyof CompanyProfile)[] = [
    'companyName', 'ceoName', 'address', 'phone', 'fax',
    'factoryName', 'revisionNumber', 'revisionDate', 'defaultAuthor', 'mastersDir', 'auditDate'
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
      auditDate: map.get('auditDate') || ''
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
