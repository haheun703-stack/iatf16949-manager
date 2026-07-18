import type { ReactNode } from 'react'
import { cn } from '../../../../lib/utils'
import { useUIStore } from '../../../stores/uiStore'
import { useAiAuthorStore } from '../../../stores/aiAuthorStore'
import type { DailyBoardDto } from '@shared/ipc-types'

function Pill({ tone, children }: { tone: 'crit' | 'warn' | 'info'; children: ReactNode }): JSX.Element {
  const cls =
    tone === 'crit'
      ? 'bg-red-100 text-red-600'
      : tone === 'warn'
        ? 'bg-amber-100 text-amber-700'
        : 'bg-sky-100 text-sky-700'
  return <span className={cn('text-[13.5px] font-extrabold px-2 py-[2px] rounded-full whitespace-nowrap', cls)}>{children}</span>
}

// span+role=button — 칩 내부에 실제 <button>(AI 초안)이 들어갈 수 있어 button 중첩 금지
function Chip({ onClick, children }: { onClick?: () => void; children: ReactNode }): JSX.Element {
  return (
    <span
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={cn(
        'flex items-center gap-1.5 text-[14.5px] font-semibold text-muted-foreground border border-border rounded-lg px-3 py-2.5 bg-muted/40',
        onClick && 'hover:border-primary/40 hover:text-foreground transition-colors cursor-pointer'
      )}
    >
      {children}
    </span>
  )
}

/**
 * 오늘 할 일 스트립 — C2 브리핑의 생성물 자리.
 * 칩 = 결정론 룰(연체·임박·최고배점 미충족·이어쓰기), ✦ = AI 브리핑 연결.
 */
export function TodoStrip({
  board,
  onOpenAiFold
}: {
  board: DailyBoardDto
  onOpenAiFold: () => void
}): JSX.Element | null {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setPendingSubmissionId = useUIStore((s) => s.setPendingSubmissionId)
  const openAuthor = useAiAuthorStore((s) => s.setOpen)

  const topRed = board.sqRed[0]
  const nextDue = board.dueSoon[0]
  const firstDraft = board.drafts[0]
  const isEmpty =
    board.overdue.length === 0 && !nextDue && !topRed && board.drafts.length === 0

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm px-5 py-3 flex items-center gap-2.5 flex-wrap">
      <span className="text-[16.5px] font-extrabold mr-1">오늘 할 일</span>
      <button
        type="button"
        onClick={onOpenAiFold}
        className="text-[14px] font-bold text-sky-600 hover:underline mr-1"
        title="AI 브리핑 열기"
      >
        ✦ 브리핑이 매일 아침 우선순위로 정렬
      </button>

      {isEmpty && <span className="text-[14.5px] text-emerald-600 font-semibold">오늘 도래 항목 없음 ✓</span>}

      {board.overdue.length > 0 && (
        <Chip onClick={() => setPage('obligations')}>
          <Pill tone="crit">연체</Pill> 정기 의무 {board.overdue.length}건 처리
        </Chip>
      )}
      {nextDue && (
        <Chip onClick={() => setPage('obligations')}>
          <Pill tone="warn">임박</Pill> {nextDue.title} D-{nextDue.daysLeft}
        </Chip>
      )}
      {topRed && (
        <Chip onClick={() => setPage('sq-readiness')}>
          <Pill tone="crit">{topRed.points}점</Pill> {topRed.code} {topRed.title} 착수
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              openAuthor(true)
            }}
            className="text-[13px] font-extrabold px-2 py-[2px] rounded-full bg-sky-100 text-sky-700 border border-transparent hover:border-sky-500"
          >
            AI 초안 ›
          </button>
        </Chip>
      )}
      {firstDraft && (
        <Chip
          onClick={() => {
            setSelectedFormCode(firstDraft.formCode)
            setPendingSubmissionId(firstDraft.submissionId)
            setPage('form-builder')
          }}
        >
          <Pill tone="info">이어쓰기</Pill> 초안 {board.drafts.length}건 ({firstDraft.formCode}
          {board.drafts.length > 1 ? ' 외' : ''})
        </Chip>
      )}
    </div>
  )
}
