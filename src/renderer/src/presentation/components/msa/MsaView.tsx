import { useEffect, useState } from 'react'
import { Ruler, Loader2, Plus, Trash2 } from 'lucide-react'
import { MSA_METHODS, type MsaStudyDto, type MsaResult, type MsaMethod } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { useMsaStore } from '../../stores/msaStore'

const RESULT_META: Record<MsaResult, { label: string; chip: string; dot: string }> = {
  acceptable: { label: '양호', chip: 'bg-ok-tint text-ok-ink', dot: 'bg-ok-ink' },
  marginal: { label: '조건부', chip: 'bg-warn-tint text-warn-ink', dot: 'bg-warn-ink' },
  unacceptable: { label: '부적합', chip: 'bg-bad-tint text-bad-ink', dot: 'bg-bad-ink' },
  pending: { label: '미평가', chip: 'bg-muted text-muted-foreground', dot: 'bg-[#C7CCD3]' }
}

const METHOD_LABEL: Record<MsaMethod, string> = {
  gage_rr: 'Gage R&R',
  bias: '편의(Bias)',
  linearity: '직선성',
  stability: '안정성'
}

/**
 * MSA 측정시스템분석 — 게이지 변동(Gage R&R) 평가, %GRR 입력 시 판정 자동 (7.1.5.1.1).
 * 템플릿 C: 좌 게이지 목록 380px / 우 상세 폼·미선택 시 판정 현황 요약(공백 금지).
 */
export function MsaView(): JSX.Element {
  const { items, loading, load, create, update, remove } = useMsaStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = items.find((i) => i.id === selectedId) ?? null

  useEffect(() => {
    void load()
  }, [load])

  const counts = {
    acceptable: items.filter((i) => i.result === 'acceptable').length,
    marginal: items.filter((i) => i.result === 'marginal').length,
    unacceptable: items.filter((i) => i.result === 'unacceptable').length,
    pending: items.filter((i) => i.result === 'pending').length
  }

  const handleCreate = async (): Promise<void> => {
    const id = await create({ gageName: '새 게이지' })
    if (id != null) setSelectedId(id)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<Ruler className="w-5 h-5" />}
          title="MSA 측정시스템분석"
          sub={
            <>
              게이지 변동(Gage R&amp;R) 평가 · %GRR 입력 시 판정 자동 (7.1.5.1.1) · 게이지 {items.length}대
              {counts.unacceptable > 0 && (
                <span className="ml-2 text-bad-ink font-semibold">부적합 {counts.unacceptable}</span>
              )}
              {counts.marginal > 0 && (
                <span className="ml-2 text-warn-ink font-semibold">조건부 {counts.marginal}</span>
              )}
            </>
          }
          actions={
            <>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                게이지 추가
              </button>
            </>
          }
        />
      </div>

      {/* 템플릿 C (19번): 좌 게이지 목록 380px 고정 / 우 상세·미선택 요약 */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {items.length === 0 && !loading && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              등록된 게이지가 없습니다.
              <br />
              <span className="text-[11px]">[게이지 추가]로 측정 장비를 등록하세요.</span>
            </div>
          )}
          {items.map((m) => (
            <GaugeCard key={m.id} m={m} active={m.id === selectedId} onPick={() => setSelectedId(m.id)} />
          ))}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            <GaugeDetail
              m={selected}
              onUpdate={update}
              onDelete={async () => {
                await remove(selected.id)
                setSelectedId(null)
              }}
            />
          ) : (
            <MsaSummary items={items} counts={counts} onPick={setSelectedId} onCreate={() => void handleCreate()} />
          )}
        </div>
      </div>
    </div>
  )
}

/** 좌측 게이지 카드 — 게이지명·판정·특성 (템플릿 C 행 확대 문법) */
function GaugeCard({
  m,
  active,
  onPick
}: {
  m: MsaStudyDto
  active: boolean
  onPick: () => void
}): JSX.Element {
  const meta = RESULT_META[m.result]
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
        <span className="text-[14px] font-semibold truncate">{m.gageName}</span>
        <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shrink-0', meta.chip)}>
          {meta.label}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {m.gageNo && <span className="font-mono">{m.gageNo} · </span>}
        {m.characteristic ? `${m.characteristic} · ` : ''}
        {METHOD_LABEL[m.method]}
        {m.studyDate ? ` · ${m.studyDate}` : ''}
      </div>
    </button>
  )
}

/** 우측 상세 — 게이지 정보·측정 결과 판정·비고. key=id로 선택 전환 시 입력 초기화. */
function GaugeDetail({
  m,
  onUpdate,
  onDelete
}: {
  m: MsaStudyDto
  onUpdate: (input: { id: number } & Record<string, unknown>) => void
  onDelete: () => Promise<void>
}): JSX.Element {
  const meta = RESULT_META[m.result]
  return (
    <div key={m.id} className="grid gap-4">
      <CardShell
        title="게이지 정보"
        cap="측정 장비·특성"
        actions={
          <button
            type="button"
            onClick={() => void onDelete()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-muted"
            title="게이지 삭제"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
      >
        <div className="px-[18px] pb-4 pt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          <Field label="게이지명">
            <input
              defaultValue={m.gageName}
              onBlur={(e) => {
                const v = e.target.value.trim() || '게이지'
                if (v !== m.gageName) onUpdate({ id: m.id, gageName: v })
              }}
              className="input-field font-semibold"
            />
          </Field>
          <Field label="게이지 번호">
            <input
              defaultValue={m.gageNo ?? ''}
              onBlur={(e) => onUpdate({ id: m.id, gageNo: e.target.value.trim() || null })}
              className="input-field font-mono"
            />
          </Field>
          <Field label="측정 특성">
            <input
              defaultValue={m.characteristic ?? ''}
              onBlur={(e) => onUpdate({ id: m.id, characteristic: e.target.value.trim() || null })}
              className="input-field"
            />
          </Field>
          <Field label="평가 방법">
            <select
              value={m.method}
              onChange={(e) => onUpdate({ id: m.id, method: e.target.value as MsaMethod })}
              className="input-field cursor-pointer"
            >
              {MSA_METHODS.map((mm) => (
                <option key={mm} value={mm}>
                  {METHOD_LABEL[mm]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="측정일">
            <input
              type="date"
              defaultValue={m.studyDate ?? ''}
              onBlur={(e) => onUpdate({ id: m.id, studyDate: e.target.value || null })}
              className="input-field"
            />
          </Field>
          {(m.teamName ?? m.clauseId) && (
            <Field label="담당·조항">
              <div className="text-[13px] py-1.5 text-muted-foreground">
                {m.teamName ?? '-'}
                {m.clauseId && (
                  <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-muted font-mono">{m.clauseId}</span>
                )}
              </div>
            </Field>
          )}
        </div>
      </CardShell>

      <CardShell title="측정 결과 판정" cap="%GRR 입력 시 자동 판정">
        <div className="px-[18px] pb-3 pt-2 flex items-end gap-6 flex-wrap">
          <Field label="%GRR" className="w-28">
            <input
              type="number"
              step="0.1"
              min={0}
              defaultValue={m.grrPercent ?? ''}
              onBlur={(e) =>
                onUpdate({ id: m.id, grrPercent: e.target.value === '' ? null : Number(e.target.value) })
              }
              className="input-field text-center tabular-nums"
            />
          </Field>
          <Field label="ndc (구별 범주 수)" className="w-32">
            <input
              type="number"
              min={0}
              defaultValue={m.ndc ?? ''}
              onBlur={(e) => onUpdate({ id: m.id, ndc: e.target.value === '' ? null : Number(e.target.value) })}
              className="input-field text-center tabular-nums"
            />
          </Field>
          <span
            className={cn(
              'inline-flex items-center gap-2 text-[15px] font-extrabold px-4 py-2 rounded-[10px]',
              meta.chip
            )}
          >
            <span className={cn('w-2 h-2 rounded-full', meta.dot)} />
            {meta.label}
            {m.grrPercent != null && <span className="tabular-nums font-bold text-[13px]">%GRR {m.grrPercent}</span>}
          </span>
        </div>
        <div className="px-[18px] pb-4 text-[11px] text-muted-foreground flex items-center gap-x-3 flex-wrap">
          <span className="font-semibold text-foreground/70">판정 기준</span>
          <span><span className="font-bold text-ok-ink">양호</span> %GRR &lt; 10</span>
          <span><span className="font-bold text-warn-ink">조건부</span> 10 ~ 30</span>
          <span><span className="font-bold text-bad-ink">부적합</span> &gt; 30</span>
          <span className="text-faint">· ndc = 구별 범주 수(≥5 권장)</span>
        </div>
      </CardShell>

      <CardShell title="비고" cap="특이사항·조건부 승인 사유 등">
        <div className="px-[18px] pb-4 pt-2">
          <textarea
            rows={3}
            defaultValue={m.note ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim() || null
              if (v !== (m.note ?? null)) onUpdate({ id: m.id, note: v })
            }}
            placeholder="예: 조건부 판정 사유, 재평가 예정일…"
            className="w-full text-[13px] bg-fillable border border-fillable-border rounded-md px-2.5 py-2 resize-y focus:outline-none focus:border-primary/50"
          />
        </div>
      </CardShell>
    </div>
  )
}

/** 미선택 요약(19번 공백 금지) — 판정 분포 + 조치 필요 게이지 + 판정 기준. */
function MsaSummary({
  items,
  counts,
  onPick,
  onCreate
}: {
  items: MsaStudyDto[]
  counts: { acceptable: number; marginal: number; unacceptable: number; pending: number }
  onPick: (id: number) => void
  onCreate: () => void
}): JSX.Element {
  // 부적합 → 조건부 → 미평가 순으로 조치 우선
  const rank: Record<MsaResult, number> = { unacceptable: 0, marginal: 1, pending: 2, acceptable: 3 }
  const actionable = [...items].sort((a, b) => rank[a.result] - rank[b.result]).filter((i) => i.result !== 'acceptable')
  return (
    <div className="grid gap-4">
      <CardShell title="측정시스템 현황" cap="게이지 판정 분포">
        <div className="px-[18px] pb-4 pt-1 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-[13px]">
            양호 <b className="text-[15px] tabular-nums text-ok-ink">{counts.acceptable}</b>대
          </div>
          <div className="text-[13px]">
            조건부 <b className="text-[15px] tabular-nums text-warn-ink">{counts.marginal}</b>대
          </div>
          <div className="text-[13px]">
            부적합 <b className="text-[15px] tabular-nums text-bad-ink">{counts.unacceptable}</b>대
          </div>
          <div className="text-[13px]">
            미평가 <b className="text-[15px] tabular-nums text-muted-foreground">{counts.pending}</b>대
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> 게이지 추가
          </button>
        </div>
      </CardShell>

      <CardShell title="조치 필요 게이지" cap="부적합·조건부부터 재평가하세요">
        <div className="px-[18px] pb-4 pt-1 grid gap-1.5">
          {actionable.length === 0 && (
            <div className="text-[13px] text-muted-foreground pb-2">조치가 필요한 게이지가 없습니다 👍</div>
          )}
          {actionable.slice(0, 6).map((m) => {
            const meta = RESULT_META[m.result]
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onPick(m.id)}
                className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left border border-border hover:bg-muted/50"
              >
                <span className="flex-1 text-[13.5px] font-medium truncate">{m.gageName}</span>
                {m.grrPercent != null && (
                  <span className="text-[11.5px] text-muted-foreground tabular-nums shrink-0">%GRR {m.grrPercent}</span>
                )}
                <span className={cn('text-[10.5px] font-bold rounded-full px-1.5 py-0.5 shrink-0', meta.chip)}>
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>
      </CardShell>

      <CardShell title="판정 기준" cap="AIAG MSA 매뉴얼 (7.1.5.1.1)">
        <div className="px-[18px] pb-4 pt-1 grid gap-1 text-[13px]">
          <div><span className="font-bold text-ok-ink">양호</span> — %GRR &lt; 10 : 측정시스템 사용 가능</div>
          <div><span className="font-bold text-warn-ink">조건부</span> — 10 ~ 30 : 용도·비용 검토 후 조건부 승인</div>
          <div><span className="font-bold text-bad-ink">부적합</span> — &gt; 30 : 측정시스템 개선 필요</div>
          <div className="text-[11.5px] text-muted-foreground mt-1">ndc(구별 범주 수)는 5 이상을 권장합니다.</div>
        </div>
      </CardShell>
    </div>
  )
}

function Field({
  label,
  className,
  children
}: {
  label: string
  className?: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <label className={cn('grid gap-1 min-w-0', className)}>
      <span className="text-[11px] font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
