import { cn } from '../../../lib/utils'

interface Area {
  area: string
  clause: string
  items: number
  done: number
  critical: string
}

const AUDIT_PREP: Area[] = [
  { area: '경영관리', clause: '5', items: 8, done: 6, critical: '경영검토 보고서 미완성' },
  { area: '기획/리스크', clause: '6', items: 10, done: 8, critical: 'SWOT 분석표 갱신 필요' },
  { area: '지원/교육', clause: '7', items: 15, done: 11, critical: '교육훈련 계획서 미작성' },
  { area: '운용/개발', clause: '8', items: 22, done: 18, critical: 'FMEA 4판 미갱신 2건' },
  { area: '성과평가', clause: '9', items: 12, done: 7, critical: '내부심사 계획서 미작성' },
  { area: '개선', clause: '10', items: 14, done: 10, critical: '유효성 검증 3건 미완료' }
]

function pct(done: number, total: number): number {
  return Math.round((done / total) * 100)
}

function progressTone(p: number): string {
  if (p >= 90) return 'bg-success'
  if (p >= 70) return 'bg-primary'
  if (p >= 50) return 'bg-warning'
  return 'bg-destructive'
}

export function AuditReadinessPanel(): JSX.Element {
  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <header className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-base font-bold">IATF 조항별 준비 현황</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">
            클릭하면 해당 조항의 미완료 항목으로 이동합니다
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground">총 81개 항목</div>
      </header>

      <div className="space-y-3">
        {AUDIT_PREP.map((a) => {
          const p = pct(a.done, a.items)
          return (
            <button
              key={a.clause}
              type="button"
              className="w-full text-left p-3 rounded-md border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-baseline justify-between mb-1.5">
                <div className="flex items-baseline gap-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded text-[11px] font-bold bg-muted text-foreground">
                    {a.clause}
                  </span>
                  <span className="font-semibold text-sm">{a.area}</span>
                </div>
                <div className="text-[12px] font-semibold tabular-nums">
                  {a.done} / {a.items}
                  <span className="ml-2 text-muted-foreground">({p}%)</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full transition-all', progressTone(p))}
                  style={{ width: `${p}%` }}
                />
              </div>
              <div className="text-[11px] text-destructive mt-1.5 truncate">
                ⚠ {a.critical}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}
