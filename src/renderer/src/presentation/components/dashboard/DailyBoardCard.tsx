import { useEffect, useState } from 'react'
import { CalendarClock, ShieldAlert, PencilLine, ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import type { DailyBoardDto } from '@shared/ipc-types'

/**
 * 오늘 할 일 — 매일 관리 보드.
 * ① 정기 의무 도래(연체🔴/임박🟡) ② SQ 미충족 중 작성으로 해결 가능한 항목 ③ 작성중 초안 이어쓰기.
 * 클릭 시 해당 화면으로 바로 이동.
 */
export function DailyBoardCard(): JSX.Element | null {
  const [data, setData] = useState<DailyBoardDto | null>(null)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setPendingSubmissionId = useUIStore((s) => s.setPendingSubmissionId)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.DAILY_BOARD)) as DailyBoardDto
        if (alive) setData(res)
      } catch {
        if (alive) setData({ overdue: [], dueSoon: [], sqRed: [], drafts: [] })
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!data) return null
  const totalCount = data.overdue.length + data.dueSoon.length + data.sqRed.length + data.drafts.length

  const openDraft = (submissionId: number, formCode: string): void => {
    setSelectedFormCode(formCode)
    setPendingSubmissionId(submissionId)
    setPage('form-builder')
  }

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold">오늘 할 일</h2>
        <span className="text-[11px] text-muted-foreground">매일 작성·관리 항목</span>
        {totalCount === 0 && (
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" /> 오늘 도래 항목 없음
          </span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* ① 정기 의무 */}
          <Column
            title="정기 의무 도래"
            icon={<CalendarClock className="w-3.5 h-3.5" />}
            count={data.overdue.length + data.dueSoon.length}
            emptyText="도래한 의무 없음"
          >
            {[...data.overdue, ...data.dueSoon].slice(0, 5).map((o) => (
              <Item
                key={o.id}
                onClick={() => setPage('obligations')}
                left={
                  <span
                    className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 tabular-nums',
                      o.daysLeft < 0
                        ? 'bg-rose-100 text-rose-700'
                        : o.daysLeft === 0
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {o.daysLeft < 0 ? `${-o.daysLeft}일 연체` : o.daysLeft === 0 ? '오늘' : `D-${o.daysLeft}`}
                  </span>
                }
                main={o.title}
                sub={`${o.cadence} · ${o.owner ?? '담당 미정'}`}
              />
            ))}
          </Column>

          {/* ② SQ 미충족 */}
          <Column
            title="SQ 미충족 — 작성 필요"
            icon={<ShieldAlert className="w-3.5 h-3.5" />}
            count={data.sqRed.length}
            emptyText="미충족 항목 없음"
          >
            {data.sqRed.slice(0, 5).map((s) => (
              <Item
                key={s.code}
                onClick={() => setPage('sq-readiness')}
                left={
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700 shrink-0 tabular-nums">
                    {s.points}점
                  </span>
                }
                main={s.title}
                sub={`${s.categoryName} · 양식 ${s.formCount}종 작성 가능`}
              />
            ))}
          </Column>

          {/* ③ 이어쓰기 */}
          <Column
            title="작성 중 — 이어쓰기"
            icon={<PencilLine className="w-3.5 h-3.5" />}
            count={data.drafts.length}
            emptyText="작성 중 초안 없음"
          >
            {data.drafts.slice(0, 5).map((d) => (
              <Item
                key={d.submissionId}
                onClick={() => openDraft(d.submissionId, d.formCode)}
                left={
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                    {d.formCode}
                  </span>
                }
                main={d.formName}
                sub={d.serialNo ?? d.updatedAt.slice(0, 10)}
              />
            ))}
          </Column>
        </div>
      )}
    </div>
  )
}

function Column({
  title,
  icon,
  count,
  emptyText,
  children
}: {
  title: string
  icon: React.ReactNode
  count: number
  emptyText: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-2">
        {icon}
        {title}
        <span
          className={cn(
            'ml-auto tabular-nums font-bold px-1.5 py-0.5 rounded-full text-[10px]',
            count > 0 ? 'bg-rose-100 text-rose-700' : 'bg-muted text-muted-foreground'
          )}
        >
          {count}
        </span>
      </div>
      {count === 0 ? (
        <p className="text-[11.5px] text-muted-foreground/60 py-2">{emptyText}</p>
      ) : (
        <ul className="space-y-1">{children}</ul>
      )}
    </div>
  )
}

function Item({
  left,
  main,
  sub,
  onClick
}: {
  left: React.ReactNode
  main: string
  sub: string
  onClick: () => void
}): JSX.Element {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="group w-full text-left flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted transition-colors"
      >
        {left}
        <span className="min-w-0 flex-1">
          <span className="block text-[12px] font-medium truncate">{main}</span>
          <span className="block text-[10.5px] text-muted-foreground truncate">{sub}</span>
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-primary shrink-0" />
      </button>
    </li>
  )
}
