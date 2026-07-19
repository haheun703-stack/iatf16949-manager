import type { PageId } from '../presentation/stores/uiStore'

/**
 * 의무·KPI 이름 → 앱 내 도구 화면 딥링크 (7/20).
 * 실측 도구가 앱 안에 있는 항목만 명시 매핑 — 이름 개정 마이그레이션 시 함께 갱신.
 * 현재: '모의 역추적 훈련'(월간 의무)·'역추적 소요시간'(KPI) → LOT 계보 조회.
 */
export interface DeepLink {
  page: PageId
  label: string
  hint: string
}

export function traceDeepLink(name: string): DeepLink | null {
  if (name.includes('역추적')) {
    return {
      page: 'mes-trace',
      label: '계보 조회',
      hint: 'LOT 계보 조회 — MES 계보 정·역추적 실측(리콜 시뮬레이션 데이터 기반)'
    }
  }
  return null
}
