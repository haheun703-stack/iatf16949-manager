import { useEffect } from 'react'
import { CalendarDays, LayoutGrid, CalendarRange, Plus, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { useScheduleStore, type ScheduleView } from '../../stores/scheduleStore'
import { BoardView } from './BoardView'
import { CalendarView } from './CalendarView'
import { TimelineView } from './TimelineView'
import { ScheduleItemModal } from './ScheduleItemModal'

const VIEWS: { id: ScheduleView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'calendar', label: '캘린더', icon: CalendarDays },
  { id: 'board', label: '보드', icon: LayoutGrid },
  { id: 'timeline', label: '타임라인', icon: CalendarRange }
]

export function SchedulePage(): JSX.Element {
  const { view, setView, load, loading, items, openCreate } = useScheduleStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <PageHeader
          title="일정표"
          sub={`심사·내부심사·교육·시정조치 일정을 캘린더/보드/타임라인으로 관리 · 총 ${items.length}건`}
          actions={
            <>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={() => openCreate()}
                className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1.5 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                일정 추가
              </button>
            </>
          }
        />

        {/* View switcher */}
        <div className="mt-4 inline-flex items-center gap-1 p-1 rounded-lg bg-muted">
          {VIEWS.map((v) => {
            const Icon = v.icon
            const active = view === v.id
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setView(v.id)}
                className={cn(
                  'text-[13px] font-semibold px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {v.label}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex-1 min-h-0 p-6">
        {view === 'board' && <BoardView />}
        {view === 'calendar' && <CalendarView />}
        {view === 'timeline' && <TimelineView />}
      </div>

      <ScheduleItemModal />
    </div>
  )
}
