import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { nextFormSerial } from '../database/serial'
import { generate as aiGenerate } from '../ai'
import type {
  FormListItemDto,
  FormDefinitionDto,
  FormFieldDto,
  FormFieldTypeDto,
  FormLayout,
  FormSubmissionDto,
  FormSubmissionListItemDto,
  RegulationSectionDto,
  AiGenerateRequest,
  AiGenerateResponse
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
    sortOrder: (row.sort_order as number) ?? 0
  }
}

export function registerFormHandlers(): void {
  const db = getSqlite()

  // ──── Form list ────
  ipcMain.handle(IPC_CHANNELS.FORM_LIST, (): FormListItemDto[] => {
    const rows = db.prepare(`
      SELECT f.code, f.name, f.reg_code, f.approvals_json,
             (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
             (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code) AS submissions_count,
             (SELECT COUNT(*) FROM form_submissions fs WHERE fs.form_code = f.code AND fs.status = 'draft') AS draft_count
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
        draftCount: (r.draft_count as number) ?? 0
      }
    })
  })

  // ──── Form scope 설정 (전사 공통 / 사업부별 전용 분류) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SET_SCOPE,
    (_event, { formCode, scope }: { formCode: string; scope: 'common' | 'division' }) => {
      const next = scope === 'division' ? 'division' : 'common'
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

      return {
        code: form.code as string,
        name: form.name as string,
        regCode: form.reg_code as string,
        description: (form.description as string) || null,
        approvals: parseJsonSafe<string[]>(form.approvals_json as string, []),
        nextFormCode: (form.next_form_code as string) || null,
        nextFormLabel: (form.next_form_label as string) || null,
        prevFormCode: (form.prev_form_code as string) || null,
        fields: fields.map(rowToField),
        layout: parseJsonSafe<FormLayout | null>(form.layout_json as string | null, null)
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
      }
    ): { success: boolean } => {
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
      // 로그인 도입 전 stub: 회사정보 defaultAuthor. 도입 후 로그인 사용자명으로 대체.
      const author = getProfileValue(db, 'defaultAuthor')

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
        } else if (f.type === 'auto' && /사용자/.test(ph)) {
          if (author) values[f.field_key] = author
        } else if (f.type === 'date' && /(작성일|발행일)/.test(f.label)) {
          values[f.field_key] = today
        }
      }

      return { values, serialPreview }
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
- 사업부장: 서상규 전무 / 품질개발팀장: 홍길동 부장
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
