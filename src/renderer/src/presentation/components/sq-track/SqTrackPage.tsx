import { useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
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

/**
 * SQ 심사 아이템 트랙 (0068/0069) — 심사원 동선(품번→관리계획서→파생문서→현장→인터뷰)을
 * 품번 4종 × 4단계 체크리스트로 관리. 42항목 준비도와 별개의 품번 축.
 */
export function SqTrackPage(): JSX.Element {
  const overview = useSqTrackStore((s) => s.overview)
  const loadOverview = useSqTrackStore((s) => s.loadOverview)
  const selected = useSqTrackStore((s) => s.selected)
  const setAuditDate = useSqTrackStore((s) => s.setAuditDate)

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  const dday = calcDday(overview?.auditDate ?? null)

  return (
    <div>
      <PageHeader
        icon={<ClipboardList size={18} />}
        title="SQ 심사 트랙"
        sub={
          <>
            {overview?.title ?? 'SQ LEVEL-UP 심사'}
            {overview?.goal && <> · 목표 {overview.goal}</>}
            {dday && (
              <span className="ml-1.5 font-bold text-primary">
                {dday}
              </span>
            )}
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
      {selected ? <SqTrackPartDetail /> : <SqTrackOverview />}
    </div>
  )
}
