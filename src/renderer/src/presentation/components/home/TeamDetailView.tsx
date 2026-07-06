import { useEffect, useState } from 'react'
import { ChevronRight, Loader2, ArrowLeft } from 'lucide-react'
import { teamTheme, ALERT_RED } from '@shared/team-theme'
import type { TeamSummaryDto, TeamSqItemDto } from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { cn } from '../../../lib/utils'

const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  red: { label: '미충족', cls: '' }, // 빨강은 스타일 인라인(ALERT_RED)
  yellow: { label: '진행중', cls: 'bg-amber-100 text-amber-700' },
  green: { label: '충족', cls: 'bg-emerald-100 text-emerald-700' },
  gray: { label: '측정불가', cls: 'bg-muted text-muted-foreground' }
}

/**
 * 팀 상세 — 그 팀 책임의 SQ 항목을 번호 단계로.
 * Phase 2 에서 단계 확장(지침 본문 → 필요 양식 보유/갭 + 작성 버튼) 예정 — 현재는 골격.
 */
export function TeamDetailView(): JSX.Element {
  const selectedTeam = useUIStore((s) => s.selectedTeam)
  const setPage = useUIStore((s) => s.setPage)
  const [data, setData] = useState<TeamSummaryDto[] | null>(null)
  const { dday } = useDday()

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.TEAM_SUMMARY)) as TeamSummaryDto[]
        if (alive) setData(res)
      } catch {
        if (alive) setData([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!selectedTeam) {
    return (
      <div className="text-center py-20 text-sm text-muted-foreground">
        팀이 선택되지 않았습니다 —{' '}
        <button type="button" className="text-primary font-semibold" onClick={() => setPage('home')}>
          홈으로
        </button>
      </div>
    )
  }
  const theme = teamTheme(selectedTeam)
  const summary = data?.find((d) => d.teamId === selectedTeam)

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* 브레드크럼 */}
      <button
        type="button"
        onClick={() => setPage('home')}
        className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> 홈
        <ChevronRight className="w-3 h-3" />
        <span style={{ color: theme.darkText }} className="font-semibold">
          {theme.label}
        </span>
      </button>

      {/* 팀 헤더 */}
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
        >
          {theme.label.slice(0, 1)}
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{theme.label}</h1>
          <p className="text-[12px] text-muted-foreground">
            {theme.desc} · SQ {summary?.itemCount ?? 0}항목 · 양식 {summary?.formsTotal ?? 0}종
          </p>
        </div>
      </div>

      {/* 요약 3칸 */}
      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="준비도" value={summary?.readinessPct == null ? '측정 전' : `${summary.readinessPct}%`} color={theme.darkText} />
        <Stat label="심사까지" value={`D-${Math.abs(dday)}`} />
        <Stat label="할 일" value={String((summary?.redCount ?? 0) + (summary?.dueCount ?? 0))} />
      </div>

      {/* 번호 단계 */}
      {!data ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
        </div>
      ) : !summary || summary.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-[13px] text-muted-foreground">
          이 팀에 배정된 SQ 항목이 아직 없습니다 (규정↔SQ 매핑 기준).
        </div>
      ) : (
        <div className="space-y-2">
          {summary.items.map((it, i) => (
            <StepRow key={it.code} idx={i + 1} item={it} themeBg={theme.tintBg} themeText={theme.darkText} />
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground text-center pt-1">
        번호 = 처리 순서(배점 큰 순) · 빨강 = 미충족 · 단계 클릭 상세(지침→양식)는 다음 단계에서 열립니다
      </p>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }): JSX.Element {
  return (
    <div className="bg-muted/50 rounded-lg px-3 py-2">
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
      <div className="text-[19px] font-bold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </div>
    </div>
  )
}

function StepRow({
  idx,
  item,
  themeBg,
  themeText
}: {
  idx: number
  item: TeamSqItemDto
  themeBg: string
  themeText: string
}): JSX.Element {
  const badge = SIGNAL_BADGE[item.signal] ?? SIGNAL_BADGE.gray
  return (
    <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-3.5 py-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center text-[12.5px] font-bold shrink-0 tabular-nums"
        style={{ backgroundColor: themeBg, color: themeText }}
      >
        {String(idx).padStart(2, '0')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-semibold truncate">
          {item.title} <span className="text-muted-foreground font-normal">{item.points}점</span>
        </div>
        <div className="text-[11px] text-muted-foreground truncate">
          지침 {item.regs.join(' · ') || '—'}
        </div>
      </div>
      <span
        className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0', badge.cls)}
        style={
          item.signal === 'red'
            ? { backgroundColor: ALERT_RED.tintBg, color: ALERT_RED.darkText }
            : undefined
        }
      >
        {badge.label}
      </span>
    </div>
  )
}
