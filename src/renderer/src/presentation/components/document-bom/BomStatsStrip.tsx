import { useEffect } from 'react'
import { CheckCircle2, AlertTriangle, FileWarning, FilePlus2, FileText, Layers } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useBomStore } from '../../stores/bomStore'

const STATUS_META: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  '현행일치': { label: '현행일치', icon: CheckCircle2, tone: 'text-success bg-success/10' },
  '개정완료(목록표갱신필요)': { label: '갱신필요', icon: AlertTriangle, tone: 'text-warning bg-warning/10' },
  '목록표미등록(신규)': { label: '미등록(신규)', icon: FilePlus2, tone: 'text-primary bg-primary/10' },
  '파일없음(작성/수집필요)': { label: '파일없음', icon: FileWarning, tone: 'text-destructive bg-destructive/10' }
}

export function BomStatsStrip(): JSX.Element {
  const stats = useBomStore((s) => s.stats)
  const loadStats = useBomStore((s) => s.loadStats)

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  if (!stats) {
    return (
      <div className="text-sm text-muted-foreground">통계 불러오는 중...</div>
    )
  }

  const cards: { key: string; label: string; value: number; sub: string; icon: typeof CheckCircle2; tone: string }[] = [
    {
      key: 'docs', label: '전체 문서', value: stats.totalDocs,
      sub: `${stats.byCategory.map((c) => `${c.categoryLabel.replace(/^[0-9]\.\s*/, '')[0]}${c.count}`).join('·')}`,
      icon: FileText, tone: 'text-primary bg-primary/10'
    },
    {
      key: 'forms', label: '관련 양식', value: stats.totalForms,
      sub: `${stats.byFormType.find((f) => f.type === 'form')?.count || 0}건 정규형 + 변종·부표 등`,
      icon: Layers, tone: 'text-foreground bg-muted'
    }
  ]

  stats.byStatus.forEach((s) => {
    const meta = STATUS_META[s.status]
    if (meta) {
      cards.push({
        key: s.status, label: meta.label, value: s.count,
        sub: s.status, icon: meta.icon, tone: meta.tone
      })
    }
  })

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon
        return (
          <div key={c.key} className="bg-card border border-border rounded-xl shadow-sm p-3.5 flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', c.tone)}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[11px] text-muted-foreground font-medium truncate">{c.label}</div>
              <div className="text-[22px] font-bold tabular-nums">{c.value}</div>
              <div className="text-[10px] text-muted-foreground truncate" title={c.sub}>{c.sub}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
