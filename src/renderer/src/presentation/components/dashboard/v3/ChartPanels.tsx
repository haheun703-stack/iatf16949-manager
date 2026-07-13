import { useMemo, type ReactNode } from 'react'
import { cn } from '../../../../lib/utils'
import { useUIStore } from '../../../stores/uiStore'
import { useAiAuthorStore } from '../../../stores/aiAuthorStore'
import { TEAMS, type TeamTheme } from '@shared/team-theme'
import type { SqReadinessDto, SqReadinessItem, TeamSummaryDto } from '@shared/ipc-types'
import { CAT_COLORS, STATUS, heatColor } from './v3-tokens'

/* ──────────────────────── 공통 패널 껍데기 ──────────────────────── */

function Panel({
  title,
  sub,
  children,
  className
}: {
  title: string
  sub?: ReactNode
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <div className={cn('bg-card border border-border rounded-xl shadow-sm p-5 flex flex-col', className)}>
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {sub && <div className="text-[11px] text-muted-foreground mb-3">{sub}</div>}
      {children}
    </div>
  )
}

/* ──────────────────────── 팀 레일 ──────────────────────── */

/** 좌측 팀 레일 — 전체(팀허브)·7팀(팀 상세) 바로가기 */
export function TeamRail(): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedTeam = useUIStore((s) => s.setSelectedTeam)
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-3 flex flex-col gap-2 lg:row-span-2">
      <div className="text-[12px] font-extrabold text-muted-foreground px-1 mb-0.5">팀</div>
      <button
        type="button"
        onClick={() => setPage('home')}
        className="flex-1 min-h-[40px] text-[13.5px] font-bold text-white rounded-lg px-1.5 hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#2a78d6' }}
      >
        전체
      </button>
      {TEAMS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => {
            setSelectedTeam(t.id)
            setPage('team-detail')
          }}
          className="flex-1 min-h-[40px] text-[13.5px] font-bold rounded-lg px-1.5 hover:opacity-80 transition-opacity"
          style={{ backgroundColor: t.tintBg, color: t.darkText }}
        >
          {t.label.replace('팀', '').replace('경영·보증', '')}
        </button>
      ))}
    </div>
  )
}

/* ──────────────────────── ① 도넛: 카테고리별 미충족 ──────────────────────── */

export function DonutUnmet({
  readiness,
  selectedCat
}: {
  readiness: SqReadinessDto
  selectedCat: number | null
}): JSX.Element {
  const slices = readiness.categories.map((c, idx) => ({
    name: c.name,
    color: CAT_COLORS[idx % CAT_COLORS.length],
    count: c.items.filter((i) => i.signal === 'red').length
  }))
  const total = slices.reduce((s, x) => s + x.count, 0)
  const itemTotal = readiness.categories.reduce((s, c) => s + c.items.length, 0)

  // conic-gradient 세그먼트(세그먼트 사이 2deg 갭)
  const gradient = useMemo(() => {
    if (total === 0) return `conic-gradient(${STATUS.track} 0deg 360deg)`
    const gap = 2
    const usable = 360 - gap * slices.filter((s) => s.count > 0).length
    let acc = 0
    const parts: string[] = []
    for (const s of slices) {
      if (s.count === 0) continue
      const span = (s.count / total) * usable
      parts.push(`${s.color} ${acc}deg ${acc + span}deg`)
      acc += span
      parts.push(`var(--card, #fff) ${acc}deg ${acc + gap}deg`)
      acc += gap
    }
    return `conic-gradient(${parts.join(', ')})`
  }, [slices, total])

  return (
    <Panel title="미충족 분포 — 카테고리" sub={`${itemTotal}항목 중 미충족 ${total} · 항목 수 기준`}>
      <div className="flex items-center gap-6 flex-1">
        <div
          className="w-[180px] h-[180px] xl:w-[210px] xl:h-[210px] rounded-full relative shrink-0"
          style={{ background: gradient }}
          role="img"
          aria-label="카테고리별 미충족 도넛 차트"
        >
          <div className="absolute inset-[24%] rounded-full bg-card" />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <b className="text-[32px] font-extrabold" style={{ color: STATUS.critical }}>
              {total}
            </b>
            <span className="text-[11px] text-muted-foreground">미충족</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 text-[12.5px] min-w-0 flex-1">
          {slices.map((s, idx) => (
            <div
              key={s.name}
              className={cn(
                'flex items-center gap-1.5 text-muted-foreground',
                selectedCat !== null && selectedCat !== idx && 'opacity-40'
              )}
            >
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="truncate">{s.name}</span>
              <b className="ml-auto pl-2 text-foreground tabular-nums">{s.count}</b>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

/* ──────────────────────── ② 팀별 신호등 스택 컬럼 ──────────────────────── */

export function TeamSignalColumns({
  teams,
  codeToCat,
  selectedCat
}: {
  teams: TeamSummaryDto[]
  codeToCat: Map<string, number>
  selectedCat: number | null
}): JSX.Element {
  const themeById = new Map<string, TeamTheme>(TEAMS.map((t) => [t.id, t]))
  const cols = teams
    .map((t) => {
      const items =
        selectedCat === null ? t.items : t.items.filter((i) => codeToCat.get(i.code) === selectedCat)
      return {
        id: t.teamId,
        label: (themeById.get(t.teamId)?.label ?? t.teamId).replace('팀', '').replace('경영·보증', ''),
        green: items.filter((i) => i.signal === 'green').length,
        yellow: items.filter((i) => i.signal === 'yellow').length,
        red: items.filter((i) => i.signal === 'red').length,
        gray: items.filter((i) => i.signal === 'gray').length
      }
    })
    .sort((a, b) => b.red - a.red)
  const max = Math.max(1, ...cols.map((c) => c.green + c.yellow + c.red + c.gray))

  const seg = (n: number, color: string, ink = '#fff'): JSX.Element | null =>
    n > 0 ? (
      <div
        className="rounded-[3px] flex items-center justify-center text-[11.5px] font-extrabold"
        style={{ height: `${(n / max) * 100}%`, minHeight: 10, backgroundColor: color, color: ink }}
      >
        {n}
      </div>
    ) : null

  return (
    <Panel title="팀별 SQ 신호등" sub="항목 수 · 미충족 많은 순">
      <div className="flex items-end gap-3 flex-1 min-h-[220px] relative px-1">
        {[25, 50, 75].map((p) => (
          <div
            key={p}
            className="absolute left-0 right-0 border-t border-dashed border-border"
            style={{ bottom: `${p}%` }}
          />
        ))}
        {cols.map((c) => (
          <div
            key={c.id}
            className="flex-1 h-full flex flex-col justify-end gap-[2px] relative z-[1]"
            title={`${c.label}: 충족${c.green} 진행${c.yellow} 미충족${c.red} 측정불가${c.gray}`}
          >
            {seg(c.gray, STATUS.neutral, '#142438')}
            {seg(c.red, STATUS.critical)}
            {seg(c.yellow, STATUS.warning)}
            {seg(c.green, STATUS.good)}
          </div>
        ))}
      </div>
      <div className="flex gap-3 px-1 pt-2">
        {cols.map((c) => (
          <span key={c.id} className="flex-1 text-center text-[11.5px] font-bold text-muted-foreground truncate">
            {c.label}
          </span>
        ))}
      </div>
      <div className="flex gap-3.5 flex-wrap text-[11px] text-muted-foreground pt-2.5">
        {(
          [
            ['충족', STATUS.good],
            ['진행', STATUS.warning],
            ['미충족', STATUS.critical],
            ['측정불가', STATUS.neutral]
          ] as const
        ).map(([label, color]) => (
          <span key={label}>
            <span className="inline-block w-2 h-2 rounded-sm mr-1 align-[-1px]" style={{ backgroundColor: color }} />
            {label}
          </span>
        ))}
      </div>
    </Panel>
  )
}

/* ──────────────────────── ③ 히트맵: 팀 × 카테고리 미충족 ──────────────────────── */

export function UnmetHeatmap({
  teams,
  readiness,
  codeToCat,
  onHotspotClick
}: {
  teams: TeamSummaryDto[]
  readiness: SqReadinessDto
  codeToCat: Map<string, number>
  onHotspotClick: () => void
}): JSX.Element {
  const themeById = new Map<string, TeamTheme>(TEAMS.map((t) => [t.id, t]))
  const catNames = readiness.categories.map((c) => c.name)

  const rows = teams
    .map((t) => {
      const cells = catNames.map((_, ci) =>
        t.items.filter((i) => i.signal === 'red' && codeToCat.get(i.code) === ci).length
      )
      return {
        id: t.teamId,
        label: themeById.get(t.teamId)?.label ?? t.teamId,
        cells,
        total: cells.reduce((s, v) => s + v, 0)
      }
    })
    .sort((a, b) => b.total - a.total)

  const max = Math.max(0, ...rows.flatMap((r) => r.cells))
  const colTotals = catNames.map((_, ci) => rows.reduce((s, r) => s + r.cells[ci], 0))

  return (
    <Panel
      title="미충족 히트맵 — 팀 × 카테고리"
      sub={
        <>
          칸 = 미충족 수 · 빨간 테두리 = 최다 핫스팟 · <b>✦ 핫스팟 클릭 → 모의심사 예상질문</b> (공동책임 중복 집계)
        </>
      }
    >
      {/* h-full + table-fixed: 본문 행이 패널 높이를 나눠 갖고, 카테고리 컬럼은 균등폭(치우침 방지) */}
      <div className="flex-1 min-h-0 overflow-x-auto">
        <table className="w-full h-full table-fixed border-collapse tabular-nums">
          <colgroup>
            <col style={{ width: 104 }} />
            {catNames.map((n) => (
              <col key={n} />
            ))}
            <col style={{ width: 44 }} />
          </colgroup>
          <thead>
            <tr style={{ height: 30 }}>
              <th />
              {catNames.map((n) => (
                <th key={n} className="text-[11.5px] font-extrabold text-muted-foreground px-1 text-center">
                  {n.replace('관리', '').replace('체제', '')}
                </th>
              ))}
              <th className="text-[11.5px] font-extrabold text-muted-foreground px-1">계</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <th className="text-right text-[12px] font-bold text-muted-foreground pr-2 truncate">
                  {r.label.replace('경영·보증', '')}
                </th>
                {r.cells.map((v, ci) => {
                  const { bg, ink } = heatColor(v, max)
                  const hotspot = max > 0 && v === max
                  return (
                    <td key={ci} className="p-[3px] h-full">
                      <div
                        role={hotspot ? 'button' : undefined}
                        onClick={hotspot ? onHotspotClick : undefined}
                        title={
                          hotspot
                            ? `✦ 최다 핫스팟 — ${r.label} × ${catNames[ci]} ${v}건 · 클릭 → 모의심사 예상질문`
                            : undefined
                        }
                        className={cn(
                          'rounded-[5px] text-[12.5px] font-bold h-full min-h-[30px] flex items-center justify-center',
                          hotspot && 'cursor-pointer'
                        )}
                        style={{
                          backgroundColor: bg,
                          color: v > 0 ? ink : 'transparent',
                          outline: hotspot ? `2px solid ${STATUS.critical}` : undefined,
                          outlineOffset: -2
                        }}
                      >
                        {v || 0}
                      </div>
                    </td>
                  )
                })}
                <td className="text-center text-[12.5px] font-extrabold">{r.total}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ height: 32 }}>
              <th className="text-right text-[12.5px] font-bold text-muted-foreground pr-2">계</th>
              {colTotals.map((v, ci) => (
                <td key={ci} className="text-center text-[12.5px] font-extrabold">
                  {v}
                </td>
              ))}
              <td className="text-center text-[12.5px] font-extrabold">
                {colTotals.reduce((s, v) => s + v, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  )
}

/* ──────────────────────── ④ 미충족 TOP — 배점순 ──────────────────────── */

export function TopUnmet({
  readiness,
  selectedCat
}: {
  readiness: SqReadinessDto
  selectedCat: number | null
}): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const openAuthor = useAiAuthorStore((s) => s.setOpen)

  const reds: Array<SqReadinessItem & { catIdx: number }> = readiness.categories.flatMap((c, idx) =>
    c.items.filter((i) => i.signal === 'red').map((i) => ({ ...i, catIdx: idx }))
  )
  const top = reds
    .filter((i) => selectedCat === null || i.catIdx === selectedCat)
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
  const max = Math.max(1, ...top.map((i) => i.points))

  return (
    <Panel title="미충족 TOP — 배점순" sub="여기부터 잡으면 점수가 가장 빨리 오릅니다">
      <div className="flex flex-col gap-3.5 flex-1 justify-center">
        {top.length === 0 && (
          <div className="text-[12px] text-muted-foreground text-center py-4">미충족 항목 없음 🎉</div>
        )}
        {top.map((i) => (
          <div key={i.code} className="grid grid-cols-[40px_1fr_48px_72px] gap-2.5 items-center">
            <button
              type="button"
              onClick={() => setPage('sq-readiness')}
              className="text-[12px] font-extrabold text-left hover:underline"
              style={{ color: STATUS.critical }}
            >
              {i.code}
            </button>
            <div className="h-[18px] rounded bg-muted overflow-hidden">
              <div
                className="h-full rounded"
                style={{ width: `${(i.points / max) * 100}%`, backgroundColor: STATUS.critical }}
              />
            </div>
            <div className="text-[12.5px] font-extrabold text-right tabular-nums">{i.points}점</div>
            <button
              type="button"
              onClick={() => openAuthor(true)}
              className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 border border-transparent hover:border-sky-500 whitespace-nowrap"
            >
              AI 초안 ›
            </button>
            <div className="col-span-4 -mt-1.5 text-[11.5px] text-muted-foreground truncate">{i.title}</div>
          </div>
        ))}
      </div>
    </Panel>
  )
}

/* ──────────────────────── ⑤ 준비도 궤적 (✦ 심사예측) ──────────────────────── */

export function TrajectoryChart({
  currentPct,
  projectedPct,
  weeksLeft,
  redCount,
  monthLabels
}: {
  currentPct: number
  projectedPct: number
  weeksLeft: number
  redCount: number
  monthLabels: string[]
}): JSX.Element {
  const neededPerWeek = weeksLeft > 0 ? Math.round((redCount / weeksLeft) * 10) / 10 : redCount
  // pct(0~100) → y좌표(105=0%, 15=100%)
  const y = (pct: number): number => 105 - (Math.min(100, Math.max(0, pct)) / 100) * 90
  const x0 = 30
  const x1 = 280

  return (
    <Panel
      title="준비도 궤적 — 심사일까지"
      sub={
        <>
          ✦ 심사예측 · 목표 90% 가정 시 <b>주 {neededPerWeek}항목</b> 해소 필요 (미충족 {redCount} ÷ {weeksLeft}주)
        </>
      }
    >
      <div className="flex-1 flex flex-col justify-end">
        <svg viewBox="0 0 300 120" preserveAspectRatio="none" className="w-full h-[200px] xl:h-[230px] block" role="img" aria-label="준비도 궤적: 현 페이스 대 필요 페이스">
          <line x1="0" y1="105" x2="300" y2="105" stroke="#d3e1ef" strokeWidth="1" />
          <line x1="0" y1={y(50)} x2="300" y2={y(50)} stroke="#d3e1ef" strokeWidth="0.6" strokeDasharray="3 3" />
          <line x1="0" y1={y(90)} x2="300" y2={y(90)} stroke="#d3e1ef" strokeWidth="0.6" strokeDasharray="3 3" />
          <text x="4" y={y(50) - 3} fontSize="9" fill="#7e93a8">50%</text>
          <text x="4" y={y(90) - 3} fontSize="9" fill="#7e93a8">90%</text>
          <polygon
            points={`${x0},${y(currentPct)} ${x1},${y(90)} ${x1},105 ${x0},105`}
            fill="#2a78d6"
            opacity="0.08"
          />
          <polyline
            points={`${x0},${y(currentPct)} ${x1},${y(90)}`}
            fill="none"
            stroke="#2a78d6"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <polyline
            points={`${x0},${y(currentPct)} ${x1},${y(projectedPct)}`}
            fill="none"
            stroke={STATUS.critical}
            strokeWidth="2.5"
          />
          <circle cx={x0} cy={y(currentPct)} r="4" fill="#142438" />
          <text x={x0 + 8} y={y(currentPct) - 4} fontSize="9" fontWeight="800" fill="#142438">
            현재 {currentPct}%
          </text>
          <circle cx={x1} cy={y(90)} r="3.5" fill="#fff" stroke="#2a78d6" strokeWidth="2" />
          <circle cx={x1} cy={y(projectedPct)} r="3.5" fill={STATUS.critical} />
          <text x={x1 - 66} y={Math.min(y(projectedPct) + 14, 100)} fontSize="9" fontWeight="800" fill={STATUS.critical}>
            현 페이스 ~{projectedPct}%
          </text>
        </svg>
        <div className="flex px-2 pt-1.5">
          {monthLabels.map((m) => (
            <span key={m} className="flex-1 text-center text-[11.5px] font-semibold text-muted-foreground">
              {m}
            </span>
          ))}
        </div>
        <div className="flex gap-3.5 flex-wrap text-[11px] text-muted-foreground pt-2">
          <span>
            <span className="inline-block w-4 border-t-[2.5px] border-dashed mr-1 align-[3px]" style={{ borderColor: '#2a78d6' }} />
            필요 페이스 (90% 도달)
          </span>
          <span>
            <span className="inline-block w-4 border-t-[2.5px] mr-1 align-[3px]" style={{ borderColor: STATUS.critical }} />
            현 페이스 (최근 4주 작성 이력 기준)
          </span>
        </div>
      </div>
    </Panel>
  )
}

/* ──────────────────────── ⑥ 팀별 책임 양식 퍼널 ──────────────────────── */

export function TeamFormsFunnel({ teams }: { teams: TeamSummaryDto[] }): JSX.Element {
  const themeById = new Map<string, TeamTheme>(TEAMS.map((t) => [t.id, t]))
  const rows = [...teams].sort((a, b) => b.formsTotal - a.formsTotal)
  const max = Math.max(1, ...rows.map((r) => r.formsTotal))

  return (
    <Panel title="팀별 책임 양식" sub="막대 = 보유 양식 · 진한 부분 = 작성가능(셀맵 정의)">
      <div className="flex flex-col gap-3 flex-1 justify-center">
        {rows.map((r) => {
          const label = themeById.get(r.teamId)?.label ?? r.teamId
          const fillPct = r.formsTotal > 0 ? (r.formsFillable / r.formsTotal) * 100 : 0
          const thin = r.formsTotal > 0 && fillPct < 10
          return (
            <div key={r.teamId} className="grid grid-cols-[104px_1fr_104px] gap-2.5 items-center">
              <div className="text-[12.5px] font-bold text-muted-foreground text-right truncate">{label}</div>
              <div className="flex justify-center">
                <div
                  className="h-[22px] rounded relative overflow-hidden"
                  style={{ width: `${(r.formsTotal / max) * 100}%`, backgroundColor: '#9ec5f4', minWidth: 28 }}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 rounded-l"
                    style={{ width: `${fillPct}%`, backgroundColor: '#2a78d6' }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[11.5px] font-extrabold text-white">
                    {r.formsTotal}
                  </span>
                </div>
              </div>
              <div className="text-[11.5px] text-muted-foreground tabular-nums">
                <b className="text-foreground">{r.formsFillable}</b> {thin ? '⚠ 셀맵 미적재' : '작성가능'}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
