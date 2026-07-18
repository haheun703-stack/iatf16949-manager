import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Plus, Loader2, Check, AlertTriangle } from 'lucide-react'
import { OBLIGATION_CADENCES, type ObligationCadence, type ObligationDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { useObligationStore } from '../../stores/obligationStore'
import { CADENCE_META, CATEGORY_CHIP, dueStatus } from './obligationMeta'
import { ObligationModal } from './ObligationModal'

type Filter = 'all' | ObligationCadence

export function ObligationPage(): JSX.Element {
  const { items, loading, load, openCreate, openEdit, complete } = useObligationStore()
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    void load()
  }, [load])

  // 신호등 요약 (활성 의무 기준)
  const summary = useMemo(() => {
    let overdue = 0
    let soon = 0
    for (const it of items) {
      if (!it.active) continue
      const s = dueStatus(it.nextDueDate, it.leadDays, it.active)
      if (s.tone === 'overdue') overdue++
      else if (s.tone === 'soon') soon++
    }
    return { overdue, soon }
  }, [items])

  // 주기별 그룹 (필터 반영)
  const groups = useMemo(() => {
    const cadences = filter === 'all' ? OBLIGATION_CADENCES : [filter]
    return cadences
      .map((c) => ({ cadence: c, list: items.filter((it) => it.cadence === c) }))
      .filter((g) => g.list.length > 0)
  }, [items, filter])

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <PageHeader
          icon={<CalendarClock className="w-5 h-5" />}
          title="정기 의무"
          sub={
            <>
              IATF 주기적 의무(일/주/월/분기/년) 도래 관리 · 총 {items.length}건
              {summary.overdue > 0 && (
                <span className="ml-2 text-rose-600 font-semibold inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  초과 {summary.overdue}
                </span>
              )}
              {summary.soon > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">임박 {summary.soon}</span>
              )}
            </>
          }
          actions={
            <>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={() => openCreate()}
                className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1.5 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                의무 추가
              </button>
            </>
          }
        />

        {/* 주기 필터 */}
        <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
          {(['all', ...OBLIGATION_CADENCES] as Filter[]).map((f) => {
            const active = filter === f
            const label = f === 'all' ? '전체' : CADENCE_META[f].label
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  'text-[13px] font-semibold px-3 py-1.5 rounded-md transition-colors',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6">
        {!loading && items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            등록된 정기 의무가 없습니다. 우측 상단 “의무 추가”로 시작하세요.
          </div>
        )}

        {groups.map((g) => (
          <section key={g.cadence}>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn('w-1.5 h-4 rounded-full', CADENCE_META[g.cadence].bar)} />
              <h2 className="text-[19px] font-extrabold text-foreground">{CADENCE_META[g.cadence].label}</h2>
              <span className="text-[13px] text-muted-foreground">{CADENCE_META[g.cadence].desc} · {g.list.length}건</span>
            </div>
            <div className="rounded-lg border border-border bg-card divide-y divide-border overflow-hidden">
              {g.list.map((it) => (
                <ObligationRow key={it.id} item={it} onEdit={() => openEdit(it)} onComplete={() => void complete(it.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <ObligationModal />
    </div>
  )
}

function ObligationRow({
  item,
  onEdit,
  onComplete
}: {
  item: ObligationDto
  onEdit: () => void
  onComplete: () => void
}): JSX.Element {
  const sig = dueStatus(item.nextDueDate, item.leadDays, item.active)
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors', !item.active && 'opacity-55')}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', sig.dot)} title={sig.text} />

      <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[15px] font-semibold text-foreground break-keep leading-snug">{item.title}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', CATEGORY_CHIP[item.category])}>
            {item.category}
          </span>
          {item.clauseRef && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
              {item.clauseRef}
            </span>
          )}
        </div>
        <div className="text-[13px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
          {item.owner && <span>{item.owner}</span>}
          {item.nextDueDate && <span>도래 {item.nextDueDate}</span>}
          {item.lastDoneDate && <span className="text-foreground/50">최근이행 {item.lastDoneDate}</span>}
        </div>
      </button>

      <span className={cn('text-[13px] shrink-0 w-20 text-right', sig.textTone)}>{sig.text}</span>

      <button
        type="button"
        onClick={onComplete}
        disabled={!item.active}
        title="이행 완료 — 오늘 처리하고 다음 도래일로 전진"
        className="shrink-0 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-green-50 hover:text-green-700 hover:border-green-300 disabled:opacity-40 flex items-center gap-1 transition-colors"
      >
        <Check className="w-3 h-3" />
        이행
      </button>
    </div>
  )
}
