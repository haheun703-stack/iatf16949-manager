import type { ScheduleStatus, ScheduleCategory, SchedulePriority } from '@shared/ipc-types'

export const STATUS_META: Record<ScheduleStatus, { dot: string; chip: string; head: string }> = {
  예정: { dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600', head: 'text-slate-500' },
  진행: { dot: 'bg-violet-500', chip: 'bg-violet-100 text-violet-700', head: 'text-violet-600' },
  완료: { dot: 'bg-green-500', chip: 'bg-green-100 text-green-700', head: 'text-green-600' },
  보류: { dot: 'bg-amber-500', chip: 'bg-amber-100 text-amber-700', head: 'text-amber-600' }
}

export const CATEGORY_CHIP: Record<ScheduleCategory, string> = {
  심사준비: 'bg-violet-100 text-violet-700',
  내부심사: 'bg-blue-100 text-blue-700',
  교육훈련: 'bg-teal-100 text-teal-700',
  '문서/양식': 'bg-indigo-100 text-indigo-700',
  시정조치: 'bg-rose-100 text-rose-700',
  기타: 'bg-slate-100 text-slate-600'
}

export const CATEGORY_BAR: Record<ScheduleCategory, string> = {
  심사준비: 'bg-violet-500',
  내부심사: 'bg-blue-500',
  교육훈련: 'bg-teal-500',
  '문서/양식': 'bg-indigo-500',
  시정조치: 'bg-rose-500',
  기타: 'bg-slate-400'
}

export const PRIORITY_DOT: Record<SchedulePriority, string> = {
  높음: 'bg-rose-500',
  보통: 'bg-slate-300',
  낮음: 'bg-slate-200'
}

/** Days from today to a YYYY-MM-DD date (today=0, future positive). */
export function ddayOf(dateStr: string | null): number | null {
  if (!dateStr) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return null
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export function ddayLabel(dateStr: string | null): { text: string; tone: string } | null {
  const n = ddayOf(dateStr)
  if (n == null) return null
  if (n === 0) return { text: 'D-DAY', tone: 'text-destructive font-bold' }
  if (n < 0) return { text: `D+${-n}`, tone: 'text-muted-foreground' }
  if (n <= 7) return { text: `D-${n}`, tone: 'text-destructive font-semibold' }
  if (n <= 14) return { text: `D-${n}`, tone: 'text-warning font-semibold' }
  return { text: `D-${n}`, tone: 'text-muted-foreground' }
}
