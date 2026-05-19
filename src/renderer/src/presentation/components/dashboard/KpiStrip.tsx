import { CheckCircle2, AlertCircle, FileWarning, TrendingUp } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface Kpi {
  label: string
  value: string
  sub: string
  icon: typeof CheckCircle2
  tone: 'primary' | 'success' | 'warning' | 'destructive'
}

const KPIS: Kpi[] = [
  { label: '전체 준비도', value: '74%', sub: '60 / 81 항목', icon: TrendingUp, tone: 'primary' },
  { label: '완료', value: '60', sub: '전 영역 합계', icon: CheckCircle2, tone: 'success' },
  { label: '진행 중', value: '15', sub: '14일 이내 마감', icon: AlertCircle, tone: 'warning' },
  { label: '미착수', value: '6', sub: '긴급 점검 필요', icon: FileWarning, tone: 'destructive' }
]

const TONE_CLASS: Record<Kpi['tone'], string> = {
  primary: 'text-primary bg-primary/10',
  success: 'text-success bg-success/10',
  warning: 'text-warning bg-warning/10',
  destructive: 'text-destructive bg-destructive/10'
}

export function KpiStrip(): JSX.Element {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {KPIS.map((k) => {
        const Icon = k.icon
        return (
          <div
            key={k.label}
            className="bg-card border border-border rounded-lg p-4 flex items-center gap-3"
          >
            <div className={cn('w-10 h-10 rounded-md flex items-center justify-center', TONE_CLASS[k.tone])}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="text-[11px] text-muted-foreground font-medium">{k.label}</div>
              <div className="text-2xl font-bold mt-0.5">{k.value}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{k.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
