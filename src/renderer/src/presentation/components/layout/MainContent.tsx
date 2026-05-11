import { useUIStore } from '../../stores/uiStore'
import { Dashboard } from '../dashboard/Dashboard'
import { ClauseDetailView } from '../clause-tree/ClauseDetailView'

export function MainContent(): JSX.Element {
  const { activeTab } = useUIStore()

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'detail' && <ClauseDetailView />}
      {activeTab === 'tasks' && (
        <div className="text-muted-foreground text-center py-20">
          <p className="text-lg font-semibold">전체 업무</p>
          <p className="text-sm mt-2">Phase 2에서 구현 예정</p>
        </div>
      )}
      {activeTab === 'gantt' && (
        <div className="text-muted-foreground text-center py-20">
          <p className="text-lg font-semibold">일정표 (간트 차트)</p>
          <p className="text-sm mt-2">Phase 2에서 구현 예정</p>
        </div>
      )}
      {activeTab === 'team' && (
        <div className="text-muted-foreground text-center py-20">
          <p className="text-lg font-semibold">팀별 현황</p>
          <p className="text-sm mt-2">Phase 2에서 구현 예정</p>
        </div>
      )}
    </div>
  )
}
