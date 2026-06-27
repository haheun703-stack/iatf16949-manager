// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase E2 — 유사 케이스 검색 + 8D/5Why 초안.
//  신규 불량 → 과거 유사 케이스(cases) 검색(결정론) → AI가 5Why 원인 + 재발방지 대책
//  (과거 case_no 인용, 그라운딩). read-only 자문(초안화는 'AI 작성'으로 연결).
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type { SimilarCase, SimilarCaseResult } from '@shared/ipc-types'

/** 과거 케이스 유사검색(단어 매칭 점수). 임베딩 대신 코퍼스 작아 키워드 매칭으로 충분. */
export function findSimilarCases(query: string, db: Database.Database = getSqlite(), k = 3): SimilarCase[] {
  const q = query.replace(/\s+/g, ' ').trim()
  if (!q) return []
  const words = q.split(' ').filter((w) => w.length >= 2)
  const rows = db
    .prepare('SELECT case_no, title, customer, part_name, defect_desc, occurred_date FROM cases')
    .all() as Array<Record<string, string | null>>
  return rows
    .map((r) => {
      const text = `${r.title ?? ''} ${r.defect_desc ?? ''} ${r.part_name ?? ''} ${r.customer ?? ''}`
      const score = words.filter((w) => text.includes(w)).length
      return { r, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((x) => ({
      caseNo: x.r.case_no ?? '',
      title: x.r.title ?? '',
      customer: x.r.customer ?? null,
      partName: x.r.part_name ?? null,
      defectDesc: x.r.defect_desc ?? null,
      occurredDate: x.r.occurred_date ?? null
    }))
}

export async function analyzeSimilar(defect: string, db: Database.Database = getSqlite()): Promise<SimilarCaseResult> {
  const similar = findSimilarCases(defect, db)
  const system = `당신은 자동차부품 품질/8D 전문가입니다. 신규 불량과 과거 유사 케이스(JSON)를 보고:
- 과거 유사 사례에서 배울 점(어떤 불량이었고 시사점은). 과거 케이스의 case_no 를 인용.
- 신규 불량의 추정 근본원인을 5Why 식으로 2~3단계.
- 재발방지 대책 2~3가지(구체적, 발생/유출 관점).
- 필요하면 search_knowledge 로 관련 규정·기준을 확인.
과거 케이스 JSON에 있는 사실만 인용. 추측은 "추정"으로 표시. 한국어, 공식 문서체.`
  const res = await aiCall({
    purpose: 'similar_case',
    system,
    messages: [
      {
        role: 'user',
        content: `신규 불량: ${defect}\n\n과거 유사 케이스(${similar.length}건): ${JSON.stringify(similar)}\n\n위를 바탕으로 원인분석(5Why)과 재발방지 대책을 제시해줘.`
      }
    ],
    tools: ['search_knowledge'],
    tier: 'fast',
    maxTokens: 1300,
    maxToolTurns: 3
  })
  return { similar, analysis: res.text, costUsd: res.costUsd }
}
