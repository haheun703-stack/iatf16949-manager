import { useState } from 'react'
import { ScanSearch, Sparkles, Loader2, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'
import { ABSENCE_TRIGGERS } from '@shared/ipc-types'
import type { AbsenceCheck, AbsenceExplainResponse, AbsenceStatus } from '@shared/ipc-types'

const STATUS: Record<AbsenceStatus, { ko: string; icon: typeof CheckCircle2; cls: string }> = {
  ok: { ko: '작성됨', icon: CheckCircle2, cls: 'text-emerald-600' },
  unwritten: { ko: '미작성', icon: AlertCircle, cls: 'text-amber-600' },
  missing: { ko: '누락', icon: XCircle, cls: 'text-red-600' }
}

export function AbsenceCard(): JSX.Element {
  const [triggerKey, setTriggerKey] = useState<string | null>(null)
  const [check, setCheck] = useState<AbsenceCheck | null>(null)
  const [loading, setLoading] = useState(false)
  const [diag, setDiag] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  const run = async (key: string): Promise<void> => {
    setTriggerKey(key); setLoading(true); setCheck(null); setDiag(null)
    try {
      const r = (await window.api.invoke(window.api.channels.AI_ABSENCE_CHECK, { triggerKey: key })) as AbsenceCheck
      setCheck(r)
    } finally {
      setLoading(false)
    }
  }

  const askAi = async (): Promise<void> => {
    if (!check) return
    setLoadingAi(true)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_ABSENCE_EXPLAIN, { check })) as AbsenceExplainResponse
      setDiag(res.success ? res.text || '' : `진단 실패: ${res.error ?? '오류'}`)
    } catch (err) {
      setDiag(`진단 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingAi(false)
    }
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16.5px] font-bold flex items-center gap-1.5">
          <ScanSearch className="w-4 h-4 text-primary" />
          변경점 영향 점검 <span className="text-[12.5px] font-normal text-muted-foreground">있어야 할 양식인데 없는 것 감지</span>
        </h2>
        {check && (
          <button
            type="button"
            onClick={() => void askAi()}
            disabled={loadingAi}
            className="text-[13.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI 진단
          </button>
        )}
      </div>

      {/* 트리거 */}
      <div className="flex flex-wrap gap-2 mb-3">
        {ABSENCE_TRIGGERS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => void run(t.key)}
            title={t.description}
            className={`text-[13.5px] font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              triggerKey === t.key ? 'bg-primary/10 text-primary border-primary/30' : 'border-border hover:bg-muted'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="py-6 flex items-center justify-center text-muted-foreground text-[13.5px] gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 점검 중…
        </div>
      )}

      {!loading && !check && (
        <p className="text-[14.5px] text-muted-foreground py-2">상황을 선택하면 IATF/SQ 논리상 <b>있어야 할 양식</b>과 <b>누락·미작성</b>을 점검합니다.</p>
      )}

      {check && (
        <>
          {/* 요약 */}
          <div className="flex gap-4 text-[14.5px] mb-2">
            <span className="text-emerald-600 font-semibold">작성됨 {check.summary.ok}</span>
            <span className="text-amber-600 font-semibold">미작성 {check.summary.unwritten}</span>
            <span className="text-red-600 font-semibold">누락 {check.summary.missing}</span>
            <span className="text-muted-foreground">/ 총 {check.summary.total}종</span>
          </div>

          {diag && (
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[14.5px] whitespace-pre-wrap leading-relaxed">
              {diag}
            </div>
          )}

          {/* 항목 */}
          <div className="rounded-lg border border-border divide-y divide-border">
            {check.items.map((it) => {
              const s = STATUS[it.status]
              const Icon = s.icon
              return (
                <div key={it.regCode} className="flex items-center gap-2.5 px-3 py-2.5 text-[14.5px]">
                  <Icon className={`w-4 h-4 shrink-0 ${s.cls}`} />
                  <span className="font-mono text-[12px] text-muted-foreground w-12 shrink-0">{it.regCode}</span>
                  <span className="flex-1 min-w-0">
                    <span className="break-keep leading-snug">{it.expected}</span>
                    {it.sampleForm && <span className="text-muted-foreground"> · {it.sampleForm}</span>}
                  </span>
                  <span className={`text-[12.5px] font-semibold shrink-0 ${s.cls}`}>{s.ko}</span>
                </div>
              )
            })}
          </div>
          <p className="text-[12.5px] text-muted-foreground mt-2">누락·미작성은 상단 <b>AI 작성</b>으로 메모→초안→결재 하세요.</p>
        </>
      )}
    </div>
  )
}
