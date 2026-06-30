import { useEffect } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import {
  PPAP_ELEMENT_STATUSES,
  type PpapElementDto,
  type PpapElementStatus,
  type PpapSubmissionStatus
} from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { usePpapStore } from '../../stores/ppapStore'

const ELEMENT_STATUS_META: Record<PpapElementStatus, { label: string; chip: string; dot: string }> = {
  not_started: { label: '미착수', chip: 'bg-slate-100 text-slate-600', dot: 'bg-slate-300' },
  in_progress: { label: '진행', chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  completed: { label: '완료', chip: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  na: { label: '해당없음', chip: 'bg-slate-50 text-slate-400', dot: 'bg-slate-200' }
}

const SUBMISSION_STATUS_META: Record<PpapSubmissionStatus, { label: string; chip: string }> = {
  draft: { label: '작성중', chip: 'bg-slate-100 text-slate-600' },
  submitted: { label: '제출', chip: 'bg-blue-100 text-blue-700' },
  approved: { label: '승인', chip: 'bg-green-100 text-green-700' },
  interim: { label: '잠정승인', chip: 'bg-amber-100 text-amber-700' },
  rejected: { label: '반려', chip: 'bg-rose-100 text-rose-700' }
}

export function PpapView(): JSX.Element {
  const { submissions, selectedId, board, loading, load, select, setElementStatus } = usePpapStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-primary" />
              PPAP 양산부품승인
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              고객 양산부품 승인용 18 표준 요구사항 제출·진척 추적 (APQP Phase 4)
            </p>
          </div>

          {/* 제출 선택 */}
          {submissions.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(e) => void select(Number(e.target.value))}
              className="input-field max-w-xs text-sm"
            >
              {submissions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.partNo} · {s.partName ?? ''} {s.customer ? `(${s.customer})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 제출 헤더 정보 + 진척률 */}
        {board && (
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                Level {board.submission.level}
              </span>
              <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', SUBMISSION_STATUS_META[board.submission.status].chip)}>
                {SUBMISSION_STATUS_META[board.submission.status].label}
              </span>
            </span>
            {board.submission.customer && (
              <span className="text-xs text-muted-foreground">고객 {board.submission.customer}</span>
            )}
            <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${board.progress.percent}%` }}
                />
              </div>
              <span className="text-xs font-bold text-foreground tabular-nums">
                {board.progress.percent}%
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({board.progress.completed}/{board.progress.applicable})
              </span>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto p-6">
        {!board && !loading && (
          <div className="text-center py-20 text-muted-foreground text-sm">PPAP 제출이 없습니다.</div>
        )}
        {board && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2 w-10">#</th>
                  <th className="text-left font-semibold px-3 py-2">요구사항</th>
                  <th className="text-left font-semibold px-3 py-2 w-24">조항</th>
                  <th className="text-left font-semibold px-3 py-2 w-24">담당</th>
                  <th className="text-left font-semibold px-3 py-2 w-32">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {board.elements.map((el) => (
                  <PpapRow key={el.id} el={el} onStatus={(s) => void setElementStatus(el.id, s)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function PpapRow({
  el,
  onStatus
}: {
  el: PpapElementDto
  onStatus: (s: PpapElementStatus) => void
}): JSX.Element {
  const meta = ELEMENT_STATUS_META[el.status]
  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-3 py-2 text-muted-foreground tabular-nums">{el.seq}</td>
      <td className="px-3 py-2">
        <div className="font-medium text-foreground">{el.name}</div>
        {el.nameEn && <div className="text-[11px] text-muted-foreground">{el.nameEn}</div>}
      </td>
      <td className="px-3 py-2">
        {el.clauseId && (
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
            {el.clauseId}
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{el.teamName ?? el.teamId ?? '-'}</td>
      <td className="px-3 py-2">
        <div className="inline-flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', meta.dot)} />
          <select
            value={el.status}
            onChange={(e) => onStatus(e.target.value as PpapElementStatus)}
            className={cn('text-[11px] font-medium rounded px-1.5 py-1 border border-transparent hover:border-border cursor-pointer bg-transparent', meta.chip)}
          >
            {PPAP_ELEMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {ELEMENT_STATUS_META[s].label}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  )
}
