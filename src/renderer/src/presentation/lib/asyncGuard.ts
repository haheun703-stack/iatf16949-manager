import { useCallback, useEffect, useRef } from 'react'

/**
 * 조회 화면 공통 가드 (8/11 검수 총평 §재발 방지 — "다음 배치부터 조회 화면 공통 프레임에
 * seq 가드·디바운스를 기본 내장한다"의 실장).
 *
 * 근거: 신규 화면 속도전에서 반복 검출된 두 결함이 같은 뿌리다 —
 *   ①늦은 응답이 새 조건 라벨 아래 앉는다(연도·탭·방향 연타 → 타 조건 값 표시/저장)
 *   ②입력 1글자마다 검색 왕복(품번 제안 3중 복제 — 무디바운스)
 * 각 화면이 useRef 를 매번 새로 짜던 것을 여기로 모은다. 신규 조회 화면은 이 둘을 기본 사용.
 */

/**
 * seq 토큰 — 늦은 응답 폐기.
 * 사용: const seq = useSeqGuard()
 *       const t = seq.begin(); ... await; if (!seq.isCurrent(t)) return
 */
export function useSeqGuard(): { begin: () => number; isCurrent: (token: number) => boolean } {
  const ref = useRef(0)
  const begin = useCallback((): number => ++ref.current, [])
  const isCurrent = useCallback((token: number): boolean => token === ref.current, [])
  return { begin, isCurrent }
}

/**
 * 동기 재진입 차단 — 쓰기 버튼 연타(더블클릭) 가드 (8/12 검수 Major ③ 재봉합).
 * useState busy 가드는 재렌더 전의 두 번째 클릭을 못 막는다(같은 틱에서 둘 다 false를 봄) —
 * ref 는 즉시 반영이라 두 번째 호출이 그 자리에서 버려진다. disabled 표시는 state 로 병행하되
 * **관문은 반드시 이것**. 쓰기 버튼 onClick 은 run(task) 경유를 표준으로 한다.
 */
export function useSingleFlight(): (task: () => Promise<void>) => Promise<void> {
  const flying = useRef(false)
  return useCallback(async (task: () => Promise<void>): Promise<void> => {
    if (flying.current) return
    flying.current = true
    try {
      await task()
    } finally {
      flying.current = false
    }
  }, [])
}

/**
 * 디바운스 호출 — 타이핑이 멎은 뒤에만 왕복(기본 250ms, 수집함 선례와 통일).
 * 언마운트 시 예약분 취소.
 */
export function useDebouncedCallback<A extends unknown[]>(fn: (...args: A) => void, ms = 250): (...args: A) => void {
  const fnRef = useRef(fn)
  fnRef.current = fn
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )
  return useCallback(
    (...args: A): void => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => fnRef.current(...args), ms)
    },
    [ms]
  )
}
