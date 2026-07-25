import { useEffect } from 'react'
import { ClipboardList, Star } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { useSqTrackStore } from '../../stores/sqTrackStore'
import { SqTrackOverview } from './SqTrackOverview'
import { SqTrackPartDetail } from './SqTrackPartDetail'

/** 'YYYY-MM-DD' → D-n (지남 = 음수 아님, 'D+n'). useDday는 IATF 심사일 전용이라 로컬 계산. */
function calcDday(dateStr: string | null): string | null {
  if (!dateStr) return null
  const target = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000)
  return diff >= 0 ? `D-${diff}` : `D+${-diff}`
}

const SEV = {
  red: { bg: '#FCEBEB', fg: '#A32D2D', label: '🔴' },
  orange: { bg: '#FAEEDA', fg: '#7A4D05', label: '🟠' },
  yellow: { bg: '#FDF6DC', fg: '#7A6205', label: '🟡' }
} as const

/**
 * SQ 심사 아이템 트랙 (0068/0069) — 심사원 동선(품번→관리계획서→파생문서→현장→인터뷰)을
 * 품번 4종 × 4단계 체크리스트로 관리. 템플릿 C: 좌 품번 목록 380px / 우 상세·미선택 요약.
 */
export function SqTrackPage(): JSX.Element {
  const overview = useSqTrackStore((s) => s.overview)
  const loading = useSqTrackStore((s) => s.loadingOverview)
  const loadOverview = useSqTrackStore((s) => s.loadOverview)
  const selected = useSqTrackStore((s) => s.selected)
  const selectPart = useSqTrackStore((s) => s.selectPart)
  const setAuditDate = useSqTrackStore((s) => s.setAuditDate)

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const dday = calcDday(overview?.auditDate ?? null)

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<ClipboardList className="w-5 h-5" />}
          title="SQ 심사 트랙"
          sub={
            <>
              {overview?.title ?? 'SQ LEVEL-UP 심사'}
              {overview?.goal && <> · 목표 {overview.goal}</>}
              {dday && <span className="ml-1.5 font-bold text-primary">{dday}</span>}
              {' · 품번별 심사 동선(서류→정합성→현장→인터뷰) 체크리스트'}
            </>
          }
          actions={
            <label className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              심사일
              <input
                type="date"
                value={overview?.auditDate ?? ''}
                onChange={(e) => {
                  if (e.target.value) void setAuditDate(e.target.value)
                }}
                className="border border-border rounded-md px-2 py-1 text-[12.5px] bg-card text-foreground"
              />
            </label>
          }
        />
      </div>

      {/* 템플릿 C (19번): 좌 품번 목록 380px 고정 / 우 상세·미선택 요약(공백 금지 규칙④) */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {loading && !overview && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
          )}
          {overview?.parts.map((p) => {
            const active = selected === p.partNo
            const denom = p.total - p.na
            const pct = denom > 0 ? Math.round((p.done / denom) * 100) : 0
            const isPrimary = overview.primaryPartNo === p.partNo
            const openSum = p.openBySeverity.red + p.openBySeverity.orange + p.openBySeverity.yellow
            return (
              <button
                key={p.partNo}
                type="button"
                onClick={() => void selectPart(p.partNo)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2.5 transition-colors border',
                  active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[14px] font-bold tabular-nums">{p.partNo}</span>
                  {isPrimary && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" /> 심사 정본
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {p.partName ?? ''}
                  {p.model ? ` · ${p.model}` : ''}
                  {p.customer ? ` · ${p.customer}` : ''}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">
                    {p.done}/{denom}
                  </span>
                  {openSum > 0 ? (
                    (Object.keys(SEV) as Array<keyof typeof SEV>).map((k) => {
                      const n = p.openBySeverity[k]
                      if (n === 0) return null
                      return (
                        <span
                          key={k}
                          className="text-[10px] font-bold rounded-full px-1.5 py-px shrink-0"
                          style={{ background: SEV[k].bg, color: SEV[k].fg }}
                        >
                          {SEV[k].label}
                          {n}
                        </span>
                      )
                    })
                  ) : (
                    <span
                      className="text-[10px] font-bold rounded-full px-1.5 py-px shrink-0"
                      style={{ background: '#E2F3E2', color: '#1D6B1D' }}
                    >
                      해소
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected ? <SqTrackPartDetail /> : <SqTrackOverview />}
        </div>
      </div>
    </div>
  )
}
