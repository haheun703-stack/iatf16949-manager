import { ShieldCheck } from 'lucide-react'
import { cn } from '../../../../lib/utils'
import { BAND } from './v3-tokens'
import type { SqReadinessCategory } from '@shared/ipc-types'

/** 헤더 밴드 — 타이틀 + 심사 D-day + SQ 카테고리 슬라이서 */
export function HeaderBand({
  divisionLabel,
  auditDateStr,
  dday,
  categories,
  selectedCat,
  onSelectCat
}: {
  /** 사업부 표시 라벨(company_profile.divisionLabel, 39호 S1). 공백이면 접두 생략. */
  divisionLabel: string
  auditDateStr: string
  dday: number
  categories: SqReadinessCategory[]
  selectedCat: number | null
  onSelectCat: (idx: number | null) => void
}): JSX.Element {
  // 로컬 기준일(toISOString은 UTC라 KST 자정~9시 사이 하루 밀림)
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return (
    <div
      className="rounded-2xl text-white px-6 py-5 shadow-lg flex items-center gap-5 flex-wrap"
      style={{ background: `linear-gradient(120deg, ${BAND.from}, ${BAND.to})` }}
    >
      <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
        <ShieldCheck className="w-7 h-7" />
      </div>
      <div className="min-w-0">
        <h1 className="text-[24px] font-extrabold tracking-tight leading-tight">
          IATF 16949 심사 준비 대시보드
        </h1>
        <div className="text-[13px] text-white/70 mt-0.5">
          {divisionLabel ? `${divisionLabel} · ` : ''}기준일 {todayStr} · 정기 인증심사 {auditDateStr} (
          {dday >= 0 ? 'D-' : 'D+'}
          {Math.abs(dday)})
        </div>
      </div>
      <div className="ml-auto">
        <div className="text-[14px] font-bold tracking-widest text-white/75 mb-1.5">SQ 카테고리</div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => onSelectCat(null)}
            className={cn(
              'text-[13px] font-bold px-3 py-1.5 rounded-lg border transition-colors',
              selectedCat === null
                ? 'bg-white border-white'
                : 'border-white/35 text-white hover:bg-white/10'
            )}
            style={selectedCat === null ? { color: BAND.from } : undefined}
          >
            전체
          </button>
          {categories.map((c, idx) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelectCat(selectedCat === idx ? null : idx)}
              className={cn(
                'text-[13px] font-bold px-3 py-1.5 rounded-lg border transition-colors',
                selectedCat === idx
                  ? 'bg-white border-white'
                  : 'border-white/35 text-white hover:bg-white/10'
              )}
              style={selectedCat === idx ? { color: BAND.from } : undefined}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
