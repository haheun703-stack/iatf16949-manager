import { useEffect } from 'react'
import { useClauseStore } from '../../stores/clauseStore'
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Database } from 'lucide-react'

export function Dashboard(): JSX.Element {
  const { dashboardStats, dbStatus, loadDashboardStats, loadDbStatus } = useClauseStore()

  useEffect(() => {
    loadDashboardStats()
    loadDbStatus()
  }, [loadDashboardStats, loadDbStatus])

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">대시보드</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="전체 업무"
          value={dashboardStats?.total ?? 0}
          color="#a78bfa"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="완료"
          value={dashboardStats?.done ?? 0}
          color="#22c55e"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="진행중"
          value={dashboardStats?.inProgress ?? 0}
          color="#f59e0b"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="기한초과"
          value={dashboardStats?.overdue ?? 0}
          color="#ef4444"
        />
      </div>

      {/* DB Status */}
      {dbStatus && (
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">데이터베이스 현황</h3>
          </div>
          <div className="grid grid-cols-5 gap-4">
            <DbStatItem label="조항" value={dbStatus.clauses} />
            <DbStatItem label="양식/문서" value={dbStatus.documents} />
            <DbStatItem label="팀" value={dbStatus.teams} />
            <DbStatItem label="인원" value={dbStatus.persons} />
            <DbStatItem label="업무" value={dbStatus.tasks} />
          </div>
        </div>
      )}

      {/* Info panel */}
      <div className="mt-6 bg-card rounded-lg border border-border p-6">
        <h3 className="text-sm font-semibold mb-3">PDCA 상태 분포</h3>
        {dashboardStats && dashboardStats.total > 0 ? (
          <div className="flex gap-3">
            <PdcaBar label="기획" value={dashboardStats.plan} total={dashboardStats.total} color="#6b7280" />
            <PdcaBar label="실행" value={dashboardStats.inProgress} total={dashboardStats.total} color="#f59e0b" />
            <PdcaBar label="검증" value={dashboardStats.check} total={dashboardStats.total} color="#3b82f6" />
            <PdcaBar label="개선" value={dashboardStats.act} total={dashboardStats.total} color="#ef4444" />
            <PdcaBar label="완료" value={dashboardStats.done} total={dashboardStats.total} color="#22c55e" />
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            아직 등록된 업무가 없습니다. Phase 2에서 업무 생성 기능이 추가되면 여기에 PDCA 분포가 표시됩니다.
          </p>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
}): JSX.Element {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  )
}

function DbStatItem({ label, value }: { label: string; value: number }): JSX.Element {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  )
}

function PdcaBar({
  label,
  value,
  total,
  color
}: {
  label: string
  value: number
  total: number
  color: string
}): JSX.Element {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex-1">
      <div className="flex justify-between text-[11px] mb-1">
        <span style={{ color }}>{label}</span>
        <span className="text-muted-foreground">{value}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
