import { useMemo } from 'react'
import type { DashboardStats, TaskListItem, TeamSummary, CalendarEvent } from '@shared/ipc-types'
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Hourglass } from 'lucide-react'
import { TEAM_COLORS, TEAM_ICONS, CHAPTER_IDS } from './Dashboard'

interface Props {
  stats: DashboardStats
  tasks: TaskListItem[]
  teams: TeamSummary[]
  calendarEvents: CalendarEvent[]
}

const CHAPTER_TITLES: Record<string, string> = {
  '4': '조직의 상황', '5': '리더십', '6': '기획', '7': '지원',
  '8.1': '운용 기획', '8.2': '제품/서비스 요구사항', '8.3': '설계와 개발',
  '8.4': '외부 제공 관리', '8.5': '생산 및 서비스', '8.6': '제품 불출',
  '8.7': '부적합 관리', '9.1': '모니터링/측정/분석', '9.2': '내부심사',
  '9.3': '경영검토', '10': '개선'
}

const EVENT_STYLES: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  audit: { bg: '#DBEAFE', color: '#1E40AF', dot: '#3B82F6', label: '심사' },
  deadline: { bg: '#FEE2E2', color: '#991B1B', dot: '#EF4444', label: '마감' },
  meeting: { bg: '#F3E8FF', color: '#6B21A8', dot: '#8B5CF6', label: '회의' },
  holiday: { bg: '#F1F5F9', color: '#64748B', dot: '#94A3B8', label: '휴일' }
}

function getChapterForClause(clauseId: string): string | null {
  for (const ch of [...CHAPTER_IDS].reverse()) {
    if (clauseId === ch || clauseId.startsWith(ch + '.')) return ch
  }
  return null
}

function getTeamColor(teamId: string): string {
  return TEAM_COLORS[teamId] || '#6B7280'
}

export function DashboardOverview({ stats, tasks, teams, calendarEvents }: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-4 max-w-[1280px] mx-auto">
      {/* Stat Cards */}
      <div className="grid grid-cols-5 gap-3">
        <StatCard icon={<BarChart3 className="w-5 h-5" />} label="전체 업무" value={stats.total}
          sub={`4장~10장 전체`} accent="#111827" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="완료" value={stats.done}
          sub={stats.total > 0 ? `${Math.round(stats.done / stats.total * 100)}% 달성` : '0%'}
          accent="#10B981" />
        <StatCard icon={<Clock className="w-5 h-5" />} label="진행중" value={stats.inProgress}
          sub="현재 작업중" accent="#F59E0B" />
        <StatCard icon={<AlertTriangle className="w-5 h-5" />} label="지연" value={stats.overdue}
          sub="즉시 조치 필요" accent="#EF4444" />
        <StatCard icon={<Hourglass className="w-5 h-5" />} label="대기" value={stats.pending}
          sub="미착수 항목" accent="#6B7280" />
      </div>

      {/* Row 2: Monthly Chart + Team Progress */}
      <div className="grid grid-cols-[2fr_1fr] gap-3">
        <MonthlyChart tasks={tasks} />
        <TeamProgressBars tasks={tasks} teams={teams} />
      </div>

      {/* Row 3: Calendar + Chapter Progress */}
      <div className="grid grid-cols-2 gap-3">
        <CalendarView calendarEvents={calendarEvents} />
        <ChapterProgress tasks={tasks} filter="all" />
      </div>
    </div>
  )
}

// ── StatCard ──
function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: number; sub: string; accent: string
}): JSX.Element {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border relative overflow-hidden">
      <div className="absolute top-3 right-4 opacity-15 text-2xl" style={{ color: accent }}>{icon}</div>
      <span className="text-[12px] text-muted-foreground font-semibold tracking-wide">{label}</span>
      <div className="text-3xl font-extrabold tracking-tight mt-1" style={{ color: accent }}>{value}</div>
      {sub && <span className="text-[11px] text-muted-foreground mt-0.5">{sub}</span>}
    </div>
  )
}

// ── MonthlyChart ──
function MonthlyChart({ tasks }: { tasks: TaskListItem[] }): JSX.Element {
  const monthData = useMemo(() => {
    const year = new Date().getFullYear()
    const months = Array.from({ length: 12 }, (_, i) => ({
      month: `${i + 1}월`,
      plan: 0,
      done: 0
    }))

    tasks.forEach((t) => {
      if (t.deadline) {
        const d = new Date(t.deadline)
        if (d.getFullYear() === year) {
          months[d.getMonth()].plan++
        }
      }
      if (t.completedAt) {
        const d = new Date(t.completedAt)
        if (d.getFullYear() === year) {
          months[d.getMonth()].done++
        }
      }
    })
    return months
  }, [tasks])

  const maxVal = Math.max(...monthData.map((d) => Math.max(d.plan, d.done)), 1)
  const currentMonth = new Date().getMonth()
  const barH = 140

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-foreground">📅 월별 진도 현황</h3>
        <div className="flex gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#3B82F6' }} />계획
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: '#10B981' }} />완료
          </span>
        </div>
      </div>
      <div className="flex items-end gap-1.5" style={{ height: barH }}>
        {monthData.map((d, i) => {
          const planH = (d.plan / maxVal) * (barH - 30)
          const doneH = (d.done / maxVal) * (barH - 30)
          const isCurrent = i === currentMonth
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-[9px] text-muted-foreground font-semibold">
                {d.done > 0 && d.plan > 0 ? `${Math.round(d.done / d.plan * 100)}%` : ''}
              </span>
              <div className="flex gap-0.5 items-end w-full">
                <div className="flex-1 rounded-t transition-all duration-500"
                  style={{ height: planH, background: isCurrent ? '#BFDBFE' : '#E5E7EB' }} />
                <div className="flex-1 rounded-t transition-all duration-500"
                  style={{ height: doneH, background: isCurrent ? '#3B82F6' : '#10B981' }} />
              </div>
              <span className={`text-[10px] ${isCurrent ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                {d.month}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── TeamProgressBars ──
function TeamProgressBars({ tasks, teams }: { tasks: TaskListItem[]; teams: TeamSummary[] }): JSX.Element {
  const teamStats = useMemo(() => {
    const map: Record<string, { total: number; done: number }> = {}
    teams.forEach((t) => { map[t.id] = { total: 0, done: 0 } })
    tasks.forEach((t) => {
      if (map[t.teamId]) {
        map[t.teamId].total++
        if (t.status === 'done') map[t.teamId].done++
      }
    })
    return Object.entries(map)
      .map(([id, s]) => ({ id, ...s, pct: s.total ? Math.round(s.done / s.total * 100) : 0 }))
      .sort((a, b) => b.pct - a.pct)
  }, [tasks, teams])

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <h3 className="text-sm font-bold text-foreground mb-4">👥 팀별 달성률</h3>
      <div className="flex flex-col gap-2.5">
        {teamStats.map((s) => {
          const team = teams.find((t) => t.id === s.id)
          const color = getTeamColor(s.id)
          return (
            <div key={s.id}>
              <div className="flex justify-between mb-1">
                <span className="text-[12px] font-semibold text-foreground">
                  {TEAM_ICONS[s.id] || '👥'} {team?.name}
                </span>
                <span className="text-[12px] font-bold" style={{ color }}>{s.pct}%</span>
              </div>
              <div className="h-2 bg-muted rounded overflow-hidden">
                <div className="h-full rounded transition-all duration-500"
                  style={{ width: `${s.pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── CalendarView ──
function CalendarView({ calendarEvents }: { calendarEvents: CalendarEvent[] }): JSX.Element {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const todayDate = now.getDate()

  const { weeks, dayNames } = useMemo(() => {
    const firstDay = new Date(year, month, 0).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const wks: (number | null)[][] = []
    let day = 1 - firstDay
    for (let w = 0; w < 6; w++) {
      const week: (number | null)[] = []
      for (let d = 0; d < 7; d++, day++) {
        week.push(day > 0 && day <= daysInMonth ? day : null)
      }
      if (week.some((d) => d !== null)) wks.push(week)
    }
    return { weeks: wks, dayNames: ['일', '월', '화', '수', '목', '금', '토'] }
  }, [year, month])

  const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthEvents = useMemo(() =>
    calendarEvents
      .filter((e) => e.date.startsWith(monthStr))
      .map((e) => ({ ...e, day: parseInt(e.date.split('-')[2]) }))
      .sort((a, b) => a.day - b.day),
    [calendarEvents, monthStr]
  )

  const eventMap = useMemo(() => {
    const map: Record<number, CalendarEvent[]> = {}
    monthEvents.forEach((e) => {
      if (!map[e.day]) map[e.day] = []
      map[e.day].push(e)
    })
    return map
  }, [monthEvents])

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-foreground">
          🗓️ {year}년 {month + 1}월 일정
        </h3>
        <div className="flex gap-2 text-[10px]">
          {Object.entries(EVENT_STYLES).map(([type, st]) => (
            <span key={type} className="flex items-center gap-1 text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: st.dot }} />
              {st.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-4">
        {/* Calendar grid */}
        <div className="flex-shrink-0">
          <div className="grid grid-cols-7 gap-0.5 mb-1" style={{ width: 252 }}>
            {dayNames.map((d) => (
              <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1" style={{ width: 36 }}>
                {d}
              </div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0.5" style={{ width: 252 }}>
              {week.map((d, di) => {
                const isToday = d === todayDate
                const isSun = di === 0
                const dayEvents = d ? eventMap[d] || [] : []
                return (
                  <div key={di} className="flex flex-col items-center justify-center relative rounded-lg"
                    style={{
                      width: 36, height: 36,
                      background: isToday ? '#10B981' : 'transparent',
                      color: isToday ? '#fff' : isSun ? '#EF4444' : d ? '#374151' : 'transparent',
                      fontWeight: isToday ? 700 : 400,
                      fontSize: 12
                    }}>
                    {d || ''}
                    {dayEvents.length > 0 && !isToday && (
                      <div className="flex gap-0.5 absolute bottom-0.5">
                        {dayEvents.slice(0, 2).map((e, i) => (
                          <span key={i} className="rounded-full"
                            style={{ width: 4, height: 4, background: EVENT_STYLES[e.type]?.dot || '#9CA3AF' }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Event list */}
        <div className="flex-1 min-w-0 border-l border-border pl-4">
          <div className="text-[11px] font-semibold text-muted-foreground mb-2">
            {month + 1}월 주요 일정
          </div>
          <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto">
            {monthEvents.length === 0 ? (
              <div className="text-[11px] text-muted-foreground py-4 text-center">
                등록된 일정이 없습니다
              </div>
            ) : (
              monthEvents.map((e, i) => {
                const st = EVENT_STYLES[e.type] || EVENT_STYLES.deadline
                return (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px]"
                    style={{ background: st.bg }}>
                    <span className="font-bold min-w-[28px]" style={{ color: st.color }}>{e.day}일</span>
                    <span className="rounded-full flex-shrink-0" style={{ width: 5, height: 5, background: st.dot }} />
                    <span className="font-medium" style={{ color: st.color }}>{e.label}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── ChapterProgress ──
export function ChapterProgress({ tasks, filter }: { tasks: TaskListItem[]; filter: string }): JSX.Element {
  const chapters = useMemo(() => {
    const now = new Date().toISOString().split('T')[0]
    const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.teamId === filter)

    return CHAPTER_IDS.map((ch) => {
      const chapterTasks = filtered.filter((t) => getChapterForClause(t.clauseId) === ch)
      const total = chapterTasks.length
      const done = chapterTasks.filter((t) => t.status === 'done').length
      const progress = chapterTasks.filter((t) => t.status === 'do' || t.status === 'check' || t.status === 'act').length
      const overdue = chapterTasks.filter((t) => {
        if (!t.deadline || t.status === 'done') return false
        return t.deadline < now
      }).length
      // Find dominant team for coloring
      const teamCounts: Record<string, number> = {}
      chapterTasks.forEach((t) => {
        teamCounts[t.teamId] = (teamCounts[t.teamId] || 0) + 1
      })
      const dominantTeam = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || ''

      return { id: ch, title: CHAPTER_TITLES[ch] || ch, total, done, progress, overdue, dominantTeam }
    }).filter((c) => c.total > 0 || filter === 'all')
  }, [tasks, filter])

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <h3 className="text-sm font-bold text-foreground mb-3">📖 조항별 달성률</h3>
      <div className="flex flex-col gap-2">
        {chapters.map((c) => {
          const pct = c.total > 0 ? Math.round(c.done / c.total * 100) : 0
          const color = getTeamColor(c.dominantTeam)
          return (
            <div key={c.id}>
              <div className="flex justify-between items-center mb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-white px-1.5 py-px rounded min-w-[28px] text-center"
                    style={{ background: color }}>{c.id}</span>
                  <span className="text-[12px] font-medium text-foreground">{c.title}</span>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  {c.overdue > 0 && (
                    <span className="text-destructive font-semibold">⚠ {c.overdue}</span>
                  )}
                  <span className="text-muted-foreground">{c.done}/{c.total}</span>
                  <span className={`font-bold min-w-[32px] text-right ${
                    pct >= 80 ? 'text-green-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500'
                  }`}>{pct}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded overflow-hidden flex">
                <div className="h-full transition-all duration-500" style={{ width: `${c.total > 0 ? (c.done / c.total) * 100 : 0}%`, background: '#10B981' }} />
                <div className="h-full transition-all duration-500" style={{ width: `${c.total > 0 ? (c.progress / c.total) * 100 : 0}%`, background: '#FBBF24' }} />
                <div className="h-full transition-all duration-500" style={{ width: `${c.total > 0 ? (c.overdue / c.total) * 100 : 0}%`, background: '#EF4444' }} />
              </div>
            </div>
          )
        })}
        {chapters.every((c) => c.total === 0) && (
          <div className="text-[12px] text-muted-foreground py-4 text-center">
            등록된 업무가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
