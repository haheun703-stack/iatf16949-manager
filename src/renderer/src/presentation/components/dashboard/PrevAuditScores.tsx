import { cn } from '../../../lib/utils'

interface DeptScore {
  dept: string
  score: number
  note?: string
}

const PREV_AUDIT: DeptScore[] = [
  { dept: '정밀강관', score: 96.8, note: '관리 양호' },
  { dept: '쇼바용접', score: 96.0, note: '관리 양호' },
  { dept: 'A/M', score: 95.5, note: '조도관리 체크시트 미흡' },
  { dept: '지원부서', score: 95.2 },
  { dept: '정밀인발', score: 94.3, note: '일부 공정 표준류 이탈' },
  { dept: '필라넥워터', score: 92.3, note: '선입선출/잔량관리/4M변경' }
]

function tone(score: number): { bar: string; text: string } {
  if (score >= 95) return { bar: 'bg-success', text: 'text-success' }
  if (score >= 93) return { bar: 'bg-primary', text: 'text-primary' }
  if (score >= 90) return { bar: 'bg-warning', text: 'text-warning' }
  return { bar: 'bg-destructive', text: 'text-destructive' }
}

export function PrevAuditScores(): JSX.Element {
  const avg = PREV_AUDIT.reduce((s, d) => s + d.score, 0) / PREV_AUDIT.length

  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full">
      <header className="mb-4">
        <h2 className="text-base font-bold">전년도 내부심사 점수</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">
          2025년 결과 · 평균{' '}
          <span className="font-semibold text-foreground tabular-nums">{avg.toFixed(1)}</span>
        </p>
      </header>

      <div className="space-y-2.5">
        {PREV_AUDIT.map((d) => {
          const t = tone(d.score)
          return (
            <div key={d.dept}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm font-medium">{d.dept}</span>
                <span className={cn('text-sm font-bold tabular-nums', t.text)}>{d.score.toFixed(1)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full', t.bar)}
                  style={{ width: `${(d.score / 100) * 100}%` }}
                />
              </div>
              {d.note && (
                <div className="text-[11px] text-muted-foreground mt-1">{d.note}</div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
