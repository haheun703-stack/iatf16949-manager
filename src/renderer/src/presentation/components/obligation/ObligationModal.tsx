import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import {
  OBLIGATION_CADENCES,
  OBLIGATION_CATEGORIES,
  type ObligationCadence,
  type ObligationCategory
} from '@shared/ipc-types'
import { useObligationStore } from '../../stores/obligationStore'

export function ObligationModal(): JSX.Element | null {
  const { modalOpen, editing, closeModal, create, update, remove } = useObligationStore()

  const [title, setTitle] = useState('')
  const [cadence, setCadence] = useState<ObligationCadence>('월')
  const [category, setCategory] = useState<ObligationCategory>('기타')
  const [clauseRef, setClauseRef] = useState('')
  const [owner, setOwner] = useState('')
  const [leadDays, setLeadDays] = useState('7')
  const [nextDueDate, setNextDueDate] = useState('')
  const [active, setActive] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      setTitle(editing.title)
      setCadence(editing.cadence)
      setCategory(editing.category)
      setClauseRef(editing.clauseRef ?? '')
      setOwner(editing.owner ?? '')
      setLeadDays(String(editing.leadDays ?? 7))
      setNextDueDate(editing.nextDueDate ?? '')
      setActive(editing.active)
      setNote(editing.note ?? '')
    } else {
      setTitle('')
      setCadence('월')
      setCategory('기타')
      setClauseRef('')
      setOwner('')
      setLeadDays('7')
      setNextDueDate('')
      setActive(true)
      setNote('')
    }
  }, [modalOpen, editing])

  if (!modalOpen) return null

  const handleSave = async (): Promise<void> => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: title.trim(),
        cadence,
        category,
        clauseRef: clauseRef.trim() || null,
        owner: owner.trim() || null,
        leadDays: Number(leadDays) || 0,
        nextDueDate: nextDueDate || null,
        active,
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
    if (!confirm(`"${editing.title}" 정기 의무를 삭제할까요?`)) return
    setSaving(true)
    try {
      await remove(editing.id)
      closeModal()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={closeModal}>
      <div
        className="bg-card rounded-lg border border-border shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="px-5 py-3.5 border-b border-border flex items-center justify-between sticky top-0 bg-card">
          <h3 className="text-base font-bold">{editing ? '정기 의무 편집' : '새 정기 의무'}</h3>
          <button
            type="button"
            onClick={closeModal}
            className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="p-5 space-y-3.5">
          <Field label="의무명">
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 경영검토 회의"
              className="input-field"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="주기">
              <select value={cadence} onChange={(e) => setCadence(e.target.value as ObligationCadence)} className="input-field">
                {OBLIGATION_CADENCES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="분류">
              <select value={category} onChange={(e) => setCategory(e.target.value as ObligationCategory)} className="input-field">
                {OBLIGATION_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="IATF/SQ 조항">
              <input type="text" value={clauseRef} onChange={(e) => setClauseRef(e.target.value)} placeholder="예: 9.3" className="input-field" />
            </Field>
            <Field label="담당">
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="담당자/팀" className="input-field" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="다음 도래일">
              <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="input-field" />
            </Field>
            <Field label="임박 알림(일 전)">
              <input type="number" min={0} value={leadDays} onChange={(e) => setLeadDays(e.target.value)} className="input-field" />
            </Field>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-primary" />
            <span className="text-[13px] text-foreground">활성 (도래 관리 대상)</span>
          </label>

          <Field label="메모">
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="세부 내용·증빙"
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
