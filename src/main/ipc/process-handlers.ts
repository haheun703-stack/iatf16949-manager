import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { mkdirSync, copyFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import type {
  ProcessListItemDto,
  ProcessDetailDto,
  ProcessCategoryDto,
  ProcessPageDto,
  ProcessFormRefDto,
  ProcessPageUploadResponse,
  ProcessPageAddResponse
} from '@shared/ipc-types'

function ensureProcessImageDir(): string {
  const dir = join(app.getPath('userData'), 'process-images')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function registerProcessHandlers(): void {
  const db = getSqlite()

  // ──── Process list ────
  ipcMain.handle(IPC_CHANNELS.PROCESS_LIST, (): ProcessListItemDto[] => {
    const rows = db.prepare(`
      SELECT p.code, p.category, p.name, p.doc_no, p.sort_order,
             (SELECT COUNT(*) FROM process_pages pp WHERE pp.process_code = p.code) AS pages_count,
             (SELECT COUNT(*) FROM process_pages pp WHERE pp.process_code = p.code AND pp.image_path IS NOT NULL) AS images_count,
             (SELECT COUNT(*) FROM process_forms pf WHERE pf.process_code = p.code) AS forms_count
      FROM processes p
      ORDER BY p.sort_order ASC
    `).all() as Array<Record<string, unknown>>

    return rows.map((r) => ({
      code: r.code as string,
      category: r.category as ProcessCategoryDto,
      name: r.name as string,
      docNo: (r.doc_no as string) || null,
      pagesCount: (r.pages_count as number) ?? 0,
      formsCount: (r.forms_count as number) ?? 0,
      hasImages: ((r.images_count as number) ?? 0) > 0,
      sortOrder: (r.sort_order as number) ?? 0
    }))
  })

  // ──── Process detail (pages + forms) ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_GET_DETAIL,
    (_event, { code }: { code: string }): ProcessDetailDto | null => {
      const proc = db.prepare('SELECT * FROM processes WHERE code = ?').get(code) as
        | Record<string, unknown>
        | undefined
      if (!proc) return null

      const pages = db
        .prepare(
          'SELECT id, process_code, page_no, page_label, image_path FROM process_pages WHERE process_code = ? ORDER BY page_no ASC'
        )
        .all(code) as Array<Record<string, unknown>>

      const forms = db
        .prepare(
          `SELECT pf.form_code, pf.sort_order, f.name AS form_name, f.reg_code,
                  (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
                  (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code) AS submissions_count,
                  (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code AND fs.status = 'draft') AS draft_count
           FROM process_forms pf
           JOIN forms f ON pf.form_code = f.code
           WHERE pf.process_code = ?
           ORDER BY pf.sort_order ASC`
        )
        .all(code) as Array<Record<string, unknown>>

      const pageDtos: ProcessPageDto[] = pages.map((p) => ({
        id: p.id as number,
        processCode: p.process_code as string,
        pageNo: p.page_no as number,
        pageLabel: (p.page_label as string) || null,
        imagePath: (p.image_path as string) || null
      }))

      const formDtos: ProcessFormRefDto[] = forms.map((f) => ({
        formCode: f.form_code as string,
        formName: (f.form_name as string) || '',
        regCode: (f.reg_code as string) || '',
        fieldsCount: (f.fields_count as number) ?? 0,
        submissionsCount: (f.submissions_count as number) ?? 0,
        draftCount: (f.draft_count as number) ?? 0,
        sortOrder: (f.sort_order as number) ?? 0
      }))

      return {
        code: proc.code as string,
        category: proc.category as ProcessCategoryDto,
        name: proc.name as string,
        description: (proc.description as string) || null,
        docNo: (proc.doc_no as string) || null,
        pages: pageDtos,
        forms: formDtos
      }
    }
  )

  // ──── Page: upload image (file dialog → copy → save path) ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGE_UPLOAD,
    async (_event, { pageId }: { pageId: number }): Promise<ProcessPageUploadResponse> => {
      try {
        const page = db.prepare('SELECT id, process_code, page_no, image_path FROM process_pages WHERE id = ?').get(pageId) as
          | { id: number; process_code: string; page_no: number; image_path: string | null }
          | undefined
        if (!page) return { success: false, error: '페이지를 찾을 수 없습니다.' }

        const win = BrowserWindow.getFocusedWindow()
        const result = await dialog.showOpenDialog(win || undefined!, {
          title: `${page.process_code} 페이지 ${page.page_no} 이미지 선택`,
          properties: ['openFile'],
          filters: [
            { name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }
          ]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return { success: false, error: '취소되었습니다.' }
        }

        const sourcePath = result.filePaths[0]
        const ext = extname(sourcePath).toLowerCase() || '.png'

        // Copy to userData/process-images/<process_code>/<uuid>.ext
        const baseDir = ensureProcessImageDir()
        const procDir = join(baseDir, page.process_code)
        if (!existsSync(procDir)) mkdirSync(procDir, { recursive: true })
        const filename = `${randomUUID()}${ext}`
        const targetPath = join(procDir, filename)
        copyFileSync(sourcePath, targetPath)

        // Delete previous image if any
        if (page.image_path && existsSync(page.image_path)) {
          try {
            unlinkSync(page.image_path)
          } catch (e) {
            console.warn('[process:pageUpload] previous image delete failed', e)
          }
        }

        // Save path to DB
        db.prepare('UPDATE process_pages SET image_path = ? WHERE id = ?').run(targetPath, pageId)
        return { success: true, imagePath: targetPath }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[process:pageUpload] error', msg)
        return { success: false, error: msg }
      }
    }
  )

  // ──── Page: delete image (keep page row) ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGE_DELETE_IMAGE,
    (_event, { pageId }: { pageId: number }): { success: boolean } => {
      const page = db.prepare('SELECT image_path FROM process_pages WHERE id = ?').get(pageId) as
        | { image_path: string | null }
        | undefined
      if (page?.image_path && existsSync(page.image_path)) {
        try {
          unlinkSync(page.image_path)
        } catch (e) {
          console.warn('[process:pageDeleteImage] delete failed', e)
        }
      }
      db.prepare('UPDATE process_pages SET image_path = NULL WHERE id = ?').run(pageId)
      return { success: true }
    }
  )

  // ──── Page: read image as data URL (safe IPC instead of file://) ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGE_READ_IMAGE,
    (_event, { pageId }: { pageId: number }): { success: boolean; dataUrl?: string; error?: string } => {
      try {
        const page = db
          .prepare('SELECT image_path FROM process_pages WHERE id = ?')
          .get(pageId) as { image_path: string | null } | undefined
        if (!page?.image_path) return { success: false, error: '이미지가 등록되지 않았습니다.' }
        if (!existsSync(page.image_path)) {
          return { success: false, error: '이미지 파일이 존재하지 않습니다.' }
        }
        // Security: only serve files inside userData/process-images
        const safeRoot = ensureProcessImageDir()
        if (!page.image_path.startsWith(safeRoot)) {
          return { success: false, error: '허용되지 않은 경로입니다.' }
        }
        const buf = readFileSync(page.image_path)
        const ext = extname(page.image_path).toLowerCase().replace('.', '') || 'png'
        const mime =
          ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'png'
              ? 'image/png'
              : ext === 'webp'
                ? 'image/webp'
                : ext === 'gif'
                  ? 'image/gif'
                  : ext === 'bmp'
                    ? 'image/bmp'
                    : 'application/octet-stream'
        return { success: true, dataUrl: `data:${mime};base64,${buf.toString('base64')}` }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  // ──── Page: add new ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGE_ADD,
    (
      _event,
      { processCode, pageLabel }: { processCode: string; pageLabel: string }
    ): ProcessPageAddResponse => {
      const last = db
        .prepare('SELECT MAX(page_no) AS max_no FROM process_pages WHERE process_code = ?')
        .get(processCode) as { max_no: number | null }
      const nextNo = (last?.max_no ?? 0) + 1

      const result = db
        .prepare(
          `INSERT INTO process_pages (process_code, page_no, page_label, image_path, created_at)
           VALUES (?, ?, ?, NULL, datetime('now'))`
        )
        .run(processCode, nextNo, pageLabel || null)

      return { success: true, pageId: Number(result.lastInsertRowid), pageNo: nextNo }
    }
  )
}
