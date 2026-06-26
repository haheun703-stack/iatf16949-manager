// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase A3 — 도구 레지스트리 (read 도구 + draft 도구).
//
//  AI가 쓸 수 있는 능력을 명시적 화이트리스트로 고정.
//   - read 도구: 부작용 0(우리 데이터 조회).
//   - draft 도구: ai_drafts 에만 INSERT(공식 테이블 X). createDraft 경유 = 헌법 준수.
//
//  zod 스키마 = 런타임 검증 단일출처. zodToJsonSchema 로 Anthropic input_schema 생성.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from 'zod'
import { getSqlite } from '../database/connection'
import { createDraft, type SourceRef } from './drafts'
import { searchKnowledge, type KbKind } from './kb'

export interface AiTool {
  name: string
  description: string
  kind: 'read' | 'draft'
  input: z.ZodTypeAny
  handler: (args: Record<string, unknown>) => unknown | Promise<unknown>
}

const refSchema = z
  .array(z.object({ kind: z.string(), key: z.string(), quote_short: z.string().optional() }))
  .optional()

// ── READ 도구 (부작용 0) ─────────────────────────────────────────────────────
const getFormDefinition: AiTool = {
  name: 'get_form_definition',
  description: '양식 코드(form_key)로 양식 정의(이름·규정·필드 목록)를 반환한다.',
  kind: 'read',
  input: z.object({ form_key: z.string() }),
  handler: ({ form_key }) => {
    const db = getSqlite()
    const form = db.prepare('SELECT code, name, reg_code FROM forms WHERE code = ?').get(form_key)
    if (!form) return { error: `양식 ${form_key} 없음` }
    const fields = db
      .prepare('SELECT field_key, label, type, section FROM form_fields WHERE form_code = ? ORDER BY sort_order')
      .all(form_key)
    return { form, fields }
  }
}

const getOpenCases: AiTool = {
  name: 'get_open_cases',
  description: '진행중(open/in_progress) 고객불만/부적합 케이스 목록을 반환한다.',
  kind: 'read',
  input: z.object({ limit: z.number().optional() }),
  handler: ({ limit }) => {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT case_no, title, customer, part_no, part_name, defect_desc, defect_qty, status, due_date
         FROM cases WHERE status IN ('open','in_progress') ORDER BY received_date DESC LIMIT ?`
      )
      .all(typeof limit === 'number' ? limit : 20)
  }
}

const getDocumentBom: AiTool = {
  name: 'get_document_bom',
  description: '프로세스 코드(예 CP-03)에 매핑된 양식 목록을 반환한다.',
  kind: 'read',
  input: z.object({ process_code: z.string() }),
  handler: ({ process_code }) => {
    const db = getSqlite()
    return db
      .prepare(
        `SELECT f.code AS form_key, f.name, f.reg_code
         FROM process_forms pf JOIN forms f ON pf.form_code = f.code
         WHERE pf.process_code = ? ORDER BY pf.sort_order`
      )
      .all(process_code)
  }
}

const KB_KINDS = ['clause', 'sq_item', 'form_def', 'case', 'process'] as const
const searchKnowledgeTool: AiTool = {
  name: 'search_knowledge',
  description:
    '우리 데이터(조항 clause·SQ항목 sq_item·양식정의 form_def·과거케이스 case·프로세스 process)에서 근거를 검색한다. 결과의 ref_key 를 source_refs 로 인용할 것. 근거 없으면 빈 결과.',
  kind: 'read',
  input: z.object({
    query: z.string(),
    k: z.number().optional(),
    kind: z.enum(KB_KINDS).optional()
  }),
  handler: ({ query, k, kind }) => {
    const hits = searchKnowledge(String(query), typeof k === 'number' ? k : 6, kind as KbKind | undefined)
    return { results: hits, note: hits.length ? undefined : '해당 질의에 대한 근거 없음(우리 데이터에서 미발견).' }
  }
}

// ── DRAFT 도구 (ai_drafts 에만 INSERT) ────────────────────────────────────────
function draftTool(
  name: string,
  description: string,
  input: z.ZodTypeAny,
  build: (a: Record<string, unknown>) => {
    targetKind: Parameters<typeof createDraft>[0]['targetKind']
    targetKey?: string | null
    payload: unknown
  }
): AiTool {
  return {
    name,
    description,
    kind: 'draft',
    input,
    handler: (a) => {
      const { targetKind, targetKey, payload } = build(a)
      const id = createDraft({
        targetKind,
        targetKey: targetKey ?? null,
        payload,
        rationale: (a.rationale as string) ?? null,
        sourceRefs: (a.source_refs as SourceRef[]) ?? [],
        confidence: (a.confidence as number) ?? null
      })
      return { draft_id: id, status: 'proposed', note: '공식 기록 아님 — 사람 결재 필요' }
    }
  }
}

const proposeFormEntry = draftTool(
  'propose_form_entry',
  '양식 작성 초안을 제안한다(ai_drafts). 공식 기록 아님 — 사람이 결재해야 반영됨.',
  z.object({
    form_key: z.string(),
    values: z.record(z.any()),
    source_refs: refSchema,
    rationale: z.string().optional(),
    confidence: z.number().optional()
  }),
  (a) => ({ targetKind: 'form_entry', targetKey: a.form_key as string, payload: { formCode: a.form_key, values: a.values } })
)

const proposeCase = draftTool(
  'propose_case',
  '부적합/고객불만 케이스 초안을 제안한다(ai_drafts).',
  z.object({
    title: z.string(),
    customer: z.string().optional(),
    part_no: z.string().optional(),
    defect_desc: z.string().optional(),
    defect_qty: z.number().optional(),
    source_refs: refSchema,
    rationale: z.string().optional(),
    confidence: z.number().optional()
  }),
  (a) => ({
    targetKind: 'case',
    payload: {
      title: a.title,
      customer: a.customer,
      partNo: a.part_no,
      defectDesc: a.defect_desc,
      defectQty: a.defect_qty
    }
  })
)

const proposeAssignment = draftTool(
  'propose_assignment',
  '담당자 배정·마감일 초안을 제안한다(ai_drafts).',
  z.object({
    target: z.string(),
    assignee: z.string(),
    due: z.string().optional(),
    source_refs: refSchema,
    rationale: z.string().optional(),
    confidence: z.number().optional()
  }),
  (a) => ({ targetKind: 'assignment', targetKey: a.target as string, payload: { target: a.target, assignee: a.assignee, due: a.due } })
)

const proposeSchedule = draftTool(
  'propose_schedule',
  '일정(심사주기·교정·만료 등) 초안을 제안한다(ai_drafts).',
  z.object({
    items: z.array(z.any()),
    source_refs: refSchema,
    rationale: z.string().optional(),
    confidence: z.number().optional()
  }),
  (a) => ({ targetKind: 'schedule', payload: { items: a.items } })
)

const proposeSqSelfScore = draftTool(
  'propose_sq_self_score',
  'SQ 항목 자가점수 초안을 제안한다(ai_drafts). 증빙 근거 동반.',
  z.object({
    sq_item_key: z.string(),
    score: z.number(),
    evidence_refs: refSchema,
    rationale: z.string().optional(),
    confidence: z.number().optional()
  }),
  (a) => ({ targetKind: 'sq_self', targetKey: a.sq_item_key as string, payload: { sqItemKey: a.sq_item_key, score: a.score, evidenceRefs: a.evidence_refs } })
)

// ── 레지스트리 ────────────────────────────────────────────────────────────────
export const READ_TOOLS: AiTool[] = [getFormDefinition, getOpenCases, getDocumentBom, searchKnowledgeTool]
export const DRAFT_TOOLS: AiTool[] = [
  proposeFormEntry,
  proposeCase,
  proposeAssignment,
  proposeSchedule,
  proposeSqSelfScore
]
export const AI_TOOLS: AiTool[] = [...READ_TOOLS, ...DRAFT_TOOLS]

const BY_NAME = new Map(AI_TOOLS.map((t) => [t.name, t]))
export function getTool(name: string): AiTool | undefined {
  return BY_NAME.get(name)
}

// ── zod → JSON Schema (Anthropic input_schema). 사용하는 zod 타입만 처리. ──────
type JsonSchema = Record<string, unknown>
export function zodToJsonSchema(s: z.ZodTypeAny): JsonSchema {
  const t = (s as { _def: { typeName: string } })._def.typeName
  const def = (s as { _def: Record<string, unknown> })._def
  switch (t) {
    case 'ZodOptional':
      return zodToJsonSchema(def.innerType as z.ZodTypeAny)
    case 'ZodString':
      return { type: 'string' }
    case 'ZodNumber':
      return { type: 'number' }
    case 'ZodBoolean':
      return { type: 'boolean' }
    case 'ZodAny':
      return {}
    case 'ZodArray':
      return { type: 'array', items: zodToJsonSchema(def.type as z.ZodTypeAny) }
    case 'ZodRecord':
      return { type: 'object', additionalProperties: zodToJsonSchema(def.valueType as z.ZodTypeAny) }
    case 'ZodObject': {
      const shape = (def.shape as () => Record<string, z.ZodTypeAny>)()
      const properties: Record<string, JsonSchema> = {}
      const required: string[] = []
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchema(v)
        if ((v as { _def: { typeName: string } })._def.typeName !== 'ZodOptional') required.push(k)
      }
      return required.length ? { type: 'object', properties, required } : { type: 'object', properties }
    }
    default:
      return {}
  }
}

export interface AnthropicToolDef {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, JsonSchema>; required?: string[] }
}

/** Anthropic Messages API tools 포맷으로 변환(input_schema 는 항상 type:'object'). */
export function toAnthropicTools(tools: AiTool[]): AnthropicToolDef[] {
  return tools.map((t) => {
    const s = zodToJsonSchema(t.input)
    const properties = (s.properties as Record<string, JsonSchema>) ?? {}
    const required = s.required as string[] | undefined
    return {
      name: t.name,
      description: t.description,
      input_schema: required ? { type: 'object', properties, required } : { type: 'object', properties }
    }
  })
}
