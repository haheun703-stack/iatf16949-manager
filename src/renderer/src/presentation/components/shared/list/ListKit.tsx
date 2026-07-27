import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { cn } from '../../../../lib/utils'

/**
 * ListKit — 템플릿 B(목록형·K-Mobility) 공통 부품 (19번 §2.5 · 17번 §0.9).
 * 문법 = ①숫자 요약 밴드(클릭=필터 점프) ②큰 검색창+필터 ③칼럼 헤더 붙은 행 리스트.
 * doc-browse 가 시각 정본 — 나머지 B 화면은 이 부품을 쓴다(화면별 복붙 금지).
 * 색은 app.css 토큰(틴트 문법)만 — 원색 배경 금지.
 */

const TONE: Record<string, { chip: string; ring: string }> = {
  muted: { chip: 'bg-muted text-muted-foreground', ring: 'ring-foreground/20' },
  primary: { chip: 'bg-primary/10 text-primary', ring: 'ring-primary/40' },
  ok: { chip: 'bg-ok-tint text-ok-ink', ring: 'ring-ok-ink/40' },
  warn: { chip: 'bg-warn-tint text-warn-ink', ring: 'ring-warn-ink/40' },
  bad: { chip: 'bg-bad-tint text-bad-ink', ring: 'ring-bad-ink/40' },
  data: { chip: 'bg-data-tint text-data-ink', ring: 'ring-data-ink/40' }
}

export type StatTone = keyof typeof TONE

/** 숫자 요약 타일 — 클릭하면 그 조건으로 목록을 거른다(건수 붙은 탭 겸용). */
export function StatTile({
  label,
  value,
  icon,
  tone = 'muted',
  active,
  onClick
}: {
  label: string
  value: number | string
  icon?: ReactNode
  tone?: StatTone
  active?: boolean
  onClick?: () => void
}): JSX.Element {
  const t = TONE[tone] ?? TONE.muted
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'flex items-center gap-3 rounded-[14px] border bg-card px-4 py-3 text-left shadow-card transition-colors',
        active ? cn('border-transparent ring-2', t.ring) : 'border-border',
        onClick && 'hover:bg-muted/40'
      )}
    >
      {icon && (
        <span className={cn('w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0', t.chip)}>{icon}</span>
      )}
      <span className="leading-tight min-w-0">
        <span className="block text-[11.5px] font-semibold text-muted-foreground truncate">{label}</span>
        <span className="block text-[22px] font-extrabold tabular-nums tracking-[-0.02em]">{value}</span>
      </span>
    </Tag>
  )
}

/** 숫자 밴드 — 타일 2~6개를 균등 배치. */
export function StatBand({ children }: { children: ReactNode }): JSX.Element {
  return <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{children}</div>
}

/** 큰 검색창 + 필터 슬롯(select 등을 children 으로). */
export function SearchBar({
  value,
  onChange,
  placeholder,
  children
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  children?: ReactNode
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-card text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      {children}
    </div>
  )
}

/** 필터 select — 검색바 안에서 쓰는 공통 스타일. */
export function FilterSelect<T extends string>({
  value,
  onChange,
  options,
  className
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
}): JSX.Element {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn('h-10 px-3 rounded-lg border border-border bg-card text-[13px] font-medium', className)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/** 행 리스트 껍데기 — 칼럼 헤더(cols)를 붙이고 행들을 감싼다. */
export function ListShell({
  cols,
  children,
  className
}: {
  /** 칼럼 헤더 셀. 미지정 시 헤더 줄 생략. */
  cols?: ReactNode
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div className={cn('rounded-[14px] border border-border bg-card shadow-card overflow-hidden', className)}>
      {cols && (
        <div className="flex items-center gap-3 px-4 py-1.5 bg-muted/40 border-b border-border text-[10.5px] font-bold text-muted-foreground uppercase tracking-wide">
          {cols}
        </div>
      )}
      {children}
    </div>
  )
}

/** 그룹 제목 줄 — 주기·조항 등으로 묶을 때. */
export function GroupLabel({
  bar,
  title,
  cap
}: {
  /** 좌측 색 막대 클래스(bg-*) */
  bar?: string
  title: string
  cap?: string
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 mb-2">
      {bar && <span className={cn('w-1.5 h-4 rounded-full', bar)} />}
      <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">{title}</h2>
      {cap && <span className="text-[12px] text-muted-foreground">{cap}</span>}
    </div>
  )
}

/** 결과 없음 — 필터 초기화 유도(19번 규칙④: 말 없는 공백 금지). */
export function EmptyResult({
  message,
  onReset
}: {
  message: string
  onReset?: () => void
}): JSX.Element {
  return (
    <div className="text-center py-16 text-[13px] text-muted-foreground">
      {message}{' '}
      {onReset && (
        <button type="button" onClick={onReset} className="text-primary font-semibold hover:underline">
          필터 초기화
        </button>
      )}
    </div>
  )
}
