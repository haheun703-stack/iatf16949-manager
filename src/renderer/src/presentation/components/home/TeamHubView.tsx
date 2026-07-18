import { useEffect, useState } from 'react'
import {
  Briefcase, Truck, Factory, BadgeCheck, DraftingCompass,
  Clock, ChevronRight, ShieldCheck, Loader2
} from 'lucide-react'
import { TEAMS, type TeamId, type TeamTheme } from '@shared/team-theme'
import type { TeamSummaryDto } from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { PageHeader } from '../shared/PageHeader'

const TEAM_ICON: Record<TeamId, typeof Briefcase> = {
  gaebal: DraftingCompass,
  jajae: Truck,
  saengsan: Factory,
  pumjil: BadgeCheck,
  gwanli: Briefcase
}

/**
 * 홈 — 팀별 컬러 허브 (첫 화면).
 * 같은 데이터(프로세스×규정×양식×책임팀)를 팀 렌즈로: 카드 → 팀 상세(단계→지침→양식).
 * 색 = 팀 고유 식별. 빨강은 경고/미작성 전용.
 */
export function TeamHubView(): JSX.Element {
  const [data, setData] = useState<TeamSummaryDto[] | null>(null)
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
    return () => {
      alive = false
    }
  }, [])

  const openTeam = (id: TeamId): void => {
    setSelectedTeam(id)
    setPage('team-detail')
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <PageHeader
        title="무엇부터 볼까요?"
        sub="팀마다 고유 색 · 카드를 누르면 그 팀의 심사 단계 → 지침 → 양식 순으로 열립니다"
        actions={
          <div className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
            <ShieldCheck className="w-3.5 h-3.5" />
            심사 D-{Math.abs(dday)}
          </div>
        }
      />

      {!data ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 팀 현황 집계 중...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TEAMS.map((t) => (
            <TeamCard
              key={t.id}
              theme={t}
              summary={data.find((d) => d.teamId === t.id)}
              onClick={() => openTeam(t.id)}
            />
          ))}
        </div>
      )}

      <p className="text-[13px] text-muted-foreground text-center pt-2">
        색 = 팀 고유 식별 · 빨강은 부적합/미작성 경고에만 사용 · 준비도 = SQ 신호등 가중점수
      </p>
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
      className="group text-left bg-card rounded-xl p-5 shadow-sm hover:shadow-md transition-all"
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
