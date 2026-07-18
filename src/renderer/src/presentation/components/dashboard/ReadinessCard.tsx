import { useEffect, useState } from 'react'
import { Gauge, Sparkles, Loader2 } from 'lucide-react'
import type { ReadinessPrediction, ReadinessExplainResponse } from '@shared/ipc-types'

const SIG = {
  green: { ko: '충족', cls: 'text-emerald-600' },
  yellow: { ko: '진행', cls: 'text-amber-600' },
  red: { ko: '미충족', cls: 'text-red-600' },
  gray: { ko: '측정불가', cls: 'text-slate-400' }
} as const

export function ReadinessCard(): JSX.Element | null {
  const [p, setP] = useState<ReadinessPrediction | null>(null)
  const [diag, setDiag] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const r = (await window.api.invoke(window.api.channels.AI_READINESS_PREDICT, {})) as ReadinessPrediction
        setP(r)
      } catch {
        /* noop */
      }
    })()
  }, [])

  if (!p) return null
  const pct = p.totalPoints > 0 ? Math.round((p.score / p.totalPoints) * 100) : 0

  const askAi = async (): Promise<void> => {
    setLoadingAi(true)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_READINESS_EXPLAIN, {
        prediction: p
      })) as ReadinessExplainResponse
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
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Gauge className="w-4 h-4 text-primary" />
          AI 심사 예측 <span className="text-[12.5px] font-normal text-muted-foreground">지금 SQ 심사 시 추정</span>
        </h2>
        <button
          type="button"
          onClick={() => void askAi()}
          disabled={loadingAi}
          className="text-[13.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI 진단
        </button>
      </div>

      {/* 점수 */}
      <div className="flex items-end gap-3 mb-2">
        <div className="text-[34px] font-black leading-none tabular-nums">
          {p.score}
          <span className="text-base font-bold text-muted-foreground"> / {p.totalPoints}</span>
        </div>
        <div className="text-[13.5px] text-muted-foreground mb-1">추정 {pct}% · 회색(측정불가)은 0점 처리</div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* 신호등 카운트 */}
      <div className="flex gap-4 text-[13.5px] mb-3">
        {(['green', 'yellow', 'red', 'gray'] as const).map((s) => (
          <span key={s} className={`font-semibold ${SIG[s].cls}`}>
            {SIG[s].ko} {p.counts[s]}
          </span>
        ))}
      </div>

      {/* AI 진단 */}
      {diag && (
        <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[13px] whitespace-pre-wrap leading-relaxed">
          {diag}
        </div>
      )}

      {/* 점수 손실 큰 항목 */}
      {p.reds.length > 0 && (
        <div>
          <div className="text-[12.5px] font-semibold text-muted-foreground mb-1">점수 손실 큰 항목</div>
          <div className="divide-y divide-border/50">
            {p.reds.slice(0, 5).map((r) => (
              <div key={r.code} className="flex items-center gap-2 py-1 text-[13.5px]">
                <span className="font-mono text-[12px] text-muted-foreground w-10 shrink-0">{r.code}</span>
                <span className="truncate flex-1">{r.title}</span>
                <span className={`text-[12px] shrink-0 ${r.signal === 'gray' ? 'text-slate-400' : 'text-red-600'}`}>{r.reason}</span>
                <span className="font-bold tabular-nums w-10 text-right shrink-0">-{r.points}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
