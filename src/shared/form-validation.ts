// 예시값 완전일치 차단(기록 조작 방지)의 공유 규칙 — 프론트(FormCanvas)와 main(form-handlers) 공용.
// H1 수정: 조작 차단이 UI 버튼이 아니라 데이터 계층에서 성립해야 함(모든 저장 경로 커버).

/**
 * 판정류(저경우수 선택형) 값 — 실제 판정이 예시와 같을 수 있어 완전일치 차단이 오탐(코워크 §0.7).
 * date 와 마찬가지로 완전일치 차단에서 제외한다. 차단 대상 = 측정치·LOT·수량 같은 자유값 fact.
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

/** 예시값을 그대로 복제한 fact 필드가 완전일치 차단 대상인지 */
export function isExampleCopyBlocked(
  fieldClass: string | null | undefined,
  type: string,
  exampleValue: string,
  actualValue: string
): boolean {
  if (fieldClass !== 'fact') return false
  if (isExactBlockExemptType(type)) return false
  const ex = (exampleValue ?? '').trim()
  if (!ex || JUDGMENT_VALUES.has(ex)) return false
  const v = (actualValue ?? '').trim()
  return v !== '' && v === ex
}
