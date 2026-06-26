// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase A2 — draft→결재 척추 + 감사 추적 서비스.
//
//  헌법(절대 불변):
//   - AI 쓰기는 ai_drafts 에만(공식 테이블 직접 쓰기 금지). 사람이 approve 해야 commit.
//   - 모든 행위(draft/approve/reject)는 ai_actions 에 출처·모델·시각·결재자와 함께 남는다.
//   - 대상은 안정키(form_code/case_no…)로 가리킨다.
//
//  applyDraft 는 target_kind 별 디스패처. 현재 form_entry(→form_submissions)·case(→cases) 반영.
//  나머지(assignment/schedule/sq_self)는 후속 단계에서 추가.
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import type Database from 'better-sqlite3'

export type DraftTargetKind = 'form_entry' | 'case' | 'assignment' | 'schedule' | 'sq_self'
export type DraftStatus = 'proposed' | 'approved' | 'rejected' | 'superseded' | 'expired'

export interface SourceRef {
  kind: string // clause|sq_item|form_def|entry|case …
  key: string
  quote_short?: string
}

export interface CreateDraftInput {
  targetKind: DraftTargetKind
  targetKey?: string | null
  payload: unknown
  rationale?: string | null
  sourceRefs?: SourceRef[]
  confidence?: number | null
  model?: string | null
}

export interface AiDraftDto {
  id: number
  targetKind: DraftTargetKind
  targetKey: string | null
  payload: unknown
  rationale: string | null
  sourceRefs: SourceRef[]
  confidence: number | null
  status: DraftStatus
  createdBy: string
  model: string | null
  createdAt: string
  decidedBy: string | null
  decidedAt: string | null
  decidedNote: string | null
  appliedRef: string | null
}

export interface LogActionInput {
  actor: 'ai' | 'human'
  action: 'draft' | 'approve' | 'reject' | 'query' | 'briefing' | 'structure_capture'
  draftId?: number | null
  purpose?: string | null
  sourceRefs?: SourceRef[] | null
  model?: string | null
  tokensIn?: number | null
  tokensOut?: number | null
  costUsd?: number | null
}

function parseJson<T>(raw: unknown, fallback: T): T {
  if (typeof raw !== 'string' || !raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** 감사 추적 1행 기록. 게이트웨이(A1)·결재·캡처 등 모든 AI 행위가 이걸 호출. */
export function logAction(input: LogActionInput, db: Database.Database = getSqlite()): number {
  const info = db
    .prepare(
      `INSERT INTO ai_actions (actor, action, draft_id, purpose, source_refs, model, tokens_in, tokens_out, cost_usd, ts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.actor,
      input.action,
      input.draftId ?? null,
      input.purpose ?? null,
      input.sourceRefs ? JSON.stringify(input.sourceRefs) : null,
      input.model ?? null,
      input.tokensIn ?? null,
      input.tokensOut ?? null,
      input.costUsd ?? null,
      new Date().toISOString()
    )
  return Number(info.lastInsertRowid)
}

/** AI 제안 생성(공식 테이블 미변경). draft 도구(A3)가 이걸 호출. */
export function createDraft(input: CreateDraftInput, db: Database.Database = getSqlite()): number {
  const now = new Date().toISOString()
  const info = db
    .prepare(
      `INSERT INTO ai_drafts
         (target_kind, target_key, payload_json, rationale, source_refs, confidence, status, created_by, model, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'proposed', 'ai', ?, ?)`
    )
    .run(
      input.targetKind,
      input.targetKey ?? null,
      JSON.stringify(input.payload ?? {}),
      input.rationale ?? null,
      JSON.stringify(input.sourceRefs ?? []),
      input.confidence ?? null,
      input.model ?? null,
      now
    )
  const id = Number(info.lastInsertRowid)
  logAction({ actor: 'ai', action: 'draft', draftId: id, model: input.model ?? null, sourceRefs: input.sourceRefs ?? null }, db)
  return id
}

function rowToDto(r: Record<string, unknown>): AiDraftDto {
  return {
    id: r.id as number,
    targetKind: r.target_kind as DraftTargetKind,
    targetKey: (r.target_key as string) ?? null,
    payload: parseJson<unknown>(r.payload_json, {}),
    rationale: (r.rationale as string) ?? null,
    sourceRefs: parseJson<SourceRef[]>(r.source_refs, []),
    confidence: (r.confidence as number) ?? null,
    status: r.status as DraftStatus,
    createdBy: r.created_by as string,
    model: (r.model as string) ?? null,
    createdAt: r.created_at as string,
    decidedBy: (r.decided_by as string) ?? null,
    decidedAt: (r.decided_at as string) ?? null,
    decidedNote: (r.decided_note as string) ?? null,
    appliedRef: (r.applied_ref as string) ?? null
  }
}

export function getDraft(id: number, db: Database.Database = getSqlite()): AiDraftDto | null {
  const r = db.prepare('SELECT * FROM ai_drafts WHERE id = ?').get(id) as Record<string, unknown> | undefined
  return r ? rowToDto(r) : null
}

export function listDrafts(
  opts: { status?: DraftStatus; targetKind?: DraftTargetKind } = {},
  db: Database.Database = getSqlite()
): AiDraftDto[] {
  const where: string[] = []
  const params: unknown[] = []
  if (opts.status) {
    where.push('status = ?')
    params.push(opts.status)
  }
  if (opts.targetKind) {
    where.push('target_kind = ?')
    params.push(opts.targetKind)
  }
  const sql = `SELECT * FROM ai_drafts ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`
  return (db.prepare(sql).all(...params) as Array<Record<string, unknown>>).map(rowToDto)
}

// ── target_kind 별 공식 테이블 반영기 ───────────────────────────────────────────
// 반영 후 식별 문자열("table:id")을 반환. payload 검증은 보수적으로(필수 필드 없으면 throw).
function applyByKind(
  db: Database.Database,
  kind: DraftTargetKind,
  payload: Record<string, unknown>,
  approver: string
): string {
  const now = new Date().toISOString()
  switch (kind) {
    case 'form_entry': {
      const formCode = String(payload.formCode ?? payload.form_key ?? '')
      if (!formCode) throw new Error('form_entry payload 에 formCode 가 없습니다.')
      const values = payload.values ?? {}
      const serialNo = (payload.serialNo as string) ?? null
      const info = db
        .prepare(
          `INSERT INTO form_submissions (form_code, serial_no, values_json, status, created_by, created_at, updated_at)
           VALUES (?, ?, ?, 'draft', ?, ?, ?)`
        )
        .run(formCode, serialNo, JSON.stringify(values), approver, now, now)
      return `form_submissions:${Number(info.lastInsertRowid)}`
    }
    case 'case': {
      const title = (payload.title as string) ?? null
      const info = db
        .prepare(
          `INSERT INTO cases (case_no, title, customer, source, part_no, part_name, model, defect_desc, defect_qty,
                              attributable, occurred_date, received_date, due_date, status, owner, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`
        )
        .run(
          (payload.caseNo as string) ?? null,
          title,
          (payload.customer as string) ?? null,
          (payload.source as string) ?? null,
          (payload.partNo as string) ?? null,
          (payload.partName as string) ?? null,
          (payload.model as string) ?? null,
          (payload.defectDesc as string) ?? null,
          (payload.defectQty as number) ?? null,
          (payload.attributable as string) ?? null,
          (payload.occurredDate as string) ?? null,
          (payload.receivedDate as string) ?? null,
          (payload.dueDate as string) ?? null,
          (payload.owner as string) ?? approver,
          now,
          now
        )
      return `cases:${Number(info.lastInsertRowid)}`
    }
    default:
      throw new Error(`applyDraft: target_kind '${kind}' 반영기는 후속 단계에서 구현 예정입니다.`)
  }
}

/**
 * 결재(승인) — 트랜잭션으로: draft 의 payload 를 공식 테이블에 반영 + status=approved + ai_actions 기록.
 * editDiff: 사람이 결재 전 수정한 내용(★수용률 학습용). 수정본이 있으면 그 payload 로 반영.
 */
export function applyDraft(
  id: number,
  approver: string,
  opts: { editedPayload?: unknown; editDiff?: string } = {},
  db: Database.Database = getSqlite()
): { success: boolean; appliedRef?: string; error?: string } {
  const draft = db.prepare('SELECT * FROM ai_drafts WHERE id = ?').get(id) as Record<string, unknown> | undefined
  if (!draft) return { success: false, error: '제안을 찾을 수 없습니다.' }
  if (draft.status !== 'proposed') return { success: false, error: `이미 처리된 제안입니다(status=${draft.status}).` }

  const kind = draft.target_kind as DraftTargetKind
  const payload =
    opts.editedPayload !== undefined
      ? (opts.editedPayload as Record<string, unknown>)
      : parseJson<Record<string, unknown>>(draft.payload_json, {})

  try {
    const run = db.transaction(() => {
      const appliedRef = applyByKind(db, kind, payload, approver)
      db.prepare(
        `UPDATE ai_drafts
           SET status='approved', decided_by=?, decided_at=?, edit_diff=?, applied_ref=?,
               payload_json=?
         WHERE id=?`
      ).run(
        approver,
        new Date().toISOString(),
        opts.editDiff ?? null,
        appliedRef,
        JSON.stringify(payload),
        id
      )
      logAction({ actor: 'human', action: 'approve', draftId: id, purpose: kind }, db)
      return appliedRef
    })
    const appliedRef = run()
    return { success: true, appliedRef }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/** 거절 — status=rejected + 사유 기록 + ai_actions. 공식 테이블 미변경. */
export function rejectDraft(
  id: number,
  approver: string,
  note?: string,
  db: Database.Database = getSqlite()
): { success: boolean; error?: string } {
  const draft = db.prepare('SELECT status FROM ai_drafts WHERE id = ?').get(id) as { status: string } | undefined
  if (!draft) return { success: false, error: '제안을 찾을 수 없습니다.' }
  if (draft.status !== 'proposed') return { success: false, error: `이미 처리된 제안입니다(status=${draft.status}).` }
  db.prepare(
    `UPDATE ai_drafts SET status='rejected', decided_by=?, decided_at=?, decided_note=? WHERE id=?`
  ).run(approver, new Date().toISOString(), note ?? null, id)
  logAction({ actor: 'human', action: 'reject', draftId: id }, db)
  return { success: true }
}
