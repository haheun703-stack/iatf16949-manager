// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase B — 지식 인덱스(FTS5) reindex + 검색.
//
//  우리 데이터(조항·SQ항목·양식정의·케이스·프로세스)를 kb_chunks 에 평탄화하고 kb_fts(trigram)
//  로 색인. search_knowledge 도구가 이걸 질의해 근거(ref_key + snippet)를 동반한다.
//  로컬·외부유출 0(임베딩 API 안 씀). 코퍼스가 작아 전체 재색인이 충분(앱 기동 시 1회).
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import type Database from 'better-sqlite3'

export type KbKind = 'clause' | 'sq_item' | 'form_def' | 'case' | 'process'

function norm(s: unknown): string {
  return String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 전체 재색인(kb_chunks + kb_fts 비우고 다시 채움). 앱 기동/수동 새로고침에서 호출. */
export function reindexKb(db: Database.Database = getSqlite()): { chunks: number } {
  const run = db.transaction(() => {
    db.exec('DELETE FROM kb_chunks; DELETE FROM kb_fts;')
    const insChunk = db.prepare(
      'INSERT INTO kb_chunks (kind, ref_key, title, text, updated_at) VALUES (?, ?, ?, ?, ?)'
    )
    const insFts = db.prepare('INSERT INTO kb_fts (kind, ref_key, title, text) VALUES (?, ?, ?, ?)')
    const now = new Date().toISOString()
    const add = (kind: KbKind, refKey: string, title: string, text: string): void => {
      const t = norm(text)
      if (!t) return
      insChunk.run(kind, refKey, norm(title), t, now)
      insFts.run(kind, refKey, norm(title), t)
    }

    // clause — IATF 규정 본문
    for (const r of db
      .prepare('SELECT reg_code, section_title, section_body FROM regulation_sections')
      .all() as Array<Record<string, string>>) {
      add('clause', r.reg_code, r.section_title, `${r.section_title} ${r.section_body}`)
    }

    // sq_item — SQ 42항목(요구사항)
    for (const r of db
      .prepare('SELECT code, title, requirement FROM sq_items')
      .all() as Array<Record<string, string>>) {
      add('sq_item', r.code, r.title, `${r.title} ${r.requirement ?? ''}`)
    }

    // form_def — 양식명 + 필드 라벨
    const fieldsStmt = db.prepare('SELECT label FROM form_fields WHERE form_code = ? ORDER BY sort_order')
    for (const f of db
      .prepare('SELECT code, name, reg_code FROM forms')
      .all() as Array<Record<string, string>>) {
      const labels = (fieldsStmt.all(f.code) as Array<{ label: string }>).map((x) => x.label).join(', ')
      add('form_def', f.code, f.name, `${f.name} (${f.reg_code}) ${labels}`)
    }

    // case — 과거 불량/고객불만
    for (const c of db
      .prepare('SELECT case_no, title, customer, part_name, defect_desc FROM cases')
      .all() as Array<Record<string, string>>) {
      add(
        'case',
        c.case_no || 'case',
        c.title || '',
        `${c.title ?? ''} ${c.customer ?? ''} ${c.part_name ?? ''} ${c.defect_desc ?? ''}`
      )
    }

    // process — 프로세스 표지(범위/목적)
    for (const p of db
      .prepare('SELECT process_code, title, scope, purpose FROM process_doc')
      .all() as Array<Record<string, string>>) {
      add('process', p.process_code, p.title, `${p.title} ${p.scope ?? ''} ${p.purpose ?? ''}`)
    }
  })
  run()
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM kb_chunks').get() as { c: number }
  return { chunks: c }
}

export interface KbHit {
  kind: KbKind
  ref_key: string
  title: string
  snippet: string
}

/** FTS5 안전질의: trigram 이라 구문(phrase)으로 감싸 연산자/특수문자 무력화. */
function ftsPhrase(query: string): string {
  return '"' + query.replace(/"/g, '') + '"'
}

function ftsSearch(db: Database.Database, q: string, k: number, kindFilter?: KbKind): KbHit[] {
  const sql = `
    SELECT kind, ref_key, title, snippet(kb_fts, 3, '《', '》', '…', 14) AS snip
    FROM kb_fts WHERE kb_fts MATCH ? ${kindFilter ? 'AND kind = ?' : ''}
    ORDER BY bm25(kb_fts) LIMIT ?`
  const params = kindFilter ? [ftsPhrase(q), kindFilter, k] : [ftsPhrase(q), k]
  return (db.prepare(sql).all(...params) as Array<Record<string, string>>).map((r) => ({
    kind: r.kind as KbKind,
    ref_key: r.ref_key,
    title: r.title,
    snippet: r.snip
  }))
}

// LIKE 폴백 스니펫: 첫 매칭 주변 발췌.
function makeSnippet(text: string, q: string, win = 28): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase())
  if (i < 0) return text.slice(0, win * 2)
  const start = Math.max(0, i - win)
  const end = Math.min(text.length, i + q.length + win)
  return (start > 0 ? '…' : '') + text.slice(start, i) + '《' + text.slice(i, i + q.length) + '》' + text.slice(i + q.length, end) + (end < text.length ? '…' : '')
}

function likeSearch(db: Database.Database, q: string, k: number, kindFilter?: KbKind): KbHit[] {
  const sql = `SELECT kind, ref_key, title, text FROM kb_chunks
               WHERE text LIKE ? ${kindFilter ? 'AND kind = ?' : ''} LIMIT ?`
  const like = `%${q}%`
  const params = kindFilter ? [like, kindFilter, k] : [like, k]
  return (db.prepare(sql).all(...params) as Array<Record<string, string>>).map((r) => ({
    kind: r.kind as KbKind,
    ref_key: r.ref_key,
    title: r.title,
    snippet: makeSnippet(r.text, q)
  }))
}

/**
 * 근거 검색(하이브리드). ≥3자는 trigram FTS(랭킹+스니펫), 2자/FTS 0건은 LIKE 폴백
 * (코퍼스가 작아 저렴 — 한국어 2글자 품질용어 검사·교정·불량 등을 커버).
 * 결과 없으면 빈 배열(근거 없음 = 단정 금지의 토대).
 */
export function searchKnowledge(
  query: string,
  k = 6,
  kindFilter?: KbKind,
  db: Database.Database = getSqlite()
): KbHit[] {
  const q = norm(query)
  if (!q) return []
  let hits: KbHit[] = []
  if (q.length >= 3) {
    try {
      hits = ftsSearch(db, q, k, kindFilter)
    } catch {
      hits = []
    }
  }
  if (hits.length === 0) {
    try {
      hits = likeSearch(db, q, k, kindFilter)
    } catch {
      hits = []
    }
  }
  return hits
}
