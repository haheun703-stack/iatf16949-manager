import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Plus, Loader2, Check, AlertTriangle, Network, RotateCcw, ListChecks, Clock, PauseCircle } from 'lucide-react'
import { OBLIGATION_CADENCES, type ObligationCadence, type ObligationDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { traceDeepLink } from '../../../lib/deeplink'
import { useUIStore } from '../../stores/uiStore'
import { PageHeader } from '../shared/PageHeader'
import { StatBand, StatTile, SearchBar, FilterSelect, ListShell, GroupLabel, EmptyResult } from '../shared/list/ListKit'
import { useObligationStore } from '../../stores/obligationStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { CADENCE_META, CATEGORY_CHIP, dueStatus } from './obligationMeta'
import { ObligationModal } from './ObligationModal'

type Cadence = 'all' | ObligationCadence
type Quick = 'all' | 'overdue' | 'soon' | 'inactive'

/**
 * 정기 의무 — IATF 주기적 의무(일/주/월/분기/반기/년) 도래 관리.
 * 템플릿 B(19번): 숫자 밴드(클릭=필터) → 검색·주기 필터 → 주기별 그룹 행 리스트. 등록·편집은 행 액션(모달).
 */
export function ObligationPage(): JSX.Element {
  const { items, loading, load, openCreate, openEdit, complete, resetDueDates } = useObligationStore()
  const [cadence, setCadence] = useState<Cadence>('all')
  const [quick, setQuick] = useState<Quick>('all')
  const [q, setQ] = useState('')
  const [resetting, setResetting] = useState(false)
  // 도래일 재설정은 관리자 액션 — executive/manager 만 노출(§0.7 ④)
  const users = useActiveUserStore((s) => s.users)
  const activeUserId = useActiveUserStore((s) => s.activeUserId)
  const currentUser = users.find((u) => u.id === activeUserId) ?? null
  const canReset = currentUser?.role === 'executive' || currentUser?.role === 'manager'

  useEffect(() => {
    void load()
  }, [load])

  const handleReset = async (): Promise<void> => {
    const ok = window.confirm(
      '가동 개시일 재설정\n\n' +
        '모든 정기 의무의 도래일을 오늘로 맞춥니다. 과거 연체 표시가 사라지고 오늘부터 관리가 시작됩니다.\n' +
        '※ 데이터 조작이 아니라 이 프로그램의 실사용 개시일 설정입니다(완료 이력은 보존).\n\n계속할까요?'
    )
    if (!ok) return
    setResetting(true)
    try {
      const count = await resetDueDates(currentUser?.name)
      window.alert(`도래일을 오늘로 재설정했습니다 — 대상 ${count}건. 오늘부터 관리가 시작됩니다.`)
    } finally {
      setResetting(false)
    }
  }

  // 신호등 요약 (활성 의무 기준)
  const totals = useMemo(() => {
    let overdue = 0
    let soon = 0
    let inactive = 0
    for (const it of items) {
      if (!it.active) {
        inactive++
        continue
      }
      const s = dueStatus(it.nextDueDate, it.leadDays, it.active)
      if (s.tone === 'overdue') overdue++
      else if (s.tone === 'soon') soon++
    }
    return { all: items.length, overdue, soon, inactive }
  }, [items])

  // 주기별 그룹 (숫자밴드·검색·주기 필터 반영)
  const groups = useMemo(() => {
    const kw = q.trim().toLowerCase()
    let list = items
    if (quick === 'inactive') list = list.filter((it) => !it.active)
    else if (quick !== 'all')
      list = list.filter((it) => it.active && dueStatus(it.nextDueDate, it.leadDays, it.active).tone === quick)
    if (kw)
      list = list.filter(
        (it) =>
          it.title.toLowerCase().includes(kw) ||
          (it.owner ?? '').toLowerCase().includes(kw) ||
          (it.clauseRef ?? '').toLowerCase().includes(kw)
      )
    const cadences = cadence === 'all' ? OBLIGATION_CADENCES : [cadence]
    return cadences
      .map((c) => ({ cadence: c, list: list.filter((it) => it.cadence === c) }))
      .filter((g) => g.list.length > 0)
  }, [items, cadence, quick, q])

  const resetFilters = (): void => {
    setCadence('all')
    setQuick('all')
    setQ('')
  }

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        icon={<CalendarClock className="w-5 h-5" />}
        title="정기 의무"
        sub={`IATF 주기적 의무(일/주/월/분기/반기/년) 도래 관리 · 총 ${items.length}건`}
        actions={
          <>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            {canReset && (
              <button
                type="button"
                onClick={() => void handleReset()}
                disabled={resetting}
                title="가동 개시일 재설정 — 모든 도래일을 오늘로(실사용 개시, 데이터 조작 아님)"
                className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-border text-foreground hover:bg-muted flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {resetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                도래일 재설정
              </button>
            )}
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

      {/* ① 숫자 요약 밴드 — 클릭 = 필터 점프 */}
      <StatBand>
        <StatTile
          label="전체 의무"
          value={totals.all}
          icon={<ListChecks className="w-[18px] h-[18px]" />}
          active={quick === 'all'}
          onClick={() => setQuick('all')}
        />
        <StatTile
          label="도래 초과"
          value={totals.overdue}
          icon={<AlertTriangle className="w-[18px] h-[18px]" />}
          tone={totals.overdue > 0 ? 'bad' : 'muted'}
          active={quick === 'overdue'}
          onClick={() => setQuick('overdue')}
        />
        <StatTile
          label="임박 (리드타임 내)"
          value={totals.soon}
          icon={<Clock className="w-[18px] h-[18px]" />}
          tone={totals.soon > 0 ? 'warn' : 'muted'}
          active={quick === 'soon'}
          onClick={() => setQuick('soon')}
        />
        <StatTile
          label="비활성"
          value={totals.inactive}
          icon={<PauseCircle className="w-[18px] h-[18px]" />}
          active={quick === 'inactive'}
          onClick={() => setQuick('inactive')}
        />
      </StatBand>

      {/* ② 검색 + 주기 필터 */}
      <SearchBar value={q} onChange={setQ} placeholder="의무명·담당자·조항 검색">
        <FilterSelect
          value={cadence}
          onChange={setCadence}
          options={[
            { value: 'all' as Cadence, label: '주기 · 전체' },
            ...OBLIGATION_CADENCES.map((c) => ({ value: c as Cadence, label: CADENCE_META[c].label }))
          ]}
        />
      </SearchBar>

      {/* ③ 주기별 그룹 행 리스트 */}
      {!loading && items.length === 0 ? (
        <EmptyResult message="등록된 정기 의무가 없습니다. 우측 상단 “의무 추가”로 시작하세요." />
      ) : groups.length === 0 ? (
        <EmptyResult message="조건에 맞는 의무가 없습니다." onReset={resetFilters} />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.cadence}>
              <GroupLabel
                bar={CADENCE_META[g.cadence].bar}
                title={CADENCE_META[g.cadence].label}
                cap={`${CADENCE_META[g.cadence].desc} · ${g.list.length}건`}
              />
              <ListShell>
                <div className="divide-y divide-border">
                  {g.list.map((it) => (
                    <ObligationRow
                      key={it.id}
                      item={it}
                      onEdit={() => openEdit(it)}
                      onComplete={() => void complete(it.id)}
                    />
                  ))}
                </div>
              </ListShell>
            </section>
          ))}
        </div>
      )}

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
  const setPage = useUIStore((s) => s.setPage)
  const link = traceDeepLink(item.title)
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors', !item.active && 'opacity-55')}>
      <span className={cn('w-2 h-2 rounded-full shrink-0', sig.dot)} title={sig.text} />

      <button type="button" onClick={onEdit} className="flex-1 min-w-0 text-left">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-foreground break-keep leading-snug">{item.title}</span>
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0', CATEGORY_CHIP[item.category])}>
            {item.category}
          </span>
          {item.clauseRef && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono shrink-0">
              {item.clauseRef}
            </span>
          )}
        </div>
        <div className="text-[12px] text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
          {item.owner && <span>{item.owner}</span>}
          {item.nextDueDate && <span>도래 {item.nextDueDate}</span>}
          {item.lastDoneDate && <span className="text-foreground/50">최근이행 {item.lastDoneDate}</span>}
        </div>
      </button>

      <span className={cn('text-[13px] shrink-0 w-20 text-right', sig.textTone)}>{sig.text}</span>

      {link && (
        <button
          type="button"
          onClick={() => setPage(link.page)}
          title={link.hint}
          className="shrink-0 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md text-primary hover:bg-primary/10 flex items-center gap-1 transition-colors"
        >
          <Network className="w-3 h-3" />
          {link.label}
        </button>
      )}

      <button
        type="button"
        onClick={onComplete}
        disabled={!item.active}
        title="이행 완료 — 오늘 처리하고 다음 도래일로 전진"
        className="shrink-0 text-[12.5px] font-semibold px-2.5 py-1.5 rounded-md border border-border text-foreground hover:bg-ok-tint hover:text-ok-ink hover:border-ok-ink/30 disabled:opacity-40 flex items-center gap-1 transition-colors"
      >
        <Check className="w-3 h-3" />
        이행
      </button>
    </div>
  )
}
