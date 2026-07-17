import { useSqTrackStore } from '../../stores/sqTrackStore'
import { SqTrackPartCard } from './SqTrackPartCard'

/** 오버뷰 — 전체 요약 스트립 + 품번 카드 그리드. */
export function SqTrackOverview(): JSX.Element {
  const overview = useSqTrackStore((s) => s.overview)
  const loading = useSqTrackStore((s) => s.loadingOverview)

  if (!overview) {
    return (
      <div className="text-[13px] text-muted-foreground py-10 text-center">
        {loading ? '불러오는 중…' : '심사 트랙 데이터가 없습니다. (마이그레이션 0068/0069 적용 확인)'}
      </div>
    )
  }

  const { totals } = overview
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      {/* 요약 스트립 */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 bg-card border border-border rounded-xl px-5 py-3.5">
        <div className="text-[13px]">
          전체 <b className="text-[15px]">{totals.total}</b>건
        </div>
        <div className="text-[13px]">
          미해소 <b className="text-[15px] text-[#A32D2D] dark:text-[#EF8A89]">{totals.open}</b>건
        </div>
        <div className="text-[13px]">
          해소 <b className="text-[15px] text-[#1D6B1D]">{totals.done}</b>건
        </div>
        <div className="flex-1 min-w-[160px]">
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="text-[12px] text-muted-foreground tabular-nums">{pct}% 해소</div>
      </div>

      {/* 품번 카드 그리드 */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {overview.parts.map((p) => (
          <SqTrackPartCard key={p.partNo} part={p} />
        ))}
      </div>

      <p className="text-[12px] text-muted-foreground">
        근거 문서: <code className="bg-secondary px-1.5 py-0.5 rounded">docs/sq-levelup-2026-10/</code> (00 종합보고 ·
        10 문서대장 · 20 심사추적맵 · 30 보완액션리스트) — 2026-07-17 ISIR 스캔 354p 전수 판독.
      </p>
    </div>
  )
}
