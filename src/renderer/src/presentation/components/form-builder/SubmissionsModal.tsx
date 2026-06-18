import { useEffect, useState } from 'react'
import { X, FileText, Trash2, Loader2, Inbox } from 'lucide-react'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  submitted: '제출',
  approved: '승인'
}

function fmtDate(iso: string): string {
  // 2026-06-18T... → 2026-06-18 13:24
  const d = iso.replace('T', ' ')
  return d.length >= 16 ? d.slice(0, 16) : d
}

interface Props {
  onClose: () => void
}

/** 저장된 작성본(제출본) 목록 — 클릭하면 양식에 불러와 이어쓰기. */
export function SubmissionsModal({ onClose }: Props): JSX.Element {
  const submissions = useFormStore((s) => s.submissions)
  const loadSubmissions = useFormStore((s) => s.loadSubmissions)
  const loadSubmission = useFormStore((s) => s.loadSubmission)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)

  const refresh = async (): Promise<void> => {
    setLoading(true)
    await loadSubmissions() // 전체(양식 무관)
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = async (id: number, formCode: string): Promise<void> => {
    setBusyId(id)
    try {
      setSelectedFormCode(formCode)
      await loadSubmission(id)
      onClose()
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: number): Promise<void> => {
    await window.api.invoke(window.api.channels.FORM_SUBMISSION_DELETE, { id })
    await refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">저장된 작성본</h3>
            {!loading && <span className="text-[11px] text-muted-foreground">({submissions.length})</span>}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : submissions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-sm">저장된 작성본이 없습니다.</p>
              <p className="text-[12px]">양식을 작성하고 [초안 저장]을 누르면 여기에 쌓입니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {submissions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 group">
                  <button
                    type="button"
                    onClick={() => void open(s.id, s.formCode)}
                    disabled={busyId === s.id}
                    className="flex-1 text-left min-w-0"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-primary">{s.formCode}</span>
                      <span className="text-sm font-semibold truncate">{s.formName || '(이름 없음)'}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {s.serialNo && <span className="font-mono">{s.serialNo}</span>}
                      <span>{fmtDate(s.updatedAt)}</span>
                      {s.preview && <span className="truncate">· {s.preview}</span>}
                    </div>
                  </button>
                  {busyId === s.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void remove(s.id)}
                      title="삭제"
                      className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground">
          작성본을 클릭하면 양식에 불러와 이어서 작성할 수 있습니다.
        </div>
      </div>
    </div>
  )
}
