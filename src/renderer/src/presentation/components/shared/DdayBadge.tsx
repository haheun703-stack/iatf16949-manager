import { CalendarClock } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDday } from '../../hooks/useDday'

export function DdayBadge(): JSX.Element {
  const { dday, auditDate } = useDday()

  const color =
    dday <= 7
      ? 'bg-destructive text-destructive-foreground'
      : dday <= 14
        ? 'bg-warning text-white'
        : dday <= 30
          ? 'bg-primary text-primary-foreground'
          : 'bg-success text-white'

  const auditDateStr = `${auditDate.getFullYear()}.${String(auditDate.getMonth() + 1).padStart(2, '0')}.${String(auditDate.getDate()).padStart(2, '0')}`

  return (
    <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold', color)}>
      <CalendarClock className="w-4 h-4" />
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg leading-none">{dday >= 0 ? 'D-' : 'D+'}{Math.abs(dday)}</span>
        <span className="text-xs opacity-90">심사 {auditDateStr}</span>
      </div>
    </div>
  )
}
