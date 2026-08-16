import { useEffect, useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import {
  OBLIGATION_CADENCES,
  OBLIGATION_CATEGORIES,
  type ObligationCadence,
  type ObligationCategory
} from '@shared/ipc-types'
import { useSingleFlight } from '../../lib/asyncGuard'
import { invokeErrText } from '../../lib/errText'
import { useObligationStore } from '../../stores/obligationStore'
import { confirmDialog } from '../shared/ConfirmDialog'

export function ObligationModal(): JSX.Element | null {
  const { modalOpen, editing, closeModal, create, update, remove } = useObligationStore()

  const [title, setTitle] = useState('')
  const [cadence, setCadence] = useState<ObligationCadence>('월')
  const [category, setCategory] = useState<ObligationCategory>('기타')
  const [clauseRef, setClauseRef] = useState('')
  const [owner, setOwner] = useState('')
  const [assignee, setAssignee] = useState('')
  const [leadDays, setLeadDays] = useState('7')
  const [nextDueDate, setNextDueDate] = useState('')
  const [active, setActive] = useState(true)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  // Minor 1(8/14 검수 2차): 저장·삭제가 실패해도 catch 가 없어 **모달이 열린 채 침묵**했다
  // (사용자는 왜 안 닫히는지 모른 채 재클릭). 사유를 모달 안에 띄우고, 쓰기 관문도 규약대로.
  const [err, setErr] = useState<string | null>(null)
  const saveFlight = useSingleFlight()
  const deleteFlight = useSingleFlight()

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      setTitle(editing.title)
      setCadence(editing.cadence)
      setCategory(editing.category)
      setClauseRef(editing.clauseRef ?? '')
      setOwner(editing.owner ?? '')
      setAssignee(editing.assignee ?? '')
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
      setAssignee('')
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
    setErr(null)
    try {
      const payload = {
        title: title.trim(),
        cadence,
        category,
        clauseRef: clauseRef.trim() || null,
        owner: owner.trim() || null,
        assignee: assignee.trim() || null,
        leadDays: Number(leadDays) || 0,
        nextDueDate: nextDueDate || null,
        active,
        note: note.trim() || null
      }
      if (editing) await update({ id: editing.id, ...payload })
      else await create(payload)
      closeModal()
    } catch (e) {
      setErr(invokeErrText(e, '저장 실패 — 통신 오류. 다시 시도해 주세요.'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!editing) return
    // window.confirm 은 Electron 미지원 — 전역 확인창 규약(8/11 묶음 배치)으로 통일
    const ok = await confirmDialog({
      title: `"${editing.title}" 정기 의무를 삭제할까요?`,
      body: '삭제하면 이 의무의 도래 관리가 중단됩니다(완료 이력도 함께 정리됩니다).',
      okLabel: '삭제',
      danger: true
    })
    if (!ok) return
    setSaving(true)
    setErr(null)
    try {
      await remove(editing.id)
      closeModal()
    } catch (e) {
      setErr(invokeErrText(e, '삭제 실패 — 통신 오류. 다시 시도해 주세요.'))
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
            <Field label="담당 팀">
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="예: 품질팀" className="input-field" />
            </Field>
          </div>

          <Field label="담당자 (개인) — 홈 개인별 보드에 표시">
            <input type="text" value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="예: 홍길동" className="input-field" />
          </Field>

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

        {/* Minor 1: 실패 사유 — 모달을 닫지 않고 그 자리에서 알린다(침묵 금지) */}
        {err && (
          <div className="mx-5 mb-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] font-semibold text-destructive">
            {err}
          </div>
        )}

        <footer className="px-5 py-3 border-t border-border flex items-center justify-between gap-2 sticky bottom-0 bg-card">
          {editing ? (
            <button
              type="button"
              onClick={() => void deleteFlight(handleDelete)}
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
              onClick={() => void saveFlight(handleSave)}
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
