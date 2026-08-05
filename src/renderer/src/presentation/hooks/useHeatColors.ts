import { useState } from 'react'

/**
 * PB2 ⓔ — "색상 ON/OFF" 단일 토글(문법노트 4차 §2·§4-2, 심사 뷰·매트릭스 공용).
 * OFF = 히트맵·셀 배경 제거(기호·글자만 — 인쇄용/흑백 모니터 전환). localStorage 영속,
 * 회사 DB 미혼입(개인화 — activeUser 선례). 같은 키를 쓰는 화면끼리 상태 공유(재진입 시 반영).
 */
const KEY = 'ui.heatColors'

export function useHeatColors(): [boolean, () => void] {
  const [on, setOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) !== 'off'
    } catch {
      return true
    }
  })
  const toggle = (): void => {
    setOn((v) => {
      try {
        localStorage.setItem(KEY, v ? 'off' : 'on')
      } catch {
        /* 저장 실패 — 메모리 상태로 계속 */
      }
      return !v
    })
  }
  return [on, toggle]
}
