// 예시값 완전일치 차단(기록 조작 방지)의 공유 규칙 — 프론트(FormCanvas)와 main(form-handlers) 공용.
// H1 수정: 조작 차단이 UI 버튼이 아니라 데이터 계층에서 성립해야 함(모든 저장 경로 커버).

/**
 * 판정류(저경우수 선택형) 값 — 실제 판정이 예시와 같을 수 있어 완전일치 차단이 오탐(코워크 §0.7).
 * date 와 마찬가지로 완전일치 차단에서 제외한다. 차단 대상 = 측정치·LOT 같은 자유값 fact.
 */
export const JUDGMENT_VALUES = new Set<string>([
  '합격', '불합격', '적합', '부적합', '양', '부', '양호', '불량', '정상', '이상',
  '통과', '유', '무', '완료', '미완료', '가', '불가', '해당없음', '해당',
  'OK', 'NG', 'ok', 'ng', 'PASS', 'FAIL', 'pass', 'fail', 'Pass', 'Fail',
  'Y', 'N', 'y', 'n', 'yes', 'no', 'Yes', 'No'
])

/** 완전일치 차단 제외 타입: date(오늘 우연일치)·선택형(select/radio/checkbox)·auto(자동채움) */
export function isExactBlockExemptType(type: string): boolean {
  return (
    type === 'date' ||
    type === 'select' ||
    type === 'radio' ||
    type === 'checkbox' ||
    type === 'auto'
  )
}

/**
 * 완전일치 차단 대상 라벨 — 우연 일치가 "사실상 불가능"한 고유값 필드만.
 *
 * 코워크 7/22 재정정: 품번·단일 수량·품명은 fact 로 유지(공란 검증은 함)하되 완전일치 차단에서는 제외한다.
 *   회사가 만드는 품번은 소수라 예시에 실존 품번(84610-2S000)을 넣으면, 진짜 그 품번의 부적합을
 *   등록하는 날 정당한 입력이 차단당한다(판정 '합격'과 같은 오탐 구조). 단일 정수 수량도 우연 일치가 잦다.
 * 차단은 우연 일치가 불가능한 것만 — 다중 측정값(10.02/10.05/…)·LOT·시리얼(날짜·일련 기반 고유값).
 *   이 조합이 "베끼면 막히고, 진짜 값이 우연히 예시와 같아도 안 막히는" 최종 형태다.
 */
const BLOCK_ELIGIBLE_LABEL = /(측정치|실측값|실측|LOT|로트|시리얼|serial)/i

export function isBlockEligibleLabel(label: string | null | undefined): boolean {
  return BLOCK_ELIGIBLE_LABEL.test(label ?? '')
}

/** 예시값을 그대로 복제한 fact 필드가 완전일치 차단 대상인지 */
export function isExampleCopyBlocked(
  fieldClass: string | null | undefined,
  type: string,
  exampleValue: string,
  actualValue: string,
  label?: string | null
): boolean {
  if (fieldClass !== 'fact') return false
  if (isExactBlockExemptType(type)) return false
  // 코워크 7/22 재정정: 다중 측정값·LOT·시리얼만 차단(품번·수량·품명은 오탐 방지로 제외)
  if (!isBlockEligibleLabel(label)) return false
  const ex = (exampleValue ?? '').trim()
  if (!ex || JUDGMENT_VALUES.has(ex)) return false
  const v = (actualValue ?? '').trim()
  return v !== '' && v === ex
}
