import { AlertTriangle, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'

interface CritItem {
  code: string
  title: string
  clause: string
  due: string
  daysLeft: number
  formCode?: string
}

const ITEMS: CritItem[] = [
  { code: 'A5100-02', title: '내부심사 실시 계획서 작성', clause: '9.2', due: '2026.05.25', daysLeft: 6, formCode: 'A5100-02' },
  { code: 'J-1101', title: 'FMEA 4판 갱신 (인발 공정)', clause: '8.3', due: '2026.05.28', daysLeft: 9 },
  { code: 'B2100-12', title: '유효성 검증 체크시트 — NCR-2026-0042', clause: '10.2', due: '2026.05.30', daysLeft: 11 },
  { code: 'F-2100', title: '교육훈련 계획서 미작성', clause: '7.2', due: '2026.06.01', daysLeft: 13 },
  { code: 'MP-02', title: 'SWOT 분석표 갱신', clause: '6.1', due: '2026.06.05', daysLeft: 17 }
]

function daysTone(n: number): string {
  if (n <= 7) return 'text-destructive'
  if (n <= 14) return 'text-warning'
  return 'text-muted-foreground'
}

export function CriticalItemsList(): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)

  const openForm = (formCode?: string): void => {
    if (!formCode) return
    setSelectedFormCode(formCode)
    setPage('form-builder')
  }

  return (
    <section className="bg-card border border-border rounded-lg p-5">
      <header className="flex items-baseline justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-warning" />
          <h2 className="text-base font-bold">긴급 점검 항목</h2>
        </div>
        <span className="text-[11px] text-muted-foreground">마감 임박순</span>
      </header>

      <div className="divide-y divide-border -mx-2">
        {ITEMS.map((it) => (
          <button
            key={it.code}
            type="button"
            onClick={() => openForm(it.formCode)}
            disabled={!it.formCode}
            className={cn(
              'w-full text-left px-2 py-2.5 flex items-center gap-3',
              it.formCode ? 'hover:bg-muted/50' : 'cursor-default'
            )}
          >
            <span className="inline-flex items-center justify-center min-w-[64px] px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-muted">
              {it.code}
            </span>
            <span className="flex-1 text-sm truncate">{it.title}</span>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              §{it.clause}
            </span>
            <span className="text-[11px] text-muted-foreground tabular-nums">{it.due}</span>
            <span className={cn('text-xs font-bold tabular-nums w-12 text-right', daysTone(it.daysLeft))}>
              D-{it.daysLeft}
            </span>
            <ChevronRight
              className={cn(
                'w-4 h-4 shrink-0',
                it.formCode ? 'text-muted-foreground' : 'text-transparent'
              )}
            />
          </button>
        ))}
      </div>
    </section>
  )
}
