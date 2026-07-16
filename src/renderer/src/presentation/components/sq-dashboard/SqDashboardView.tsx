import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react'
import { teamTheme, type TeamId } from '@shared/team-theme'
import type { SqDashboardDto, SqDashboardItemDto, SqSuggestedState } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { PageHeader } from '../shared/PageHeader'

/**
 * SQ 대시보드 (코워크 09 목업 실구현, 7/16 사장님 지시).
 * 드릴다운: 이 화면(한 장 요약) → 팀별 해야 할 것 → [팀 상세]에서 항목 펼침·가이드 체크.
 * 숫자는 basis='suggested' — 체크리스트에서 자동 산출한 "제안" 점수(정직 라벨).
 * 자체평가(Phase B) 확정 후에는 확정 점수가 이 화면의 정본이 된다.
 */

const STATE_PILL: Record<SqSuggestedState, { bg: string; fg: string }> = {
  우수: { bg: '#dcf5dc', fg: '#0a5c0a' },
  양호: { bg: '#e2f3e2', fg: '#1d6b1d' },
  보완: { bg: '#faeeda', fg: '#7a4d05' },
  일부미흡: { bg: '#fcebeb', fg: '#a32d2d' },
  다수미흡: { bg: '#fcebeb', fg: '#8a1f1f' },
  미관리: { bg: '#f3d1d1', fg: '#7a1515' },
  미해당: { bg: '#edf3fa', fg: '#5c7288' }
}

export function SqDashboardView(): JSX.Element {
  const [data, setData] = useState<SqDashboardDto | null>(null)
  const [failed, setFailed] = useState(false)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedTeam = useUIStore((s) => s.setSelectedTeam)
  const { dday } = useDday()

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.SQ_DASHBOARD)) as SqDashboardDto | null
        if (!alive) return
        if (res) setData(res)
        else setFailed(true)
      } catch {
        if (alive) setFailed(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const openTeam = (teamId: TeamId): void => {
    setSelectedTeam(teamId)
    setPage('team-detail')
  }

  if (failed) {
    return <div className="text-center py-20 text-sm text-muted-foreground">SQ 대시보드를 불러오지 못했습니다 — 가이드층(0064) 시드 확인이 필요합니다.</div>
  }
  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> SQ 현황 집계 중...
      </div>
    )
  }

  const cpActive = data.checkpoint.met + data.checkpoint.partial + data.checkpoint.missing
  const readyPct = cpActive > 0 ? Math.round((data.checkpoint.met / cpActive) * 100) : 0
  // 정본 = 확정 자체평가(있으면), 없으면 제안치
  const mainScore = data.confirmed ? data.confirmed.totalScore : data.totalConverted
  const mainGrade = data.confirmed ? data.confirmed.grade : data.grade
  const toS = Math.max(0, data.gradeRule.S - mainScore)
  const toG = Math.max(0, data.gradeRule.G - mainScore)

  return (
    <div className="space-y-5 break-keep">
      <PageHeader
        title="SQ 대시보드 — 이번 심사, 붙습니까?"
        sub={`한 장 요약 · 가이드 ${data.guideVersion} · 제안 기준(증빙 체크리스트 자동 산출) — 확정 점수는 자체평가에서`}
        actions={
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4" /> 심사 D-{Math.abs(dday)}
          </span>
        }
      />

      {/* ── 1행: 히어로 점수 + 준비도 + 남은 거리 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl px-6 py-5">
          <div className="text-[13px] font-semibold text-muted-foreground">
            {data.confirmed
              ? `SQ 확정 점수 — 자체평가 ${data.confirmed.id} (${data.confirmed.assessedAt})`
              : 'SQ 환산 점수 (제안 기준)'}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[40px] font-extrabold tabular-nums tracking-[-0.02em] leading-none">
              {data.confirmed ? data.confirmed.totalScore : data.totalConverted}
            </span>
            <span className="text-[15px] font-semibold text-muted-foreground">/1000</span>
            {(() => {
              const g = data.confirmed ? data.confirmed.grade : data.grade
              return (
                <span
                  className={cn(
                    'text-[13px] font-bold px-2.5 py-0.5 rounded-md ml-1',
                    g === 'S' && 'bg-emerald-100 text-emerald-800',
                    g === 'G' && 'bg-secondary text-secondary-foreground',
                    g === '불합격' && 'bg-[#fcebeb] text-[#a32d2d]'
                  )}
                >
                  {g === '불합격' ? '불합격권' : `${g} 등급`}
                </span>
              )
            })()}
            {data.confirmed && (
              <span className="text-[12px] text-muted-foreground ml-2">
                제안치(체크리스트) {data.totalConverted}점
              </span>
            )}
          </div>
          {/* 등급컷 불릿 바 */}
          <svg viewBox="0 0 340 46" width="100%" height="46" className="mt-2" aria-label={`점수 위치 — G ${data.gradeRule.G}, S ${data.gradeRule.S}`}>
            <rect x="10" y="18" width="320" height="10" rx="5" fill="#edf3fa" />
            <rect x="10" y="18" width={Math.min(320, (mainScore / 1000) * 320)} height="10" rx="5" fill="#2a78d6" />
            {[
              { v: data.gradeRule.G, label: `G ${data.gradeRule.G}` },
              { v: data.gradeRule.S, label: `S ${data.gradeRule.S}` }
            ].map((m) => (
              <g key={m.v}>
                <line x1={10 + (m.v / 1000) * 320} y1="12" x2={10 + (m.v / 1000) * 320} y2="34" stroke="#98a8b8" strokeWidth="1.5" />
                <text x={10 + (m.v / 1000) * 320} y="9" textAnchor="middle" fontSize="10" fill="#5c7288">
                  {m.label}
                </text>
              </g>
            ))}
            <text x={Math.min(320, Math.max(20, 10 + (mainScore / 1000) * 320))} y="43" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1f3348">
              {mainScore}
            </text>
          </svg>
          <div className="text-[12px] text-muted-foreground mt-1">
            {mainGrade === 'S'
              ? 'S 등급권 — 유지가 과제입니다'
              : toS > 0 && mainGrade === 'G'
                ? `S등급까지 ${toS}점 — 아래 '남은 점수 Top 5'가 그 후보입니다`
                : `G등급(합격)까지 ${toG}점 — 아래 Top 5부터 해소하세요`}
            {data.naScore > 0 && ` · 미해당 ${data.naScore}점 제외 환산(모드①, 원본 확정 전)`}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl px-6 py-5">
          <div className="text-[13px] font-semibold text-muted-foreground">증빙 준비도 (체크포인트)</div>
          <div className="text-[30px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1">
            {readyPct}%
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
            {cpActive}개 중 충족 {data.checkpoint.met} · 부분 {data.checkpoint.partial}
            <br />
            미비 {data.checkpoint.missing}개 → 팀 상세에서 체크하며 해소
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl px-6 py-5">
          <div className="text-[13px] font-semibold text-muted-foreground">남은 점수 (전체 손실)</div>
          <div className="text-[30px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1 text-[#a32d2d]">
            −{1000 - data.naScore - data.totalRaw}
          </div>
          <div className="text-[12px] text-muted-foreground mt-1.5">전부 '양호' 이상이 되면 0 — 팀별 목록에서 회수</div>
        </div>
      </div>

      {/* ── 2행: 남은 점수 Top5 + 영역별 미터 ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-[13.5px] font-bold text-muted-foreground mb-1">남은 점수 Top 5 — 등급으로 가는 최단 경로</div>
          <div className="text-[11.5px] text-muted-foreground mb-3">행을 누르면 담당 팀 상세로 이동합니다</div>
          <div>
            {data.topLosses.map((it) => (
              <ItemRow key={it.code} item={it} onOpenTeam={openTeam} />
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-[13.5px] font-bold text-muted-foreground mb-4">영역별 취득 현황</div>
          <div className="space-y-3">
            {data.areas.map((a) => {
              const pct = a.naAll ? 0 : a.score > 0 ? Math.round((a.earned / a.score) * 100) : 0
              return (
                <div key={a.area} className={cn('flex items-center gap-3', a.naAll && 'opacity-50')}>
                  <span className="w-[104px] text-[13px] font-semibold truncate">{a.area}</span>
                  <span className="flex-1 h-3 rounded-full bg-[#e7f1fc] overflow-hidden">
                    {!a.naAll && <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />}
                  </span>
                  <span className="w-[110px] text-right text-[12.5px] tabular-nums text-muted-foreground">
                    {a.naAll ? '미해당' : (
                      <>
                        <b className="text-foreground">{a.earned}</b> / {a.score} · {pct}%
                      </>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-4">
            막대 = 제안 기준 취득점수 / 트랙 = 배점
          </div>
        </div>
      </div>

      {/* ── 3행: 팀별로 해야 할 것 (드릴다운) ── */}
      <div>
        <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
          <span className="text-[16px] font-extrabold tracking-[-0.01em]">팀별로 해야 할 것 — 손실 큰 순</span>
          <span className="text-[13px] font-medium text-muted-foreground">
            팀 카드를 누르면 팀 상세(항목 펼침 → 증빙 체크 → 작성)로 갑니다
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.teams.map((t) => {
            const theme = teamTheme(t.teamId)
            return (
              <button
                key={t.teamId}
                type="button"
                onClick={() => openTeam(t.teamId)}
                className="text-left bg-card border border-border rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div
                  className="px-5 py-3 text-[14px] font-bold flex items-center"
                  style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
                >
                  <span className="flex-1 truncate">{theme.label}</span>
                  <span className="text-[12.5px] font-bold tabular-nums" style={{ color: '#a32d2d' }}>
                    −{t.loss}점
                  </span>
                </div>
                <div className="flex-1">
                  {t.items.slice(0, 4).map((it) => (
                    <div key={it.code} className="px-5 py-[9px] border-t border-border flex items-center gap-2 text-[13px]">
                      <span className="font-mono text-[11.5px] text-muted-foreground shrink-0">{it.code}</span>
                      <span className="flex-1 min-w-0 truncate" title={it.title}>
                        {it.title}
                      </span>
                      <StatePill state={it.suggestedState} />
                      <span className="text-[12px] font-bold tabular-nums text-[#a32d2d] shrink-0">−{it.loss}</span>
                    </div>
                  ))}
                  {t.items.length > 4 && (
                    <div className="px-5 py-2 border-t border-border text-[11.5px] text-muted-foreground">
                      외 {t.items.length - 4}개 항목…
                    </div>
                  )}
                </div>
                <div className="mt-auto px-5 py-2.5 border-t border-border text-[12.5px] font-bold text-primary inline-flex items-center gap-1">
                  팀 상세에서 해소하기 <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {data.unassigned.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-[13px] text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
          팀 미배정 손실 항목 {data.unassigned.length}건 ({data.unassigned.map((i) => i.code).join(', ')}) — 규정 매핑
          보강 대상
        </div>
      )}

      <p className="text-[12px] text-muted-foreground text-center">
        이 화면의 점수는 증빙 체크리스트에서 자동 산출한 <b>제안치</b>입니다 — 공식 점수·등급은 자체평가(예정)에서
        사람이 확정하고, 확정본이 이 화면의 정본이 됩니다.
      </p>
    </div>
  )
}

function StatePill({ state }: { state: SqSuggestedState }): JSX.Element {
  const s = STATE_PILL[state]
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: s.bg, color: s.fg }}>
      {state}
    </span>
  )
}

function ItemRow({
  item,
  onOpenTeam
}: {
  item: SqDashboardItemDto
  onOpenTeam: (teamId: TeamId) => void
}): JSX.Element {
  const first = item.teams[0]
  return (
    <button
      type="button"
      onClick={() => first && onOpenTeam(first)}
      disabled={!first}
      className="w-full flex items-center gap-2.5 py-2.5 border-t border-border first:border-t-0 text-left hover:bg-muted/40 rounded-md px-1.5 disabled:cursor-default"
    >
      <span className="font-mono text-[12px] font-bold text-muted-foreground shrink-0">{item.code}</span>
      <span className="flex-1 min-w-0 truncate text-[13.5px]" title={item.title}>
        {item.title}
      </span>
      <StatePill state={item.suggestedState} />
      {first && (
        <span
          className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0"
          style={{ backgroundColor: teamTheme(first).tintBg, color: teamTheme(first).darkText }}
        >
          {teamTheme(first).label.slice(0, 2)}
          {item.teams.length > 1 && ` +${item.teams.length - 1}`}
        </span>
      )}
      <span className="text-[14px] font-extrabold tabular-nums text-[#a32d2d] shrink-0 w-14 text-right">
        −{item.loss}
        <small className="text-[11px] font-semibold text-muted-foreground">/{item.score}</small>
      </span>
    </button>
  )
}
