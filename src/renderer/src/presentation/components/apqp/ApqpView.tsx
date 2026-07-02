import { useEffect } from 'react'
import { Route, Check, ChevronDown, ChevronRight, ExternalLink, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useApqpStore } from '../../stores/apqpStore'
import { useUIStore, type PageId } from '../../stores/uiStore'
import type { ApqpCoreTool, ApqpElementDto, ApqpPhaseDto, ApqpStatus } from '@shared/ipc-types'

const STATUS_LABEL: Record<ApqpStatus, string> = {
  not_started: '미착수',
  in_progress: '진행중',
  completed: '완료',
  na: 'N/A'
}
const STATUS_STYLE: Record<ApqpStatus, string> = {
  not_started: 'bg-muted text-muted-foreground',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  na: 'bg-slate-100 text-slate-400'
}

// Core Tool 태그 → 기존 v5 모듈 딥링크 (SPC는 모듈 보류중 → 비활성)
const CORE_TOOL_LINK: Record<ApqpCoreTool, { page: PageId | null; label: string; style: string }> = {
  FMEA: { page: 'fmea', label: 'FMEA', style: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
  PPAP: { page: 'ppap', label: 'PPAP', style: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  MSA: { page: 'msa', label: 'MSA', style: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  CP: { page: 'parts', label: 'CP·ISIR', style: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  SPC: { page: null, label: 'SPC(준비중)', style: 'bg-slate-100 text-slate-400 cursor-default' }
}

/**
 * APQP 여정 — 5단계(계획→제품설계→공정설계→검증→피드백) 순차 스테퍼.
 * 산출물 43개를 단계별 체크리스트로, Core Tool 산출물은 해당 모듈로 바로가기.
 */
export function ApqpView(): JSX.Element {
  const { board, loading, error, openPhaseId, load, setOpenPhase, updateElement } = useApqpStore()
  const setPage = useUIStore((s) => s.setPage)

  useEffect(() => {
    void load()
  }, [load])

  if (!board) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {error ?? '불러오는 중...'}
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Route className="w-6 h-6 text-primary" />
            APQP 여정
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            사전 제품 품질 계획 — 계획→설계→공정→검증→피드백 순서로 산출물을 채웁니다 · Core Tool은
            배지 클릭으로 바로 작성
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold tabular-nums">{board.overallPct}%</div>
          <div className="text-[11px] text-muted-foreground">전체 진척률</div>
        </div>
      </header>

      {/* ── 순차 스테퍼 ── */}
      <div className="flex items-stretch gap-0 rounded-xl border border-border bg-card px-4 py-4 overflow-x-auto">
        {board.phases.map((p, i) => {
          const done = p.total > 0 && p.completed === p.total
          const isCurrent = p.phaseNo === board.currentPhaseNo
          const isOpen = openPhaseId === p.id
          return (
            <div key={p.id} className="flex items-center flex-1 min-w-[150px]">
              <button
                type="button"
                onClick={() => setOpenPhase(isOpen ? null : p.id)}
                className={cn(
                  'flex-1 text-left rounded-lg px-3 py-2 transition-colors border',
                  isOpen
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted/60'
                )}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-bold shrink-0',
                      done
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {done ? <Check className="w-4 h-4" /> : p.phaseNo}
                  </span>
                  <div className="min-w-0">
                    <div className={cn('text-[12.5px] font-bold leading-tight truncate', isCurrent && 'text-primary')}>
                      {p.title}
                    </div>
                    <div className="text-[10.5px] text-muted-foreground tabular-nums">
                      {p.completed}/{p.total} 완료
                      {p.inProgress > 0 && ` · 진행 ${p.inProgress}`}
                    </div>
                  </div>
                </div>
                {/* 단계 미니 진척바 */}
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full', done ? 'bg-emerald-500' : 'bg-primary')}
                    style={{ width: `${p.total ? Math.round((p.completed / p.total) * 100) : 0}%` }}
                  />
                </div>
              </button>
              {i < board.phases.length - 1 && (
                <ChevronRight className="w-4 h-4 mx-1 text-muted-foreground/40 shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── 단계별 산출물 ── */}
      {board.phases.map((p) => (
        <PhaseSection
          key={p.id}
          phase={p}
          open={openPhaseId === p.id}
          isCurrent={p.phaseNo === board.currentPhaseNo}
          onToggle={() => setOpenPhase(openPhaseId === p.id ? null : p.id)}
          onUpdate={updateElement}
          onGoTool={(page) => setPage(page)}
        />
      ))}
    </div>
  )
}

function PhaseSection({
  phase,
  open,
  isCurrent,
  onToggle,
  onUpdate,
  onGoTool
}: {
  phase: ApqpPhaseDto
  open: boolean
  isCurrent: boolean
  onToggle: () => void
  onUpdate: (input: { id: string } & Record<string, unknown>) => void
  onGoTool: (page: PageId) => void
}): JSX.Element {
  return (
    <section className={cn('rounded-xl border bg-card overflow-hidden', isCurrent ? 'border-primary/50' : 'border-border')}>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center gap-2.5 hover:bg-muted/40 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
        <span className="font-bold text-sm">
          Phase {phase.phaseNo}. {phase.title}
        </span>
        {isCurrent && (
          <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            현재 단계
          </span>
        )}
        <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums shrink-0">
          {phase.completed}/{phase.total}
        </span>
      </button>

      {open && (
        <div className="border-t border-border">
          {phase.description && (
            <p className="px-4 pt-3 text-[12.5px] text-muted-foreground leading-relaxed">
              {phase.description}
            </p>
          )}
          <table className="w-full text-[12px] mt-2">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-muted-foreground border-b border-border/60">
                <th className="text-left font-semibold px-4 py-1.5 w-8">#</th>
                <th className="text-left font-semibold px-2 py-1.5">산출물</th>
                <th className="text-left font-semibold px-2 py-1.5 w-24">Core Tool</th>
                <th className="text-left font-semibold px-2 py-1.5 w-20">조항</th>
                <th className="text-left font-semibold px-2 py-1.5 w-24">담당</th>
                <th className="text-left font-semibold px-2 py-1.5 w-24">상태</th>
                <th className="text-left font-semibold px-2 py-1.5 w-32">목표일</th>
              </tr>
            </thead>
            <tbody>
              {phase.elements.map((e) => (
                <ElementRow key={e.id} e={e} onUpdate={onUpdate} onGoTool={onGoTool} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function ElementRow({
  e,
  onUpdate,
  onGoTool
}: {
  e: ApqpElementDto
  onUpdate: (input: { id: string } & Record<string, unknown>) => void
  onGoTool: (page: PageId) => void
}): JSX.Element {
  const link = e.coreTool ? CORE_TOOL_LINK[e.coreTool] : null
  return (
    <tr className={cn('border-b border-border/40 hover:bg-muted/30', e.status === 'na' && 'opacity-50')}>
      <td className="px-4 py-1.5 text-muted-foreground tabular-nums">{e.seq}</td>
      <td className="px-2 py-1.5">
        <span title={e.nameEn ?? undefined} className="font-medium">
          {e.name}
        </span>
        {e.io === 'input' && (
          <span className="ml-1.5 text-[9.5px] font-semibold px-1 py-0.5 rounded bg-sky-50 text-sky-600">입력</span>
        )}
      </td>
      <td className="px-2 py-1.5">
        {link &&
          (link.page ? (
            <button
              type="button"
              onClick={() => onGoTool(link.page as PageId)}
              title={`${link.label} 모듈에서 작성`}
              className={cn(
                'inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded transition-colors',
                link.style
              )}
            >
              {link.label}
              <ExternalLink className="w-3 h-3" />
            </button>
          ) : (
            <span className={cn('inline-block text-[10.5px] font-bold px-2 py-0.5 rounded', link.style)}>
              {link.label}
            </span>
          ))}
      </td>
      <td className="px-2 py-1.5 font-mono text-[11px] text-muted-foreground" title={e.clauseTitle ?? undefined}>
        {e.clauseId}
      </td>
      <td className="px-2 py-1.5 text-muted-foreground">{e.teamName ?? '-'}</td>
      <td className="px-2 py-1.5">
        <select
          value={e.status}
          onChange={(ev) => onUpdate({ id: e.id, status: ev.target.value as ApqpStatus })}
          className={cn(
            'text-[11px] font-semibold rounded px-1.5 py-1 border-0 cursor-pointer appearance-none',
            STATUS_STYLE[e.status]
          )}
        >
          {(Object.keys(STATUS_LABEL) as ApqpStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="date"
          value={e.targetDate ?? ''}
          onChange={(ev) => onUpdate({ id: e.id, targetDate: ev.target.value || null })}
          className="text-[11px] bg-transparent border border-border/60 rounded px-1.5 py-0.5 focus:outline-none focus:border-primary/50"
        />
      </td>
    </tr>
  )
}
