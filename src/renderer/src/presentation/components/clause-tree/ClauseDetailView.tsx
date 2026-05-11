import { useEffect, useState } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useClauseStore } from '../../stores/clauseStore'
import { useTaskStore } from '../../stores/taskStore'
import { FileText, Hash, Plus, BookOpen, Users } from 'lucide-react'
import { StatusBadge, PriorityBadge } from '../shared/StatusBadge'
import { TaskFormModal } from '../tasks/TaskFormModal'

export function ClauseDetailView(): JSX.Element {
  const { selectedClauseId } = useUIStore()
  const { clauseDetail, loadClauseDetail } = useClauseStore()
  const { createTask } = useTaskStore()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    if (selectedClauseId) {
      loadClauseDetail(selectedClauseId)
    }
  }, [selectedClauseId, loadClauseDetail])

  const handleCreateTask = async (data: {
    clauseId: string; documentId?: string; assigneeId: string;
    teamId: string; priority: string; deadline: string
  }): Promise<void> => {
    await createTask(data)
    if (selectedClauseId) loadClauseDetail(selectedClauseId)
  }

  if (!selectedClauseId) {
    return (
      <div className="text-muted-foreground text-center py-20">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="text-sm">좌측 트리에서 항목을 선택하세요</p>
      </div>
    )
  }

  if (!clauseDetail) {
    return (
      <div className="text-muted-foreground text-center py-20">
        <p className="text-sm">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Clause Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Hash className="w-4 h-4 text-primary" />
          <span className="text-primary font-bold text-lg">{clauseDetail.id}</span>
        </div>
        <h2 className="text-xl font-bold">{clauseDetail.title}</h2>
        {clauseDetail.description && (
          <p className="text-sm text-muted-foreground mt-2">{clauseDetail.description}</p>
        )}
      </div>

      {/* Regulations (procedure/manual) */}
      {clauseDetail.documents.filter((d) => d.docCode).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            관련 규정/프로세스 ({clauseDetail.documents.filter((d) => d.docCode).length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {clauseDetail.documents.filter((d) => d.docCode).map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <BookOpen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-primary">{doc.docCode}</span>
                      <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">{doc.type}</span>
                    </div>
                    <p className="text-[13px] font-medium text-foreground mt-1">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">{doc.revision || doc.currentVersion}</span>
                      {doc.teamName && (
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Users className="w-3 h-3" /> {doc.teamName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forms (no doc_code) */}
      {clauseDetail.documents.filter((d) => !d.docCode).length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            관련 양식 ({clauseDetail.documents.filter((d) => !d.docCode).length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clauseDetail.documents.filter((d) => !d.docCode).map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start gap-2">
                  <FileText className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{doc.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">
                        {doc.type}
                      </span>
                      <span className="text-[10px] text-muted-foreground">v{doc.currentVersion}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">연결된 업무 ({clauseDetail.tasks.length})</h3>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-primary/20 text-primary rounded hover:bg-primary/30"
          >
            <Plus className="w-3.5 h-3.5" /> 업무 추가
          </button>
        </div>
        {clauseDetail.tasks.length > 0 ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3">문서</th>
                  <th className="text-left p-3">담당</th>
                  <th className="text-left p-3">상태</th>
                  <th className="text-left p-3">우선순위</th>
                  <th className="text-left p-3">마감일</th>
                </tr>
              </thead>
              <tbody>
                {clauseDetail.tasks.map((task) => {
                  const isOverdue = task.deadline && task.status !== 'done' && task.deadline < new Date().toISOString().split('T')[0]
                  return (
                    <tr key={task.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="p-3">{task.documentName || '-'}</td>
                      <td className="p-3">
                        <span>{task.assignee}</span>
                        <span className="text-muted-foreground ml-1 text-[10px]">({task.team})</span>
                      </td>
                      <td className="p-3"><StatusBadge status={task.status} /></td>
                      <td className="p-3"><PriorityBadge priority={task.priority} /></td>
                      <td className={`p-3 ${isOverdue ? 'text-red-400 font-medium' : 'text-muted-foreground'}`}>
                        {task.deadline || '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">
            <p className="text-sm">이 항목에 연결된 업무가 없습니다.</p>
            <p className="text-[11px] mt-1">위 &apos;업무 추가&apos; 버튼으로 생성하세요.</p>
          </div>
        )}
      </div>

      <TaskFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={handleCreateTask}
        clauseId={selectedClauseId}
      />
    </div>
  )
}
