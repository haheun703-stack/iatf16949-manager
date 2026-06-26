import { useState } from 'react'
import { Wand2, X, Loader2, Check, RotateCcw, FileSpreadsheet, CircleAlert } from 'lucide-react'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import type { StructureCaptureResponse, AiDraftDto, FormDefinitionDto } from '@shared/ipc-types'

const WEDGE_FORMS = [
  { code: 'B2100-01', name: '시정/예방조치 요구서' },
  { code: 'B1100-01', name: '부적합품 발생 통보서' },
  { code: 'A2200-01', name: '회의록' }
]

const EXAMPLE = '3공정 치수 OOC 2건 발생, LOT 26-0612, 고성정밀 납품분. 기밀시험 누유로 출하 전 검출. 회신 7/5까지.'

type Mode = 'input' | 'review' | 'done'

export function AiAuthorModal(): JSX.Element | null {
  const open = useAiAuthorStore((s) => s.open)
  const setOpen = useAiAuthorStore((s) => s.setOpen)
  const [mode, setMode] = useState<Mode>('input')
  const [memo, setMemo] = useState('')
  const [formCode, setFormCode] = useState('B2100-01')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [draft, setDraft] = useState<AiDraftDto | null>(null)
  const [aiText, setAiText] = useState('')
  const [def, setDef] = useState<FormDefinitionDto | null>(null)
  const [appliedRef, setAppliedRef] = useState('')

  if (!open) return null

  const reset = (): void => {
    setMode('input'); setMemo(''); setDraft(null); setAiText(''); setDef(null); setErr(null); setAppliedRef('')
  }
  const close = (): void => { setOpen(false); reset() }

  const generate = async (): Promise<void> => {
    if (!memo.trim() || loading) return
    setLoading(true); setErr(null)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_STRUCTURE_CAPTURE, {
        memo, formCode
      })) as StructureCaptureResponse
      if (!res.success || !res.draft) {
        setErr(res.error || 'AI가 초안을 만들지 못했습니다. 메모를 더 구체적으로 적어보세요.')
        return
      }
      const d = (await window.api.invoke(window.api.channels.FORM_GET_DEFINITION, {
        code: formCode
      })) as FormDefinitionDto | null
      setDraft(res.draft); setAiText(res.aiText || ''); setDef(d); setMode('review')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const approve = async (): Promise<void> => {
    if (!draft || loading) return
    setLoading(true); setErr(null)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_DRAFT_APPROVE, { id: draft.id })) as {
        success: boolean; appliedRef?: string; error?: string
      }
      if (res.success) { setAppliedRef(res.appliedRef || ''); setMode('done') }
      else setErr(res.error || '결재 반영 실패')
    } finally {
      setLoading(false)
    }
  }

  const reject = async (): Promise<void> => {
    if (!draft) return
    await window.api.invoke(window.api.channels.AI_DRAFT_REJECT, { id: draft.id, note: '사용자 거절' })
    reset()
  }

  const values = (draft?.payload as { values?: Record<string, unknown> } | undefined)?.values ?? {}
  const filledCount = def ? def.fields.filter((f) => String(values[f.fieldKey] ?? '').trim()).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div
        className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">AI 초안 작성</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold">메모 → 공식양식 초안 · 결재 필요</span>
          </div>
          <button type="button" onClick={close} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {err && (
            <div className="mb-3 flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
              <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" /><span>{err}</span>
            </div>
          )}

          {mode === 'input' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">양식</label>
                <select
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  className="mt-1 w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-background"
                >
                  {WEDGE_FORMS.map((f) => <option key={f.code} value={f.code}>{f.code} · {f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">현장 메모 (자유롭게)</label>
                <textarea
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  rows={5}
                  placeholder={`예) ${EXAMPLE}`}
                  className="mt-1 w-full resize-none text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button type="button" onClick={() => setMemo(EXAMPLE)} className="mt-1 text-[11px] text-primary hover:underline">예시 넣기</button>
              </div>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={loading || !memo.trim()}
                className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {loading ? 'AI가 양식으로 정리 중…' : 'AI 초안 생성'}
              </button>
              <p className="text-[11px] text-muted-foreground">AI는 메모에 있는 사실만 채우고, 공식 기록에 직접 쓰지 않습니다. 사람이 결재해야 반영돼요.</p>
            </div>
          )}

          {mode === 'review' && draft && (
            <div className="space-y-3">
              <div className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{formCode}</span> 초안 · {def?.fields.length ?? 0}개 항목 중 <span className="font-semibold text-primary">{filledCount}개</span> 채움
              </div>
              {aiText && <div className="p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-[12px] whitespace-pre-wrap">{aiText}</div>}

              <div className="rounded-lg border border-border divide-y divide-border">
                {(def?.fields ?? []).map((f) => {
                  const v = String(values[f.fieldKey] ?? '')
                  return (
                    <div key={f.fieldKey} className="flex gap-3 px-3 py-2 text-[12px]">
                      <div className="w-28 shrink-0 text-muted-foreground">{f.label}</div>
                      <div className={`flex-1 whitespace-pre-wrap ${v ? '' : 'text-muted-foreground/50 italic'}`}>{v || '(비움)'}</div>
                    </div>
                  )
                })}
              </div>

              {draft.sourceRefs?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-[10px] text-muted-foreground mr-0.5 mt-0.5">근거</span>
                  {draft.sourceRefs.map((s, i) => (
                    <span key={i} className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-border">{s.key}</span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button type="button" onClick={() => void approve()} disabled={loading} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  승인 — 공식 작성본으로
                </button>
                <button type="button" onClick={() => void reject()} className="px-3 py-2.5 rounded-lg border border-border hover:bg-muted text-[13px]">거절</button>
                <button type="button" onClick={reset} title="다시 작성" className="px-3 py-2.5 rounded-lg border border-border hover:bg-muted"><RotateCcw className="w-4 h-4" /></button>
              </div>
              <p className="text-[11px] text-muted-foreground">검토 후 승인하면 공식 작성본이 생성됩니다(작성화면에서 수정·공식 엑셀 출력 가능).</p>
            </div>
          )}

          {mode === 'done' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3"><Check className="w-6 h-6" /></div>
              <p className="text-sm font-bold">공식 작성본이 생성됐습니다</p>
              <p className="text-[12px] text-muted-foreground mt-1">{appliedRef}</p>
              <div className="mt-4 flex items-center justify-center gap-2 text-[12px] text-muted-foreground">
                <FileSpreadsheet className="w-4 h-4" /> 작성 화면(양식)에서 열어 수정·공식 엑셀 출력 하세요.
              </div>
              <button type="button" onClick={close} className="mt-5 px-5 py-2 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold">닫기</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
