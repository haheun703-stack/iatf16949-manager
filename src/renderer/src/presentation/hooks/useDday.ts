import { useEffect, useState } from 'react'

const AUDIT_DATE = new Date('2026-06-15T00:00:00')

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
