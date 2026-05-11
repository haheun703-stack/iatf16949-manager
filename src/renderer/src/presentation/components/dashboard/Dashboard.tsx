import { useEffect, useState } from 'react'
import { useClauseStore } from '../../stores/clauseStore'
import { BarChart3, CheckCircle2, Clock, AlertTriangle, Database, Zap, Loader2 } from 'lucide-react'

export function Dashboard(): JSX.Element {
  const { dashboardStats, dbStatus, loadDashboardStats, loadDbStatus } = useClauseStore()
  const [bulkDeadline, setBulkDeadline] = useState('')
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkResult, setBulkResult] = useState<{ created: number } | null>(null)

  useEffect(() => {
    loadDashboardStats()
    loadDbStatus()
  }, [loadDashboardStats, loadDbStatus])

  const handleBulkCreate = async (): Promise<void> => {
    if (!bulkDeadline) return
    setBulkLoading(true)
    setBulkResult(null)
    try {
      const result = await window.api.invoke(window.api.channels.TASK_BULK_CREATE, { deadline: bulkDeadline })
      setBulkResult(result)
      loadDashboardStats()
      loadDbStatus()
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">대시보드</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="전체 업무"
          value={dashboardStats?.total ?? 0}
          color="#7c3aed"
        />
        <StatCard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="완료"
          value={dashboardStats?.done ?? 0}
          color="#16a34a"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="진행중"
          value={dashboardStats?.inProgress ?? 0}
          color="#d97706"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="기한초과"
          value={dashboardStats?.overdue ?? 0}
          color="#dc2626"
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

      {/* Bulk Task Creation */}
      <div className="mt-6 bg-card rounded-lg border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">업무 일괄생성</h3>
          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded">규정 → 업무 자동 변환</span>
        </div>
        <p className="text-[12px] text-muted-foreground mb-4">
          등록된 67개 규정/프로세스를 기반으로 각 담당팀에 업무를 자동 배정합니다. 이미 생성된 업무는 건너뜁니다.
        </p>
        <div className="flex items-center gap-3">
          <label className="text-[12px] text-muted-foreground">마감일:</label>
          <input
            type="date"
            value={bulkDeadline}
            onChange={(e) => setBulkDeadline(e.target.value)}
            className="px-3 py-1.5 text-[12px] bg-background border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={handleBulkCreate}
            disabled={!bulkDeadline || bulkLoading}
            className="flex items-center gap-1.5 px-4 py-1.5 text-[12px] bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkLoading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 생성 중...</>
            ) : (
              <><Zap className="w-3.5 h-3.5" /> 일괄생성 실행</>
            )}
          </button>
          {bulkResult && (
            <span className="text-[12px] text-green-600 font-medium">
              {bulkResult.created > 0
                ? `${bulkResult.created}건 생성 완료!`
                : '새로 생성할 업무가 없습니다 (모두 기존 등록됨)'}
            </span>
          )}
        </div>
      </div>

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
            아직 등록된 업무가 없습니다. 업무 탭에서 업무를 생성하면 여기에 PDCA 분포가 표시됩니다.
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
