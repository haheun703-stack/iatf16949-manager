import { useEffect, useState } from 'react'
import { Sparkles, Loader2, AlertTriangle, Clock, CalendarClock, FileWarning } from 'lucide-react'
import type { BriefingFacts, BriefingSummarizeResponse, BriefingItem } from '@shared/ipc-types'

function Stat({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof Clock
  label: string
  value: string
  tone: string
}): JSX.Element {
  return (
    <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${tone}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <div className="leading-tight">
        <div className="text-[15px] font-bold tabular-nums">{value}</div>
        <div className="text-[10px] opacity-80">{label}</div>
      </div>
    </div>
  )
}

function ItemRow({ it }: { it: BriefingItem }): JSX.Element {
  const dd = it.daysLeft < 0 ? `D+${-it.daysLeft}` : it.daysLeft === 0 ? 'D-DAY' : `D-${it.daysLeft}`
  return (
    <div className="flex items-center gap-2 text-[12px] py-1 border-b border-border/50 last:border-0">
      <span
        className={`font-mono font-bold w-12 shrink-0 ${it.daysLeft < 0 ? 'text-red-600' : it.daysLeft <= 3 ? 'text-amber-600' : 'text-muted-foreground'}`}
      >
        {dd}
      </span>
      <span className="truncate flex-1">{it.title}</span>
      {it.owner && <span className="text-[10px] text-muted-foreground shrink-0">{it.owner}</span>}
      <span className="text-[10px] px-1 rounded bg-muted text-muted-foreground shrink-0">
        {it.kind === 'case' ? '케이스' : '일정'}
      </span>
    </div>
  )
}

export function BriefingCard(): JSX.Element | null {
  const [facts, setFacts] = useState<BriefingFacts | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const f = (await window.api.invoke(window.api.channels.AI_BRIEFING_FACTS, {})) as BriefingFacts
        setFacts(f)
      } catch {
        /* noop */
      }
    })()
  }, [])

  if (!facts) return null

  const askAi = async (): Promise<void> => {
    setLoadingAi(true)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_BRIEFING_SUMMARIZE, {
        facts
      })) as BriefingSummarizeResponse
      setSummary(res.success ? res.text || '' : `요약 실패: ${res.error ?? '오류'}`)
    } catch (err) {
      setSummary(`요약 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingAi(false)
    }
  }

  const top = [...facts.overdue, ...facts.dueSoon].slice(0, 5)

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          오늘의 브리핑
          <span className="text-[11px] font-normal text-muted-foreground">{facts.today}</span>
        </h2>
        <button
          type="button"
          onClick={() => void askAi()}
          disabled={loadingAi}
          title="현재 현황을 AI가 자연어로 요약합니다"
          className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
        >
          {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          AI 요약
        </button>
      </div>

      {/* 신호등 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <Stat icon={AlertTriangle} label="기한 초과" value={`${facts.overdue.length}`} tone="border-red-200 bg-red-50 text-red-700" />
        <Stat icon={Clock} label="마감 임박(7일)" value={`${facts.dueSoon.length}`} tone="border-amber-200 bg-amber-50 text-amber-700" />
        <Stat
          icon={CalendarClock}
          label={`심사 · ${facts.audit?.date ?? ''}`}
          value={facts.audit ? `D-${facts.audit.dday}` : '—'}
          tone="border-sky-200 bg-sky-50 text-sky-700"
        />
        <Stat icon={FileWarning} label={`SQ 증빙누락 / ${facts.sq.total}`} value={`${facts.sq.missingEvidence}`} tone="border-slate-200 bg-slate-50 text-slate-700" />
      </div>

      {/* AI 요약 */}
      {summary && (
        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[13px] whitespace-pre-wrap leading-relaxed">
          {summary}
        </div>
      )}

      {/* 임박/초과 항목 */}
      {top.length > 0 ? (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1">처리 필요 항목</div>
          {top.map((it, i) => (
            <ItemRow key={i} it={it} />
          ))}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-muted-foreground">기한 초과·임박 항목이 없습니다. 👍</p>
      )}
    </div>
  )
}
