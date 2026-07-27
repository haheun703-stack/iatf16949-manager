import { useEffect } from 'react'
import { Route, Check, ExternalLink, Loader2, Link2, Zap } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
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
  in_progress: 'bg-warn-tint text-warn-ink',
  completed: 'bg-ok-tint text-ok-ink',
  na: 'bg-muted/60 text-faint'
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
 * APQP 여정 — 5단계(계획→제품설계→공정설계→검증→피드백) × 산출물 43개.
 * 템플릿 C: 좌 단계 목록 380px / 우 선택 단계 산출물. 스토어가 현재 단계를 자동 선택한다(공백 금지).
 */
export function ApqpView(): JSX.Element {
  const { board, loading, error, openPhaseId, load, setOpenPhase, updateElement } = useApqpStore()
  const setPage = useUIStore((s) => s.setPage)

  useEffect(() => {
    void load()
  }, [load])

  const openPhase = board?.phases.find((p) => p.id === openPhaseId) ?? null

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<Route className="w-5 h-5" />}
          title="APQP 여정"
          sub="사전 제품 품질 계획 — 계획→설계→공정→검증→피드백 순서로 산출물을 채웁니다 · Core Tool은 배지 클릭으로 바로 작성"
          actions={
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums">{board?.overallPct ?? 0}%</div>
              <div className="text-[11px] text-muted-foreground">전체 진척률</div>
            </div>
          }
        />
      </div>

      {!board ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {error ?? '불러오는 중...'}
        </div>
      ) : (
        /* 템플릿 C (19번): 좌 단계 목록 380px 고정 / 우 산출물 테이블 */
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
            {board.phases.map((p) => (
              <PhaseCard
                key={p.id}
                phase={p}
                active={openPhaseId === p.id}
                isCurrent={p.phaseNo === board.currentPhaseNo}
                onPick={() => setOpenPhase(p.id)}
              />
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto">
            {openPhase && (
              <PhaseDetail
                phase={openPhase}
                isCurrent={openPhase.phaseNo === board.currentPhaseNo}
                onUpdate={updateElement}
                onGoTool={(page) => setPage(page)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** 좌측 단계 카드 — 번호·제목·진척 (템플릿 C 행 확대 문법) */
function PhaseCard({
  phase,
  active,
  isCurrent,
  onPick
}: {
  phase: ApqpPhaseDto
  active: boolean
  isCurrent: boolean
  onPick: () => void
}): JSX.Element {
  const done = phase.total > 0 && phase.completed === phase.total
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
        active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-full text-[13px] font-bold shrink-0',
            done
              ? 'bg-ok-ink text-white'
              : isCurrent
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-muted text-muted-foreground'
          )}
        >
          {done ? <Check className="w-4 h-4" /> : phase.phaseNo}
        </span>
        <div className="min-w-0 flex-1">
          <div className={cn('text-[14px] font-semibold leading-tight truncate', isCurrent && 'text-primary')}>
            {phase.title}
          </div>
          <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
            {phase.completed}/{phase.total} 완료
            {phase.inProgress > 0 && ` · 진행 ${phase.inProgress}`}
          </div>
        </div>
        {isCurrent && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
            현재
          </span>
        )}
      </div>
      <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full', done ? 'bg-ok-ink' : 'bg-primary')}
          style={{ width: `${phase.total ? Math.round((phase.completed / phase.total) * 100) : 0}%` }}
        />
      </div>
    </button>
  )
}

/** 우측 — 선택 단계의 산출물 테이블 */
function PhaseDetail({
  phase,
  isCurrent,
  onUpdate,
  onGoTool
}: {
  phase: ApqpPhaseDto
  isCurrent: boolean
  onUpdate: (input: { id: string } & Record<string, unknown>) => void
  onGoTool: (page: PageId) => void
}): JSX.Element {
  return (
    <section className={cn('rounded-[14px] border bg-card shadow-card overflow-hidden', isCurrent ? 'border-primary/50' : 'border-border')}>
      <div className="px-4 py-3 flex items-center gap-2.5 border-b border-border">
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
      </div>

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
        {e.evidence && (
          <span className="mt-0.5 flex items-center gap-1.5">
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded',
                e.evidence.suggestedStatus === e.status
                  ? 'bg-ok-tint text-ok-ink'
                  : 'bg-warn-tint text-warn-ink'
              )}
              title="앱 실데이터에서 자동 집계된 증거"
            >
              <Link2 className="w-3 h-3" />
              {e.evidence.summary}
            </span>
            {e.evidence.suggestedStatus !== e.status && (
              <button
                type="button"
                onClick={() => onUpdate({ id: e.id, status: e.evidence!.suggestedStatus })}
                title={`실데이터 기준 '${STATUS_LABEL[e.evidence.suggestedStatus]}'로 상태 반영`}
                className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Zap className="w-3 h-3" />
                {STATUS_LABEL[e.evidence.suggestedStatus]} 반영
              </button>
            )}
          </span>
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
