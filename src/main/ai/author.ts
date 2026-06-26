// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase D — 캡처 구조화(메모 → 공식 양식 초안 제안).
//  사용자가 던진 자유 메모를 AI가 양식 필드로 구조화 → propose_form_entry 로 ai_drafts 제안.
//  공식 테이블 미변경(사람 결재 필요). "서류 말고 일을 캡처하라"(#1).
// ─────────────────────────────────────────────────────────────────────────────
import { getSqlite } from '../database/connection'
import { aiCall } from './gateway'
import { getDraft, type AiDraftDto } from './drafts'

export async function structureCapture(
  memo: string,
  formCode: string
): Promise<{ draft: AiDraftDto | null; aiText: string; captureId: number }> {
  const db = getSqlite()
  const now = new Date().toISOString()

  // 1) 캡처 저장
  const cap = db
    .prepare("INSERT INTO raw_captures (kind, content, form_code, status, created_at) VALUES ('memo', ?, ?, 'new', ?)")
    .run(memo, formCode, now)
  const captureId = Number(cap.lastInsertRowid)

  // 2) 기준선(새 draft 회수용)
  const { m: beforeMax } = db.prepare('SELECT COALESCE(MAX(id),0) AS m FROM ai_drafts').get() as { m: number }

  // 3) AI 구조화 (도구: 양식정의 + 근거검색 + 초안제안)
  const today = now.split('T')[0]
  const year = today.slice(0, 4)
  const system = `당신은 메모를 양식 ${formCode} 의 작성 초안으로 구조화하는 어시스턴트입니다.
오늘 날짜는 ${today} 입니다. 메모의 날짜(예 "7/5")는 올해(${year}) 기준으로 해석하고, 발행일자류는 오늘(${today})로 채우세요.
1) 먼저 get_form_definition("${formCode}") 로 필드(field_key·label·type)를 확인하세요.
2) 필요하면 search_knowledge 로 근거(규정·과거 케이스)를 찾으세요.
3) 메모에 있는 사실만 채우고, 없는 필드는 비워두세요(절대 지어내지 말 것).
4) 마지막에 반드시 propose_form_entry 를 호출하세요:
   - form_key = "${formCode}"
   - values 의 키는 반드시 field_key(예: s6) 사용. type=date 는 YYYY-MM-DD, type=auto(발행번호)는 비워둠.
   - source_refs 에 근거 ref_key 를, rationale 에 한 줄 요약을 담으세요.
한국어, 공식 문서체.`
  const res = await aiCall({
    purpose: 'structure_capture',
    system,
    messages: [{ role: 'user', content: `다음 메모를 ${formCode} 초안으로 만들어줘:\n\n${memo}` }],
    tools: ['get_form_definition', 'search_knowledge', 'propose_form_entry'],
    tier: 'fast',
    maxTokens: 1600,
    maxToolTurns: 6
  })

  // 4) 이 호출이 만든 proposed form_entry draft 회수
  const created = db
    .prepare(
      "SELECT id FROM ai_drafts WHERE id > ? AND target_kind='form_entry' AND status='proposed' ORDER BY id DESC LIMIT 1"
    )
    .get(beforeMax) as { id: number } | undefined
  const draft = created ? getDraft(created.id) : null

  if (draft) db.prepare("UPDATE raw_captures SET status='drafted' WHERE id=?").run(captureId)
  return { draft, aiText: res.text, captureId }
}
