import { useMemo } from 'react'
import { CalendarRange, User } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useScheduleStore } from '../../stores/scheduleStore'
import { CATEGORY_BAR, CATEGORY_CHIP, STATUS_META, ddayLabel } from './scheduleMeta'

const DAY = 86400000

function parse(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d + 'T00:00:00').getTime()
  return Number.isNaN(t) ? null : t
}

export function TimelineView(): JSX.Element {
  const items = useScheduleStore((s) => s.items)
  const openEdit = useScheduleStore((s) => s.openEdit)

  const dated = useMemo(
    () => items.filter((it) => it.dueDate || it.startDate),
    [items]
  )

  const { startMs, totalDays, months, todayPct } = useMemo(() => {
    const now = Date.now()
    if (dated.length === 0) {
      const s = new Date()
      s.setDate(1)
      return { startMs: s.getTime(), totalDays: 30, months: [], todayPct: -1 }
    }
    const points: number[] = []
    for (const it of dated) {
      const s = parse(it.startDate)
      const d = parse(it.dueDate)
      if (s != null) points.push(s)
      if (d != null) points.push(d)
    }
    let min = Math.min(...points) - 3 * DAY
    let max = Math.max(...points) + 7 * DAY
    if (max - min < 30 * DAY) max = min + 30 * DAY
    const total = Math.ceil((max - min) / DAY)

    // month gridlines
    const ms: { label: string; leftPct: number }[] = []
    const cur = new Date(min)
    cur.setDate(1)
    cur.setMonth(cur.getMonth() + 1)
    while (cur.getTime() < max) {
      ms.push({
        label: `${cur.getFullYear()}.${String(cur.getMonth() + 1).padStart(2, '0')}`,
        leftPct: ((cur.getTime() - min) / (total * DAY)) * 100
      })
      cur.setMonth(cur.getMonth() + 1)
    }
    const tPct = ((now - min) / (total * DAY)) * 100
    return { startMs: min, totalDays: total, months: ms, todayPct: tPct }
  }, [dated])

  if (dated.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <CalendarRange className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold mb-1">날짜가 지정된 일정이 없습니다</p>
          <p className="text-[12px] text-muted-foreground">일정에 시작일/마감일을 넣으면 타임라인에 표시됩니다.</p>
        </div>
      </div>
    )
  }

  const totalMs = totalDays * DAY

  return (
    <div className="h-full overflow-auto border border-border rounded-lg bg-card">
      <div className="min-w-[760px]">
        {/* Month header */}
        <div className="flex sticky top-0 z-10 bg-muted/40 border-b border-border">
          <div className="w-[260px] shrink-0 px-3 py-2 text-[11px] font-semibold text-muted-foreground border-r border-border">
            일정 ({dated.length})
          </div>
          <div className="relative flex-1 h-8">
            {months.map((m) => (
              <div
                key={m.label}
                className="absolute top-0 h-full flex items-center px-1.5 text-[10px] text-muted-foreground border-l border-border/60"
                style={{ left: `${m.leftPct}%` }}
              >
                {m.label}
              </div>
            ))}
            {todayPct >= 0 && todayPct <= 100 && (
              <div className="absolute top-0 h-full w-0.5 bg-primary z-10" style={{ left: `${todayPct}%` }} />
            )}
          </div>
        </div>

        {/* Rows */}
        <div>
          {dated.map((it) => {
            const s = parse(it.startDate) ?? parse(it.dueDate)!
            const d = parse(it.dueDate) ?? parse(it.startDate)!
            const lo = Math.min(s, d)
            const hi = Math.max(s, d)
            const leftPct = Math.max(0, ((lo - startMs) / totalMs) * 100)
            // 막대가 트랙 오른쪽 밖으로 넘치지 않도록 left+width <= 100 으로 클램프
            const widthPct = Math.max(Math.min(((hi - lo) / totalMs) * 100, 100 - leftPct), 1.5)
            const dd = ddayLabel(it.dueDate)
            return (
              <button
                key={it.id}
                type="button"
                onClick={() => openEdit(it)}
                className="w-full flex items-stretch border-b border-border/50 hover:bg-muted/30 text-left"
              >
                <div className="w-[260px] shrink-0 px-3 py-2.5 border-r border-border min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', CATEGORY_CHIP[it.category])}>
                      {it.category}
                    </span>
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_META[it.status].dot)} />
                  </div>
                  <div className="text-[13px] font-medium truncate">{it.title}</div>
                  {it.owner && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <User className="w-2.5 h-2.5" />
                      {it.owner}
                    </div>
                  )}
                </div>
                <div className="relative flex-1 my-2">
                  <div
                    className={cn(
                      'absolute h-5 top-1/2 -translate-y-1/2 rounded flex items-center px-2',
                      CATEGORY_BAR[it.category],
                      it.status === '완료' && 'opacity-50'
                    )}
                    style={{ left: `${Math.max(0, leftPct)}%`, width: `${widthPct}%` }}
                  >
                    {dd && <span className="text-[9px] text-white/90 font-semibold whitespace-nowrap">{dd.text}</span>}
                  </div>
                  {todayPct >= 0 && todayPct <= 100 && (
                    <div className="absolute top-0 h-full w-px bg-primary/40" style={{ left: `${todayPct}%` }} />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
