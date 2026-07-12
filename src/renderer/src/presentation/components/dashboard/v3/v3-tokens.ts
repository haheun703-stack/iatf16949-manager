// 대시보드 v3 차트 팔레트 — 목업(아티팩트 c8a47661) 확정색.
// dataviz 검증 통과(라이트 서피스 #fff): CVD ΔE 47.2, 대비 WARN 3색은 직접 라벨로 해소.
// 카테고리색은 sq_categories sort_order 에 고정 배정(엔티티 고정, 순환 금지).

/** SQ 6대 카테고리 고정색 (sort_order 순) */
export const CAT_COLORS = ['#2a78d6', '#1baf7a', '#eda100', '#4a3aa7', '#e87ba4', '#eb6834']

/** 히트맵 단계(연→진). 값 0 = 트랙색. */
export const HEAT = ['#cde2fb', '#9ec5f4', '#5598e7', '#2a78d6', '#184f95']
/** 히트맵 3단계 이상은 흰 글자 */
export const HEAT_INK_FLIP = 2

export const STATUS = {
  good: '#0ca30c',
  critical: '#d03b3b',
  warning: '#b97707',
  neutral: '#b4c2ce',
  track: '#e9f0f7'
} as const

/** 헤더 밴드 그라디언트 */
export const BAND = { from: '#17497e', to: '#123a63' } as const

/** 값→히트맵 색 (max 기준 5단계) */
export function heatColor(v: number, max: number): { bg: string; ink: string } {
  if (v <= 0 || max <= 0) return { bg: STATUS.track, ink: 'var(--muted-foreground, #7e93a8)' }
  const idx = Math.min(HEAT.length - 1, Math.floor((v / max) * HEAT.length))
  return { bg: HEAT[idx], ink: idx > HEAT_INK_FLIP ? '#ffffff' : '#142438' }
}
