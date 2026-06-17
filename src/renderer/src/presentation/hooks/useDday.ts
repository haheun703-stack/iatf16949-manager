import { useEffect, useState } from 'react'

// TODO: 데모용 임시 심사일. 실제 정기심사 일정 확정 시 해당 날짜로 교체할 것.
const AUDIT_DATE = new Date('2026-12-31T00:00:00')

function calcDday(): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = AUDIT_DATE.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function useDday(): { dday: number; auditDate: Date } {
  const [dday, setDday] = useState<number>(calcDday())

  useEffect(() => {
    const timer = setInterval(() => setDday(calcDday()), 60 * 60 * 1000)
    return () => clearInterval(timer)
  }, [])

  return { dday, auditDate: AUDIT_DATE }
}
