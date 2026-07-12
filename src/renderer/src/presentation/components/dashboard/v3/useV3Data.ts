import { useEffect, useState } from 'react'
import type { SqReadinessDto, TeamSummaryDto, DailyBoardDto, SqSignal } from '@shared/ipc-types'

const SIGNAL_SCORE: Record<SqSignal, number> = { green: 1, yellow: 0.5, red: 0, gray: 0 }

export interface V3Data {
  readiness: SqReadinessDto | null
  teams: TeamSummaryDto[]
  board: DailyBoardDto | null
  loading: boolean
}

/** SQ준비도·팀요약·오늘할일 3개 집계를 병렬 로드(기존 IPC 재사용, 신규 채널 없음) */
export function useV3Data(): V3Data {
  const [readiness, setReadiness] = useState<SqReadinessDto | null>(null)
  const [teams, setTeams] = useState<TeamSummaryDto[]>([])
  const [board, setBoard] = useState<DailyBoardDto | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [r, t, b] = await Promise.allSettled([
        window.api.invoke(window.api.channels.SQ_READINESS) as Promise<SqReadinessDto>,
        window.api.invoke(window.api.channels.TEAM_SUMMARY) as Promise<TeamSummaryDto[]>,
        window.api.invoke(window.api.channels.DAILY_BOARD) as Promise<DailyBoardDto>
      ])
      if (!alive) return
      if (r.status === 'fulfilled') setReadiness(r.value)
      if (t.status === 'fulfilled') setTeams(t.value)
      if (b.status === 'fulfilled') setBoard(b.value)
      setLoading(false)
    })()
    return () => {
      alive = false
    }
  }, [])

  return { readiness, teams, board, loading }
}

/** 전 항목 가중 준비도 %(팀 집계와 동일 규칙: green 1 · yellow 0.5, gray 제외) */
export function overallReadinessPct(readiness: SqReadinessDto | null): number | null {
  if (!readiness) return null
  const items = readiness.categories.flatMap((c) => c.items).filter((i) => i.signal !== 'gray')
  if (items.length === 0) return null
  const wsum = items.reduce((s, i) => s + i.points, 0)
  return Math.round(
    (items.reduce((s, i) => s + SIGNAL_SCORE[i.signal] * i.points, 0) / (wsum || 1)) * 100
  )
}

/** 항목코드 → 카테고리 인덱스(sort_order 순) 조인맵 — 히트맵·슬라이서용 */
export function codeToCategoryIndex(readiness: SqReadinessDto | null): Map<string, number> {
  const m = new Map<string, number>()
  if (!readiness) return m
  readiness.categories.forEach((cat, idx) => {
    for (const it of cat.items) m.set(it.code, idx)
  })
  return m
}
