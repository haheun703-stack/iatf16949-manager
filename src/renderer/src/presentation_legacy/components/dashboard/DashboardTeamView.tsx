import { useState, useMemo } from 'react'
import type { DashboardStats, TaskListItem, PersonSummary } from '@shared/ipc-types'
import { TEAM_COLORS } from './Dashboard'
import { ChapterProgress } from './DashboardOverview'

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  done: { label: '완료', color: '#10B981', bg: '#D1FAE5' },
  do: { label: '진행중', color: '#F59E0B', bg: '#FEF3C7' },
  plan: { label: '대기', color: '#6B7280', bg: '#F3F4F6' },
  check: { label: '검증', color: '#3B82F6', bg: '#DBEAFE' },
  act: { label: '개선', color: '#8B5CF6', bg: '#F3E8FF' },
  overdue: { label: '지연', color: '#EF4444', bg: '#FEE2E2' }
}

const PRIORITY_CFG: Record<string, { label: string; color: string }> = {
  high: { label: '긴급', color: '#EF4444' },
  medium: { label: '보통', color: '#F59E0B' },
  low: { label: '낮음', color: '#94A3B8' }
}

interface Props {
  teamId: string
  teamName: string
  teamIcon: string
  stats: DashboardStats
  tasks: TaskListItem[]
  members: PersonSummary[]
}

export function DashboardTeamView({ teamId, teamName, teamIcon, stats, tasks, members }: Props): JSX.Element {
  const color = TEAM_COLORS[teamId] || '#6B7280'

  return (
    <div className="flex flex-col gap-4 max-w-[1280px] mx-auto">
      {/* Team Header */}
      <div className="rounded-xl p-5 flex items-center justify-between"
        style={{
          background: `linear-gradient(135deg, ${color}11, ${color}05)`,
          border: `1px solid ${color}22`
        }}>
        <div>
          <h2 className="text-lg font-extrabold text-foreground">
            {teamIcon} {teamName}
          </h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            담당 인원 {members.length}명 · 담당 업무 {stats.total}건
          </p>
        </div>
        <div className="flex gap-2.5">
          {[
            { key: 'done', value: stats.done },
            { key: 'do', value: stats.inProgress },
            { key: 'overdue', value: stats.overdue }
          ].map((s) => {
            const cfg = STATUS_CFG[s.key] || STATUS_CFG.plan
            return (
              <div key={s.key} className="px-4 py-2 rounded-lg text-center min-w-[64px]"
                style={{ background: cfg.bg }}>
                <div className="text-xl font-extrabold" style={{ color: cfg.color }}>{s.value}</div>
                <div className="text-[10px] font-semibold" style={{ color: cfg.color }}>{cfg.label}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-2 gap-3">
        <MemberCards teamId={teamId} members={members} tasks={tasks} />
        <ChapterProgress tasks={tasks} filter={teamId} />
      </div>

      {/* Task Table */}
      <TaskTable tasks={tasks} teamId={teamId} />
    </div>
  )
}

// ── MemberCards ──
function MemberCards({ teamId, members, tasks }: {
  teamId: string; members: PersonSummary[]; tasks: TaskListItem[]
}): JSX.Element {
  const color = TEAM_COLORS[teamId] || '#6B7280'
  const now = new Date().toISOString().split('T')[0]

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <h3 className="text-sm font-bold text-foreground mb-3">👤 담당자별 현황</h3>
      <div className={`grid gap-2.5 ${members.length >= 4 ? 'grid-cols-4' : members.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {members.map((m) => {
          const myTasks = tasks.filter((t) => t.assigneeId === m.id)
          const done = myTasks.filter((t) => t.status === 'done').length
          const overdue = myTasks.filter((t) => {
            if (!t.deadline || t.status === 'done') return false
            return t.deadline < now
          }).length
          const inProgress = myTasks.filter((t) => t.status === 'do' || t.status === 'check' || t.status === 'act').length
          const pct = myTasks.length ? Math.round(done / myTasks.length * 100) : 0

          return (
            <div key={m.id} className="p-3 rounded-lg border border-border bg-muted/30">
              <div className="text-[13px] font-bold text-foreground mb-2">{m.name}</div>
              <div className="flex gap-1 mb-2 flex-wrap">
                {done > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-px rounded"
                    style={{ background: STATUS_CFG.done.bg, color: STATUS_CFG.done.color }}>
                    완료 {done}
                  </span>
                )}
                {inProgress > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-px rounded"
                    style={{ background: STATUS_CFG.do.bg, color: STATUS_CFG.do.color }}>
                    진행 {inProgress}
                  </span>
                )}
                {overdue > 0 && (
                  <span className="text-[10px] font-semibold px-1.5 py-px rounded"
                    style={{ background: STATUS_CFG.overdue.bg, color: STATUS_CFG.overdue.color }}>
                    지연 {overdue}
                  </span>
                )}
                {myTasks.length === 0 && (
                  <span className="text-[10px] text-muted-foreground">배정 없음</span>
                )}
              </div>
              <div className="h-1.5 bg-border rounded overflow-hidden">
                <div className="h-full rounded transition-all duration-500"
                  style={{ width: `${pct}%`, background: color }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1 text-right">{pct}% 완료</div>
            </div>
          )
        })}
        {members.length === 0 && (
          <div className="col-span-full text-[12px] text-muted-foreground text-center py-4">
            등록된 담당자가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}

// ── TaskTable ──
function TaskTable({ tasks, teamId }: { tasks: TaskListItem[]; teamId: string }): JSX.Element {
  const [sortBy, setSortBy] = useState<'priority' | 'status' | 'deadline'>('priority')
  const color = TEAM_COLORS[teamId] || '#3B82F6'
  const now = new Date().toISOString().split('T')[0]

  const sorted = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (sortBy === 'priority') {
        const o: Record<string, number> = { high: 0, medium: 1, low: 2 }
        return (o[a.priority] ?? 9) - (o[b.priority] ?? 9)
      }
      if (sortBy === 'status') {
        const isOverdue = (t: TaskListItem): boolean => !!(t.deadline && t.status !== 'done' && t.deadline < now)
        const getOrder = (t: TaskListItem): number => {
          if (isOverdue(t)) return 0
          const o: Record<string, number> = { do: 1, check: 2, act: 3, plan: 4, done: 5 }
          return o[t.status] ?? 9
        }
        return getOrder(a) - getOrder(b)
      }
      // deadline
      const da = a.deadline || '9999'
      const db = b.deadline || '9999'
      return da.localeCompare(db)
    })
  }, [tasks, sortBy, now])

  const getStatusDisplay = (task: TaskListItem): { label: string; color: string; bg: string } => {
    if (task.deadline && task.status !== 'done' && task.deadline < now) {
      return STATUS_CFG.overdue
    }
    return STATUS_CFG[task.status] || STATUS_CFG.plan
  }

  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-bold text-foreground">📋 업무 목록</h3>
        <div className="flex gap-1">
          {([['priority', '우선순위'], ['status', '상태'], ['deadline', '마감일']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setSortBy(k)}
              className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold transition-colors ${
                sortBy === k
                  ? 'bg-foreground text-card border-foreground'
                  : 'bg-card text-muted-foreground border-border hover:border-foreground/20'
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="border-b-2 border-border">
              {['조항', '업무', '담당자', '마감', '우선', '상태'].map((h) => (
                <th key={h} className="px-2.5 py-2 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const statusDisplay = getStatusDisplay(t)
              const priCfg = PRIORITY_CFG[t.priority] || PRIORITY_CFG.medium
              return (
                <tr key={t.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                  <td className="px-2.5 py-2.5 font-bold" style={{ color }}>{t.clauseId}</td>
                  <td className="px-2.5 py-2.5 text-foreground max-w-[200px] truncate">
                    {t.documentName || t.clauseTitle}
                  </td>
                  <td className="px-2.5 py-2.5 text-muted-foreground">{t.assignee}</td>
                  <td className={`px-2.5 py-2.5 font-mono text-[11px] ${
                    t.deadline && t.status !== 'done' && t.deadline < now ? 'text-destructive' : 'text-muted-foreground'
                  }`}>
                    {t.deadline ? t.deadline.slice(5) : '-'}
                  </td>
                  <td className="px-2.5 py-2.5">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: priCfg.color }} />
                      <span className="text-[10px] font-semibold" style={{ color: priCfg.color }}>{priCfg.label}</span>
                    </span>
                  </td>
                  <td className="px-2.5 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                      style={{ background: statusDisplay.bg, color: statusDisplay.color }}>
                      {statusDisplay.label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-2.5 py-8 text-center text-muted-foreground">
                  등록된 업무가 없습니다
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
