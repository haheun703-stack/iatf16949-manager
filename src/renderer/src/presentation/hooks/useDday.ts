import { useEffect, useState } from 'react'
import type { CompanyProfile } from '@shared/ipc-types'

// 심사일 출처 = company_profile.auditDate(Sidebar 에서 설정). 미설정/로드실패 시 데모 폴백.
// 모듈 단위 캐시 + 구독: 여러 컴포넌트(D-day 배지·대시보드·팀허브)가 IPC 1회를 공유하고,
// Sidebar 에서 심사일을 바꾸면 setAuditDateCache 로 전부 즉시 갱신된다.
// 39호 S1: 캐시를 auditDate 단일값 → CompanyProfile 전체로 확장 — useCompanyProfile 이
// 같은 캐시·구독을 공유한다(회사 표기 divisionLabel·표지 로고 companyNameEn/Short 등).
const FALLBACK_AUDIT_DATE = '2026-12-31'
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const EMPTY_PROFILE: CompanyProfile = {
  companyName: '',
  ceoName: '',
  address: '',
  phone: '',
  fax: '',
  factoryName: '',
  revisionNumber: '',
  revisionDate: '',
  defaultAuthor: '',
  mastersDir: '',
  auditDate: '',
  companyNameEn: '',
  companyNameShort: '',
  divisionLabel: '',
  processes: '',
  products: '',
  plant: ''
}

let cachedProfile: CompanyProfile | null = null // null = 아직 미로드
let loadStarted = false
const listeners = new Set<() => void>()

function currentDateStr(): string {
  const d = cachedProfile?.auditDate
  return d && ISO_DATE.test(d) ? d : FALLBACK_AUDIT_DATE
}

/** Sidebar 저장 직후 호출 — 모든 구독자(useDday·useCompanyProfile)에 즉시 반영. */
export function setAuditDateCache(date: string): void {
  cachedProfile = { ...(cachedProfile ?? EMPTY_PROFILE), auditDate: date }
  listeners.forEach((l) => l())
}

function ensureLoaded(): void {
  if (cachedProfile !== null || loadStarted) return
  loadStarted = true
  void (async () => {
    try {
      const p = (await window.api.invoke(
        window.api.channels.COMPANY_PROFILE_GET
      )) as CompanyProfile
      cachedProfile = p ?? EMPTY_PROFILE
    } catch {
      cachedProfile = EMPTY_PROFILE
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

/** 회사 프로파일 공유 캐시 훅 — useDday 와 동일 IPC 1회·구독을 공유. 로드 전엔 null. */
export function useCompanyProfile(): CompanyProfile | null {
  const [profile, setProfile] = useState(cachedProfile)

  useEffect(() => {
    const sync = (): void => setProfile(cachedProfile)
    listeners.add(sync)
    ensureLoaded()
    return () => {
      listeners.delete(sync)
    }
  }, [])

  return profile
}
