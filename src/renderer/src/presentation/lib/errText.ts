/**
 * W4-B 검수 소견(8/13) — 쓰기 실패 안내 공용 분기.
 * 폴리필(server/polyfill/web-api)이 비2xx 응답에 이름표를 붙인다:
 *   403 = PermissionError(권한 매트릭스·PROTECTED 안내문) · 401 = AuthError(세션 만료).
 * 이 둘은 서버 안내문이 정본 — "통신 오류" 폴백으로 덮으면 현장이 권한 문제를 서버
 * 장애로 오인해 재시도·문의가 폭주한다(코워크 8/13 실측). 그 외(진짜 통신 실패·
 * 데스크톱 IPC 예외)만 화면별 폴백 문구를 쓴다. 쓰기 catch 는 이 함수 경유가 표준.
 */
export function invokeErrText(e: unknown, fallback: string): string {
  if (e instanceof Error && (e.name === 'PermissionError' || e.name === 'AuthError') && e.message) {
    return e.message
  }
  return fallback
}
