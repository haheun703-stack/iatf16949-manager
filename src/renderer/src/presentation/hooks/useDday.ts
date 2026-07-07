import { useEffect, useState } from 'react'
import type { CompanyProfile } from '@shared/ipc-types'

// 심사일 출처 = company_profile.auditDate(Sidebar 에서 설정). 미설정/로드실패 시 데모 폴백.
// 모듈 단위 캐시 + 구독: 여러 컴포넌트(D-day 배지·대시보드·팀허브)가 IPC 1회를 공유하고,
// Sidebar 에서 심사일을 바꾸면 setAuditDateCache 로 전부 즉시 갱신된다.
const FALLBACK_AUDIT_DATE = '2026-12-31'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

let cachedDate: string | null = null // null = 아직 미로드
let loadStarted = false
const listeners = new Set<() => void>()

function currentDateStr(): string {
  return cachedDate && ISO_DATE.test(cachedDate) ? cachedDate : FALLBACK_AUDIT_DATE
}

/** Sidebar 저장 직후 호출 — 모든 useDday 구독자에 즉시 반영. */
export function setAuditDateCache(date: string): void {
  cachedDate = date
  listeners.forEach((l) => l())
}

function ensureLoaded(): void {
  if (cachedDate !== null || loadStarted) return
  loadStarted = true
  void (async () => {
    try {
      const p = (await window.api.invoke(
        window.api.channels.COMPANY_PROFILE_GET
      )) as CompanyProfile
      cachedDate = p?.auditDate || FALLBACK_AUDIT_DATE
    } catch {
      cachedDate = FALLBACK_AUDIT_DATE
    }
    listeners.forEach((l) => l())
  })()
}

function calcDday(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export function useDday(): { dday: number; auditDate: Date } {
  const [dateStr, setDateStr] = useState(currentDateStr())
  const [, setTick] = useState(0)

  useEffect(() => {
    const sync = (): void => setDateStr(currentDateStr())
    listeners.add(sync)
    ensureLoaded()
    // 자정 넘김 대비 시간당 재계산(값이 같아도 tick 으로 강제 리렌더)
    const timer = setInterval(() => setTick((t) => t + 1), 60 * 60 * 1000)
    return () => {
      listeners.delete(sync)
      clearInterval(timer)
    }
  }, [])

  return { dday: calcDday(dateStr), auditDate: new Date(dateStr + 'T00:00:00') }
}
