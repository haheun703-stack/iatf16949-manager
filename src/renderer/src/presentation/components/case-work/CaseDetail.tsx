import { useEffect, useState } from 'react'
import { Check, Circle, Clock, Factory, ShieldAlert, AlertCircle } from 'lucide-react'
import type { CaseDetailDto, CaseScreeningDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'

const STATUS_NEXT: Record<string, string> = { todo: 'doing', doing: 'done', done: 'todo' }
const FILL = 'bg-fillable text-[13px] px-2 py-1 rounded border border-border focus:border-primary/50 focus:outline-none'

/** D-day 계산(오늘 vs 회신요구일). 음수=초과. */
function dday(due: string): { text: string; over: boolean } | null {
  if (!due) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(due + 'T00:00:00')
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return { text: `D+${-diff} 초과`, over: true }
  if (diff === 0) return { text: 'D-DAY', over: true }
  return { text: `D-${diff}`, over: false }
}

export function CaseDetail({
  detail,
  onReload
}: {
  detail: CaseDetailDto
  onReload: () => void
}): JSX.Element {
  const dd = dday(detail.dueDate)

  const cycleStep = async (stepKey: string, status: string): Promise<void> => {
    await window.api.invoke(window.api.channels.CASE_STEP_UPDATE, {
      id: detail.id,
      stepKey,
      status: STATUS_NEXT[status] ?? 'todo'
    })
    onReload()
  }

  return (
    <div className="max-w-[820px]">
      {/* 헤더 */}
      <div className="flex items-start gap-3 mb-1">
        <span className="font-mono text-xs bg-muted rounded px-2 py-1 mt-0.5">{detail.caseNo}</span>
        <h2 className="text-lg font-bold leading-snug flex-1">{detail.title || '(제목 없음)'}</h2>
        {dd && (
          <span
            className={cn(
              'text-xs font-bold px-2.5 py-1 rounded-full shrink-0',
              dd.over ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'
            )}
          >
            {dd.text}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-muted-foreground mb-4 pl-1">
        <span>고객 <b className="text-foreground">{detail.customer}</b></span>
        <span>품번 <b className="text-foreground font-mono">{detail.partNo}</b></span>
        <span>{detail.partName}</span>
        <span>차종 {detail.model}</span>
        <span className="text-destructive font-semibold">{detail.defectDesc}</span>
        <span>{detail.defectQty}EA</span>
        <span>귀책 {detail.attributable}</span>
        {detail.dueDate && <span>회신요구일 {detail.dueDate}</span>}
      </div>

      {/* 8D 단계 레일 */}
      <section className="mb-5">
        <h3 className="text-[12px] font-bold text-muted-foreground mb-2">8D 흐름 진행</h3>
        <div className="flex flex-wrap gap-1.5">
          {detail.steps.map((s) => {
            const done = s.status === 'done'
            const doing = s.status === 'doing'
            return (
              <button
                key={s.stepKey}
                type="button"
                onClick={() => void cycleStep(s.stepKey, s.status)}
                title="클릭: 할일→진행→완료"
                className={cn(
                  'flex items-center gap-1.5 text-[12px] rounded-lg px-2.5 py-1.5 border transition-colors',
                  done && 'bg-success/10 border-success/40 text-success',
                  doing && 'bg-warning/10 border-warning/40 text-warning font-semibold',
                  !done && !doing && 'bg-card border-border text-muted-foreground hover:bg-muted'
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : doing ? <Clock className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                {s.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* 선별(임시대책) — 두 주체 */}
      <section className="mb-5">
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground mb-2">
          <ShieldAlert className="w-3.5 h-3.5" /> 임시대책 — 선별 (1차 고객 요구)
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {detail.screening.map((sc) => (
            <ScreeningCard key={sc.scope} caseId={detail.id} sc={sc} onSaved={onReload} />
          ))}
        </div>
      </section>

      {/* 공유 사실 — 원인/대책 */}
      <section>
        <h3 className="text-[12px] font-bold text-muted-foreground mb-2">8D 조사 · 개선대책 (공유 사실)</h3>
        <div className="space-y-3">
          <FactBox caseId={detail.id} factKey="root_cause" label="근본원인 (5Why / 8D)" value={detail.facts.root_cause ?? ''} onSaved={onReload} />
          <FactBox caseId={detail.id} factKey="corrective_action" label="개선대책 (회신용)" value={detail.facts.corrective_action ?? ''} onSaved={onReload} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> 다음 단계: 이 공유사실이 B1100-01·B2100-01·B2100-03 양식으로 자동 분배(분배 엔진은 후속).
        </p>
      </section>
    </div>
  )
}

/* 선별 카드(사내재고/고객사) */
function ScreeningCard({
  caseId,
  sc,
  onSaved
}: {
  caseId: number
  sc: CaseScreeningDto
  onSaved: () => void
}): JSX.Element {
  const [total, setTotal] = useState(sc.totalQty?.toString() ?? '')
  const [screened, setScreened] = useState(sc.screenedQty?.toString() ?? '')
  const [defect, setDefect] = useState(sc.defectQty?.toString() ?? '')
  const [status, setStatus] = useState(sc.status)

  const isInternal = sc.scope === 'internal'
  const save = async (nextStatus?: string): Promise<void> => {
    const st = nextStatus ?? status
    if (nextStatus) setStatus(nextStatus)
    await window.api.invoke(window.api.channels.CASE_SCREENING_SAVE, {
      id: caseId,
      scope: sc.scope,
      totalQty: total === '' ? null : Number(total),
      screenedQty: screened === '' ? null : Number(screened),
      defectQty: defect === '' ? null : Number(defect),
      status: st
    })
    onSaved()
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-3',
        status === 'done' ? 'border-success/40 bg-success/5' : 'border-border bg-card'
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Factory className="w-4 h-4 text-primary" />
        <span className="text-[13px] font-bold">{isInternal ? '사내재고 선별' : '고객사 선별'}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">담당 {sc.ownerDept}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 mb-2">
        <label className="text-[10px] text-muted-foreground">
          대상
          <input value={total} onChange={(e) => setTotal(e.target.value)} onBlur={() => void save()} type="number" className={cn(FILL, 'w-full mt-0.5')} />
        </label>
        <label className="text-[10px] text-muted-foreground">
          선별
          <input value={screened} onChange={(e) => setScreened(e.target.value)} onBlur={() => void save()} type="number" className={cn(FILL, 'w-full mt-0.5')} />
        </label>
        <label className="text-[10px] text-muted-foreground">
          불량
          <input value={defect} onChange={(e) => setDefect(e.target.value)} onBlur={() => void save()} type="number" className={cn(FILL, 'w-full mt-0.5')} />
        </label>
      </div>
      <div className="flex gap-1">
        {(['todo', 'doing', 'done'] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => void save(st)}
            className={cn(
              'flex-1 text-[11px] py-1 rounded border transition-colors',
              status === st
                ? st === 'done'
                  ? 'bg-success/15 border-success/40 text-success font-semibold'
                  : st === 'doing'
                    ? 'bg-warning/15 border-warning/40 text-warning font-semibold'
                    : 'bg-muted border-border'
                : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {st === 'todo' ? '대기' : st === 'doing' ? '진행' : '완료'}
          </button>
        ))}
      </div>
    </div>
  )
}

/* 공유 사실 입력(blur 저장) */
function FactBox({
  caseId,
  factKey,
  label,
  value,
  onSaved
}: {
  caseId: number
  factKey: string
  label: string
  value: string
  onSaved: () => void
}): JSX.Element {
  const [val, setVal] = useState(value)
  useEffect(() => setVal(value), [value])
  const save = async (): Promise<void> => {
    if (val === value) return
    await window.api.invoke(window.api.channels.CASE_FACT_SAVE, { id: caseId, key: factKey, value: val })
    onSaved()
  }
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-muted-foreground mb-1">{label}</span>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => void save()}
        rows={2}
        className="w-full bg-fillable text-[13px] px-2.5 py-2 rounded border border-border focus:border-primary/50 focus:outline-none resize-y leading-relaxed"
      />
    </label>
  )
}
