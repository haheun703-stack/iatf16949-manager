import { useEffect } from 'react'
import { Workflow, ExternalLink } from 'lucide-react'
import { useApqpStore } from '../../stores/apqpStore'
import { useUIStore } from '../../stores/uiStore'
import type { ApqpElement, ApqpPhase, ApqpStatus } from '@shared/ipc-types'

const STATUS_OPTIONS: { value: ApqpStatus; label: string }[] = [
  { value: 'not_started', label: '미착수' },
  { value: 'in_progress', label: '진행중' },
  { value: 'completed', label: '완료' },
  { value: 'na', label: '해당없음' }
]

const STATUS_STYLES: Record<ApqpStatus, { bg: string; text: string }> = {
  not_started: { bg: '#f1f5f9', text: '#64748b' },
  in_progress: { bg: '#fef3c7', text: '#b45309' },
  completed: { bg: '#dcfce7', text: '#15803d' },
  na: { bg: '#e2e8f0', text: '#94a3b8' }
}

const CORE_TOOL_STYLES: Record<string, string> = {
  FMEA: '#7c3aed',
  MSA: '#0891b2',
  SPC: '#dc2626',
  PPAP: '#ea580c',
  CP: '#2563eb'
}

const PHASE_ACCENTS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#10b981']

export function ApqpView(): JSX.Element {
  const { board, loadBoard, updateElement } = useApqpStore()

  useEffect(() => {
    loadBoard()
  }, [loadBoard])

  if (!board) {
    return <div className="text-muted-foreground text-sm py-20 text-center">불러오는 중...</div>
  }

  return (
    <div>
      {/* Header + overall summary */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Workflow className="w-5 h-5 text-primary" /> APQP 사전 제품 품질 계획
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1">
            Advanced Product Quality Planning · 5단계 {board.total}개 표준 산출물 · IATF 16949 Core Tool
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{board.progress}%</div>
          <div className="text-[11px] text-muted-foreground">
            완료 {board.completed} / 진행 {board.inProgress} / 미착수 {board.notStarted}
            {board.na > 0 && ` / 해당없음 ${board.na}`}
          </div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 w-full bg-muted rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${board.progress}%` }}
        />
      </div>

      {/* Phase sections */}
      <div className="space-y-5">
        {board.phases.map((phase, i) => (
          <PhaseSection
            key={phase.id}
            phase={phase}
            accent={PHASE_ACCENTS[i % PHASE_ACCENTS.length]}
            onUpdate={updateElement}
          />
        ))}
      </div>
    </div>
  )
}

function PhaseSection({
  phase,
  accent,
  onUpdate
}: {
  phase: ApqpPhase
  accent: string
  onUpdate: ReturnType<typeof useApqpStore.getState>['updateElement']
}): JSX.Element {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: accent }}
        >
          {phase.phaseNo}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[14px]">{phase.title}</h3>
          <p className="text-[11px] text-muted-foreground truncate">{phase.titleEn}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full transition-all" style={{ width: `${phase.progress}%`, backgroundColor: accent }} />
          </div>
          <span className="text-[11px] text-muted-foreground w-20 text-right">
            {phase.completed}/{phase.total} ({phase.progress}%)
          </span>
        </div>
      </div>

      {/* Elements table */}
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-border text-muted-foreground text-[11px]">
            <th className="text-left p-2.5 w-8">#</th>
            <th className="text-left p-2.5">산출물</th>
            <th className="text-left p-2.5 w-20">구분</th>
            <th className="text-left p-2.5 w-24">IATF 조항</th>
            <th className="text-left p-2.5 w-28">담당팀</th>
            <th className="text-left p-2.5 w-28">상태</th>
            <th className="text-left p-2.5 w-32">목표일</th>
          </tr>
        </thead>
        <tbody>
          {phase.elements.map((el) => (
            <ElementRow key={el.id} el={el} onUpdate={onUpdate} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ElementRow({
  el,
  onUpdate
}: {
  el: ApqpElement
  onUpdate: ReturnType<typeof useApqpStore.getState>['updateElement']
}): JSX.Element {
  const { setSelectedClause, setActiveTab, toggleExpanded, expandedIds } = useUIStore()
  const statusStyle = STATUS_STYLES[el.status]

  const goToClause = (): void => {
    if (!el.clauseId) return
    // Expand ancestors so the clause is reachable in the sidebar tree
    const parts = el.clauseId.split('.')
    let prefix = ''
    for (let i = 0; i < parts.length - 1; i++) {
      prefix = prefix ? `${prefix}.${parts[i]}` : parts[i]
      if (!expandedIds.has(prefix)) toggleExpanded(prefix)
    }
    setSelectedClause(el.clauseId)
    setActiveTab('detail')
  }

  return (
    <tr className="border-b border-border/50 hover:bg-muted/20">
      <td className="p-2.5 text-muted-foreground text-[11px]">{el.seq}</td>
      <td className="p-2.5">
        <div className="font-medium">{el.name}</div>
        <div className="flex items-center gap-1.5 mt-0.5">
          {el.nameEn && <span className="text-[10px] text-muted-foreground">{el.nameEn}</span>}
          {el.coreTool && (
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white"
              style={{ backgroundColor: CORE_TOOL_STYLES[el.coreTool] || '#64748b' }}
            >
              {el.coreTool}
            </span>
          )}
        </div>
      </td>
      <td className="p-2.5">
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            el.io === 'input' ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-600'
          }`}
        >
          {el.io === 'input' ? '입력' : '산출'}
        </span>
      </td>
      <td className="p-2.5">
        {el.clauseId ? (
          <button
            onClick={goToClause}
            className="text-primary font-mono text-[11px] hover:underline inline-flex items-center gap-0.5"
            title={el.clauseTitle || undefined}
          >
            {el.clauseId}
            <ExternalLink className="w-3 h-3" />
          </button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </td>
      <td className="p-2.5 text-muted-foreground">{el.teamName || '-'}</td>
      <td className="p-2.5">
        <select
          value={el.status}
          onChange={(e) => onUpdate({ id: el.id, status: e.target.value as ApqpStatus })}
          className="text-[11px] font-medium rounded px-1.5 py-1 border-0 outline-none cursor-pointer"
          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </td>
      <td className="p-2.5">
        <input
          type="date"
          value={el.targetDate || ''}
          onChange={(e) => onUpdate({ id: el.id, targetDate: e.target.value || null })}
          className="text-[11px] bg-background border border-border rounded px-1.5 py-1 outline-none focus:border-primary"
        />
      </td>
    </tr>
  )
}
