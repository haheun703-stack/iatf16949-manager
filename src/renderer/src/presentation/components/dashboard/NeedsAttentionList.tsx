import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useUIStore } from '../../stores/uiStore'
import { useFormStore } from '../../stores/formStore'

const REASON_STYLE: Record<string, string> = {
  부적합: 'bg-destructive/10 text-destructive',
  보완필요: 'bg-warning/10 text-warning',
  '미채점 초안': 'bg-muted text-muted-foreground'
}

export function NeedsAttentionList(): JSX.Element {
  // default OUTSIDE the selector (fresh [] inside a selector loops zustand)
  const items = useDashboardStore((s) => s.data?.needsAttention) ?? []
  const totalCount = useDashboardStore((s) => s.data?.needsAttentionCount) ?? 0
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)

  const openForm = (formCode: string): void => {
    setSelectedFormCode(formCode)
    void loadFormDefinition(formCode)
    setPage('form-builder')
  }

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6">
      <header className="flex items-baseline justify-between mb-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h2 className="text-lg font-bold tracking-tight">보완 필요 양식</h2>
        </div>
        <span className="text-[12.5px] text-muted-foreground">
          {totalCount > 0 ? `점수 낮은 순 · 총 ${totalCount}건` : ''}
        </span>
      </header>

      {items.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-success opacity-70" />
          <p className="text-[15px] font-semibold">보완이 필요한 양식이 없습니다</p>
          <p className="text-[13.5px] text-muted-foreground mt-0.5">
            양식을 작성·채점하면 80점 미만·미채점 항목이 여기에 모입니다.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border -mx-2">
          {items.map((it) => (
            <button
              key={it.formCode}
              type="button"
              onClick={() => openForm(it.formCode)}
              className="w-full text-left px-2 py-2.5 flex items-center gap-3 hover:bg-muted/50"
            >
              <span className="inline-flex items-center justify-center min-w-[72px] px-2 py-0.5 rounded text-[12.5px] font-mono font-semibold bg-muted">
                {it.formCode}
              </span>
              <span className="flex-1 text-[14.5px] break-keep leading-snug">{it.formName || it.formCode}</span>
              <span className={cn('text-[12.5px] font-semibold px-2 py-0.5 rounded', REASON_STYLE[it.reason] ?? 'bg-muted text-muted-foreground')}>
                {it.reason}
              </span>
              <span className="text-[13.5px] font-bold tabular-nums w-10 text-right">
                {it.score != null ? `${it.score}점` : '–'}
              </span>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
