import { Gauge } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDashboardStore } from '../../stores/dashboardStore'

const GRADE_TONE: Record<string, { bar: string; text: string; label: string }> = {
  A: { bar: 'bg-success', text: 'text-success', label: '우수 (90+)' },
  B: { bar: 'bg-primary', text: 'text-primary', label: '양호 (75~89)' },
  C: { bar: 'bg-warning', text: 'text-warning', label: '보완 (60~74)' },
  D: { bar: 'bg-destructive', text: 'text-destructive', label: '미흡 (60↓)' }
}

function avgTone(score: number | null): string {
  if (score == null) return 'text-muted-foreground'
  if (score >= 90) return 'text-success'
  if (score >= 75) return 'text-primary'
  if (score >= 60) return 'text-warning'
  return 'text-destructive'
}

export function ScoreDistributionPanel(): JSX.Element {
  const data = useDashboardStore((s) => s.data)
  const scored = data?.formsScored ?? 0
  const total = data?.formsTotal ?? 0
  const avg = data?.avgScore ?? null
  const dist = data?.gradeDist ?? []
  const maxCount = Math.max(1, ...dist.map((d) => d.count))

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 h-full">
      <header className="flex items-baseline justify-between mb-5">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-bold tracking-tight">AI 채점 준비도</h2>
        </div>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          채점 {scored} / 전체 {total} 양식
        </span>
      </header>

      {scored === 0 ? (
        <div className="text-center py-10">
          <Gauge className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-30" />
          <p className="text-sm font-semibold mb-1">아직 채점된 양식이 없습니다</p>
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            양식을 작성한 뒤 <span className="text-primary font-semibold">AI 채점</span>을 실행하면<br />
            여기에 실제 준비도가 집계됩니다.
          </p>
        </div>
      ) : (
        <div className="flex gap-6">
          {/* 평균 점수 */}
          <div className="flex flex-col items-center justify-center px-4 shrink-0">
            <span className={cn('text-5xl font-black tabular-nums leading-none', avgTone(avg))}>
              {avg ?? '–'}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1.5">평균 점수</span>
          </div>

          {/* 등급 분포 */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {dist.map((d) => {
              const tone = GRADE_TONE[d.grade] ?? GRADE_TONE.D
              return (
                <div key={d.grade} className="flex items-center gap-2.5">
                  <span className={cn('w-4 text-sm font-black', tone.text)}>{d.grade}</span>
                  <span className="text-[11px] text-muted-foreground w-20 shrink-0">{tone.label}</span>
                  <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', tone.bar)}
                      style={{ width: `${(d.count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold tabular-nums w-6 text-right">{d.count}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
