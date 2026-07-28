import { useEffect, useState } from 'react'
import {
  Briefcase, Truck, Factory, BadgeCheck, DraftingCompass,
  Clock, ChevronRight, ShieldCheck
} from 'lucide-react'
import { TEAMS, type TeamId, type TeamTheme } from '@shared/team-theme'
import type { TeamSummaryDto, TeamTodayBoardDto } from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { PageHeader } from '../shared/PageHeader'
import { CardShell, KpiTile, TeamDonut, ChipGridSkeleton } from '../shared/dash/DashKit'

const TEAM_ICON: Record<TeamId, typeof Briefcase> = {
  gaebal: DraftingCompass,
  jajae: Truck,
  saengsan: Factory,
  pumjil: BadgeCheck,
  gwanli: Briefcase
}

/**
 * 팀별 허브 — 템플릿 A(대시보드형), 홈과 같은 골격 공유 (19번 추기②: 별도 설계 금지).
 * KPI 타일·이행률 도넛은 홈과 동일 부품(DashKit), 범위 = 전사(팀 카드가 팀 렌즈 입구).
 * 색 = 팀 고유 식별. 빨강은 경고/미작성 전용.
 */
export function TeamHubView(): JSX.Element {
  const [data, setData] = useState<TeamSummaryDto[] | null>(null)
  const [board, setBoard] = useState<TeamTodayBoardDto | null>(null)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedTeam = useUIStore((s) => s.setSelectedTeam)
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
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.TEAM_TODAY_BOARD)) as TeamTodayBoardDto
        if (alive) setBoard(res)
      } catch {
        if (alive) setBoard(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const openTeam = (id: TeamId): void => {
    setSelectedTeam(id)
    setPage('team-detail')
  }

  // ── 전사 파생 수치 (기존 채널 재사용 — 17번 §3-1) ──
  const measured = (data ?? []).filter((d) => d.readinessPct != null)
  const avgReady =
    measured.length > 0
      ? Math.round(measured.reduce((a, d) => a + (d.readinessPct ?? 0), 0) / measured.length)
      : null
  const redSum = (data ?? []).reduce((a, d) => a + d.redCount, 0)
  const dueSum = (data ?? []).reduce((a, d) => a + d.dueCount, 0)
  const fillableSum = (data ?? []).reduce((a, d) => a + d.formsFillable, 0)
  const formsSum = (data ?? []).reduce((a, d) => a + d.formsTotal, 0)
  const urgentTeams = (data ?? []).filter((d) => d.urgent).length

  const denomAll = board ? board.teams.reduce((a, t) => a + t.done + t.open, 0) : 0
  const doneAll = board ? board.teams.reduce((a, t) => a + t.done, 0) : 0
  const ratePct = denomAll > 0 ? Math.round((doneAll / denomAll) * 100) : null
  const donutSegs = (board?.teams ?? []).map((t) => ({
    teamId: t.teamId,
    share: denomAll > 0 ? t.done / denomAll : 0,
    done: t.done,
    denom: t.done + t.open
  }))

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        title="팀별 허브"
        sub="홈 관제탑의 팀 렌즈 — 카드를 누르면 그 팀의 이행 매트릭스·심사 단계·책임 양식이 열립니다"
        actions={
          <div className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            심사 D-{Math.abs(dday)}
          </div>
        }
      />

      {/* ── KPI 스탯 타일 — 홈과 같은 부품(DashKit), 전사 범위 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiTile
          icon="✓" iconTint="bg-secondary text-primary" label="오늘 완료율 (전사)"
          value={ratePct == null ? '—' : ratePct} unit={ratePct == null ? undefined : '%'}
          chip={denomAll === 0 ? '오늘 도래 없음' : `${doneAll}/${denomAll}건 · 실시간`}
          chipTone={ratePct != null && ratePct >= 50 ? 'up' : 'fx'}
        />
        <KpiTile
          icon="◎" iconTint="bg-ok-tint text-ok-ink" label="평균 SQ 준비도"
          value={avgReady == null ? '—' : avgReady} unit={avgReady == null ? undefined : '%'}
          chip={measured.length > 0 ? `측정 ${measured.length}팀 평균` : '측정 전'} chipTone="fx"
        />
        <KpiTile
          icon="!" iconTint="bg-bad-tint text-bad-ink" label="미충족 + 도래 의무"
          value={redSum + dueSum} unit="건"
          chip={urgentTeams > 0 ? `급한 팀 ${urgentTeams}` : '급한 팀 없음'}
          chipTone={redSum + dueSum > 0 ? 'dn' : 'up'}
        />
        <KpiTile
          icon="▤" iconTint="bg-data-tint text-data-ink" label="작성 가능 양식"
          value={fillableSum} unit={`/${formsSum}`}
          chip="팀 책임 양식 기준" chipTone="fx"
          onClick={() => setPage('doc-browse')}
        />
      </div>

      {/* ── 메인: 팀 카드 그리드 | 우측 레일(전사 이행률 도넛 — 홈과 동일) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <CardShell
          title="팀별 현황"
          cap="카드 = 팀 상세 입구 · 준비도 = SQ 신호등 가중점수"
          status={data ? 'ready' : 'loading'}
          skeleton={<ChipGridSkeleton rows={3} cols={8} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 px-[18px] pb-[18px] pt-2">
            {TEAMS.map((t) => (
              <TeamCard
                key={t.id}
                theme={t}
                summary={data?.find((d) => d.teamId === t.id)}
                onClick={() => openTeam(t.id)}
              />
            ))}
          </div>
        </CardShell>

        <CardShell title="전사 이행률" cap="오늘">
          {board ? (
            <TeamDonut
              segments={donutSegs}
              centerPct={ratePct}
              centerCap="오늘"
              onPickTeam={openTeam}
            />
          ) : (
            <div className="px-[18px] py-8 text-[13px] text-muted-foreground">집계 중...</div>
          )}
          <p className="px-[18px] pb-4 text-[12px] text-muted-foreground leading-relaxed">
            색 = 팀 고유 식별 · 빨강은 부적합/미작성 경고에만 · 조각 클릭 = 팀 상세
          </p>
        </CardShell>
      </div>
    </div>
  )
}

function TeamCard({
  theme,
  summary,
  onClick
}: {
  theme: TeamTheme
  summary?: TeamSummaryDto
  onClick: () => void
}): JSX.Element {
  const Icon = TEAM_ICON[theme.id]
  const pct = summary?.readinessPct ?? null
  const todo = (summary?.redCount ?? 0) + (summary?.dueCount ?? 0)

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left bg-card rounded-[14px] p-5 shadow-card hover:shadow-md transition-all"
      style={{ border: `1px solid ${theme.border}` }}
    >
      <div className="flex items-center gap-2.5 mb-2.5">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="text-[17px] font-extrabold flex-1 min-w-0 break-keep leading-snug">{theme.label}</div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
      <div className="text-[13.5px] text-muted-foreground mb-3 break-keep leading-snug">{theme.desc}</div>

      {/* 준비도 바 (팀색) */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2.5">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct ?? 0}%`, backgroundColor: theme.border }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span
          className="text-[12.5px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
        >
          {pct == null ? '측정 전' : `준비도 ${pct}%`}
        </span>
        <span className="text-[13px] text-muted-foreground inline-flex items-center gap-1">
          {summary?.urgent && <Clock className="w-3.5 h-3.5 text-amber-600" />}
          {summary?.urgent ? `급함 · ${todo}` : `할 일 ${todo}`}
        </span>
      </div>
    </button>
  )
}
