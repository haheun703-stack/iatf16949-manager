import type { ReactNode } from 'react'

/**
 * 공통 페이지 헤더 — 전 화면 단일 규격 (2026-07-13 UI 업그레이드 P2, 7/18 사장님 위계 지시로 확대).
 * 제목 22px/800 진한색 · 부제 13.5px — "제목이 크고 진하게, 본문은 그보다 작게".
 * 새 화면은 반드시 이 컴포넌트를 사용할 것(자체 h1/h2 헤더 금지). 대시보드(밴드)만 예외.
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
  return (
    <div className="flex items-center gap-3 pb-4 mb-5 border-b border-border">
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
