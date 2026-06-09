import { useState } from 'react'
import { Plus, User } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { SCHEDULE_STATUSES, type ScheduleItemDto, type ScheduleStatus } from '@shared/ipc-types'
import { useScheduleStore } from '../../stores/scheduleStore'
import { STATUS_META, CATEGORY_CHIP, PRIORITY_DOT, ddayLabel } from './scheduleMeta'

export function BoardView(): JSX.Element {
  const items = useScheduleStore((s) => s.items)
  const setStatus = useScheduleStore((s) => s.setStatus)
  const openEdit = useScheduleStore((s) => s.openEdit)
  const openCreate = useScheduleStore((s) => s.openCreate)
  const [dragId, setDragId] = useState<number | null>(null)
  const [overCol, setOverCol] = useState<ScheduleStatus | null>(null)

  const handleDrop = (status: ScheduleStatus): void => {
    if (dragId != null) void setStatus(dragId, status)
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="h-full overflow-x-auto">
      <div className="flex gap-4 h-full min-w-max pb-2">
        {SCHEDULE_STATUSES.map((status) => {
          const colItems = items.filter((it) => it.status === status)
          const meta = STATUS_META[status]
          return (
            <div
              key={status}
              onDragOver={(e) => {
                e.preventDefault()
                setOverCol(status)
              }}
              onDragLeave={() => setOverCol((c) => (c === status ? null : c))}
              onDrop={() => handleDrop(status)}
              className={cn(
                'w-[300px] shrink-0 flex flex-col rounded-lg border bg-muted/30 transition-colors',
                overCol === status ? 'border-primary bg-primary/5' : 'border-border'
              )}
            >
              <div className="px-3 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
                  <span className={cn('text-sm font-bold', meta.head)}>{status}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">{colItems.length}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openCreate({ status })}
                  className="w-6 h-6 rounded hover:bg-muted flex items-center justify-center text-muted-foreground"
                  title="이 상태로 일정 추가"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                {colItems.map((it) => (
                  <Card
                    key={it.id}
                    item={it}
                    onClick={() => openEdit(it)}
                    onDragStart={() => setDragId(it.id)}
                    onDragEnd={() => setDragId(null)}
                    dragging={dragId === it.id}
                  />
                ))}
                {colItems.length === 0 && (
                  <div className="text-[11px] text-muted-foreground text-center py-6 border border-dashed border-border rounded-md">
                    여기로 카드를 드래그
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Card({
  item,
  onClick,
  onDragStart,
  onDragEnd,
  dragging
}: {
  item: ScheduleItemDto
  onClick: () => void
  onDragStart: () => void
  onDragEnd: () => void
  dragging: boolean
}): JSX.Element {
  const dd = ddayLabel(item.dueDate)
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={cn(
        'bg-card border border-border rounded-md p-2.5 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all',
        dragging && 'opacity-40'
      )}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded', CATEGORY_CHIP[item.category])}>
          {item.category}
        </span>
        <span className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[item.priority])} title={`우선순위 ${item.priority}`} />
      </div>
      <div className="text-sm font-medium leading-snug mb-2">{item.title}</div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          {item.owner && (
            <>
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{item.owner}</span>
            </>
          )}
        </span>
        {dd && <span className={cn('tabular-nums shrink-0', dd.tone)}>{dd.text}</span>}
      </div>
    </div>
  )
}
