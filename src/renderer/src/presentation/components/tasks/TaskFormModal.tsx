import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import type { TaskListItem, TeamSummary, PersonSummary, ClauseTreeNode, DocumentSummary } from '@shared/ipc-types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    clauseId: string; documentId?: string; assigneeId: string;
    teamId: string; priority: string; deadline: string
  }) => void
  clauseId?: string
  task?: TaskListItem | null
}

export function TaskFormModal({ isOpen, onClose, onSubmit, clauseId, task }: Props): JSX.Element | null {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [members, setMembers] = useState<PersonSummary[]>([])
  const [clauses, setClauses] = useState<ClauseTreeNode[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])

  const [form, setForm] = useState({
    clauseId: clauseId || '',
    documentId: '',
    teamId: '',
    assigneeId: '',
    priority: 'medium',
    deadline: ''
  })

  useEffect(() => {
    if (!isOpen) return
    window.api.invoke(window.api.channels.TEAM_LIST).then(setTeams)
    window.api.invoke(window.api.channels.CLAUSE_GET_TREE).then((data) => {
      setClauses(data.filter((c: ClauseTreeNode) => !c.hasChildren))
    })
  }, [isOpen])

  useEffect(() => {
    if (form.teamId) {
      window.api.invoke(window.api.channels.TEAM_GET_MEMBERS, { teamId: form.teamId }).then(setMembers)
    } else {
      setMembers([])
    }
  }, [form.teamId])

  useEffect(() => {
    if (form.clauseId) {
      window.api.invoke(window.api.channels.DOCUMENT_LIST_BY_CLAUSE, { clauseId: form.clauseId }).then(setDocuments)
    } else {
      setDocuments([])
    }
  }, [form.clauseId])

  useEffect(() => {
    if (isOpen) {
      setForm({
        clauseId: task?.clauseId || clauseId || '',
        documentId: task?.documentId || '',
        teamId: task?.teamId || '',
        assigneeId: task?.assigneeId || '',
        priority: task?.priority || 'medium',
        deadline: task?.deadline?.split('T')[0] || ''
      })
    }
  }, [isOpen, task, clauseId])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault()
    if (!form.clauseId || !form.teamId || !form.assigneeId || !form.deadline) return
    onSubmit({
      clauseId: form.clauseId,
      documentId: form.documentId || undefined,
      assigneeId: form.assigneeId,
      teamId: form.teamId,
      priority: form.priority,
      deadline: form.deadline
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{task ? '업무 수정' : '새 업무 생성'}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="조항">
            <select value={form.clauseId} onChange={(e) => setForm({ ...form, clauseId: e.target.value, documentId: '' })}
              className="input-field" disabled={!!clauseId}>
              <option value="">선택</option>
              {clauses.map((c) => <option key={c.id} value={c.id}>{c.id} - {c.title}</option>)}
            </select>
          </Field>

          <Field label="관련 문서 (선택)">
            <select value={form.documentId} onChange={(e) => setForm({ ...form, documentId: e.target.value })} className="input-field">
              <option value="">없음</option>
              {documents.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="담당 팀">
              <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value, assigneeId: '' })} className="input-field">
                <option value="">선택</option>
                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="담당자">
              <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="input-field">
                <option value="">선택</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="우선순위">
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </Field>
            <Field label="마감일">
              <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="input-field" />
            </Field>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">취소</button>
            <button type="submit" className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              disabled={!form.clauseId || !form.teamId || !form.assigneeId || !form.deadline}>
              {task ? '수정' : '생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-[12px] text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  )
}
