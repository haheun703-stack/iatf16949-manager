import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { MesProcessLiveDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { ProcessLiveMatrix } from './ProcessLiveMatrix'

/**
 * 31호 §2-3층 — 공정 실황 스트립: 도넛 7카드 → 높이 1줄 미니 칩 7개.
 * "문제만 크게": 공백(gap) 공정만 호박 강조, 정상은 소형 초록 점, 미반입·원천 없음은 무채 소형
 * (반복 문구 없음 — 미반입 집약은 1층 문제 배너 담당, 동일 데이터 2회 표출 금지 §5-2).
 * 클릭 = 기록 커버리지 매트릭스 상세 펼침(§3 — 홈 제거가 아니라 2층 상세로 강등, 손실 0).
 */
export function ProcessLiveStrip(): JSX.Element {
  const [data, setData] = useState<MesProcessLiveDto | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    void (async () => {
      try {
        const d = (await window.api.invoke(window.api.channels.MES_RECORDS_PROCESS_LIVE, {})) as MesProcessLiveDto
        setData(d)
      } catch {
        setData(null)
      }
    })()
  }, [])

  const cols = data?.columns ?? []
  if (cols.length === 0) return <></>
  const gapCount = cols.filter((c) => c.status === 'gap').length

  return (
    <section data-testid="process-live-strip">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2 shadow-card hover:bg-muted/30 transition-colors"
        title="클릭 = 기록 커버리지 상세 펼침"
      >
        <span className="text-[12px] font-bold text-muted-foreground shrink-0">공정 실황</span>
        <span className="flex items-center gap-1.5 flex-wrap min-w-0">
          {cols.map((c) => {
            const isGap = c.status === 'gap'
            const isActive = c.status === 'active'
            return (
              <span
                key={c.key}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] whitespace-nowrap',
                  isGap
                    ? 'bg-warn-tint text-warn-ink font-extrabold' // 문제만 크게
                    : isActive
                      ? 'bg-ok-tint/50 text-ok-ink font-semibold'
                      : 'bg-muted/60 text-muted-foreground/70 font-medium text-[11px]'
                )}
              >
                {isGap ? '⚠' : isActive ? '●' : '·'} {c.label}
                {c.weekPct != null && (isGap || isActive) && (
                  <b className="tabular-nums">{c.weekPct}%</b>
                )}
              </span>
            )
          })}
        </span>
        <span className="ml-auto shrink-0 flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          {gapCount > 0 ? `공백 ${gapCount}공정` : '상세'}
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>
      {expanded && (
        <div className="mt-2">
          <ProcessLiveMatrix />
        </div>
      )}
    </section>
  )
}
