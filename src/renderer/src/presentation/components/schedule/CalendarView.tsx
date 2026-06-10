import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useScheduleStore } from '../../stores/scheduleStore'
import { CATEGORY_BAR } from './scheduleMeta'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function fmt(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function CalendarView(): JSX.Element {
  const items = useScheduleStore((s) => s.items)
  const openEdit = useScheduleStore((s) => s.openEdit)
  const openCreate = useScheduleStore((s) => s.openCreate)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const todayStr = fmt(now.getFullYear(), now.getMonth(), now.getDate())

  const byDate = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const it of items) {
      if (!it.dueDate) continue
      if (!map.has(it.dueDate)) map.set(it.dueDate, [])
      map.get(it.dueDate)!.push(it)
    }
    return map
  }, [items])

  const cells = useMemo(() => {
    const first = new Date(year, month, 1)
    const startOffset = first.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const total = Math.ceil((startOffset + daysInMonth) / 7) * 7
    const out: Array<{ day: number; dateStr: string } | null> = []
    for (let i = 0; i < total; i++) {
      const dayNum = i - startOffset + 1
      if (dayNum < 1 || dayNum > daysInMonth) out.push(null)
      else out.push({ day: dayNum, dateStr: fmt(year, month, dayNum) })
    }
    return out
  }, [year, month])

  const prev = (): void => {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }
  const next = (): void => {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
  }
  const goToday = (): void => {
    setYear(now.getFullYear())
    setMonth(now.getMonth())
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-3 shrink-0">
        <h2 className="text-xl font-bold tabular-nums tracking-tight">
          {year}년 {month + 1}월
        </h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={prev} className="p-1.5 rounded-md hover:bg-muted">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={next} className="p-1.5 rounded-md hover:bg-muted">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={goToday}
          className="text-xs font-semibold px-2.5 py-1 rounded-md border border-border hover:bg-muted"
        >
          오늘
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-border border border-border rounded-t-xl overflow-hidden shrink-0">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              'bg-card py-2 text-center text-[11px] font-semibold',
              i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-muted-foreground'
            )}
          >
            {w}
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-7 auto-rows-fr gap-px bg-border border-x border-b border-border rounded-b-xl overflow-hidden shadow-sm">
        {cells.map((cell, idx) => {
          if (!cell) return <div key={idx} className="bg-muted/20" />
          const dayItems = byDate.get(cell.dateStr) ?? []
          const isToday = cell.dateStr === todayStr
          const weekday = idx % 7
          return (
            <div
              key={idx}
              onClick={() => openCreate({ dueDate: cell.dateStr })}
              className="bg-card p-2 min-h-[104px] flex flex-col gap-1 cursor-pointer hover:bg-muted/30 transition-colors"
            >
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums w-5 h-5 flex items-center justify-center rounded-full',
                  isToday
                    ? 'bg-primary text-primary-foreground'
                    : weekday === 0
                      ? 'text-rose-500'
                      : weekday === 6
                        ? 'text-blue-500'
                        : 'text-foreground'
                )}
              >
                {cell.day}
              </span>
              <div className="space-y-0.5 overflow-hidden">
                {dayItems.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      openEdit(it)
                    }}
                    className={cn(
                      'w-full text-left text-[10px] font-medium text-white px-1.5 py-1 rounded-md truncate',
                      CATEGORY_BAR[it.category],
                      it.status === '완료' && 'opacity-50 line-through'
                    )}
                    title={it.title}
                  >
                    {it.title}
                  </button>
                ))}
                {dayItems.length > 3 && (
                  <div className="text-[10px] text-muted-foreground pl-1">+{dayItems.length - 3}건</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
