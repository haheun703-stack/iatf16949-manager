import { useEffect } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import {
  PPAP_ELEMENT_STATUSES,
  type PpapElementDto,
  type PpapElementStatus,
  type PpapSubmissionDto,
  type PpapSubmissionStatus
} from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { usePpapStore } from '../../stores/ppapStore'

const ELEMENT_STATUS_META: Record<PpapElementStatus, { label: string; chip: string; dot: string }> = {
  not_started: { label: '미착수', chip: 'bg-muted text-muted-foreground', dot: 'bg-[#C7CCD3]' },
  in_progress: { label: '진행', chip: 'bg-warn-tint text-warn-ink', dot: 'bg-warn-ink' },
  completed: { label: '완료', chip: 'bg-ok-tint text-ok-ink', dot: 'bg-ok-ink' },
  na: { label: '해당없음', chip: 'bg-muted/60 text-faint', dot: 'bg-[#E3E6EA]' }
}

const SUBMISSION_STATUS_META: Record<PpapSubmissionStatus, { label: string; chip: string }> = {
  draft: { label: '작성중', chip: 'bg-muted text-muted-foreground' },
  submitted: { label: '제출', chip: 'bg-primary/10 text-primary' },
  approved: { label: '승인', chip: 'bg-ok-tint text-ok-ink' },
  interim: { label: '잠정승인', chip: 'bg-warn-tint text-warn-ink' },
  rejected: { label: '반려', chip: 'bg-bad-tint text-bad-ink' }
}

/**
 * PPAP 양산부품승인 — 고객 제출 단위(품번) × 18 표준 요구사항 진척 (APQP Phase 4).
 * 템플릿 C: 좌 제출 목록 380px / 우 18요구사항 보드. 스토어가 첫 제출을 자동 선택한다(공백 금지).
 */
export function PpapView(): JSX.Element {
  const { submissions, selectedId, board, loading, load, select, setElementStatus } = usePpapStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<ClipboardCheck className="w-5 h-5" />}
          title="PPAP 양산부품승인"
          sub={`고객 양산부품 승인용 18 표준 요구사항 제출·진척 추적 (APQP Phase 4) · 제출 ${submissions.length}건`}
          actions={loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : undefined}
        />
      </div>

      {/* 템플릿 C (19번): 좌 제출 목록 380px 고정 / 우 요구사항 보드 */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {submissions.length === 0 && !loading && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              PPAP 제출이 없습니다.
              <br />
              <span className="text-[11px]">양산 승인 대상 품번이 생기면 여기서 추적합니다.</span>
            </div>
          )}
          {submissions.map((s) => (
            <SubmissionCard key={s.id} s={s} active={s.id === selectedId} onPick={() => void select(s.id)} />
          ))}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto">
          {board ? (
            <div className="grid gap-3">
              {/* 제출 정보 + 진척 스트립 */}
              <div className="bg-card border border-border rounded-[14px] shadow-card px-[18px] py-3 flex items-center gap-x-4 gap-y-2 flex-wrap">
                <span className="font-mono text-[15px] font-bold tabular-nums">{board.submission.partNo}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  Level {board.submission.level}
                </span>
                <span
                  className={cn(
                    'text-[11px] px-2 py-0.5 rounded-full font-bold',
                    SUBMISSION_STATUS_META[board.submission.status].chip
                  )}
                >
                  {SUBMISSION_STATUS_META[board.submission.status].label}
                </span>
                {board.submission.customer && (
                  <span className="text-xs text-muted-foreground">고객 {board.submission.customer}</span>
                )}
                {board.submission.submittedDate && (
                  <span className="text-xs text-muted-foreground">제출일 {board.submission.submittedDate}</span>
                )}
                <div className="flex items-center gap-2 flex-1 min-w-[180px] max-w-md ml-auto">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-ok-ink transition-all" style={{ width: `${board.progress.percent}%` }} />
                  </div>
                  <span className="text-xs font-bold text-foreground tabular-nums">{board.progress.percent}%</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    ({board.progress.completed}/{board.progress.applicable})
                  </span>
                </div>
              </div>

              {/* 18 요구사항 표 */}
              <div className="rounded-[14px] border border-border bg-card shadow-card overflow-hidden">
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
            </div>
          ) : (
            !loading && (
              <CardShell title="PPAP 제출 현황" cap="고객 승인 제출 단위로 관리합니다">
                <div className="px-[18px] pb-4 text-[13px] text-muted-foreground">
                  등록된 PPAP 제출이 없습니다. ISIR·양산 승인 대상 품번이 생기면 좌측 목록에서 선택해 18
                  요구사항을 추적하세요.
                </div>
              </CardShell>
            )
          )}
        </div>
      </div>
    </div>
  )
}

/** 좌측 제출 카드 — 품번·Level·상태·고객 (템플릿 C 행 확대 문법) */
function SubmissionCard({
  s,
  active,
  onPick
}: {
  s: PpapSubmissionDto
  active: boolean
  onPick: () => void
}): JSX.Element {
  const meta = SUBMISSION_STATUS_META[s.status]
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
        active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[14px] font-bold tabular-nums">{s.partNo}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
          Level {s.level}
        </span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shrink-0', meta.chip)}>
          {meta.label}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {s.partName ?? ''}
        {s.customer ? ` · ${s.customer}` : ''}
        {s.submittedDate ? ` · 제출 ${s.submittedDate}` : ''}
      </div>
    </button>
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
            className={cn(
              'text-[11px] font-medium rounded px-1.5 py-1 border border-transparent hover:border-border cursor-pointer bg-transparent',
              meta.chip
            )}
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
