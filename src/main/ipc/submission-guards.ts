// 기록 조작 차단 가드 — form_submissions 의 모든 쓰기 경로가 공유한다.
// form-handlers 클로저에서 추출(검수 7/30 M-조작차단: ai/drafts·케이스 분배가 우회하던 것).
import type Database from 'better-sqlite3'
import { isExampleCopyBlocked } from '@shared/form-validation'

/**
 * H1: 예시값 완전일치(기록 조작) 차단 — 데이터 계층. 모든 저장 경로(초안·완료·이어서·출력·
 * AI 초안 반영·케이스 분배)가 통과. form_examples 있는 양식만 검사(정답 따라쓰기 대상).
 * 위반 필드 label 반환(없으면 null).
 */
export function detectExampleCopy(
  db: Database.Database,
  formCode: string,
  values: Record<string, unknown>
): string | null {
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

/**
 * W2 2착: fact 공란검사 — 완료 저장(createdBy 동반)에만 적용한다(초안은 부분 작성 허용).
 * 서버가 최종 관문(클라 검증은 웹에서 우회 가능).
 */
export function detectEmptyFact(
  db: Database.Database,
  formCode: string,
  values: Record<string, unknown>
): string | null {
  let rows: Array<{ fk: string; lb: string | null }>
  try {
    rows = db
      .prepare(
        `SELECT field_key AS fk, label AS lb FROM form_fields
         WHERE form_code = ? AND field_class = 'fact' AND type <> 'auto'`
      )
      .all(formCode) as typeof rows
  } catch {
    return null // form_fields 미존재(구버전 DB) — 검증 스킵
  }
  for (const r of rows) {
    const v = values[r.fk]
    if (v == null || String(v).trim() === '') return r.lb ?? r.fk
  }
  return null
}
