import { forwardRef } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { BriefingCard } from '../BriefingCard'
import { ReadinessCard } from '../ReadinessCard'
import { AbsenceCard } from '../AbsenceCard'
import { MockAuditCard } from '../MockAuditCard'
import { FlywheelCard } from '../FlywheelCard'
import { IsirCompletenessCard } from '../IsirCompletenessCard'

/**
 * AI 인사이트 접이식 — 기존 AI 카드 6종의 강등 자리(기능 제거 아님).
 * 대시보드 정면은 결정론 데이터가 차지하고, AI는 여기 + 데이터 옆 ✦각주로만 등장.
 */
export const AiInsightsFold = forwardRef<
  HTMLDivElement,
  { open: boolean; onToggle: () => void }
>(function AiInsightsFold({ open, onToggle }, ref): JSX.Element {
  return (
    <div ref={ref} className="bg-card border border-dashed border-border rounded-xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
        <span className="text-[10px] font-extrabold px-2 py-[2px] rounded-full bg-sky-100 text-sky-700">
          AI 인사이트 6
        </span>
        <span className="text-[12px] font-bold text-muted-foreground">
          브리핑 · 심사예측 · 부재감지 · 모의심사 · 수용률 · ISIR — 펼쳐서 보기
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto shrink-0" />
        )}
      </button>
      {open && (
        <div className="border-t border-border p-4 space-y-4 bg-muted/20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BriefingCard />
            <ReadinessCard />
          </div>
          <AbsenceCard />
          <MockAuditCard />
          <FlywheelCard />
          <IsirCompletenessCard />
        </div>
      )}
    </div>
  )
})
