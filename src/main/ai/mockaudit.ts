// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase E3 — 모의 심사(AI가 심사원).
//  SQ 항목(요구사항) + 우리 증빙 상태 → 예상 질문 + 증빙 충분/부족 판정 + 보완 제안.
//  증빙 상태는 결정론(양식·작성본·기대문서). AI는 질문·판정만(근거 인용, 환각 금지).
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type { MockAuditResult } from '@shared/ipc-types'

export async function mockAudit(sqItemKey: string, db: Database.Database = getSqlite()): Promise<MockAuditResult> {
  const item = db
    .prepare(
      `SELECT i.code, i.title, i.points, i.requirement, c.name AS category
       FROM sq_items i JOIN sq_categories c ON c.id = i.category_id WHERE i.code = ?`
    )
    .get(sqItemKey) as
    | { code: string; title: string; points: number; requirement: string | null; category: string }
    | undefined
  if (!item) throw new Error(`SQ 항목 없음: ${sqItemKey}`)

  // 기대 증빙 문서
  const docs = db
    .prepare('SELECT doc_code, doc_name FROM sq_item_docs WHERE item_code = ?')
    .all(sqItemKey) as Array<{ doc_code: string; doc_name: string }>

  // 매핑 규정 → 양식 → 작성 여부
  const regs = (db.prepare('SELECT reg_code FROM sq_reg_map WHERE item_code = ?').all(sqItemKey) as Array<{
    reg_code: string
  }>).map((r) => r.reg_code)
  const forms: Array<{ code: string; name: string; submitted: boolean }> = []
  const formStmt = db.prepare('SELECT code, name FROM forms WHERE reg_code = ?')
  const subStmt = db.prepare('SELECT COUNT(*) AS c FROM form_submissions WHERE form_code = ?')
  for (const reg of regs) {
    for (const f of formStmt.all(reg) as Array<{ code: string; name: string }>) {
      const { c } = subStmt.get(f.code) as { c: number }
      forms.push({ code: f.code, name: f.name, submitted: c > 0 })
    }
  }
  const submittedCount = forms.filter((f) => f.submitted).length

  const facts = {
    항목: { 코드: item.code, 제목: item.title, 배점: item.points, 요구사항: item.requirement, 카테고리: item.category },
    기대증빙문서: docs.map((d) => d.doc_name),
    보유양식: forms.map((f) => ({ 양식: f.name, 작성됨: f.submitted })),
    작성된양식수: submittedCount
  }

  const system = `당신은 IATF 16949 / 고객 SQ 심사원입니다. 아래 SQ 항목(요구사항)과 우리 회사의 증빙 상태(JSON)를 보고 모의 심사를 진행하세요.
- 이 항목을 심사할 때 던질 **예상 질문 3~5개**(구체적, 심사원 어투).
- 각 질문에 대해 우리 증빙이 **충분/부족** 판정하고, 부족하면 무엇을 보완해야 하는지 명시.
- 보유 양식이 0이거나 작성된 양식이 없으면 **"객관적 증거 부족"**으로 분명히 지적.
- 필요하면 search_knowledge 로 관련 규정·기준을 확인해 질문 근거를 보강하세요.
사실(JSON)에 있는 양식/문서만 인용. 지어내지 말 것. 한국어.`
  const res = await aiCall({
    purpose: 'mock_audit',
    system,
    messages: [{ role: 'user', content: JSON.stringify(facts) + `\n\n위 SQ 항목("${item.title}")을 모의 심사해줘.` }],
    tools: ['search_knowledge'],
    tier: 'fast',
    maxTokens: 1500,
    maxToolTurns: 4
  })

  return {
    itemCode: item.code,
    itemTitle: item.title,
    category: item.category,
    points: item.points,
    formCount: forms.length,
    submittedCount,
    expectedDocCount: docs.length,
    text: res.text,
    costUsd: res.costUsd
  }
}
