import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { FORM_SCOPES } from '@shared/ipc-types'
import { isExampleCopyBlocked } from '@shared/form-validation'
import { getSqlite } from '../database/connection'
import { nextFormSerial } from '../database/serial'
import { generate as aiGenerate } from '../ai'
import { exportSubmissionXlsx, type FormFieldLite } from '../docgen/form-export-engine'
import { buildRenderModel } from '../docgen/render-model'
import type {
  FormListItemDto,
  FormDefinitionDto,
  FormExampleDto,
  FormFieldDto,
  FormFieldTypeDto,
  FormLayout,
  FormSubmissionDto,
  FormSubmissionListItemDto,
  RegulationSectionDto,
  AiGenerateRequest,
  AiGenerateResponse,
  FormExportResult,
  FormRevisionListItemDto,
  FormRevisionDto
} from '@shared/ipc-types'

function parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function getProfileValue(db: ReturnType<typeof getSqlite>, key: string): string | null {
  try {
    const r = db.prepare('SELECT value FROM company_profile WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return r?.value ?? null
  } catch {
    return null
  }
}

function rowToField(row: Record<string, unknown>): FormFieldDto {
  return {
    id: row.id as number,
    formCode: row.form_code as string,
    fieldKey: row.field_key as string,
    label: row.label as string,
    type: row.type as FormFieldTypeDto,
    section: (row.section as string) || null,
    placeholder: (row.placeholder as string) || null,
    options: parseJsonSafe<string[] | null>(row.options_json as string | null, null),
    unit: (row.unit as string) || null,
    aiEnabled: (row.ai_enabled as number) === 1,
    aiPromptHint: (row.ai_prompt_hint as string) || null,
    sortOrder: (row.sort_order as number) ?? 0,
    fieldClass: (row.field_class as string) === 'fact' ? 'fact' : 'frame'
  }
}

export function registerFormHandlers(): void {
  const db = getSqlite()

  // H1: 예시값 완전일치(기록 조작) 차단 — 데이터 계층. 모든 저장 경로(초안·완료·이어서·출력)가 통과.
  // form_examples 있는 양식만 검사(정답 따라쓰기 대상). 위반 필드 label 반환(없으면 null).
  const detectExampleCopy = (formCode: string, values: Record<string, unknown>): string | null => {
    let rows: Array<{ fk: string; ev: string | null; fc: string | null; ty: string | null; lb: string | null }>
    try {
      rows = db
        .prepare(
          `SELECT e.field_key AS fk, e.example_value AS ev, f.field_class AS fc, f.type AS ty, f.label AS lb
           FROM form_examples e LEFT JOIN form_fields f ON f.form_code = e.form_code AND f.field_key = e.field_key
           WHERE e.form_code = ?`
        )
        .all(formCode) as typeof rows
    } catch {
      return null // form_examples 미존재(구버전 DB) — 검증 스킵
    }
    for (const r of rows) {
      const actual = values[r.fk]
      if (isExampleCopyBlocked(r.fc, r.ty ?? 'text', r.ev ?? '', actual == null ? '' : String(actual), r.lb)) {
        return r.lb ?? r.fk
      }
    }
    return null
  }

  // ──── Form list ────
  ipcMain.handle(IPC_CHANNELS.FORM_LIST, (): FormListItemDto[] => {
    const rows = db.prepare(`
      SELECT f.code, f.name, f.reg_code, f.approvals_json, f.resp_dept, f.deprecated,
             (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
             (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code) AS submissions_count,
             (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code AND fs.status = 'draft') AS draft_count,
             EXISTS(SELECT 1 FROM form_examples e WHERE e.form_code = f.code) AS has_example,
             EXISTS(SELECT 1 FROM recurring_obligations o WHERE o.form_code = f.code AND o.active = 1) AS obligation_linked,
             (SELECT MAX(COALESCE(fs.updated_at, fs.created_at)) FROM form_submissions fs WHERE fs.form_code = f.code) AS last_written_at
      FROM forms f
      ORDER BY f.code
    `).all() as Array<Record<string, unknown>>

    return rows.map((r) => {
      const approvals = parseJsonSafe<string[]>(r.approvals_json as string, [])
      return {
        code: r.code as string,
        name: r.name as string,
        regCode: r.reg_code as string,
        approvalsCount: approvals.length,
        fieldsCount: (r.fields_count as number) ?? 0,
        submissionsCount: (r.submissions_count as number) ?? 0,
        draftCount: (r.draft_count as number) ?? 0,
        respDept: (r.resp_dept as string) || null,
        hasExample: !!(r.has_example as number),
        obligationLinked: !!(r.obligation_linked as number),
        lastWrittenAt: (r.last_written_at as string) || null,
        deprecated: !!(r.deprecated as number)
      }
    })
  })

  // ──── Form scope 설정 (사업부 분류: 공통 또는 사업부 명칭) ────
  // 유효 라벨 목록은 ipc-types 의 FORM_SCOPES 단일 출처 사용(사업부 추가 시 한 곳만 수정).
  const validScopes = FORM_SCOPES as readonly string[]
  ipcMain.handle(
    IPC_CHANNELS.FORM_SET_SCOPE,
    (_event, { formCode, scope }: { formCode: string; scope: string }) => {
      const next = validScopes.includes(scope) ? scope : '공통'
      const info = db.prepare('UPDATE forms SET scope = ? WHERE code = ?').run(next, formCode)
      return { success: info.changes > 0, scope: next }
    }
  )

  // ──── Form definition (with fields) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_GET_DEFINITION,
    (_event, { code }: { code: string }): FormDefinitionDto | null => {
      const form = db.prepare('SELECT * FROM forms WHERE code = ?').get(code) as
        | Record<string, unknown>
        | undefined
      if (!form) return null

      const fields = db
        .prepare('SELECT * FROM form_fields WHERE form_code = ? ORDER BY sort_order ASC')
        .all(code) as Array<Record<string, unknown>>

      // 격자/대장형(type='grid') 필드에 컬럼 정의 첨부(렌더러 grid 에디터용)
      const fieldDtos = fields.map(rowToField)
      for (const fd of fieldDtos) {
        if (fd.type === 'grid') {
          try {
            fd.gridColumns = db
              .prepare(
                'SELECT col_key AS colKey, label, type FROM form_grid_columns WHERE form_code = ? AND grid_key = ? ORDER BY sort_order'
              )
              .all(code, fd.fieldKey) as FormDefinitionDto['fields'][number]['gridColumns']
          } catch {
            /* form_grid_columns 미존재(구버전 DB) */
          }
        }
      }

      return {
        code: form.code as string,
        name: form.name as string,
        regCode: form.reg_code as string,
        description: (form.description as string) || null,
        approvals: parseJsonSafe<string[]>(form.approvals_json as string, []),
        nextFormCode: (form.next_form_code as string) || null,
        nextFormLabel: (form.next_form_label as string) || null,
        prevFormCode: (form.prev_form_code as string) || null,
        fields: fieldDtos,
        layout: parseJsonSafe<FormLayout | null>(form.layout_json as string | null, null),
        deprecated: Number(form.deprecated) === 1,
        deprecatedNote: (form.deprecated_note as string) || null,
        replacementPage: (form.replacement_page as string) || null
      }
    }
  )

  // ──── 양식별 모범 예시(form_examples) — 좌측 정답 패널(P5) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_EXAMPLES_GET,
    (_event, { formCode }: { formCode: string }): FormExampleDto[] => {
      try {
        const rows = db
          .prepare(
            `SELECT e.field_key, e.example_value, e.why_note, f.label, f.field_class, f.type
             FROM form_examples e
             LEFT JOIN form_fields f ON f.form_code = e.form_code AND f.field_key = e.field_key
             WHERE e.form_code = ?
             ORDER BY f.sort_order ASC`
          )
          .all(formCode) as Array<Record<string, unknown>>
        return rows.map((r) => ({
          fieldKey: r.field_key as string,
          label: (r.label as string) || (r.field_key as string),
          exampleValue: (r.example_value as string) ?? '',
          whyNote: (r.why_note as string) || null,
          fieldClass: (r.field_class as string) === 'fact' ? 'fact' : 'frame',
          fieldType: (r.type as string) || 'text'
        }))
      } catch (err) {
        console.error('[form:examplesGet] failed:', (err as Error).message)
        return []
      }
    }
  )

  // ──── 양식 캔버스 RenderModel (엑셀형 작성 화면) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_RENDER_MODEL,
    async (_event, { formCode }: { formCode: string }) => {
      try {
        return await buildRenderModel(db, formCode)
      } catch (err) {
        return {
          formCode,
          sheetName: '', rowCount: 0, colCount: 0,
          colWidthsPx: [], rowHeightsPx: [], cells: [], editCells: [],
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }
  )

  // ──── Regulation sections ────
  ipcMain.handle(
    IPC_CHANNELS.REGULATION_GET_SECTIONS,
    (_event, { regCode }: { regCode: string }): RegulationSectionDto[] => {
      const rows = db
        .prepare(
          'SELECT id, reg_code, section_title, section_body, sort_order FROM regulation_sections WHERE reg_code = ? ORDER BY sort_order ASC'
        )
        .all(regCode) as Array<Record<string, unknown>>

      return rows.map((r) => ({
        id: r.id as number,
        regCode: r.reg_code as string,
        sectionTitle: r.section_title as string,
        sectionBody: r.section_body as string,
        sortOrder: r.sort_order as number
      }))
    }
  )

  // ──── Submission: create ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SUBMISSION_CREATE,
    (
      _event,
      data: {
        formCode: string
        values: Record<string, unknown>
        serialNo?: string
        createdBy?: string
      }
    ): { id: number } => {
      const copied = detectExampleCopy(data.formCode, data.values || {})
      if (copied) {
        throw new Error(`예시값을 그대로 저장할 수 없습니다: '${copied}' — 실제 값을 입력하세요(기록 조작 방지).`)
      }
      const now = new Date().toISOString()
      const result = db
        .prepare(
          `INSERT INTO form_submissions (form_code, serial_no, values_json, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?)`
        )
        .run(
          data.formCode,
          data.serialNo || null,
          JSON.stringify(data.values || {}),
          data.createdBy || null,
          now,
          now
        )
      return { id: Number(result.lastInsertRowid) }
    }
  )

  // ──── Submission: update ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SUBMISSION_UPDATE,
    (
      _event,
      data: {
        id: number
        values: Record<string, unknown>
        status?: 'draft' | 'submitted' | 'approved'
        createdBy?: string
      }
    ): { success: boolean } => {
      const sub = db.prepare('SELECT form_code FROM form_submissions WHERE id = ?').get(data.id) as
        | { form_code: string }
        | undefined
      if (sub) {
        const copied = detectExampleCopy(sub.form_code, data.values || {})
        if (copied) {
          throw new Error(`예시값을 그대로 저장할 수 없습니다: '${copied}' — 실제 값을 입력하세요(기록 조작 방지).`)
        }
      }
      const now = new Date().toISOString()
      if (data.status) {
        db.prepare(
          'UPDATE form_submissions SET values_json = ?, status = ?, updated_at = ? WHERE id = ?'
        ).run(JSON.stringify(data.values || {}), data.status, now, data.id)
      } else {
        db.prepare(
          'UPDATE form_submissions SET values_json = ?, updated_at = ? WHERE id = ?'
        ).run(JSON.stringify(data.values || {}), now, data.id)
      }
      // M2: created_by 가 아직 비어 있을 때만 채움(이어쓰기 시 원작성자 보존, §4)
      if (data.createdBy) {
        db.prepare(
          "UPDATE form_submissions SET created_by = ? WHERE id = ? AND (created_by IS NULL OR created_by = '')"
        ).run(data.createdBy, data.id)
      }
      return { success: true }
    }
  )

  // ──── Submission: list ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SUBMISSION_LIST,
    (_event, { formCode }: { formCode?: string } = {}): FormSubmissionListItemDto[] => {
      const params: unknown[] = []
      let sql = `
        SELECT fs.id, fs.form_code, fs.serial_no, fs.status, fs.updated_at, fs.values_json,
               f.name AS form_name
        FROM form_submissions fs
        LEFT JOIN forms f ON fs.form_code = f.code
      `
      if (formCode) {
        sql += ' WHERE fs.form_code = ?'
        params.push(formCode)
      }
      sql += ' ORDER BY fs.updated_at DESC'

      const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>
      return rows.map((r) => {
        const values = parseJsonSafe<Record<string, unknown>>(r.values_json as string, {})
        // Generate preview from first non-empty text-ish value
        let preview = ''
        for (const v of Object.values(values)) {
          if (typeof v === 'string' && v.trim()) {
            preview = v.slice(0, 80)
            break
          }
        }
        return {
          id: r.id as number,
          formCode: r.form_code as string,
          formName: (r.form_name as string) || '',
          serialNo: (r.serial_no as string) || null,
          status: r.status as 'draft' | 'submitted' | 'approved',
          updatedAt: r.updated_at as string,
          preview
        }
      })
    }
  )

  // ──── Submission: get ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SUBMISSION_GET,
    (_event, { id }: { id: number }): FormSubmissionDto | null => {
      const row = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined
      if (!row) return null

      return {
        id: row.id as number,
        formCode: row.form_code as string,
        serialNo: (row.serial_no as string) || null,
        values: parseJsonSafe<Record<string, unknown>>(row.values_json as string, {}),
        status: row.status as 'draft' | 'submitted' | 'approved',
        createdBy: (row.created_by as string) || null,
        createdAt: row.created_at as string,
        updatedAt: row.updated_at as string
      }
    }
  )

  // ──── Submission: delete ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SUBMISSION_DELETE,
    (_event, { id }: { id: number }): { success: boolean } => {
      db.prepare('DELETE FROM form_submission_links WHERE from_submission_id = ? OR to_submission_id = ?')
        .run(id, id)
      db.prepare('DELETE FROM form_submissions WHERE id = ?').run(id)
      return { success: true }
    }
  )

  // ──── New-draft meta defaults (자동 메타주입) ────
  // 새 양식을 열 때 채워줄 메타값: 발행번호(자동 넘버링 미리보기) / 작성일자(오늘) / 작성자(회사정보).
  // 실내용은 사람이 입력. 발행번호는 저장 시 serial_no로 확정(미리보기는 다음 가용번호).
  ipcMain.handle(
    IPC_CHANNELS.FORM_DRAFT_DEFAULTS,
    (
      _event,
      { formCode }: { formCode: string }
    ): { values: Record<string, string>; serialPreview: string | null } => {
      const fields = db
        .prepare('SELECT field_key, label, type, placeholder FROM form_fields WHERE form_code = ?')
        .all(formCode) as Array<{
        field_key: string
        label: string
        type: string
        placeholder: string | null
      }>

      const today = new Date().toISOString().split('T')[0]
      const year = new Date().getFullYear()

      const values: Record<string, string> = {}
      let serialPreview: string | null = null

      for (const f of fields) {
        const ph = f.placeholder ?? ''
        if (f.type === 'auto' && /자동부여/.test(ph)) {
          // placeholder 예: "NCR-2026-XXXX (자동부여)" → prefix=NCR, 연도는 현재연도로 재생성
          const m = ph.match(/([A-Z]{2,})-\d{4}/)
          if (m) {
            const s = nextFormSerial(db, formCode, m[1], year)
            values[f.field_key] = s
            serialPreview = s
          }
        } else if (f.type === 'date' && /(작성일|발행일)/.test(f.label)) {
          values[f.field_key] = today
        }
        // 작성자 auto(placeholder '로그인 사용자')는 여기서 채우지 않는다 —
        // 활성 사용자(§4 기록 주체)를 클라이언트(formStore)에서 주입. 미선택이면 빈값 유지
        // (회사 defaultAuthor 폴백 금지: 서류상 작성자와 시스템 기록이 어긋나는 왜곡 방지).
      }

      return { values, serialPreview }
    }
  )

  // ──── Submission → 공식 엑셀(원본양식 주입) 출력 ────
  // 제출값(values_json) + form_fields(라벨) + form_cell_map(셀맵) → 원본 .xlsx 주입 → 공식 양식 출력.
  ipcMain.handle(
    IPC_CHANNELS.FORM_EXPORT_XLSX,
    async (
      _event,
      { submissionId, pdf }: { submissionId: number; pdf?: boolean }
    ): Promise<FormExportResult> => {
      try {
        const sub = db.prepare('SELECT * FROM form_submissions WHERE id = ?').get(submissionId) as
          | Record<string, unknown>
          | undefined
        if (!sub) return { success: false, error: '제출 기록을 찾을 수 없습니다.' }

        const formCode = sub.form_code as string
        const values = parseJsonSafe<Record<string, unknown>>(sub.values_json as string, {})

        const form = db.prepare('SELECT code, name, reg_code FROM forms WHERE code = ?').get(formCode) as
          | { code: string; name: string; reg_code: string }
          | undefined
        if (!form) return { success: false, error: `양식 ${formCode} 정의가 없습니다.` }

        const fieldRows = db
          .prepare('SELECT field_key, label, type FROM form_fields WHERE form_code = ? ORDER BY sort_order')
          .all(formCode) as Array<{ field_key: string; label: string; type: string }>
        const formFields: FormFieldLite[] = fieldRows.map((r) => ({
          fieldKey: r.field_key,
          label: r.label,
          type: r.type
        }))

        const win = BrowserWindow.getFocusedWindow()
        const stamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
        const serial = (sub.serial_no as string) || stamp
        const defaultName = `${formCode}_${serial}.xlsx`
        const saveRes = await dialog.showSaveDialog(win ?? undefined!, {
          title: '공식 양식 엑셀 저장',
          defaultPath: defaultName,
          filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
        })
        if (saveRes.canceled || !saveRes.filePath) return { success: false, canceled: true }

        const result = await exportSubmissionXlsx({
          db,
          formCode,
          regCode: form.reg_code,
          appValues: values,
          formFields,
          outPath: saveRes.filePath,
          pdf: pdf === true
        })

        // 생성 파일 폴더 열기(검수 편의)
        try {
          shell.showItemInFolder(result.out)
        } catch {
          /* noop */
        }

        return {
          success: true,
          filePath: result.pdf || result.out,
          applied: result.applied.length,
          unmapped: result.unmapped,
          grids: result.grids,
          optCells: result.optCells,
          verify: {
            values: result.verify.values,
            mediaOk: result.verify.mediaOk,
            mergesOk: result.verify.mergesOk
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[form:exportXlsx] error', msg)
        return { success: false, error: msg }
      }
    }
  )

  // ──── 개정 이력: 현재 작성본 값을 개정 스냅샷으로 저장 ────
  // form_submissions.values_json(현재 저장값)을 그대로 스냅샷. rev_no 는 작성본별 누적.
  ipcMain.handle(
    IPC_CHANNELS.FORM_REVISION_SAVE,
    (
      _event,
      { submissionId, changeReason }: { submissionId: number; changeReason?: string }
    ): { success: boolean; revNo?: number; error?: string } => {
      const sub = db
        .prepare('SELECT id, values_json, status, created_by FROM form_submissions WHERE id = ?')
        .get(submissionId) as
        | { id: number; values_json: string; status: string; created_by: string | null }
        | undefined
      if (!sub) return { success: false, error: '작성본을 찾을 수 없습니다.' }

      const { maxRev } = db
        .prepare('SELECT COALESCE(MAX(rev_no), 0) AS maxRev FROM form_submission_revisions WHERE submission_id = ?')
        .get(submissionId) as { maxRev: number }
      const revNo = (maxRev ?? 0) + 1
      // 작성자: 작성본 created_by 우선, 없으면 회사정보 defaultAuthor(로그인 도입 전 stub)
      const author = sub.created_by || getProfileValue(db, 'defaultAuthor')
      const now = new Date().toISOString()

      db.prepare(
        `INSERT INTO form_submission_revisions
           (submission_id, rev_no, values_json, change_reason, author, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(submissionId, revNo, sub.values_json, changeReason?.trim() || null, author, sub.status, now)

      return { success: true, revNo }
    }
  )

  // ──── 개정 이력: 목록(값 제외 경량) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_REVISION_LIST,
    (_event, { submissionId }: { submissionId: number }): FormRevisionListItemDto[] => {
      const rows = db
        .prepare(
          'SELECT id, rev_no, change_reason, author, status, created_at FROM form_submission_revisions WHERE submission_id = ? ORDER BY rev_no DESC'
        )
        .all(submissionId) as Array<Record<string, unknown>>
      return rows.map((r) => ({
        id: r.id as number,
        revNo: r.rev_no as number,
        changeReason: (r.change_reason as string) || null,
        author: (r.author as string) || null,
        status: (r.status as string) || null,
        createdAt: r.created_at as string
      }))
    }
  )

  // ──── 개정 이력: 단건(스냅샷 값 포함, 복원용) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_REVISION_GET,
    (_event, { id }: { id: number }): FormRevisionDto | null => {
      const r = db.prepare('SELECT * FROM form_submission_revisions WHERE id = ?').get(id) as
        | Record<string, unknown>
        | undefined
      if (!r) return null
      return {
        id: r.id as number,
        submissionId: r.submission_id as number,
        revNo: r.rev_no as number,
        values: parseJsonSafe<Record<string, unknown>>(r.values_json as string, {}),
        changeReason: (r.change_reason as string) || null,
        author: (r.author as string) || null,
        status: (r.status as string) || null,
        createdAt: r.created_at as string
      }
    }
  )

  // ──── AI: Claude API generate ────
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE,
    async (_event, req: AiGenerateRequest): Promise<AiGenerateResponse> => {
      try {
        // Load form + field for context
        const form = db
          .prepare('SELECT code, name, reg_code, description FROM forms WHERE code = ?')
          .get(req.formCode) as
          | { code: string; name: string; reg_code: string; description: string | null }
          | undefined
        if (!form) {
          return { success: false, error: `양식 ${req.formCode}을 찾을 수 없습니다.` }
        }

        const field = db
          .prepare(
            'SELECT field_key, label, ai_prompt_hint FROM form_fields WHERE form_code = ? AND field_key = ?'
          )
          .get(req.formCode, req.fieldKey) as
          | { field_key: string; label: string; ai_prompt_hint: string | null }
          | undefined
        if (!field) {
          return { success: false, error: `필드 ${req.fieldKey}를 찾을 수 없습니다.` }
        }

        // Compose context: include other field labels + current values
        const otherFields = db
          .prepare(
            'SELECT field_key, label FROM form_fields WHERE form_code = ? AND field_key != ? ORDER BY sort_order ASC'
          )
          .all(req.formCode, req.fieldKey) as Array<{ field_key: string; label: string }>

        const contextLines: string[] = []
        for (const f of otherFields) {
          const v = req.currentValues[f.field_key]
          if (v !== undefined && v !== null && String(v).trim() !== '') {
            contextLines.push(`- ${f.label}: ${String(v)}`)
          }
        }

        const systemPrompt = `당신은 한국 자동차부품 제조업체 TPC(AM사업부)의 IATF 16949 품질경영시스템 문서 작성을 돕는 어시스턴트입니다.
- 회사: TPC, 2공장 AM사업부 (인발/가공/조립/검사/포장)
- 주요 공정: 인발, 자동차용 방진고무 INNER/OUTER PIPE류, 필라넥, 워터파이프, 쇼바파이프
- 톤: 공식 문서체, 간결, 정량적, IATF 16949 용어 사용
- 형식: 평문 한국어. 절대 마크다운(##, **, -) 사용 금지. 필요시 【】와 번호(1. 2.) 또는 줄바꿈만 사용.
- 분량: 5~15줄 이내.
- 추측 금지: 컨텍스트에 없는 숫자/날짜/이름은 절대 만들어내지 말고, [확인필요] 또는 일반 표현으로 대체.`

        const userMessage = `양식: ${form.name} (${form.code})
규정: ${form.reg_code}
작성할 필드: "${field.label}"

${field.ai_prompt_hint ? `[지침] ${field.ai_prompt_hint}\n\n` : ''}[현재 입력된 다른 필드값]
${contextLines.length > 0 ? contextLines.join('\n') : '(아직 입력된 값 없음)'}

위 컨텍스트를 활용해서 "${field.label}" 항목에 들어갈 내용을 작성해주세요.`

        const result = await aiGenerate({
          systemPrompt,
          userMessage,
          maxTokens: 1200
        })

        console.log(`[ai:generate] ${result.providerId} (${result.model}) success`)
        return { success: true, text: result.text }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:generate] error', msg)
        return { success: false, error: msg }
      }
    }
  )
}
