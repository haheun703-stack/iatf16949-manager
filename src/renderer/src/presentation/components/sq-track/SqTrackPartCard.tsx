import type { SqTrackPartCardDto } from '@shared/ipc-types'
import { useSqTrackStore } from '../../stores/sqTrackStore'

const SEV = {
  red: { bg: '#FCEBEB', fg: '#A32D2D', label: '🔴' },
  orange: { bg: '#FAEEDA', fg: '#7A4D05', label: '🟠' },
  yellow: { bg: '#FDF6DC', fg: '#7A6205', label: '🟡' }
} as const

/** 품번 카드 — 진행바 + 미해소 심각도 배지. 클릭 = 상세 진입. */
export function SqTrackPartCard({ part }: { part: SqTrackPartCardDto }): JSX.Element {
  const selectPart = useSqTrackStore((s) => s.selectPart)
  const denom = part.total - part.na
  const pct = denom > 0 ? Math.round((part.done / denom) * 100) : 0

  return (
    <button
      type="button"
      onClick={() => void selectPart(part.partNo)}
      className="text-left bg-card border border-border rounded-xl px-5 py-4 hover:border-primary/60 transition-colors flex flex-col gap-2.5"
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[16.5px] font-extrabold tabular-nums tracking-tight">{part.partNo}</span>
        {part.customer && <span className="text-[11.5px] text-muted-foreground shrink-0">{part.customer}</span>}
      </div>
      <div className="text-[12px] text-muted-foreground truncate">
        {part.partName ?? ''}
        {part.model ? ` · ${part.model}` : ''}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[11.5px] text-muted-foreground tabular-nums shrink-0">
          {part.done}/{denom} 해소
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(Object.keys(SEV) as Array<keyof typeof SEV>).map((k) => {
          const n = part.openBySeverity[k]
          if (n === 0) return null
          return (
            <span
              key={k}
              className="text-[11px] font-bold rounded-full px-2 py-0.5"
              style={{ background: SEV[k].bg, color: SEV[k].fg }}
            >
              {SEV[k].label} {n}
            </span>
          )
        })}
        {part.openBySeverity.red + part.openBySeverity.orange + part.openBySeverity.yellow === 0 && (
          <span className="text-[11px] font-bold rounded-full px-2 py-0.5" style={{ background: '#E2F3E2', color: '#1D6B1D' }}>
            전항 해소
          </span>
        )}
      </div>

      {part.binderInfo && <div className="text-[11px] text-muted-foreground/80 leading-snug">{part.binderInfo}</div>}
    </button>
  )
}
