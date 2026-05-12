import { useEffect, useState, useMemo } from 'react'
import type { DashboardFullData, PersonSummary } from '@shared/ipc-types'
import { AlertTriangle, Shield } from 'lucide-react'
import { DashboardOverview } from './DashboardOverview'
import { DashboardTeamView } from './DashboardTeamView'

const TEAM_COLORS: Record<string, string> = {
  'team-qc': '#F59E0B',
  'team-pu': '#8B5CF6',
  'team-de': '#EF4444',
  'team-pr': '#3B82F6',
  'team-mg': '#6B7280'
}

const TEAM_ICONS: Record<string, string> = {
  'team-qc': '🔍',
  'team-pu': '📦',
  'team-de': '🛠️',
  'team-pr': '🏭',
  'team-mg': '📋'
}

// Chapter IDs for progress display (4~7 top-level, 8.x, 9.x, 10)
const CHAPTER_IDS = ['4', '5', '6', '7', '8.1', '8.2', '8.3', '8.4', '8.5', '8.6', '8.7', '9.1', '9.2', '9.3', '10']

export { TEAM_COLORS, TEAM_ICONS, CHAPTER_IDS }

export function Dashboard(): JSX.Element {
  const [data, setData] = useState<DashboardFullData | null>(null)
  const [activeTeam, setActiveTeam] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async (): Promise<void> => {
    const result = await window.api.invoke(window.api.channels.DASHBOARD_FULL)
    setData(result)
  }

  const tabs = useMemo(() => {
    if (!data) return []
    return [
      { id: 'all', name: '전체 현황', icon: '📊' },
      ...data.teams.map((t) => ({
        id: t.id,
        name: t.name,
        icon: TEAM_ICONS[t.id] || '👥'
      }))
    ]
  }, [data])

  const filteredTasks = useMemo(() => {
    if (!data) return []
    if (activeTeam === 'all') return data.tasks
    return data.tasks.filter((t) => t.teamId === activeTeam)
  }, [data, activeTeam])

  const filteredStats = useMemo(() => {
    const now = new Date().toISOString().split('T')[0]
    const tasks = filteredTasks
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'do').length,
      overdue: tasks.filter((t) => {
        if (!t.deadline || t.status === 'done') return false
        return t.deadline < now
      }).length,
      pending: tasks.filter((t) => t.status === 'plan').length,
      plan: tasks.filter((t) => t.status === 'plan').length,
      check: tasks.filter((t) => t.status === 'check').length,
      act: tasks.filter((t) => t.status === 'act').length
    }
  }, [filteredTasks])

  const teamMembers = useMemo((): PersonSummary[] => {
    if (!data || activeTeam === 'all') return data?.members || []
    return data.members.filter((m) => m.teamId === activeTeam)
  }, [data, activeTeam])

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground text-sm">대시보드 로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Badges */}
      <div className="flex items-center gap-3">
        {data.stats.overdue > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: '#FEF3C7', color: '#92400E' }}>
            <AlertTriangle className="w-3.5 h-3.5" />
            지연 {data.stats.overdue}건
          </div>
        )}
        {data.nextAudit && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: '#DBEAFE', color: '#1E40AF' }}>
            <Shield className="w-3.5 h-3.5" />
            {data.nextAudit.label} D-{data.nextAudit.daysUntil}
          </div>
        )}
      </div>

      {/* Team Tabs */}
      <div className="flex gap-0.5 border-b border-border -mx-6 px-6">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTeam(t.id)}
            className={`px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors border-b-2 ${
              activeTeam === t.id
                ? 'text-primary border-primary'
                : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
          >
            {t.icon} {t.name}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTeam === 'all' ? (
        <DashboardOverview
          stats={filteredStats}
          tasks={data.tasks}
          teams={data.teams}
          calendarEvents={data.calendarEvents}
        />
      ) : (
        <DashboardTeamView
          teamId={activeTeam}
          teamName={tabs.find((t) => t.id === activeTeam)?.name || ''}
          teamIcon={tabs.find((t) => t.id === activeTeam)?.icon || ''}
          stats={filteredStats}
          tasks={filteredTasks}
          members={teamMembers}
        />
      )}
    </div>
  )
}
