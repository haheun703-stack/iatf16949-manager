import { History, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useUIStore } from '../../stores/uiStore'
import { useFormStore } from '../../stores/formStore'

function scoreTone(score: number): string {
  if (score >= 90) return 'text-success'
  if (score >= 75) return 'text-primary'
  if (score >= 60) return 'text-warning'
  return 'text-destructive'
}

export function RecentScoresPanel(): JSX.Element {
  // NOTE: default OUTSIDE the selector — returning a fresh [] inside the
  // selector makes zustand see a new snapshot every render → infinite loop.
  const recent = useDashboardStore((s) => s.data?.recentScores) ?? []
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)

  const openForm = (formCode: string): void => {
    setSelectedFormCode(formCode)
    void loadFormDefinition(formCode)
    setPage('form-builder')
  }

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 h-full">
      <header className="flex items-center gap-2 mb-5">
        <History className="w-4 h-4 text-primary" />
        <h2 className="text-lg font-bold tracking-tight">최근 AI 채점</h2>
      </header>

      {recent.length === 0 ? (
        <div className="text-center py-10 text-[13.5px] text-muted-foreground leading-relaxed">
          최근 채점 이력이 없습니다.<br />양식에서 AI 채점을 실행해 보세요.
        </div>
      ) : (
        <div className="space-y-1.5">
          {recent.map((r) => (
            <button
              key={`${r.formCode}-${r.scoredAt}`}
              type="button"
              onClick={() => openForm(r.formCode)}
              className="w-full text-left p-2.5 rounded-md hover:bg-muted/50 transition-colors flex items-center gap-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{r.formName || r.formCode}</div>
                <div className="text-[12.5px] text-muted-foreground font-mono">{r.formCode}</div>
              </div>
              <span className={cn('text-lg font-black tabular-nums', scoreTone(r.score))}>
                {r.score}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
