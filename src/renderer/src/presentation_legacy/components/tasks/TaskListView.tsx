import { useEffect, useState } from 'react'
import { Plus, Trash2, ChevronRight, History } from 'lucide-react'
import { useTaskStore } from '../../stores/taskStore'
import { useUIStore } from '../../stores/uiStore'
import { StatusBadge, PriorityBadge } from '../shared/StatusBadge'
import { TaskFormModal } from './TaskFormModal'
import type { TaskListItem, TaskHistoryItem } from '@shared/ipc-types'

const PDCA_TRANSITIONS: Record<string, string[]> = {
  plan: ['do'],
  do: ['check'],
  check: ['act'],
  act: ['done', 'plan'],
  done: ['plan']
}

const PDCA_LABELS: Record<string, string> = {
  plan: '기획', do: '실행', check: '검증', act: '개선', done: '완료'
}

export function TaskListView(): JSX.Element {
  const { tasks, selectedTask, taskHistory, loadTasks, loadTaskById, loadTaskHistory, createTask, deleteTask, updateStatus } = useTaskStore()
  const { filterTeam, filterStatus } = useUIStore()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    const filters: { teamId?: string; status?: string } = {}
    if (filterTeam !== '전체') filters.teamId = filterTeam
    if (filterStatus !== '전체') filters.status = filterStatus
    loadTasks(filters)
  }, [filterTeam, filterStatus, loadTasks])

  const handleToggleExpand = async (id: string): Promise<void> => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    await loadTaskById(id)
    await loadTaskHistory(id)
  }

  const handleStatusChange = async (taskId: string, newStatus: string): Promise<void> => {
    await updateStatus(taskId, newStatus, statusNote || undefined)
    setStatusNote('')
  }

  const handleDelete = async (id: string): Promise<void> => {
    if (!confirm('이 업무를 삭제하시겠습니까?')) return
    await deleteTask(id)
    if (expandedId === id) setExpandedId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">전체 업무 ({tasks.length})</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> 새 업무
        </button>
      </div>

      {tasks.length === 0 ? (
        <div className="text-muted-foreground text-center py-20 bg-card border border-border rounded-lg">
          <p className="text-sm">등록된 업무가 없습니다.</p>
          <p className="text-[11px] mt-1">위 &apos;새 업무&apos; 버튼으로 업무를 생성하세요.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left p-3 w-8"></th>
                <th className="text-left p-3">조항</th>
                <th className="text-left p-3">문서</th>
                <th className="text-left p-3">담당</th>
                <th className="text-left p-3">상태</th>
                <th className="text-left p-3">우선순위</th>
                <th className="text-left p-3">마감일</th>
                <th className="text-left p-3 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  isExpanded={expandedId === task.id}
                  selectedTask={expandedId === task.id ? selectedTask : null}
                  taskHistory={expandedId === task.id ? taskHistory : []}
                  statusNote={statusNote}
                  onToggle={() => handleToggleExpand(task.id)}
                  onStatusChange={handleStatusChange}
                  onStatusNoteChange={setStatusNote}
                  onDelete={() => handleDelete(task.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <TaskFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSubmit={createTask} />
    </div>
  )
}

function TaskRow({
  task, isExpanded, selectedTask, taskHistory, statusNote,
  onToggle, onStatusChange, onStatusNoteChange, onDelete
}: {
  task: TaskListItem
  isExpanded: boolean
  selectedTask: TaskListItem | null
  taskHistory: TaskHistoryItem[]
  statusNote: string
  onToggle: () => void
  onStatusChange: (taskId: string, newStatus: string) => void
  onStatusNoteChange: (note: string) => void
  onDelete: () => void
}): JSX.Element {
  const nextStatuses = PDCA_TRANSITIONS[task.status] || []
  const isOverdue = task.deadline && task.status !== 'done' && task.deadline < new Date().toISOString().split('T')[0]

  return (
    <>
      <tr
        className={`border-b border-border/50 hover:bg-muted/30 cursor-pointer ${isExpanded ? 'bg-muted/20' : ''}`}
        onClick={onToggle}
      >
        <td className="p-3">
          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </td>
        <td className="p-3">
          <span className="text-primary font-mono text-[11px]">{task.clauseId}</span>
          <span className="text-muted-foreground ml-1.5">{task.clauseTitle}</span>
        </td>
        <td className="p-3 text-muted-foreground">{task.documentName || '-'}</td>
        <td className="p-3">
          <span>{task.assignee}</span>
          <span className="text-muted-foreground ml-1 text-[10px]">({task.team})</span>
        </td>
        <td className="p-3"><StatusBadge status={task.status} /></td>
        <td className="p-3"><PriorityBadge priority={task.priority} /></td>
        <td className={`p-3 ${isOverdue ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
          {task.deadline || '-'}
        </td>
        <td className="p-3" onClick={(e) => e.stopPropagation()}>
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-400">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </td>
      </tr>
      {isExpanded && selectedTask && (
        <tr>
          <td colSpan={8} className="p-4 bg-muted/10 border-b border-border">
            <div className="grid grid-cols-2 gap-6">
              {/* PDCA transition */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground mb-2">PDCA 상태 전이</h4>
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={selectedTask.status} />
                  {nextStatuses.length > 0 && <span className="text-muted-foreground text-[11px]">→</span>}
                  {nextStatuses.map((next) => (
                    <button
                      key={next}
                      onClick={() => onStatusChange(selectedTask.id, next)}
                      className="px-2.5 py-1 text-[11px] bg-primary/20 text-primary rounded hover:bg-primary/30"
                    >
                      {PDCA_LABELS[next]}으로 전환
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => onStatusNoteChange(e.target.value)}
                  placeholder="상태 변경 메모 (선택)"
                  className="input-field text-[11px] w-full"
                />
              </div>
              {/* History */}
              <div>
                <h4 className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> PDCA 이력
                </h4>
                {taskHistory.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">이력 없음</p>
                ) : (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {taskHistory.map((h) => (
                      <div key={h.id} className="flex items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground w-32 shrink-0">
                          {h.changedAt?.replace('T', ' ').slice(0, 16)}
                        </span>
                        {h.fromStatus && <StatusBadge status={h.fromStatus} />}
                        <span className="text-muted-foreground">→</span>
                        <StatusBadge status={h.toStatus} />
                        {h.note && <span className="text-muted-foreground">- {h.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}
