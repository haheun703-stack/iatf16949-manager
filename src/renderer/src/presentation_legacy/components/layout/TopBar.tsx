import { useUIStore, type TabId } from '../../stores/uiStore'
import { LayoutDashboard, FileText, ListTodo, GanttChart, Users, FilePlus } from 'lucide-react'

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard },
  { id: 'detail', label: '항목 상세', icon: FileText },
  { id: 'tasks', label: '전체 업무', icon: ListTodo },
  { id: 'gantt', label: '일정표', icon: GanttChart },
  { id: 'team', label: '팀별 현황', icon: Users },
  { id: 'docgen', label: '문서생성', icon: FilePlus }
]

export function TopBar(): JSX.Element {
  const { activeTab, setActiveTab, filterTeam, setFilterTeam, filterStatus, setFilterStatus } =
    useUIStore()

  return (
    <div className="flex items-center justify-between px-5 py-2 bg-card border-b border-border">
      {/* Tab buttons */}
      <div className="flex gap-1">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <select
          value={filterTeam}
          onChange={(e) => setFilterTeam(e.target.value)}
          className="bg-background border border-border rounded-md px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
        >
          <option value="전체">전체</option>
          <option value="team-mg">관리지원팀</option>
          <option value="team-pu">자재/납품팀</option>
          <option value="team-pr">생산팀</option>
          <option value="team-qc">품질팀</option>
          <option value="team-de">개발팀</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-background border border-border rounded-md px-2 py-1 text-[11px] text-foreground outline-none focus:border-primary"
        >
          <option>전체</option>
          <option value="plan">기획</option>
          <option value="do">실행</option>
          <option value="check">검증</option>
          <option value="act">개선</option>
          <option value="done">완료</option>
        </select>
      </div>
    </div>
  )
}
