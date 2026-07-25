import type { ReactNode } from 'react'
import type { ObligationMatrixDto, MatrixCellState } from '@shared/ipc-types'
import { teamTheme, type TeamId } from '@shared/team-theme'
import { cn } from '../../../../lib/utils'

/**
 * DashKit — 템플릿 A(대시보드형) 공통 부품 (17번 §2.5 · 19번 컴포넌트 원칙).
 * 홈·팀별 허브·SQ/IATF 대시보드가 같은 부품을 쓴다 — 화면별 복붙 금지.
 * 색은 전부 app.css 토큰(틴트 문법) — 원색 배경 금지.
 */

export function CardShell({
  title,
  cap,
  actions,
  children,
  className
}: {
  title?: string
  cap?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div className={cn('bg-card border border-border rounded-[14px] shadow-card', className)}>
      {(title || actions) && (
        <div className="flex items-center gap-2.5 px-[18px] pt-4">
          {title && <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">{title}</h2>}
          {cap && <span className="text-[12px] text-muted-foreground">{cap}</span>}
          <span className="flex-1" />
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

/** KPI 스탯 타일 — 큰 굵은 숫자 + 보조 칩(틴트 문법) */
export function KpiTile({
  icon,
  iconTint,
  label,
  value,
  unit,
  chip,
  chipTone = 'fx',
  onClick
}: {
  icon: string
  /** 아이콘 박스 틴트 클래스(bg/text) — 토큰 유틸 */
  iconTint: string
  label: string
  value: string | number
  unit?: string
  chip?: string
  chipTone?: 'up' | 'dn' | 'fx'
  onClick?: () => void
}): JSX.Element {
  const tones = {
    up: 'bg-ok-tint text-ok-ink',
    dn: 'bg-bad-tint text-bad-ink',
    fx: 'bg-muted text-muted-foreground'
  }
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      {...(onClick ? { type: 'button' as const, onClick } : {})}
      className={cn(
        'bg-card border border-border rounded-[14px] shadow-card px-[18px] py-4 text-left',
        onClick && 'hover:shadow-md transition-shadow'
      )}
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-muted-foreground mb-2">
        <span className={cn('w-[26px] h-[26px] rounded-lg flex items-center justify-center text-[13px]', iconTint)}>
          {icon}
        </span>
        {label}
      </div>
      <div className="text-[27px] font-extrabold tabular-nums tracking-[-0.03em] leading-[1.1]">
        {value}
        {unit && <small className="text-[13px] text-faint font-semibold ml-0.5">{unit}</small>}
      </div>
      {chip && (
        <span className={cn('inline-flex mt-1.5 px-2 py-0.5 rounded-md text-[11.5px] font-bold', tones[chipTone])}>
          {chip}
        </span>
      )}
    </Tag>
  )
}

/** 전사/팀 이행률 도넛 — conic-gradient(팀 5색), 라이브러리 0 (17번 §5) */
export function TeamDonut({
  segments,
  centerPct,
  centerCap,
  onPickTeam
}: {
  /** 팀별 조각: 전체 대비 비중(0~1)과 완료/분모 */
  segments: { teamId: TeamId; share: number; done: number; denom: number }[]
  centerPct: number | null
  centerCap: string
  onPickTeam?: (id: TeamId) => void
}): JSX.Element {
  let acc = 0
  const stops: string[] = []
  for (const s of segments) {
    const from = acc * 100
    acc += s.share
    stops.push(`${teamTheme(s.teamId).border} ${from}% ${acc * 100}%`)
  }
  stops.push(`#E9EBEE ${acc * 100}% 100%`)
  return (
    <div className="flex items-center gap-[18px] px-[18px] pb-[18px] pt-3">
      <div
        className="w-[110px] h-[110px] rounded-full relative shrink-0"
        style={{ background: `conic-gradient(${stops.join(', ')})` }}
      >
        <div className="absolute inset-4 bg-card rounded-full" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <b className="text-[19px] tabular-nums tracking-[-0.02em]">{centerPct == null ? '—' : `${centerPct}%`}</b>
          <small className="text-[10px] text-faint font-semibold">{centerCap}</small>
        </div>
      </div>
      <div className="grid gap-1.5 text-[12px] text-muted-foreground min-w-0 flex-1">
        {segments.map((s) => (
          <button
            key={s.teamId}
            type="button"
            onClick={() => onPickTeam?.(s.teamId)}
            className="flex items-center gap-1.5 hover:text-foreground text-left"
            title={`${teamTheme(s.teamId).label} 상세로`}
          >
            <i className="w-[9px] h-[9px] rounded-[3px] shrink-0" style={{ backgroundColor: teamTheme(s.teamId).border }} />
            <span className="truncate">{teamTheme(s.teamId).label}</span>
            <b className="ml-auto text-foreground tabular-nums">{s.done}/{s.denom}</b>
          </button>
        ))}
      </div>
    </div>
  )
}

/** 이행 매트릭스 — 사람×일자 칩 표 (HRMS 근태 패턴, 17번 §3-2 셀 계약) */
const CELL: Record<MatrixCellState, { cls: string; glyph: (n?: number) => string; title: string }> = {
  done: { cls: 'bg-ok-tint text-ok-ink', glyph: () => '✓', title: '완료(작성기록/완료처리)' },
  overdue: { cls: 'bg-bad-tint text-bad-ink', glyph: (n) => (n != null ? String(n) : '·'), title: '연체 — 숫자=연체 일수' },
  due: { cls: 'bg-warn-tint text-warn-ink', glyph: () => '!', title: '오늘 해야 함' },
  data: { cls: 'bg-data-tint text-data-ink', glyph: () => '⚡', title: '데이터 할 일(시스템 발행)' },
  na: { cls: 'bg-muted text-[#B4BAC3]', glyph: () => '—', title: '해당 없음' }
}

export function MatrixBoard({
  matrix,
  personView
}: {
  matrix: ObligationMatrixDto
  /** true=개인별(사람 기준 재그룹), false=팀별 */
  personView?: boolean
}): JSX.Element {
  const dayLabel = (d: string): string => {
    if (d === matrix.today) return '오늘'
    const [, , dd] = d.split('-')
    return String(Number(dd))
  }
  const groups = personView
    ? (() => {
        const by = new Map<string, { label: string; rows: ObligationMatrixDto['teams'][0]['rows'] }>()
        for (const t of matrix.teams)
          for (const r of t.rows) {
            const k = r.person
            if (!by.has(k)) by.set(k, { label: k, rows: [] })
            by.get(k)!.rows.push(r)
          }
        return [...by.values()]
      })()
    : matrix.teams.map((t) => ({ label: t.label, rows: t.rows }))

  return (
    <div className="px-[18px] pb-2 overflow-x-auto">
      <table className="border-separate border-spacing-y-1 w-full">
        <tbody>
          {groups.map((g, gi) => (
            <GroupRows key={g.label + gi} label={g.label} rows={g.rows} days={matrix.days} dayLabel={dayLabel} first={gi === 0} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GroupRows({
  label,
  rows,
  days,
  dayLabel,
  first
}: {
  label: string
  rows: ObligationMatrixDto['teams'][0]['rows']
  days: string[]
  dayLabel: (d: string) => string
  first: boolean
}): JSX.Element {
  return (
    <>
      <tr>
        <th className={cn('text-left pl-2 text-[11px] font-bold text-faint min-w-[150px]', !first && 'pt-2.5')}>{label}</th>
        {days.map((d) => (
          <th key={d} className="text-center text-[11px] font-bold text-faint px-[3px] py-1">
            {first ? dayLabel(d) : ''}
          </th>
        ))}
      </tr>
      {rows.map((r) => (
        <tr key={r.key}>
          <td className="text-left px-2 py-1.5 bg-[#FAFBFC] rounded-l-lg whitespace-nowrap">
            <div className="leading-tight">
              <b className={cn('block text-[12.5px]', r.data && 'text-data-ink')}>{r.person}</b>
              <span className="text-[10.5px] text-faint">{r.label}</span>
            </div>
          </td>
          {r.cells.map((c) => {
            const spec = CELL[c.s]
            return (
              <td key={c.d} className="text-center px-[3px] py-0.5" title={`${c.d} — ${spec.title}`}>
                <span
                  className={cn(
                    'inline-flex w-[26px] h-[26px] rounded-lg items-center justify-center text-[10.5px] font-extrabold',
                    spec.cls
                  )}
                >
                  {spec.glyph(c.n)}
                </span>
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

export function MatrixLegend(): JSX.Element {
  const items: { s: MatrixCellState; label: string }[] = [
    { s: 'done', label: '✓ 완료(작성기록)' },
    { s: 'overdue', label: '숫자 = 연체 일수' },
    { s: 'due', label: '! 오늘 해야 함' },
    { s: 'data', label: '⚡ 데이터 할 일(시스템 발행)' },
    { s: 'na', label: '— 해당 없음' }
  ]
  return (
    <div className="flex gap-4 px-[18px] pb-4 text-[11.5px] text-muted-foreground flex-wrap">
      {items.map((i) => (
        <span key={i.s} className="inline-flex items-center gap-1.5">
          <i className={cn('w-[13px] h-[13px] rounded', CELL[i.s].cls.split(' ')[0])} />
          {i.label}
        </span>
      ))}
    </div>
  )
}

/** 세그 탭(팀별/개인별) — 목업 seg 문법 */
export function SegTabs<T extends string>({
  value,
  options,
  onChange
}: {
  value: T
  options: { key: T; label: string }[]
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="flex bg-muted rounded-[9px] p-[3px] text-[12px] font-bold">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            'px-3 py-[5px] rounded-[7px] transition-colors',
            value === o.key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
