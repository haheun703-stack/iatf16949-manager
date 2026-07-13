import { CalendarClock, Gauge, AlertTriangle, Clock3, CircleAlert, FileCheck2 } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { useUIStore, type PageId } from '../../../stores/uiStore'
import { STATUS } from './v3-tokens'

export interface KpiTileSpec {
  key: string
  label: string
  value: string
  unit?: string
  sub: string
  /** ✦ AI 각주(결정론 산수) — 있으면 타일 하단에 표시 */
  aiNote?: string
  tone: 'accent' | 'hot' | 'warm'
  valueTone?: 'crit' | 'warn'
  page?: PageId
}

const ICONS: Record<string, typeof Gauge> = {
  dday: CalendarClock,
  readiness: Gauge,
  unmet: AlertTriangle,
  obligations: Clock3,
  cases: CircleAlert,
  coverage: FileCheck2
}

const ICON_TONE: Record<KpiTileSpec['tone'], string> = {
  accent: 'bg-sky-100 text-sky-700',
  hot: 'bg-red-100 text-red-600',
  warm: 'bg-amber-100 text-amber-700'
}

/** KPI 6타일 — 아이콘형. ✦각주 = AI(시크릿)를 카드가 아니라 데이터 옆에 심는 자리 */
export function KpiTiles({ tiles }: { tiles: KpiTileSpec[] }): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
      {tiles.map((t) => {
        const Icon = ICONS[t.key] ?? Gauge
        const clickable = !!t.page
        const Tag = (clickable ? 'button' : 'div') as 'button'
        return (
          <Tag
            key={t.key}
            type={clickable ? 'button' : undefined}
            onClick={clickable ? () => setPage(t.page!) : undefined}
            className={cn(
              'bg-card border border-border rounded-xl shadow-sm px-5 py-4 flex items-center gap-4 text-left',
              clickable && 'hover:shadow-md hover:border-primary/30 transition-all cursor-pointer'
            )}
          >
            <div
              className={cn(
                'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                ICON_TONE[t.tone]
              )}
            >
              <Icon className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-bold text-muted-foreground tracking-wide">
                {t.label}
              </div>
              <div
                className="text-[30px] font-extrabold leading-tight tabular-nums"
                style={
                  t.valueTone === 'crit'
                    ? { color: STATUS.critical }
                    : t.valueTone === 'warn'
                      ? { color: STATUS.warning }
                      : undefined
                }
              >
                {t.value}
                {t.unit && <span className="text-[15px] font-bold text-muted-foreground ml-0.5">{t.unit}</span>}
              </div>
              <div className="text-[11.5px] text-muted-foreground truncate">{t.sub}</div>
              {t.aiNote && (
                <div className="text-[11px] font-bold text-sky-600 mt-0.5 truncate" title={`✦ ${t.aiNote}`}>
                  ✦ {t.aiNote}
                </div>
              )}
            </div>
          </Tag>
        )
      })}
    </div>
  )
}
