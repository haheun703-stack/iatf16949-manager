import { useUIStore } from '../../stores/uiStore'
import { Dashboard } from '../dashboard/Dashboard'
import { ClauseDetailView } from '../clause-tree/ClauseDetailView'
import { TaskListView } from '../tasks/TaskListView'
import { GanttChartView } from '../gantt/GanttChartView'
import { TeamView } from '../team/TeamView'

export function MainContent(): JSX.Element {
  const { activeTab } = useUIStore()

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {activeTab === 'dashboard' && <Dashboard />}
      {activeTab === 'detail' && <ClauseDetailView />}
      {activeTab === 'tasks' && <TaskListView />}
      {activeTab === 'gantt' && <GanttChartView />}
      {activeTab === 'team' && <TeamView />}
    </div>
  )
}
