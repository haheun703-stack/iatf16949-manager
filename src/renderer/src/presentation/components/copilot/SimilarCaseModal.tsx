import { useState } from 'react'
import { Search, X, Loader2, History, CircleAlert } from 'lucide-react'
import { useSimilarStore } from '../../stores/similarStore'
import type { SimilarCaseResponse, SimilarCaseResult } from '@shared/ipc-types'

const EXAMPLE = '브레이징 조인트 기밀시험 누유, 출하 전 전수검사에서 3건 검출. 품번 BRZ-1180.'

export function SimilarCaseModal(): JSX.Element | null {
  const open = useSimilarStore((s) => s.open)
  const setOpen = useSimilarStore((s) => s.setOpen)
  const [defect, setDefect] = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<SimilarCaseResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  if (!open) return null

  const close = (): void => {
    setOpen(false)
    setDefect(''); setRes(null); setErr(null)
  }

  const run = async (): Promise<void> => {
    if (!defect.trim() || loading) return
    setLoading(true); setErr(null); setRes(null)
    try {
      const r = (await window.api.invoke(window.api.channels.AI_SIMILAR_CASES, { defect })) as SimilarCaseResponse
      if (r.success && r.result) setRes(r.result)
      else setErr(r.error || '분석 실패')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={close}>
      <div
        className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">유사 사례 · 대책 초안</h3>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold">과거 케이스 + 5Why·재발방지</span>
          </div>
          <button type="button" onClick={close} className="p-1 rounded hover:bg-muted text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground">신규 불량 내용</label>
            <textarea
              value={defect}
              onChange={(e) => setDefect(e.target.value)}
              rows={3}
              placeholder={`예) ${EXAMPLE}`}
              className="mt-1 w-full resize-none text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex items-center justify-between mt-1">
              <button type="button" onClick={() => setDefect(EXAMPLE)} className="text-[11px] text-primary hover:underline">예시 넣기</button>
              <button
                type="button"
                onClick={() => void run()}
                disabled={loading || !defect.trim()}
                className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1.5"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {loading ? '유사사례 분석 중…' : '유사사례·대책 분석'}
              </button>
            </div>
          </div>

          {err && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
              <CircleAlert className="w-4 h-4 shrink-0 mt-0.5" /><span>{err}</span>
            </div>
          )}

          {res && (
            <>
              {/* 유사 케이스 */}
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> 과거 유사 케이스 {res.similar.length}건
                </div>
                {res.similar.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">유사한 과거 케이스를 찾지 못했습니다.</p>
                ) : (
                  <div className="space-y-1.5">
                    {res.similar.map((c) => (
                      <div key={c.caseNo} className="rounded-lg border border-border px-3 py-2 text-[12px]">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-primary">{c.caseNo}</span>
                          <span className="font-semibold truncate">{c.title}</span>
                          {c.occurredDate && <span className="text-[10px] text-muted-foreground shrink-0">{c.occurredDate}</span>}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                          {c.customer && <span>{c.customer} · </span>}
                          {c.partName && <span>{c.partName} · </span>}
                          <span>{c.defectDesc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* AI 원인/대책 */}
              <div>
                <div className="text-[11px] font-semibold text-muted-foreground mb-1">AI 원인분석(5Why) · 재발방지 대책</div>
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[13px] whitespace-pre-wrap leading-relaxed">
                  {res.analysis}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">이 분석을 바탕으로 상단 <b>AI 작성</b>에서 시정조치 요구서(B2100-01)·개선대책서 초안을 만들어 결재하세요.</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
