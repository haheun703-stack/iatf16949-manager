import type { ObligationCadence, ObligationCategory } from '@shared/ipc-types'

/** 주기별 색/라벨 */
export const CADENCE_META: Record<
  ObligationCadence,
  { label: string; bar: string; chip: string; desc: string }
> = {
  일: { label: '일간', bar: 'bg-rose-500', chip: 'bg-rose-100 text-rose-700', desc: '매일 반복' },
  주: { label: '주간', bar: 'bg-orange-500', chip: 'bg-orange-100 text-orange-700', desc: '매주 반복' },
  월: { label: '월간', bar: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', desc: '매월 반복' },
  분기: { label: '분기', bar: 'bg-teal-500', chip: 'bg-teal-100 text-teal-700', desc: '분기 반복' },
  년: { label: '연간', bar: 'bg-blue-500', chip: 'bg-blue-100 text-blue-700', desc: '매년 반복' }
}

export const CATEGORY_CHIP: Record<ObligationCategory, string> = {
  내부심사: 'bg-blue-100 text-blue-700',
  경영검토: 'bg-violet-100 text-violet-700',
  모니터링: 'bg-slate-100 text-slate-600',
  공급업체: 'bg-amber-100 text-amber-700',
  '교육/인식': 'bg-teal-100 text-teal-700',
  '교정/MSA': 'bg-cyan-100 text-cyan-700',
  'FMEA/관리계획서': 'bg-indigo-100 text-indigo-700',
  '안전/비상': 'bg-rose-100 text-rose-700',
  문서관리: 'bg-emerald-100 text-emerald-700',
  기타: 'bg-slate-100 text-slate-600'
}

/** 오늘로부터 YYYY-MM-DD 까지 일수 (오늘=0, 미래=양수) */
export function ddayOf(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export type DueTone = 'overdue' | 'soon' | 'ok' | 'inactive'

/** 도래 상태 신호등 (비활성/초과/임박/정상) */
export function dueStatus(
  nextDue: string | null,
  leadDays: number,
  active: boolean
): { tone: DueTone; dot: string; text: string; textTone: string } {
  if (!active) {
    return { tone: 'inactive', dot: 'bg-slate-300', text: '비활성', textTone: 'text-muted-foreground' }
  }
  const n = ddayOf(nextDue)
  if (n == null) {
    return { tone: 'ok', dot: 'bg-slate-300', text: '미정', textTone: 'text-muted-foreground' }
  }
  if (n < 0) {
    return { tone: 'overdue', dot: 'bg-rose-500', text: `D+${-n} 초과`, textTone: 'text-rose-600 font-bold' }
  }
  if (n === 0) {
    return { tone: 'soon', dot: 'bg-amber-500', text: 'D-DAY', textTone: 'text-amber-600 font-bold' }
  }
  if (n <= leadDays) {
    return { tone: 'soon', dot: 'bg-amber-500', text: `D-${n} 임박`, textTone: 'text-amber-600 font-semibold' }
  }
  return { tone: 'ok', dot: 'bg-green-500', text: `D-${n}`, textTone: 'text-muted-foreground' }
}
