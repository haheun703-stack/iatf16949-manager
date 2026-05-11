import { useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { useClauseStore } from '../../stores/clauseStore'
import { FileText, Hash } from 'lucide-react'

export function ClauseDetailView(): JSX.Element {
  const { selectedClauseId } = useUIStore()
  const { clauseDetail, loadClauseDetail } = useClauseStore()

  useEffect(() => {
    if (selectedClauseId) {
      loadClauseDetail(selectedClauseId)
    }
  }, [selectedClauseId, loadClauseDetail])

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

      {/* Documents / Forms */}
      {clauseDetail.documents.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            관련 양식/문서 ({clauseDetail.documents.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {clauseDetail.documents.map((doc) => (
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

      {/* Tasks (placeholder) */}
      {clauseDetail.tasks.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold mb-3">연결된 업무 ({clauseDetail.tasks.length})</h3>
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left p-3">업무</th>
                  <th className="text-left p-3">담당</th>
                  <th className="text-left p-3">상태</th>
                  <th className="text-left p-3">마감일</th>
                </tr>
              </thead>
              <tbody>
                {clauseDetail.tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3">{task.documentName || task.id}</td>
                    <td className="p-3 text-muted-foreground">{task.assignee}</td>
                    <td className="p-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="p-3 text-muted-foreground">{task.deadline || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground text-center py-8 bg-card border border-border rounded-lg">
          <p className="text-sm">이 항목에 연결된 업무가 없습니다.</p>
          <p className="text-[11px] mt-1">Phase 2에서 업무 생성 기능이 추가됩니다.</p>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    plan: { bg: '#1f2937', text: '#6b7280', label: '기획' },
    do: { bg: '#422006', text: '#f59e0b', label: '실행' },
    check: { bg: '#1e3a5f', text: '#3b82f6', label: '검증' },
    act: { bg: '#450a0a', text: '#ef4444', label: '개선' },
    done: { bg: '#052e16', text: '#22c55e', label: '완료' }
  }

  const style = styles[status] || styles.plan

  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}
