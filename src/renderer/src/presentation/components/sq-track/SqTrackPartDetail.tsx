import { ArrowLeft } from 'lucide-react'
import { useSqTrackStore } from '../../stores/sqTrackStore'
import { SqTrackItemRow } from './SqTrackItemRow'

/** 품번 상세 — 4단계(서류/정합성/현장/인터뷰) 섹션별 체크리스트. */
export function SqTrackPartDetail(): JSX.Element {
  const detail = useSqTrackStore((s) => s.detail)
  const loading = useSqTrackStore((s) => s.loadingDetail)
  const back = useSqTrackStore((s) => s.back)

  if (!detail) {
    return (
      <div className="text-[13px] text-muted-foreground py-10 text-center">
        {loading ? '불러오는 중…' : '품번 정보를 찾을 수 없습니다.'}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={back}
          className="flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground border border-border rounded-md px-2.5 py-1.5 bg-card shrink-0"
        >
          <ArrowLeft size={14} /> 품번 목록
        </button>
        <div className="min-w-0">
          <div className="text-[16px] font-extrabold tabular-nums truncate">
            {detail.partNo}
            <span className="ml-2 text-[12.5px] font-medium text-muted-foreground">
              {detail.partName ?? ''}
              {detail.model ? ` · ${detail.model}` : ''}
              {detail.customer ? ` · ${detail.customer}` : ''}
            </span>
          </div>
          {detail.binderInfo && <div className="text-[11.5px] text-muted-foreground truncate">{detail.binderInfo}</div>}
        </div>
      </div>

      {detail.phases.map((p) => {
        const done = p.items.filter((it) => it.status === 'done' || it.status === 'na').length
        return (
          <section key={p.phase} className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-border bg-secondary/40">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-[12px] font-bold flex items-center justify-center shrink-0">
                {p.phase}
              </span>
              <h2 className="text-[14px] font-bold">{p.label}</h2>
              <span className="ml-auto text-[11.5px] text-muted-foreground tabular-nums">
                {done}/{p.items.length} 처리
              </span>
            </div>
            <div className="divide-y divide-border">
              {p.items.map((it) => (
                <SqTrackItemRow key={it.code} item={it} />
              ))}
            </div>
          </section>
        )
      })}

      {detail.scanRef && (
        <p className="text-[11.5px] text-muted-foreground">원본 스캔: {detail.scanRef}</p>
      )}
    </div>
  )
}
