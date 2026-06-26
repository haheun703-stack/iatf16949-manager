// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase C2 — 매일 브리핑.
//  규칙엔진이 사실(마감 임박/초과·심사 D-day·누락 증빙)을 결정론적으로 모으고,
//  AI 는 그 사실을 자연어로 요약만 한다(추측·환각 없음, read-only).
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type { BriefingItem, BriefingFacts } from '@shared/ipc-types'

// 데모 심사일(audits 비었을 때 폴백) — useDday.ts 와 동일. 실제 일정 확정 시 audits 테이블로.
const AUDIT_FALLBACK = '2026-12-31'
const DONE = new Set(['done', 'closed', 'completed', '완료', 'approved'])

function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso + 'T00:00:00').getTime()
  const b = new Date(toIso + 'T00:00:00').getTime()
  return Math.round((b - a) / 86400000)
}

/** 결정론적 사실 수집(무API). */
export function computeBriefingFacts(db: Database.Database = getSqlite()): BriefingFacts {
  const today = new Date().toISOString().split('T')[0]
  const overdue: BriefingItem[] = []
  const dueSoon: BriefingItem[] = []

  const consider = (it: Omit<BriefingItem, 'daysLeft'>): void => {
    if (!it.dueDate) return
    const d = daysBetween(today, it.dueDate.slice(0, 10))
    const row = { ...it, daysLeft: d }
    if (d < 0) overdue.push(row)
    else if (d <= 7) dueSoon.push(row)
  }

  // schedule_items
  try {
    for (const r of db
      .prepare('SELECT title, due_date, status, owner FROM schedule_items WHERE due_date IS NOT NULL')
      .all() as Array<Record<string, string>>) {
      if (DONE.has(String(r.status))) continue
      consider({ kind: 'schedule', ref: r.title, title: r.title, dueDate: r.due_date, owner: r.owner || null })
    }
  } catch {
    /* 테이블 없으면 skip */
  }
  // cases (회신 요구일)
  try {
    for (const r of db
      .prepare("SELECT case_no, title, due_date, status, owner FROM cases WHERE due_date IS NOT NULL AND status IN ('open','in_progress')")
      .all() as Array<Record<string, string>>) {
      consider({ kind: 'case', ref: r.case_no || '', title: r.title || r.case_no || '케이스', dueDate: r.due_date, owner: r.owner || null })
    }
  } catch {
    /* skip */
  }

  overdue.sort((a, b) => a.daysLeft - b.daysLeft)
  dueSoon.sort((a, b) => a.daysLeft - b.daysLeft)

  // 심사 D-day: audits 우선, 없으면 폴백
  let audit: BriefingFacts['audit'] = null
  try {
    const a = db
      .prepare("SELECT type, scheduled_date FROM audits WHERE scheduled_date >= ? ORDER BY scheduled_date LIMIT 1")
      .get(today) as { type: string; scheduled_date: string } | undefined
    if (a) audit = { label: a.type, dday: daysBetween(today, a.scheduled_date.slice(0, 10)), date: a.scheduled_date.slice(0, 10) }
  } catch {
    /* skip */
  }
  if (!audit) audit = { label: '정기 인증심사', dday: daysBetween(today, AUDIT_FALLBACK), date: AUDIT_FALLBACK }

  // SQ 누락 증빙: 증빙 문서가 매핑 안 된 항목(부재 감지)
  const sq = { total: 0, missingEvidence: 0, examples: [] as string[] }
  try {
    sq.total = (db.prepare('SELECT COUNT(*) AS c FROM sq_items').get() as { c: number }).c
    const missing = db
      .prepare(
        `SELECT code, title FROM sq_items
         WHERE code NOT IN (SELECT DISTINCT item_code FROM sq_item_docs)
         ORDER BY sort_order`
      )
      .all() as Array<{ code: string; title: string }>
    sq.missingEvidence = missing.length
    sq.examples = missing.slice(0, 3).map((m) => `${m.code} ${m.title}`)
  } catch {
    /* sq 테이블 없으면 skip */
  }

  return { today, overdue, dueSoon, audit, sq }
}

/** AI 요약(사실을 받아 3~5줄 자연어 브리핑). 도구 없음 — 추측 금지. read-only. */
export async function summarizeBriefing(facts: BriefingFacts): Promise<{ text: string; costUsd: number | null }> {
  const system = `당신은 TPC AM사업부 품질팀의 비서입니다. 아래 JSON 사실만으로 오늘의 브리핑을 작성하세요.
- 3~5줄, 한국어, 우선순위: 기한초과 > 마감임박 > 심사 D-day > SQ 증빙누락.
- 사실에 있는 숫자/항목만 언급. 없는 것을 지어내지 마세요. 항목 0개면 "없음"으로.
- 담백하게, 행동을 촉구하는 톤. 마크다운 과용 금지.`
  const res = await aiCall({
    purpose: 'briefing',
    system,
    messages: [{ role: 'user', content: '오늘의 품질 현황 사실:\n' + JSON.stringify(facts, null, 0) + '\n\n위 사실로 브리핑해줘.' }],
    tier: 'fast',
    maxTokens: 500
  })
  return { text: res.text, costUsd: res.costUsd }
}
