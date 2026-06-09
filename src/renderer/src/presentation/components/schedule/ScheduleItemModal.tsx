import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import {
  SCHEDULE_STATUSES,
  SCHEDULE_CATEGORIES,
  SCHEDULE_PRIORITIES,
  type ScheduleCategory,
  type ScheduleStatus,
  type SchedulePriority
} from '@shared/ipc-types'
import { useScheduleStore } from '../../stores/scheduleStore'

export function ScheduleItemModal(): JSX.Element | null {
  const { modalOpen, editing, modalDefaults, closeModal, create, update, remove } = useScheduleStore()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<ScheduleCategory>('기타')
  const [status, setStatus] = useState<ScheduleStatus>('예정')
  const [priority, setPriority] = useState<SchedulePriority>('보통')
  const [owner, setOwner] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      setTitle(editing.title)
      setCategory(editing.category)
      setStatus(editing.status)
      setPriority(editing.priority)
      setOwner(editing.owner ?? '')
      setStartDate(editing.startDate ?? '')
      setDueDate(editing.dueDate ?? '')
      setNote(editing.note ?? '')
    } else {
      setTitle('')
      setCategory(modalDefaults.category ?? '기타')
      setStatus(modalDefaults.status ?? '예정')
      setPriority(modalDefaults.priority ?? '보통')
      setOwner('')
      setStartDate(modalDefaults.startDate ?? '')
      setDueDate(modalDefaults.dueDate ?? '')
      setNote('')
    }
  }, [modalOpen, editing, modalDefaults])

  if (!modalOpen) return null

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        category,
        status,
        priority,
        owner: owner.trim() || null,
        startDate: startDate || null,
        dueDate: dueDate || null,
        note: note.trim() || null
      }
      if (editing) await update({ id: editing.id, ...payload })
      else await create(payload)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!editing) return
    if (!confirm(`"${editing.title}" 일정을 삭제할까요?`)) return
    setSaving(true)
    try {
      await remove(editing.id)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={closeModal}
    >
      <div
        className="bg-card rounded-lg border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <h3 className="text-base font-bold">{editing ? '일정 편집' : '새 일정'}</h3>
          <button
            type="button"
            onClick={closeModal}
            className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-3.5">
          <Field label="제목">
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 내부심사 실시 계획서 작성"
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="분류">
              <select value={category} onChange={(e) => setCategory(e.target.value as ScheduleCategory)} className="input-field">
                {SCHEDULE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="상태">
              <select value={status} onChange={(e) => setStatus(e.target.value as ScheduleStatus)} className="input-field">
                {SCHEDULE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="우선순위">
              <select value={priority} onChange={(e) => setPriority(e.target.value as SchedulePriority)} className="input-field">
                {SCHEDULE_PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="담당">
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="담당자/팀" className="input-field" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="시작일">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="마감일">
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input-field" />
            </Field>
          </div>

          <Field label="메모">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="세부 내용·체크리스트"
              className="input-field resize-y"
            />
          </Field>
        </div>

        <footer className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 sticky bottom-0 bg-card">
          {editing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs font-semibold px-3 py-2 rounded-md text-destructive hover:bg-destructive/10 flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              삭제
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button type="button" onClick={closeModal} className="text-xs font-semibold px-3 py-2 rounded-md hover:bg-muted">
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="text-xs font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {saving ? '저장 중...' : editing ? '저장' : '추가'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  )
}
