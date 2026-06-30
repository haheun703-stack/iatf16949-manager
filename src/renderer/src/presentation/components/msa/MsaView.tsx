import { useEffect } from 'react'
import { Ruler, Loader2, Plus, Trash2 } from 'lucide-react'
import { MSA_METHODS, type MsaStudyDto, type MsaResult, type MsaMethod } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useMsaStore } from '../../stores/msaStore'

const RESULT_META: Record<MsaResult, { label: string; chip: string; dot: string }> = {
  acceptable: { label: '양호', chip: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  marginal: { label: '조건부', chip: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  unacceptable: { label: '부적합', chip: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  pending: { label: '미평가', chip: 'bg-slate-100 text-slate-500', dot: 'bg-slate-300' }
}

const METHOD_LABEL: Record<MsaMethod, string> = {
  gage_rr: 'Gage R&R',
  bias: '편의(Bias)',
  linearity: '직선성',
  stability: '안정성'
}

export function MsaView(): JSX.Element {
  const { items, loading, load, create, update, remove } = useMsaStore()

  useEffect(() => {
    void load()
  }, [load])

  const counts = {
    unacceptable: items.filter((i) => i.result === 'unacceptable').length,
    marginal: items.filter((i) => i.result === 'marginal').length
  }

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Ruler className="w-6 h-6 text-primary" />
              MSA 측정시스템분석
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              게이지 변동(Gage R&amp;R) 평가 · %GRR 입력 시 판정 자동 (7.1.5.1.1)
              {counts.unacceptable > 0 && (
                <span className="ml-2 text-rose-600 font-semibold">부적합 {counts.unacceptable}</span>
              )}
              {counts.marginal > 0 && (
                <span className="ml-2 text-amber-600 font-semibold">조건부 {counts.marginal}</span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void create({ gageName: '새 게이지' })}
            className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            게이지 추가
          </button>
        </div>

        {/* 판정 기준 범례 */}
        <div className="mt-2 text-[11px] text-muted-foreground flex items-center gap-x-3 flex-wrap">
          <span className="font-semibold text-foreground/70">판정 기준</span>
          <span><span className="font-bold text-green-600">양호</span> %GRR &lt; 10</span>
          <span><span className="font-bold text-amber-600">조건부</span> 10 ~ 30</span>
          <span><span className="font-bold text-rose-600">부적합</span> &gt; 30</span>
          <span className="text-foreground/40">· ndc = 구별 범주 수(≥5 권장)</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        {!loading && items.length === 0 && (
          <div className="text-center py-20 text-muted-foreground text-sm">
            등록된 게이지가 없습니다. “게이지 추가”로 시작하세요.
          </div>
        )}
        {items.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-[11px] text-muted-foreground uppercase tracking-wide">
                  <th className="text-left font-semibold px-3 py-2">게이지명</th>
                  <th className="text-left font-semibold px-3 py-2 w-28">번호</th>
                  <th className="text-left font-semibold px-3 py-2 w-28">측정특성</th>
                  <th className="text-left font-semibold px-3 py-2 w-28">방법</th>
                  <th className="text-center font-semibold px-3 py-2 w-20">%GRR</th>
                  <th className="text-center font-semibold px-3 py-2 w-16">ndc</th>
                  <th className="text-center font-semibold px-3 py-2 w-24">판정</th>
                  <th className="text-left font-semibold px-3 py-2 w-28">측정일</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((m) => (
                  <MsaRow key={m.id} m={m} onUpdate={update} onDelete={() => void remove(m.id)} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function MsaRow({
  m,
  onUpdate,
  onDelete
}: {
  m: MsaStudyDto
  onUpdate: (input: { id: number } & Record<string, unknown>) => void
  onDelete: () => void
}): JSX.Element {
  const meta = RESULT_META[m.result]
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-2 py-1">
        <input
          defaultValue={m.gageName}
          onBlur={(e) => {
            const v = e.target.value.trim() || '게이지'
            if (v !== m.gageName) onUpdate({ id: m.id, gageName: v })
          }}
          className="w-full bg-transparent px-1.5 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-2 py-1">
        <input
          defaultValue={m.gageNo ?? ''}
          onBlur={(e) => onUpdate({ id: m.id, gageNo: e.target.value.trim() || null })}
          className="w-full bg-transparent px-1.5 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-2 py-1">
        <input
          defaultValue={m.characteristic ?? ''}
          onBlur={(e) => onUpdate({ id: m.id, characteristic: e.target.value.trim() || null })}
          className="w-full bg-transparent px-1.5 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-2 py-1">
        <select
          value={m.method}
          onChange={(e) => onUpdate({ id: m.id, method: e.target.value as MsaMethod })}
          className="w-full bg-transparent text-xs px-1 py-1 rounded focus:bg-fillable focus:outline-none cursor-pointer"
        >
          {MSA_METHODS.map((mm) => (
            <option key={mm} value={mm}>{METHOD_LABEL[mm]}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="number"
          step="0.1"
          min={0}
          value={m.grrPercent ?? ''}
          onChange={(e) =>
            onUpdate({ id: m.id, grrPercent: e.target.value === '' ? null : Number(e.target.value) })
          }
          className="w-16 bg-transparent text-center px-1 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="number"
          min={0}
          value={m.ndc ?? ''}
          onChange={(e) => onUpdate({ id: m.id, ndc: e.target.value === '' ? null : Number(e.target.value) })}
          className="w-12 bg-transparent text-center px-1 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-2 py-1 text-center">
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full', meta.chip)}>
          <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
      </td>
      <td className="px-2 py-1">
        <input
          type="date"
          defaultValue={m.studyDate ?? ''}
          onBlur={(e) => onUpdate({ id: m.id, studyDate: e.target.value || null })}
          className="w-full bg-transparent text-xs px-1 py-1 rounded focus:bg-fillable focus:outline-none"
        />
      </td>
      <td className="px-1 py-1 text-center">
        <button
          type="button"
          onClick={onDelete}
          className="w-6 h-6 text-muted-foreground hover:text-destructive flex items-center justify-center"
          title="삭제"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  )
}
