import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import type { SqReadinessDto, SqSignal } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { SqItemDetail } from './SqItemDetail'

const SIGNAL_BG: Record<SqSignal, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive'
}
const SIGNAL_TEXT: Record<SqSignal, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive'
}
const SIGNAL_LABEL: Record<SqSignal, string> = { green: '충족', yellow: '진행', red: '미충족' }

function Dot({ signal, className }: { signal: SqSignal; className?: string }): JSX.Element {
  return <span className={cn('inline-block rounded-full shrink-0', SIGNAL_BG[signal], className)} />
}

/**
 * SQ 준비도 — 삼보(HKMC) SQ 평가 Ver4 백본(6대·42항목)을 forms.reg_code 로 연결해
 * 항목별 신호등으로 "지금 심사 받으면 되나?"를 보여준다. 항목 클릭 → 우측 상세.
 */
export function SqReadinessPage(): JSX.Element {
  const [data, setData] = useState<SqReadinessDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.invoke(window.api.channels.SQ_READINESS)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    const acc = { green: 0, yellow: 0, red: 0, total: 0 }
    if (data) {
      for (const c of data.categories)
        for (const it of c.items) {
          acc[it.signal]++
          acc.total++
        }
    }
    return acc
  }, [data])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 */}
      <header className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">SQ 준비도</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            삼보모터스(HKMC) SQ 평가 Ver4 · 6대 · {summary.total}항목 · 1000점 — 양식 작성·표준화 현황 신호등
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><Dot signal="green" className="w-2.5 h-2.5" /> {summary.green}</span>
          <span className="flex items-center gap-1.5"><Dot signal="yellow" className="w-2.5 h-2.5" /> {summary.yellow}</span>
          <span className="flex items-center gap-1.5"><Dot signal="red" className="w-2.5 h-2.5" /> {summary.red}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="ml-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
            title="새로고침"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>
      </header>

      {/* 본문: 좌(목록) / 우(상세) */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 — 카테고리·항목 목록 */}
        <div className="w-[460px] shrink-0 overflow-y-auto pr-1 space-y-4">
          {loading && !data && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
          )}
          {data?.categories.map((cat) => (
            <section key={cat.id}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Dot signal={cat.signal} className="w-2.5 h-2.5" />
                <h2 className="text-sm font-bold">{cat.id}. {cat.name}</h2>
                <span className="text-[11px] text-muted-foreground">{cat.points}점</span>
                {cat.iatfClause && (
                  <span className="text-[10px] text-muted-foreground/70 truncate">· IATF {cat.iatfClause}</span>
                )}
              </div>
              <div className="space-y-1">
                {cat.items.map((it) => {
                  const active = selected === it.code
                  return (
                    <button
                      key={it.code}
                      type="button"
                      onClick={() => setSelected(it.code)}
                      className={cn(
                        'w-full text-left rounded-lg px-3 py-2 flex items-center gap-2.5 transition-colors border',
                        active
                          ? 'bg-muted border-primary/40'
                          : 'bg-card border-border hover:bg-muted/50'
                      )}
                    >
                      <Dot signal={it.signal} className="w-3 h-3" />
                      <span className="font-mono text-[11px] text-muted-foreground w-9 shrink-0">{it.code}</span>
                      <span className="flex-1 text-[13px] font-medium leading-snug truncate">{it.title}</span>
                      <span className="text-[10px] tabular-nums text-muted-foreground shrink-0">
                        양식 {it.formCount} · 표준 {it.standardizedCount} · 작성 {it.draftedCount}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* 우측 — 상세 */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            <SqItemDetail code={selected} signalText={SIGNAL_TEXT} signalLabel={SIGNAL_LABEL} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" />
                좌측에서 SQ 항목을 선택하면<br />요건·지배규정·필요 양식이 표시됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
