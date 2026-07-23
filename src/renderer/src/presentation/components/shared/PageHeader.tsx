import type { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useUIStore, PAGE_LABELS } from '../../stores/uiStore'
import { goBackWithGuard } from '../../lib/navBack'

/**
 * 공통 페이지 헤더 — 전 화면 단일 규격 (2026-07-13 UI 업그레이드 P2, 7/18 사장님 위계 지시로 확대).
 * 제목 22px/800 진한색 · 부제 13.5px — "제목이 크고 진하게, 본문은 그보다 작게".
 * 새 화면은 반드시 이 컴포넌트를 사용할 것(자체 h1/h2 헤더 금지). 대시보드(밴드)만 예외.
 * P11(2026-07-23): 히스토리가 있으면 좌측에 [← 직전 화면명] 뒤로가기 버튼.
 */
export function PageHeader({
  icon,
  title,
  sub,
  actions
}: {
  icon?: ReactNode
  title: string
  sub?: ReactNode
  actions?: ReactNode
}): JSX.Element {
  const prevPage = useUIStore((s) => (s.history.length > 0 ? s.history[s.history.length - 1].page : null))

  return (
    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border">
      {prevPage && (
        <button
          type="button"
          onClick={goBackWithGuard}
          title={`뒤로 (${PAGE_LABELS[prevPage]})  ·  Alt+←`}
          className="flex items-center gap-1 pl-1.5 pr-2.5 py-1.5 rounded-lg text-[13px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="max-w-[140px] truncate">{PAGE_LABELS[prevPage]}</span>
        </button>
      )}
      {icon && (
        <div className="w-9 h-9 rounded-lg bg-secondary text-primary flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div className="min-w-0">
        <h1 className="text-[22px] font-extrabold tracking-tight leading-tight truncate text-foreground">{title}</h1>
        {sub && <div className="text-[13.5px] text-muted-foreground mt-1">{sub}</div>}
      </div>
      {actions && <div className="ml-auto flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
