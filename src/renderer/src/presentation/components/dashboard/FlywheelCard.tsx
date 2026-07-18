import { useEffect, useState } from 'react'
import { TrendingUp, Coins } from 'lucide-react'
import type { DraftStats } from '@shared/ipc-types'

const pct = (v: number | null): string => (v == null ? '—' : `${Math.round(v * 100)}%`)

export function FlywheelCard(): JSX.Element | null {
  const [s, setS] = useState<DraftStats | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setS((await window.api.invoke(window.api.channels.AI_DRAFT_STATS, {})) as DraftStats)
      } catch {
        /* noop */
      }
    })()
  }, [])

  if (!s) return null
  const decided = s.approved + s.rejected

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <h2 className="text-sm font-bold flex items-center gap-1.5 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        AI 수용률 · 비용 <span className="text-[12.5px] font-normal text-muted-foreground">쓸수록 정확해지는 지표</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 수용률 */}
        <div>
          <div className="flex items-baseline gap-2 mb-1.5">
            <span className="text-[28px] font-black tabular-nums leading-none">{pct(s.acceptanceRate)}</span>
            <span className="text-[13.5px] text-muted-foreground">수용률{decided ? ` (결재 ${decided}건)` : ''}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13.5px]">
            <span className="text-muted-foreground">제안 <b className="text-foreground">{s.proposed + s.approved + s.rejected}</b></span>
            <span className="text-emerald-600">승인 {s.approved} <span className="text-[12px]">(그대로 {s.approvedAsIs}·수정 {s.approvedEdited})</span></span>
            <span className="text-red-600">거절 {s.rejected}</span>
            <span className="text-amber-600">수정률 {pct(s.editRate)}</span>
          </div>
          {decided === 0 && (
            <p className="text-[12.5px] text-muted-foreground mt-2">
              상단 <b>AI 작성</b>으로 초안을 만들고 검토·수정·결재하면 여기에 수용률·수정패턴이 쌓입니다(= 모델 개선 연료).
            </p>
          )}
        </div>

        {/* 비용 */}
        <div className="md:border-l md:border-border md:pl-4">
          <div className="flex items-baseline gap-2 mb-1.5">
            <Coins className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[20px] font-bold tabular-nums leading-none">${s.cost.totalUsd.toFixed(4)}</span>
            <span className="text-[13.5px] text-muted-foreground">누적 · {s.cost.totalCalls}콜</span>
          </div>
          <div className="space-y-0.5">
            {s.cost.byPurpose.length === 0 ? (
              <p className="text-[12.5px] text-muted-foreground">아직 AI 호출 기록 없음</p>
            ) : (
              s.cost.byPurpose.slice(0, 6).map((p) => (
                <div key={p.purpose} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-muted-foreground">{p.purpose} <span className="opacity-60">×{p.calls}</span></span>
                  <span className="tabular-nums">${p.costUsd.toFixed(4)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
