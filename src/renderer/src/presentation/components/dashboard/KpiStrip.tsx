import { FileText, Gauge, TrendingUp, AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDashboardStore } from '../../stores/dashboardStore'

const TONE_CLASS: Record<string, string> = {
  primary: 'text-white bg-gradient-to-br from-violet-500 to-indigo-500 shadow-sm shadow-violet-500/30',
  success: 'text-white bg-gradient-to-br from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30',
  warning: 'text-white bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm shadow-amber-500/30',
  destructive: 'text-white bg-gradient-to-br from-rose-500 to-red-500 shadow-sm shadow-rose-500/30'
}

function scoreTone(score: number | null): 'success' | 'primary' | 'warning' | 'destructive' {
  if (score == null) return 'primary'
  if (score >= 90) return 'success'
  if (score >= 75) return 'primary'
  if (score >= 60) return 'warning'
  return 'destructive'
}

export function KpiStrip(): JSX.Element {
  const data = useDashboardStore((s) => s.data)

  const formsTotal = data?.formsTotal ?? 0
  const formsScored = data?.formsScored ?? 0
  const avgScore = data?.avgScore ?? null
  const attention = data?.needsAttentionCount ?? 0

  const kpis = [
    {
      label: '등록 양식',
      value: formsTotal > 0 ? String(formsTotal) : '–',
      sub: 'AI 작성·채점 대상',
      icon: FileText,
      tone: 'primary' as const
    },
    {
      label: 'AI 채점 완료',
      value: formsScored > 0 ? String(formsScored) : '–',
      sub: formsTotal > 0 ? `전체 ${formsTotal}건 중` : '채점 대기',
      icon: Gauge,
      tone: 'success' as const
    },
    {
      label: '평균 점수',
      value: avgScore != null ? String(avgScore) : '–',
      sub: avgScore != null ? '최신 채점 평균' : '채점 후 표시',
      icon: TrendingUp,
      tone: scoreTone(avgScore)
    },
    {
      label: '보완 필요',
      value: String(attention),
      sub: '보완·부적합·미채점',
      icon: AlertTriangle,
      tone: (attention > 0 ? 'warning' : 'success') as 'warning' | 'success'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => {
        const Icon = k.icon
        return (
          <div
            key={k.label}
            className="bg-card border border-border rounded-xl shadow-sm p-5 flex items-center gap-3.5 transition-shadow hover:shadow-md"
          >
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', TONE_CLASS[k.tone])}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[11px] text-muted-foreground font-medium">{k.label}</div>
              <div className="text-[26px] font-bold mt-0.5 tabular-nums">{k.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{k.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
