import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { buildCompanyContext } from '../database/company-profile'
import { generate as aiGenerate } from '../ai'
import type {
  FormGuideDto,
  AiGuideResponse,
  AiScoreRequest,
  AiScoreResponse,
  FormScoreDto,
  FormScoreResultDto,
  FormScoreGapDto,
  FormScoreSummaryDto,
  ScoreSeverity
} from '@shared/ipc-types'

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

/** Extracts the first balanced JSON object from an LLM response and parses it. */
function extractJson<T>(raw: string): T | null {
  if (!raw) return null
  // Strip code fences if present
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const text = fenced ? fenced[1] : raw
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let esc = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') inStr = true
    else if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) {
        const slice = text.slice(start, i + 1)
        try {
          return JSON.parse(slice) as T
        } catch {
          return null
        }
      }
    }
  }
  return null
}

function asStringArray(v: unknown, max = 12): string[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => (typeof x === 'string' ? x : x == null ? '' : String(x)))
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, max)
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : parseFloat(String(n))
  if (Number.isNaN(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}

/** Grade/verdict are derived from the numeric score so the UI is always consistent. */
function gradeOf(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 75) return 'B'
  if (score >= 60) return 'C'
  return 'D'
}
function verdictOf(score: number): string {
  if (score >= 80) return '적합'
  if (score >= 60) return '보완필요'
  return '부적합'
}

// 39호 S1: 회사 컨텍스트 = company_profile 유래(buildCompanyContext, per-call).
// 값이 비면 '' — 프롬프트 삽입부에서 줄 자체를 생략한다.

interface FormRow {
  code: string
  name: string
  reg_code: string
  description: string | null
}
interface FieldRow {
  field_key: string
  label: string
  type: string
  section: string | null
}

function loadFormContext(
  db: ReturnType<typeof getSqlite>,
  formCode: string
): { form: FormRow; fields: FieldRow[]; regulationText: string } | null {
  const form = db
    .prepare('SELECT code, name, reg_code, description FROM forms WHERE code = ?')
    .get(formCode) as FormRow | undefined
  if (!form) return null

  const fields = db
    .prepare(
      'SELECT field_key, label, type, section FROM form_fields WHERE form_code = ? ORDER BY sort_order ASC'
    )
    .all(formCode) as FieldRow[]

  const regRows = db
    .prepare(
      'SELECT section_title, section_body FROM regulation_sections WHERE reg_code = ? ORDER BY sort_order ASC'
    )
    .all(form.reg_code) as Array<{ section_title: string; section_body: string }>

  const regulationText = regRows
    .map((r) => `【${r.section_title}】\n${r.section_body}`)
    .join('\n\n')

  return { form, fields, regulationText }
}

// ──────────────────────────────────────────────────────────
// Registration
// ──────────────────────────────────────────────────────────

export function registerScoringHandlers(): void {
  const db = getSqlite()

  // ──── AI 작성 가이드 생성 ────
  ipcMain.handle(
    IPC_CHANNELS.AI_GENERATE_GUIDE,
    async (_event, { formCode, force }: { formCode: string; force?: boolean }): Promise<AiGuideResponse> => {
      try {
        // 캐시 우선 (force 아닐 때)
        if (!force) {
          const cached = db
            .prepare('SELECT guide_json, generated_at FROM form_guides WHERE form_code = ?')
            .get(formCode) as { guide_json: string; generated_at: string } | undefined
          if (cached) {
            const parsed = JSON.parse(cached.guide_json) as Omit<FormGuideDto, 'formCode' | 'generatedAt'>
            return {
              success: true,
              guide: { formCode, generatedAt: cached.generated_at, ...parsed }
            }
          }
        }

        const ctx = loadFormContext(db, formCode)
        if (!ctx) return { success: false, error: `양식 ${formCode}을 찾을 수 없습니다.` }
        const { form, fields, regulationText } = ctx

        const companyCtx = buildCompanyContext(db)
        const systemPrompt = `당신은 IATF 16949 인증 컨설턴트입니다. 한국 자동차부품 제조업체의 품질담당자가 특정 양식을 처음 작성할 때, 무엇을 왜 써야 심사를 통과하는지 실무 가이드를 제공합니다.
${companyCtx ? companyCtx + '\n' : ''}반드시 아래 JSON 형식 하나만 출력하세요. 설명/마크다운/코드펜스 금지.
{
  "purpose": "이 양식의 목적 1~2문장",
  "mustInclude": ["반드시 포함할 항목", "..."],
  "auditPoints": ["심사원이 실제로 확인하는 포인트", "..."],
  "commonFindings": ["이 양식에서 자주 나오는 부적합/지적사항", "..."],
  "tips": ["작성 실무 팁(정량적·구체적으로)", "..."]
}
각 배열은 3~6개. 한국어. 추측성 수치/날짜 금지.`

        const userMessage = `양식: ${form.name} (${form.code})
관련 규정: ${form.reg_code}
${form.description ? `설명: ${form.description}\n` : ''}양식 필드: ${fields.map((f) => f.label).join(', ') || '(필드 미정의)'}

[관련 규정 원문]
${regulationText || '(원문 미등록 — IATF 16949 일반 요구사항 기준으로 작성)'}

위 양식의 작성 가이드를 JSON으로 작성하세요.`

        const result = await aiGenerate({ systemPrompt, userMessage, maxTokens: 1400 })
        const parsed = extractJson<Record<string, unknown>>(result.text)
        if (!parsed) {
          return { success: false, error: 'AI 응답을 해석하지 못했습니다. 다시 시도해 주세요.' }
        }

        const guideBody = {
          purpose: typeof parsed.purpose === 'string' ? parsed.purpose.trim() : '',
          mustInclude: asStringArray(parsed.mustInclude),
          auditPoints: asStringArray(parsed.auditPoints),
          commonFindings: asStringArray(parsed.commonFindings),
          tips: asStringArray(parsed.tips)
        }
        const now = new Date().toISOString()

        db.prepare(
          `INSERT INTO form_guides (form_code, guide_json, provider, model, generated_at)
           VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(form_code) DO UPDATE SET
             guide_json = excluded.guide_json,
             provider = excluded.provider,
             model = excluded.model,
             generated_at = excluded.generated_at`
        ).run(formCode, JSON.stringify(guideBody), result.providerId, result.model, now)

        console.log(`[ai:guide] ${formCode} via ${result.providerId} (${result.model})`)
        return { success: true, guide: { formCode, generatedAt: now, ...guideBody } }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:guide] error', msg)
        return { success: false, error: msg }
      }
    }
  )

  // ──── 캐시된 가이드 조회 ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_GUIDE_GET,
    (_event, { formCode }: { formCode: string }): FormGuideDto | null => {
      const row = db
        .prepare('SELECT guide_json, generated_at FROM form_guides WHERE form_code = ?')
        .get(formCode) as { guide_json: string; generated_at: string } | undefined
      if (!row) return null
      const parsed = JSON.parse(row.guide_json) as Omit<FormGuideDto, 'formCode' | 'generatedAt'>
      return { formCode, generatedAt: row.generated_at, ...parsed }
    }
  )

  // ──── AI 채점 ────
  ipcMain.handle(
    IPC_CHANNELS.AI_SCORE_FORM,
    async (_event, req: AiScoreRequest): Promise<AiScoreResponse> => {
      try {
        const ctx = loadFormContext(db, req.formCode)
        if (!ctx) return { success: false, error: `양식 ${req.formCode}을 찾을 수 없습니다.` }
        const { form, fields, regulationText } = ctx

        // 입력값을 라벨과 함께 정리 (빈 값도 표시 → 누락 판단 근거)
        const filledLines: string[] = []
        const emptyLabels: string[] = []
        for (const f of fields) {
          const v = req.values[f.field_key]
          const str =
            v == null
              ? ''
              : Array.isArray(v)
                ? v.join(', ')
                : String(v)
          if (str.trim() === '') emptyLabels.push(f.label)
          else filledLines.push(`- ${f.label}: ${str}`)
        }

        const companyCtx = buildCompanyContext(db)
        const systemPrompt = `당신은 IATF 16949 인증 심사원입니다. 제출된 품질문서(양식)를 관련 규정과 IATF 16949 요구사항에 비추어 엄격하고 공정하게 채점합니다.
${companyCtx ? companyCtx + '\n' : ''}채점 원칙:
- 규정 원문이 제공되면 그 요구사항 충족 여부를 우선 평가. 없으면 IATF 16949 일반 요구사항 기준.
- 정량적 근거(수치/주기/책임자/기록)가 있는지, 추적성·객관적 증거가 있는지 확인.
- 빈 칸/모호한 표현/추측성 기술은 감점.
- 점수는 0~100 정수. 후하지 않게, 실제 심사 기준으로.
반드시 아래 JSON 하나만 출력. 설명/마크다운/코드펜스 금지.
{
  "score": 0~100,
  "summary": "총평 2~3문장",
  "strengths": ["잘 작성된 점", "..."],
  "gaps": [{"item": "감점/미흡 사유", "severity": "경미|중대|치명", "regRef": "관련 조항(선택)"}],
  "suggestions": ["바로 반영 가능한 개선 문장", "..."],
  "missingFields": ["비었거나 불충분한 필드 label", "..."]
}
모든 텍스트는 한국어.`

        const userMessage = `양식: ${form.name} (${form.code})
관련 규정: ${form.reg_code}
${form.description ? `설명: ${form.description}\n` : ''}
[관련 규정 원문 — 채점 기준]
${regulationText || '(원문 미등록 — IATF 16949 일반 요구사항으로 평가)'}

[제출된 작성 내용]
${filledLines.length > 0 ? filledLines.join('\n') : '(작성된 내용 없음)'}

[빈 필드]
${emptyLabels.length > 0 ? emptyLabels.join(', ') : '(없음)'}

위 제출물을 채점하여 JSON으로 출력하세요.`

        const ai = await aiGenerate({ systemPrompt, userMessage, maxTokens: 1800 })
        const parsed = extractJson<Record<string, unknown>>(ai.text)
        if (!parsed) {
          return { success: false, error: 'AI 채점 응답을 해석하지 못했습니다. 다시 시도해 주세요.' }
        }

        const score = clampScore(parsed.score)
        const gaps: FormScoreGapDto[] = Array.isArray(parsed.gaps)
          ? (parsed.gaps as unknown[])
              .map((g) => {
                const obj = (g ?? {}) as Record<string, unknown>
                const sevRaw = String(obj.severity ?? '경미')
                const severity: ScoreSeverity =
                  sevRaw === '치명' ? '치명' : sevRaw === '중대' ? '중대' : '경미'
                return {
                  item: typeof obj.item === 'string' ? obj.item.trim() : '',
                  severity,
                  regRef: typeof obj.regRef === 'string' && obj.regRef.trim() ? obj.regRef.trim() : null
                }
              })
              .filter((g) => g.item)
              .slice(0, 12)
          : []

        const resultBody: FormScoreResultDto = {
          score,
          grade: gradeOf(score),
          verdict: verdictOf(score),
          summary: typeof parsed.summary === 'string' ? parsed.summary.trim() : '',
          strengths: asStringArray(parsed.strengths),
          gaps,
          suggestions: asStringArray(parsed.suggestions),
          missingFields: asStringArray(parsed.missingFields)
        }
        const now = new Date().toISOString()

        const ins = db
          .prepare(
            `INSERT INTO form_scores
               (form_code, submission_id, score, grade, verdict, summary, result_json, provider, model, scored_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            req.formCode,
            req.submissionId ?? null,
            resultBody.score,
            resultBody.grade,
            resultBody.verdict,
            resultBody.summary,
            JSON.stringify(resultBody),
            ai.providerId,
            ai.model,
            now
          )

        console.log(`[ai:score] ${req.formCode} = ${score}점 via ${ai.providerId}`)
        return {
          success: true,
          result: {
            id: Number(ins.lastInsertRowid),
            formCode: req.formCode,
            submissionId: req.submissionId ?? null,
            provider: ai.providerId,
            model: ai.model,
            scoredAt: now,
            ...resultBody
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:score] error', msg)
        return { success: false, error: msg }
      }
    }
  )

  // ──── 최신 채점 결과 조회 ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SCORE_LATEST,
    (
      _event,
      { formCode, submissionId }: { formCode: string; submissionId?: number | null }
    ): FormScoreDto | null => {
      const row = (
        submissionId != null
          ? db
              .prepare(
                'SELECT * FROM form_scores WHERE form_code = ? AND submission_id = ? ORDER BY scored_at DESC LIMIT 1'
              )
              .get(formCode, submissionId)
          : db
              .prepare('SELECT * FROM form_scores WHERE form_code = ? ORDER BY scored_at DESC LIMIT 1')
              .get(formCode)
      ) as Record<string, unknown> | undefined
      if (!row) return null
      const body = JSON.parse(row.result_json as string) as FormScoreResultDto
      return {
        id: row.id as number,
        formCode: row.form_code as string,
        submissionId: (row.submission_id as number) ?? null,
        provider: (row.provider as string) || null,
        model: (row.model as string) || null,
        scoredAt: row.scored_at as string,
        ...body
      }
    }
  )

  // ──── 채점 요약 목록 (대시보드 집계용) ────
  ipcMain.handle(
    IPC_CHANNELS.FORM_SCORE_LIST,
    (_event, { formCode }: { formCode?: string } = {}): FormScoreSummaryDto[] => {
      // 양식별 최신 점수 1건씩
      const rows = db
        .prepare(
          `SELECT f.code AS form_code, f.name AS form_name, f.reg_code AS reg_code,
                  s.score, s.grade, s.verdict, s.scored_at
           FROM forms f
           LEFT JOIN (
             SELECT fs.* FROM form_scores fs
             JOIN (
               SELECT form_code, MAX(scored_at) AS max_at
               FROM form_scores GROUP BY form_code
             ) m ON fs.form_code = m.form_code AND fs.scored_at = m.max_at
                -- 동일 scored_at 동률 시 최신 id 1건만 선택(중복행 방지)
                AND fs.id = (SELECT MAX(z.id) FROM form_scores z
                             WHERE z.form_code = fs.form_code AND z.scored_at = m.max_at)
           ) s ON s.form_code = f.code
           ${formCode ? 'WHERE f.code = ?' : ''}
           ORDER BY f.code`
        )
        .all(...(formCode ? [formCode] : [])) as Array<Record<string, unknown>>

      return rows.map((r) => ({
        formCode: r.form_code as string,
        formName: (r.form_name as string) || '',
        regCode: (r.reg_code as string) || '',
        latestScore: r.score != null ? (r.score as number) : null,
        grade: (r.grade as string) || null,
        verdict: (r.verdict as string) || null,
        scoredAt: (r.scored_at as string) || null
      }))
    }
  )
}
