import { useEffect, useMemo } from 'react'
import { useTaskStore } from '../../stores/taskStore'
import { StatusBadge } from '../shared/StatusBadge'

const PDCA_COLORS: Record<string, string> = {
  plan: '#6b7280',
  do: '#f59e0b',
  check: '#3b82f6',
  act: '#ef4444',
  done: '#22c55e'
}

export function GanttChartView(): JSX.Element {
  const { tasks, loadTasks } = useTaskStore()

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  const tasksWithDates = useMemo(() => tasks.filter((t) => t.deadline && t.createdAt), [tasks])

  const { startDate, endDate, totalDays } = useMemo(() => {
    if (tasksWithDates.length === 0) {
      const now = new Date()
      const s = new Date(now.getFullYear(), now.getMonth(), 1)
      const e = new Date(now.getFullYear(), now.getMonth() + 2, 0)
      return { startDate: s, endDate: e, totalDays: Math.ceil((e.getTime() - s.getTime()) / 86400000) }
    }

    const allDates = tasksWithDates.flatMap((t) => {
      const dates = [new Date(t.deadline!)]
      if (t.createdAt) dates.push(new Date(t.createdAt))
      return dates
    })
    const min = new Date(Math.min(...allDates.map((d) => d.getTime())))
    const max = new Date(Math.max(...allDates.map((d) => d.getTime())))
    min.setDate(min.getDate() - 3)
    max.setDate(max.getDate() + 7)
    const days = Math.max(Math.ceil((max.getTime() - min.getTime()) / 86400000), 30)
    return { startDate: min, endDate: max, totalDays: days }
  }, [tasksWithDates])

  const months = useMemo(() => {
    const result: { label: string; startPct: number; widthPct: number }[] = []
    const cursor = new Date(startDate)
    cursor.setDate(1)
    while (cursor <= endDate) {
      const monthStart = new Date(Math.max(cursor.getTime(), startDate.getTime()))
      const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      const monthEnd = new Date(Math.min(nextMonth.getTime() - 1, endDate.getTime()))
      const startPct = ((monthStart.getTime() - startDate.getTime()) / (totalDays * 86400000)) * 100
      const widthPct = ((monthEnd.getTime() - monthStart.getTime()) / (totalDays * 86400000)) * 100
      result.push({
        label: `${cursor.getFullYear()}.${String(cursor.getMonth() + 1).padStart(2, '0')}`,
        startPct: Math.max(0, startPct),
        widthPct: Math.min(100 - startPct, widthPct)
      })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return result
  }, [startDate, endDate, totalDays])

  const todayPct = useMemo(() => {
    const now = new Date()
    return ((now.getTime() - startDate.getTime()) / (totalDays * 86400000)) * 100
  }, [startDate, totalDays])

  if (tasks.length === 0) {
    return (
      <div>
        <h2 className="text-xl font-bold mb-6">일정표 (Gantt)</h2>
        <div className="text-muted-foreground text-center py-20 bg-card border border-border rounded-lg">
          <p className="text-sm">등록된 업무가 없습니다.</p>
          <p className="text-[11px] mt-1">업무 탭에서 업무를 생성하면 여기에 일정이 표시됩니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">일정표 (Gantt)</h2>
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {/* Month headers */}
        <div className="relative h-8 border-b border-border bg-muted/30">
          {months.map((m) => (
            <div
              key={m.label}
              className="absolute top-0 h-full flex items-center px-2 text-[10px] text-muted-foreground border-l border-border/50"
              style={{ left: `${m.startPct}%`, width: `${m.widthPct}%` }}
            >
              {m.label}
            </div>
          ))}
          {/* Today line header */}
          {todayPct >= 0 && todayPct <= 100 && (
            <div
              className="absolute top-0 h-full w-0.5 bg-primary/60 z-10"
              style={{ left: `${todayPct}%` }}
            />
          )}
        </div>

        {/* Task bars */}
        <div className="relative">
          {tasks.map((task) => {
            const created = task.createdAt ? new Date(task.createdAt) : new Date()
            const deadline = task.deadline ? new Date(task.deadline) : new Date(created.getTime() + 14 * 86400000)
            const leftPct = ((created.getTime() - startDate.getTime()) / (totalDays * 86400000)) * 100
            const widthPct = ((deadline.getTime() - created.getTime()) / (totalDays * 86400000)) * 100

            return (
              <div key={task.id} className="relative h-10 border-b border-border/30 hover:bg-muted/20 flex items-center">
                {/* Label on left */}
                <div className="absolute left-2 z-10 flex items-center gap-1.5 pointer-events-none">
                  <span className="text-[10px] font-mono text-primary">{task.clauseId}</span>
                  <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{task.assignee}</span>
                  <StatusBadge status={task.status} />
                </div>
                {/* Bar */}
                <div
                  className="absolute h-5 rounded-sm opacity-80"
                  style={{
                    left: `${Math.max(0, leftPct)}%`,
                    width: `${Math.max(1, Math.min(100 - leftPct, widthPct))}%`,
                    backgroundColor: PDCA_COLORS[task.status] || PDCA_COLORS.plan
                  }}
                />
                {/* Today line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div className="absolute top-0 h-full w-0.5 bg-primary/40" style={{ left: `${todayPct}%` }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/60 inline-block" /> 오늘</span>
        {Object.entries(PDCA_COLORS).map(([key, color]) => (
          <span key={key} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: color }} />
            {{ plan: '기획', do: '실행', check: '검증', act: '개선', done: '완료' }[key]}
          </span>
        ))}
      </div>
    </div>
  )
}
