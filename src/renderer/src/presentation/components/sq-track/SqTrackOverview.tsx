import { Star } from 'lucide-react'
import { CardShell } from '../shared/dash/DashKit'
import { useSqTrackStore } from '../../stores/sqTrackStore'

/** 우측 미선택 요약(19번 공백 금지) — 전체 진행 + 정본 품번 + 다음 동선 안내. */
export function SqTrackOverview(): JSX.Element {
  const overview = useSqTrackStore((s) => s.overview)
  const loading = useSqTrackStore((s) => s.loadingOverview)
  const selectPart = useSqTrackStore((s) => s.selectPart)

  if (!overview) {
    return (
      <div className="text-[13px] text-muted-foreground py-10 text-center">
        {loading ? '불러오는 중…' : '심사 트랙 데이터가 없습니다. (마이그레이션 0068/0069 적용 확인)'}
      </div>
    )
  }

  const { totals } = overview
  const pct = totals.total > 0 ? Math.round((totals.done / totals.total) * 100) : 0
  const primary = overview.parts.find((p) => p.partNo === overview.primaryPartNo)
  const worst = [...overview.parts].sort(
    (a, b) =>
      b.openBySeverity.red - a.openBySeverity.red ||
      b.openBySeverity.orange - a.openBySeverity.orange ||
      b.openBySeverity.yellow - a.openBySeverity.yellow
  )[0]

  return (
    <div className="grid gap-4">
      <CardShell title="전체 진행" cap={`품번 ${overview.parts.length}종 · 심사 동선 체크 ${totals.total}건`}>
        <div className="px-[18px] pb-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="text-[13px]">
              전체 <b className="text-[15px] tabular-nums">{totals.total}</b>건
            </div>
            <div className="text-[13px]">
              미해소 <b className="text-[15px] tabular-nums text-bad-ink">{totals.open}</b>건
            </div>
            <div className="text-[13px]">
              해소 <b className="text-[15px] tabular-nums text-ok-ink">{totals.done}</b>건
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="text-[12px] text-muted-foreground tabular-nums">{pct}% 해소</div>
          </div>
        </div>
      </CardShell>

      {primary && (
        <CardShell
          title="심사 대상 정본 품번"
          cap="사장님 확정(2026-07-25) — SQ 트랙·준비도·데모의 기준 품번"
        >
          <div className="px-[18px] pb-4">
            <button
              type="button"
              onClick={() => void selectPart(primary.partNo)}
              className="w-full flex items-center gap-3 rounded-[11px] border border-primary/30 bg-primary/5 px-4 py-3 text-left hover:bg-primary/10"
            >
              <Star className="w-4 h-4 text-primary fill-current shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-[15px] font-extrabold tabular-nums">{primary.partNo}</span>
                <span className="block text-[12px] text-muted-foreground truncate">
                  {primary.partName ?? ''}
                  {primary.model ? ` · ${primary.model}` : ''}
                  {primary.customer ? ` · ${primary.customer}` : ''}
                </span>
              </span>
              <span className="text-[12px] font-semibold text-primary shrink-0">동선 체크 열기 ›</span>
            </button>
          </div>
        </CardShell>
      )}

      <CardShell title="다음 동선" cap="미해소 심각도 큰 품번부터">
        <div className="px-[18px] pb-4 text-[13px] text-muted-foreground leading-relaxed">
          {worst && worst.openBySeverity.red + worst.openBySeverity.orange + worst.openBySeverity.yellow > 0 ? (
            <>
              <b className="text-foreground font-mono">{worst.partNo}</b> 에 미해소 심각 항목이 가장 많습니다 — 좌측에서
              선택해 서류→정합성→현장→인터뷰 순서로 처리하세요.
            </>
          ) : (
            <>모든 품번의 심각 항목이 해소됐습니다 — 남은 일반 항목을 순서대로 마감하세요.</>
          )}
          <p className="mt-2 text-[12px]">
            근거 문서: <code className="bg-secondary px-1.5 py-0.5 rounded">docs/sq-levelup-2026-10/</code> (00 종합보고 ·
            10 문서대장 · 20 심사추적맵 · 30 보완액션리스트) — 2026-07-17 ISIR 스캔 354p 전수 판독.
          </p>
        </div>
      </CardShell>
    </div>
  )
}
