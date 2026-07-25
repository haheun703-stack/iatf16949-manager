import { useState } from 'react'
import type { ReactNode } from 'react'
import type { ObligationMatrixDto, ObligationMatrixCellDto, MatrixCellState } from '@shared/ipc-types'
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
  className,
  status = 'ready',
  onRetry,
  skeleton
}: {
  title?: string
  cap?: string
  actions?: ReactNode
  children: ReactNode
  className?: string
  /** "말 없는 공백" 금지(19번 규칙④ 로딩판, 7/26 사장님 제보): loading=스켈레톤 · error=재시도 */
  status?: 'ready' | 'loading' | 'error'
  onRetry?: () => void
  skeleton?: ReactNode
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
      {status === 'loading' ? (
        (skeleton ?? <ChipGridSkeleton />)
      ) : status === 'error' ? (
        <div className="px-[18px] py-8 flex items-center gap-3 text-[13px] text-muted-foreground">
          불러오지 못했습니다.
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="h-8 px-3 rounded-lg text-[12.5px] font-bold bg-primary/10 text-primary hover:bg-primary/20"
            >
              다시 시도
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  )
}

/** 로딩 스켈레톤 — 회색 칩 그리드(매트릭스류 기본) */
export function ChipGridSkeleton({ rows = 5, cols = 12 }: { rows?: number; cols?: number }): JSX.Element {
  return (
    <div className="px-[18px] py-4 animate-pulse" aria-hidden>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-1.5 mb-2">
          <span className="w-[140px] h-[26px] rounded-lg bg-muted shrink-0" />
          {Array.from({ length: cols }, (_, c) => (
            <span key={c} className="w-[26px] h-[26px] rounded-lg bg-muted shrink-0" />
          ))}
        </div>
      ))}
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

/** 이행 매트릭스 — 사람×일자 칩 표 (HRMS 근태 패턴, 17번 §3-2 셀 계약)
 *  팀별 탭 = 사람당 1행 집약(셀=그날 최악 상태, 7/26 사장님 지적) — 클릭 시 의무별 아코디언.
 *  'na(—)'는 칩이 아니라 옅은 점 — 유의미 셀(✓·연체·⚡·!)만 시각 무게를 갖는다. */
const CELL: Record<Exclude<MatrixCellState, 'na'>, { cls: string; glyph: (n?: number) => string; title: string }> = {
  done: { cls: 'bg-ok-tint text-ok-ink', glyph: () => '✓', title: '완료(작성기록/완료처리)' },
  overdue: { cls: 'bg-bad-tint text-bad-ink', glyph: (n) => (n != null ? String(n) : '·'), title: '연체 — 숫자=연체 일수' },
  due: { cls: 'bg-warn-tint text-warn-ink', glyph: () => '!', title: '오늘 해야 함' },
  data: { cls: 'bg-data-tint text-data-ink', glyph: () => '⚡', title: '데이터 할 일(시스템 발행)' }
}

function Cell({ c }: { c: ObligationMatrixCellDto }): JSX.Element {
  if (c.s === 'na') {
    return (
      <td className="text-center px-[3px] py-0.5" title={c.d + ' — 해당 없음'}>
        <span className="inline-flex w-[26px] h-[26px] items-center justify-center">
          <i className="w-[5px] h-[5px] rounded-full bg-[#E3E6EA]" />
        </span>
      </td>
    )
  }
  const spec = CELL[c.s]
  return (
    <td className="text-center px-[3px] py-0.5" title={c.d + ' — ' + spec.title}>
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
}

type MatrixRow = ObligationMatrixDto['teams'][0]['rows'][0]
type PersonAgg = { key: string; person: string; sub: string; agg: ObligationMatrixCellDto[]; items: MatrixRow[] }

/** 그날 최악 상태로 병합: 연체 > 오늘 > 데이터 > 완료 > 없음. 숫자=최대 연체일 하나만. */
function worstCells(rows: MatrixRow[], days: string[]): ObligationMatrixCellDto[] {
  const rank: Record<MatrixCellState, number> = { overdue: 4, due: 3, data: 2, done: 1, na: 0 }
  return days.map((d, i) => {
    let best: ObligationMatrixCellDto = { d, s: 'na' }
    let maxN: number | undefined
    for (const r of rows) {
      const c = r.cells[i]
      if (!c) continue
      if (c.s === 'overdue' && c.n != null) maxN = maxN == null ? c.n : Math.max(maxN, c.n)
      if (rank[c.s] > rank[best.s]) best = { d, s: c.s }
    }
    if (best.s === 'overdue') return { d, s: 'overdue', n: maxN }
    return best
  })
}

export function MatrixBoard({
  matrix,
  personView
}: {
  matrix: ObligationMatrixDto
  /** true=개인별(의무별 상세 나열), false=팀별(사람당 1행 집약) */
  personView?: boolean
}): JSX.Element {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const toggle = (k: string): void =>
    setOpen((prev) => {
      const n = new Set(prev)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
  const dayLabel = (d: string): string => {
    if (d === matrix.today) return '오늘'
    const [, , dd] = d.split('-')
    return String(Number(dd))
  }

  type Group = { label: string; persons: PersonAgg[] }
  const groups: Group[] = personView
    ? (() => {
        // 개인별 = 사람 헤더 아래 의무별 상세 나열(펼친 전모)
        const by = new Map<string, MatrixRow[]>()
        for (const t of matrix.teams)
          for (const r of t.rows) {
            if (!by.has(r.person)) by.set(r.person, [])
            by.get(r.person)!.push(r)
          }
        return [...by.entries()].map(([person, rows]) => ({
          label: person,
          persons: rows.map((r) => ({
            key: r.key,
            person: r.data ? r.person : r.label,
            sub: r.data ? r.label : '',
            agg: r.cells,
            items: []
          }))
        }))
      })()
    : matrix.teams.map((t) => {
        const humans = new Map<string, MatrixRow[]>()
        const dataRows: MatrixRow[] = []
        for (const r of t.rows) {
          if (r.data) dataRows.push(r)
          else {
            if (!humans.has(r.person)) humans.set(r.person, [])
            humans.get(r.person)!.push(r)
          }
        }
        const persons: PersonAgg[] = [...humans.entries()].map(([person, rows]) => {
          const openCnt = rows.filter((r) => r.cells.some((c) => c.s === 'overdue' || c.s === 'due')).length
          return {
            key: t.label + '|' + person,
            person,
            sub:
              '의무 ' + rows.length + '건' + (openCnt > 0 ? ' · 미이행 ' + openCnt : '') +
              (rows.length > 1 ? ' · 펼치기' : ''),
            agg: worstCells(rows, matrix.days),
            items: rows.length > 1 ? rows : []
          }
        })
        if (dataRows.length > 0) {
          // 팀당 [데이터] 집계 1행 — 심사갭·MES 등 합쳐 최악 상태로
          persons.push({
            key: t.label + '|data',
            person: '[데이터]',
            sub: dataRows.map((r) => r.label).join(' · '),
            agg: worstCells(dataRows, matrix.days),
            items: []
          })
        }
        return { label: t.label, persons }
      })

  return (
    <div className="px-[18px] pb-2 overflow-x-auto">
      <table className="border-separate border-spacing-y-1 w-full">
        <tbody>
          {groups.map((g, gi) => (
            <MatrixGroup
              key={g.label + gi}
              group={g}
              days={matrix.days}
              dayLabel={dayLabel}
              first={gi === 0}
              open={open}
              onToggle={toggle}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MatrixGroup({
  group,
  days,
  dayLabel,
  first,
  open,
  onToggle
}: {
  group: { label: string; persons: PersonAgg[] }
  days: string[]
  dayLabel: (d: string) => string
  first: boolean
  open: Set<string>
  onToggle: (k: string) => void
}): JSX.Element {
  return (
    <>
      <tr>
        <th className={cn('text-left pl-2 text-[11px] font-bold text-faint min-w-[150px]', !first && 'pt-2.5')}>{group.label}</th>
        {days.map((d) => (
          <th key={d} className="text-center text-[11px] font-bold text-faint px-[3px] py-1">
            {first ? dayLabel(d) : ''}
          </th>
        ))}
      </tr>
      {group.persons.map((p) => (
        <PersonRows key={p.key} p={p} expanded={open.has(p.key)} onToggle={onToggle} />
      ))}
    </>
  )
}

function PersonRows({
  p,
  expanded,
  onToggle
}: {
  p: PersonAgg
  expanded: boolean
  onToggle: (k: string) => void
}): JSX.Element {
  const expandable = p.items.length > 0
  const isData = p.person === '[데이터]'
  return (
    <>
      <tr
        className={cn(expandable && 'cursor-pointer')}
        onClick={expandable ? () => onToggle(p.key) : undefined}
        title={expandable ? (expanded ? '접기' : '의무별로 펼치기') : undefined}
      >
        <td className="text-left px-2 py-1.5 bg-[#FAFBFC] rounded-l-lg whitespace-nowrap">
          <div className="leading-tight flex items-center gap-1">
            {expandable && <span className="text-[10px] text-faint w-3 shrink-0">{expanded ? '▾' : '▸'}</span>}
            <span className="min-w-0">
              <b className={cn('block text-[12.5px]', isData && 'text-data-ink')}>{p.person}</b>
              <span className="block text-[10.5px] text-faint truncate max-w-[180px]">{p.sub}</span>
            </span>
          </div>
        </td>
        {p.agg.map((c) => (
          <Cell key={c.d} c={c} />
        ))}
      </tr>
      {expanded &&
        p.items.map((r) => (
          <tr key={r.key}>
            <td className="text-left pl-7 pr-2 py-1 whitespace-nowrap">
              <span className="text-[11px] text-muted-foreground">{r.label}</span>
            </td>
            {r.cells.map((c) => (
              <Cell key={c.d} c={c} />
            ))}
          </tr>
        ))}
    </>
  )
}

export function MatrixLegend(): JSX.Element {
  const items: { s: Exclude<MatrixCellState, 'na'>; label: string }[] = [
    { s: 'done', label: '✓ 완료(작성기록)' },
    { s: 'overdue', label: '숫자 = 최대 연체 일수' },
    { s: 'due', label: '! 오늘 해야 함' },
    { s: 'data', label: '⚡ 데이터 할 일(시스템 발행)' }
  ]
  return (
    <div className="flex gap-4 px-[18px] pb-4 text-[11.5px] text-muted-foreground flex-wrap">
      {items.map((i) => (
        <span key={i.s} className="inline-flex items-center gap-1.5">
          <i className={cn('w-[13px] h-[13px] rounded', CELL[i.s].cls.split(' ')[0])} />
          {i.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5"><i className="w-[5px] h-[5px] rounded-full bg-[#E3E6EA]" /> 해당 없음</span>
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
