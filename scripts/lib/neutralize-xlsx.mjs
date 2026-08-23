// ============================================================
// scripts/lib/neutralize-xlsx.mjs — 표준팩 xlsx 템플릿 문자열 중립화 규칙 (39호 S3-2 후반, 2026-08-23)
//
// 40호 ④-2 ⓐ 도장: "42종 전부(회사명 칸 프로파일 치환) + 미추출 추출·클리어". 실측(8/23)은 시트 기준 199 + 번들 39.
// 정본 규정집 199시트 스캔 = 회사식별 셀 1,188 · 고유 문자열 62 → 아래 규칙으로 전량 처리, 잔재는 생성기 게이트가 중단.
//
// 규칙 순서(문자열 1개에 차례로 적용):
//   ① 회사명 → {{companyName}} 토큰 (출력 엔진이 company_profile.companyName 으로 치환 — form-export-engine applyProfileTokens)
//   ② 문서/자격 코드 접두 "TPC-" 제거 (④-1 코드 체계 채택과 같은 결)
//   ③ 실명 → 공란
//   ④ 사업부명 → "사업부 N" (전 시트 일관: 인발 계열=1 · 필라넥=2 · 조관/강관=3 · 쇼바=4)
//   ⑤ 공정·반·제품 고유 표현 → 범용 표현(명시 맵)
// ============================================================

export const COMPANY_TOKEN = '{{companyName}}'

/** ①②③ 정규식 */
const COMPANY_RE = /(?:주식회사\s*|㈜\s*|\(주\)\s*)?(?:티피씨|TPC)(?![A-Za-z0-9-])/g
const TPC_PREFIX_RE = /\bTPC-/g
const NAME_RE = /김권표(?:\s*(?:부장|이사|님))?|서상규|하헌[가-힣]?|서규하|장석봉/g

/** ④ 사업부 — 긴 표현부터 */
const DIVISION_RULES = [
  [/정밀인발튜브\s*및\s*정밀강관\s*사업부/g, '사업부 1·3'],
  [/정밀인발튜브\s*사업부|튜브인발사업부|정밀인발\s*튜브\s*사업부/g, '사업부 1'],
  [/필라넥\s*워터\s*사업부|필라넥\s*사업부/g, '사업부 2'],
  [/정밀강관\s*사업부|조관사업부/g, '사업부 3'],
  [/쇼바용접\s*사업부|쇼바\s*사업부/g, '사업부 4'],
  [/정밀인발튜브|정밀인발/g, '사업부 1'],
  [/필라넥\s*워터|필라넥/g, '사업부 2'],
  [/정밀강관/g, '사업부 3'],
  [/쇼바용접|쇼바/g, '사업부 4']
]

/** ④-2 고객사명(리뷰 8/23 — 검사 규칙 강화로 드러난 HKMC·삼보 270셀) → 범용 */
const CUSTOMER_RULES = [
  [/HKMC|현대자동차그룹|현대차그룹|현대위아|현대모비스|현대트랜시스|기아자동차|현대·기아|현대기아/g, '고객사'],
  [/삼보s*네고/g, '고객 네고'],
  [/삼보s*제출가/g, '고객 제출가'],
  [/삼보매출액/g, '고객사 매출액'],
  [/삼보모터스|삼보/g, '고객사'],
  [/현대|기아|위아|모비스|(?<![가-힣])(현대|기아|위아|모비스)(?![가-힣])/g, '고객사']
]

/** ⑤ 공정·반·제품 고유 표현(명시) — 긴 것부터 */
const PROCESS_RULES = [
  [/1\.제품안전 교육 대상\s*:\s*[^\n]*?스팟용접공정 작업자 전원/g, '1.제품안전 교육 대상 : 해당 공정 작업자 전원'],
  [/본사\s*:\s*인발 파이프[^\n]*?3공장\s*:\s*[^\n]*/g, '본사 : (주력 제품)  2공장 : (제품)  3공장 : (제품)'],
  [/본사\s*:\s*인발\/필라넥 가공,도장[^\n]*/g, '본사 : (공정)  2공장 : (공정)  공정외 : (공정)'],
  [/인발반, 가공반, 도장반/g, '생산반'],
  [/포장반, 조관반/g, '포장반'],
  [/신규인발기/g, '신규 설비'],
  [/조관 PIPE규격/g, 'PIPE 규격'],
  [/스팟용접공정|브레이징 공정|브레징 용접 공정|브레이징/g, '핵심공정'],
  [/인발 파이프|조관 파이프|인발공정|조관공정|인발\/가공/g, '주력 공정'],
  [/티피씨재고/g, '자사재고'],
  [/(?<![가-힣A-Za-z])인발(?![가-힣A-Za-z])/g, '주력 공정'], // \b 는 한글에 안 먹힘(리뷰 8/23) — 한글/영문 경계 lookaround
  [/(?<![가-힣A-Za-z])조관(?![가-힣A-Za-z])/g, '주력 공정']
]

/** 문자열 1개 중립화. 변화 없으면 원문 그대로 반환. */
export function neutralizeString(s) {
  if (typeof s !== 'string' || !s) return s
  let t = s
  t = t.replace(COMPANY_RE, COMPANY_TOKEN)
  t = t.replace(TPC_PREFIX_RE, '')
  t = t.replace(NAME_RE, '')
  for (const [re, rep] of CUSTOMER_RULES) t = t.replace(re, rep)
  for (const [re, rep] of PROCESS_RULES) t = t.replace(re, rep) // 공장 범례처럼 사업부명을 품은 긴 표현을 먼저
  for (const [re, rep] of DIVISION_RULES) t = t.replace(re, rep)
  return t
}

/** 생성기 게이트 — 치환 뒤 남으면 안 되는 것(토큰은 제외) */
export const XLSX_RESIDUE_RE = /티피씨|TPC|AM사업부|인발|조관|필라넥|쇼바|김권표|서상규|하헌|서규하|장석봉|브레이징|브레징|현대|기아|위아|삼보|모비스|HKMC/

/** 셀 값에서 검사·치환 대상 문자열 전부 — 문자열·리치텍스트·수식 텍스트·수식 캐시 결과(리뷰 8/23: 수식 안 리터럴 누락). */
export function cellStrings(v) {
  if (v == null) return []
  if (typeof v === 'string') return [v]
  if (typeof v !== 'object') return []
  const out = []
  if ('richText' in v) out.push(v.richText.map((t) => t.text).join(''))
  if (typeof v.formula === 'string') out.push(v.formula)
  if (typeof v.sharedFormula === 'string') out.push(v.sharedFormula)
  if (typeof v.result === 'string') out.push(v.result)
  if (typeof v.text === 'string') out.push(v.text)
  return out
}
