import { ipcMain, dialog, app, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { mkdirSync, copyFileSync, existsSync, unlinkSync, readFileSync } from 'fs'
import { join, extname, basename } from 'path'
import { randomUUID } from 'crypto'
import type {
  ProcessListItemDto,
  ProcessDetailDto,
  ProcessCategoryDto,
  ProcessPageDto,
  ProcessFormRefDto,
  ProcessPageUploadResponse,
  ProcessPageAddResponse,
  ProcessPagesBulkUploadResponse,
  ProcessPageAiExtractResponse,
  ProcessPageExtracted
} from '@shared/ipc-types'
import { generate } from '../ai'

function ensureProcessImageDir(): string {
  const dir = join(app.getPath('userData'), 'process-images')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

// ── 캡쳐 이미지 → 구조화 추출(AI 비전) ──
const EXTRACT_SYSTEM_PROMPT = `당신은 한국 제조업 IATF 16949 품질경영시스템 문서를 구조화하는 추출 엔진이다.
주어진 이미지는 프로세스 문서(표지/개정이력/결재)의 한 페이지다.
오직 아래 JSON 객체 하나만 출력한다. 설명/마크다운/코드펜스 금지. 값이 없으면 null 또는 빈 배열.
{
  "docNo": "문서번호(예: TPC-CP-03) | null",
  "title": "문서 제목(예: 생산관리 프로세스) | null",
  "revNo": "개정번호 | null",
  "revDate": "재/개정일자(YYYY-MM-DD) | null",
  "scope": "적용범위 본문 | null",
  "purpose": "목적 본문 | null",
  "revisions": [ { "no": "개정번호", "date": "YYYY-MM-DD", "reason": "재개정 사유 및 내용", "author": "작성자" } ],
  "approvals": [ { "role": "작성|검토|승인 등", "title": "직책", "name": "성명" } ]
}`

const EXTRACT_USER_PROMPT =
  '이 페이지에서 위 스키마대로 데이터를 추출해 JSON만 출력하라. 표의 모든 행을 빠짐없이 포함하고, 날짜는 YYYY-MM-DD로 정규화하라.'

function strOf(v: unknown): string {
  return v == null ? '' : String(v)
}

function parseExtractJson(text: string): ProcessPageExtracted | null {
  try {
    const t = text
      .trim()
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim()
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s === -1 || e === -1) return null
    const o = JSON.parse(t.slice(s, e + 1)) as Record<string, unknown>
    const revs = Array.isArray(o.revisions) ? (o.revisions as Record<string, unknown>[]) : []
    const apps = Array.isArray(o.approvals) ? (o.approvals as Record<string, unknown>[]) : []
    return {
      docNo: o.docNo != null ? String(o.docNo) : null,
      title: o.title != null ? String(o.title) : null,
      revNo: o.revNo != null ? String(o.revNo) : null,
      revDate: o.revDate != null ? String(o.revDate) : null,
      scope: o.scope != null ? String(o.scope) : null,
      purpose: o.purpose != null ? String(o.purpose) : null,
      revisions: revs.map((r) => ({
        no: strOf(r.no),
        date: strOf(r.date),
        reason: strOf(r.reason),
        author: strOf(r.author)
      })),
      approvals: apps.map((a) => ({
        role: strOf(a.role),
        title: strOf(a.title),
        name: strOf(a.name)
      }))
    }
  } catch {
    return null
  }
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

  // ──── Pages: bulk upload (여러 장 한꺼번에) ────
  // 빈(이미지 없는) 페이지를 page_no 순으로 먼저 채우고, 남는 이미지는 새 페이지로 추가.
  // 파일명 자연정렬로 1/3·2/3·3/3 순서를 보장한다.
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGES_BULK_UPLOAD,
    async (
      _event,
      { processCode }: { processCode: string }
    ): Promise<ProcessPagesBulkUploadResponse> => {
      try {
        const proc = db.prepare('SELECT code FROM processes WHERE code = ?').get(processCode)
        if (!proc) return { success: false, added: 0, error: '프로세스를 찾을 수 없습니다.' }

        const win = BrowserWindow.getFocusedWindow()
        const result = await dialog.showOpenDialog(win || undefined!, {
          title: `${processCode} 흐름도 이미지 여러 장 선택 (순서대로 등록)`,
          properties: ['openFile', 'multiSelections'],
          filters: [{ name: '이미지', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }]
        })
        if (result.canceled || result.filePaths.length === 0) {
          return { success: true, added: 0, canceled: true }
        }

        // 파일명 자연정렬(1,2,10) → 페이지 순서 보장
        const files = [...result.filePaths].sort((a, b) =>
          basename(a).localeCompare(basename(b), undefined, { numeric: true, sensitivity: 'base' })
        )

        const procDir = join(ensureProcessImageDir(), processCode)
        if (!existsSync(procDir)) mkdirSync(procDir, { recursive: true })

        const emptyPages = db
          .prepare(
            'SELECT id FROM process_pages WHERE process_code = ? AND image_path IS NULL ORDER BY page_no ASC'
          )
          .all(processCode) as Array<{ id: number }>
        const lastNoRow = db
          .prepare('SELECT MAX(page_no) AS m FROM process_pages WHERE process_code = ?')
          .get(processCode) as { m: number | null }

        const setImg = db.prepare('UPDATE process_pages SET image_path = ? WHERE id = ?')
        const addPage = db.prepare(
          `INSERT INTO process_pages (process_code, page_no, page_label, image_path, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`
        )

        let nextNo = (lastNoRow?.m ?? 0) + 1
        let emptyIdx = 0
        let added = 0
        const apply = db.transaction(() => {
          for (const src of files) {
            const ext = extname(src).toLowerCase() || '.png'
            const target = join(procDir, `${randomUUID()}${ext}`)
            copyFileSync(src, target)
            if (emptyIdx < emptyPages.length) {
              setImg.run(target, emptyPages[emptyIdx].id)
              emptyIdx++
            } else {
              // 라벨은 비워둔다(프로세스명 중복 방지) → UI에서 "N. 페이지"로 표시, 더블클릭 수정 가능
              addPage.run(processCode, nextNo, null, target)
              nextNo++
            }
            added++
          }
        })
        apply()
        return { success: true, added }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[process:pagesBulkUpload] error', msg)
        return { success: false, added: 0, error: msg }
      }
    }
  )

  // ──── Page: AI 추출 (캡쳐 이미지 → 구조화 JSON) ────
  ipcMain.handle(
    IPC_CHANNELS.PROCESS_PAGE_AI_EXTRACT,
    async (_event, { pageId }: { pageId: number }): Promise<ProcessPageAiExtractResponse> => {
      try {
        const page = db
          .prepare('SELECT image_path FROM process_pages WHERE id = ?')
          .get(pageId) as { image_path: string | null } | undefined
        if (!page?.image_path || !existsSync(page.image_path)) {
          return { success: false, error: '이미지가 등록되지 않았습니다.' }
        }
        const safeRoot = ensureProcessImageDir()
        if (!page.image_path.startsWith(safeRoot)) {
          return { success: false, error: '허용되지 않은 경로입니다.' }
        }
        const ext = extname(page.image_path).toLowerCase().replace('.', '') || 'png'
        const mediaType =
          ext === 'jpg' || ext === 'jpeg'
            ? 'image/jpeg'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'gif'
                ? 'image/gif'
                : 'image/png'
        const base64 = readFileSync(page.image_path).toString('base64')

        const result = await generate({
          systemPrompt: EXTRACT_SYSTEM_PROMPT,
          userMessage: EXTRACT_USER_PROMPT,
          image: { base64, mediaType },
          maxTokens: 4000
        })

        const data = parseExtractJson(result.text)
        if (!data) {
          return {
            success: false,
            raw: result.text,
            provider: result.providerId,
            model: result.model,
            error: 'AI 응답에서 JSON을 파싱하지 못했습니다.'
          }
        }
        return {
          success: true,
          data,
          raw: result.text,
          provider: result.providerId,
          model: result.model
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[process:pageAiExtract] error', msg)
        return { success: false, error: msg }
      }
    }
  )
}
