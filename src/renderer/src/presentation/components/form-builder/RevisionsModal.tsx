import { useEffect, useState } from 'react'
import { X, History, RotateCcw, Save, Loader2, Inbox } from 'lucide-react'
import { useFormStore } from '../../stores/formStore'
import { confirmDialog } from '../shared/ConfirmDialog'

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  submitted: '제출',
  approved: '승인'
}

function fmtDate(iso: string): string {
  const d = iso.replace('T', ' ')
  return d.length >= 16 ? d.slice(0, 16) : d
}

interface Props {
  onClose: () => void
}

/**
 * 개정 이력 모달 (g 신뢰성 레이어 — 개정관리).
 * 상단: 변경사유 입력 + [개정 저장](현재 작성본 값을 스냅샷으로 적재).
 * 목록: 개정 스냅샷(Rev 번호·작성자·일시·사유). 각 행 [불러오기]로 해당 개정 값 복원.
 */
export function RevisionsModal({ onClose }: Props): JSX.Element {
  const revisions = useFormStore((s) => s.revisions)
  const revisionsLoading = useFormStore((s) => s.revisionsLoading)
  const loadRevisions = useFormStore((s) => s.loadRevisions)
  const saveRevision = useFormStore((s) => s.saveRevision)
  const restoreRevision = useFormStore((s) => s.restoreRevision)

  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    void loadRevisions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await saveRevision(reason)
      if (res.success) {
        setReason('')
        setMsg(`Rev ${res.revNo} 개정으로 저장되었습니다.`)
        setTimeout(() => setMsg(null), 4000)
      } else {
        setMsg(`개정 저장 실패: ${res.error ?? '알 수 없는 오류'}`)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleRestore = async (id: number, revNo: number): Promise<void> => {
    const ok = await confirmDialog({
      title: `Rev ${revNo} 입력값 불러오기`,
      body: '저장하지 않은 현재 입력은 사라집니다. 계속할까요?',
      okLabel: '불러오기',
      danger: true
    })
    if (!ok) return
    setBusyId(id)
    try {
      const done = await restoreRevision(id)
      if (done) onClose()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">개정 이력</h3>
            {!revisionsLoading && (
              <span className="text-[11px] text-muted-foreground">({revisions.length})</span>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 개정 저장 영역 */}
        <div className="px-5 py-3 border-b border-border bg-muted/20">
          <label className="text-[11px] font-semibold text-muted-foreground">변경 사유 (선택)</label>
          <div className="flex items-center gap-2 mt-1.5">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 고객 요청으로 불량수량 정정"
              className="flex-1 text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !saving) void handleSave()
              }}
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              title="현재 입력값을 새 개정으로 저장합니다"
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              개정 저장
            </button>
          </div>
          {msg && (
            <p className={msg.includes('실패') ? 'text-[12px] mt-2 text-destructive' : 'text-[12px] mt-2 text-emerald-700'}>
              {msg}
            </p>
          )}
        </div>

        <div className="overflow-y-auto">
          {revisionsLoading ? (
            <div className="py-12 flex items-center justify-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : revisions.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Inbox className="w-8 h-8 opacity-40" />
              <p className="text-sm">개정 이력이 없습니다.</p>
              <p className="text-[12px]">변경 사유를 적고 [개정 저장]을 누르면 현재 입력이 개정으로 기록됩니다.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {revisions.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 group">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                        Rev {r.revNo}
                      </span>
                      <span className="text-sm font-semibold truncate">
                        {r.changeReason || <span className="text-muted-foreground font-normal">(사유 없음)</span>}
                      </span>
                      {r.status && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                          {STATUS_LABEL[r.status] || r.status}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground">
                      {r.author && <span>{r.author}</span>}
                      <span>{fmtDate(r.createdAt)}</span>
                    </div>
                  </div>
                  {busyId === r.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handleRestore(r.id, r.revNo)}
                      title="이 개정의 입력값을 현재 작성 화면으로 불러옵니다"
                      className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      불러오기
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border text-[11px] text-muted-foreground">
          개정은 [개정 저장] 시점의 입력값 스냅샷입니다. [불러오기]로 이전 개정 내용을 되돌릴 수 있습니다.
        </div>
      </div>
    </div>
  )
}
