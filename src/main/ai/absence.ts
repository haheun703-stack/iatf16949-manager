// ─────────────────────────────────────────────────────────────────────────────
// AI 레이어 Phase F1 — 부재 감지(expected-set). 시크릿 #4: "돈은 없는 것에서 나온다."
//  트리거(4M변경 등) → IATF/SQ 논리상 "있어야 할 양식 세트" → 실제 보유/작성 대비 diff
//  → 충족/미작성/누락 경고. 어제 갭지도(빈 규정)를 룰엔진으로 일반화.
//  (규칙은 큐레이션·편집가능. 점수가 아니라 '존재 여부' 판정 = 결정론. AI는 설명만.)
// ─────────────────────────────────────────────────────────────────────────────
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type { AbsenceCheck, AbsenceItem } from '@shared/ipc-types'

// 트리거 → 기대 규정세트(IATF/SQ 표준 관행). reg=규정코드, expected=기대 산출물.
const RULES: Record<string, { label: string; regs: Array<{ reg: string; expected: string }> }> = {
  '4m_change': {
    label: '4M 변경',
    regs: [
      { reg: 'J-3100', expected: '4M변경 의뢰서·관리대장' },
      { reg: 'J-1101', expected: '공정 FMEA 재검토' },
      { reg: 'J-1102', expected: '관리계획서 개정' },
      { reg: 'J-1103', expected: '작업표준서 개정' },
      { reg: 'J-2100', expected: '양산부품 승인(PPAP) 재제출' },
      { reg: 'F-1100', expected: '변경점 교육 기록' }
    ]
  },
  new_mp: {
    label: '신규 양산(PPAP)',
    regs: [
      { reg: 'J-2100', expected: '양산부품 승인(PPAP)' },
      { reg: 'J-1101', expected: '공정 FMEA' },
      { reg: 'J-1102', expected: '관리계획서' },
      { reg: 'J-1103', expected: '작업표준서' },
      { reg: 'L-2100', expected: '초도품·검사 성적서' },
      { reg: 'J-4100', expected: '도면 관리' }
    ]
  },
  customer_claim: {
    label: '고객 클레임/부적합',
    regs: [
      { reg: 'H-3200', expected: '고객불만 대응 결과' },
      { reg: 'B-1100', expected: '부적합품 통보·처리' },
      { reg: 'B-2100', expected: '시정/예방조치 요구·등록' },
      { reg: 'B-2300', expected: '정성품질 점검' }
    ]
  }
}

/** 결정론 부재 감지(무API): 기대 규정별 양식 보유/작성 여부 → 충족/미작성/누락. */
export function computeExpectedSet(db: Database.Database, triggerKey: string): AbsenceCheck {
  const rule = RULES[triggerKey]
  if (!rule) throw new Error(`알 수 없는 트리거: ${triggerKey}`)

  const formsStmt = db.prepare('SELECT code, name FROM forms WHERE reg_code = ? ORDER BY code')
  const subStmt = db.prepare('SELECT COUNT(*) AS c FROM form_submissions WHERE form_code = ?')

  const items: AbsenceItem[] = rule.regs.map(({ reg, expected }) => {
    const forms = formsStmt.all(reg) as Array<{ code: string; name: string }>
    let submittedForms = 0
    for (const f of forms) {
      const { c } = subStmt.get(f.code) as { c: number }
      if (c > 0) submittedForms++
    }
    const status: AbsenceItem['status'] = forms.length === 0 ? 'missing' : submittedForms > 0 ? 'ok' : 'unwritten'
    return {
      regCode: reg,
      expected,
      formCount: forms.length,
      submittedForms,
      status,
      sampleForm: forms[0]?.name ?? null
    }
  })

  const summary = {
    total: items.length,
    ok: items.filter((i) => i.status === 'ok').length,
    unwritten: items.filter((i) => i.status === 'unwritten').length,
    missing: items.filter((i) => i.status === 'missing').length
  }
  return { triggerKey, triggerLabel: rule.label, items, summary }
}

/** AI 설명(영향 연쇄 + 우선순위). 도구 없음, 사실만. read-only. */
export async function explainAbsence(check: AbsenceCheck): Promise<{ text: string; costUsd: number | null }> {
  const system = `당신은 IATF 16949 / 고객 SQ 심사 전문가입니다. "${check.triggerLabel}" 상황에서 점검해야 할 양식 세트와 현재 보유/작성 상태(JSON)를 보고:
- 1줄 총평: 총 ${check.summary.total}종 중 누락 ${check.summary.missing}·미작성 ${check.summary.unwritten}이 심사/품질에 주는 위험.
- 누락(missing=양식 자체 없음)·미작성(unwritten) 항목을 "왜 필요한지(${check.triggerLabel} 연쇄)"와 함께.
- 우선 처리 순서 3가지(누락 먼저, 영향 큰 것부터).
사실(JSON)에 있는 규정/항목만. 지어내지 말 것. 한국어, 간결, 행동촉구.`
  const res = await aiCall({
    purpose: 'absence',
    system,
    messages: [{ role: 'user', content: JSON.stringify(check) + '\n\n위 점검 결과를 진단하고 우선순위를 제안해줘.' }],
    tier: 'fast',
    maxTokens: 700
  })
  return { text: res.text, costUsd: res.costUsd }
}
