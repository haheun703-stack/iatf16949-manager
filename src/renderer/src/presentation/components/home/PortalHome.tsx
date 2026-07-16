import { useCallback, useEffect, useState } from 'react'
import {
  Check, X, AlertCircle, Clock, Loader2, ShieldCheck, ChevronRight, FileEdit
} from 'lucide-react'
import { teamTheme } from '@shared/team-theme'
import type { CompanyProfile, TeamTodayBoardDto, TodayTaskDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'

/**
 * 홈 = 사장님 관제탑 (포털 1단계, v4 목업 확정 2026-07-16).
 * 메인 = 팀별 오늘 할 일의 이행 여부(✓/✕) — 품질·심사만이 아닌 전사 정기 업무.
 * ✓ 판정 = 완료 처리(0063 이력) 또는 연결 양식의 오늘 작성 기록(눈속임 아님).
 * SQ/IATF 는 할 일 옆 배지로만(항목 강등) — 심사 중심 화면은 '심사 대응' 탭.
 * PageHeader 예외: 대시보드형 밴드가 헤더 역할(P2 예외 4종과 동일 근거).
 */
export function PortalHome(): JSX.Element {
  const [board, setBoard] = useState<TeamTodayBoardDto | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [completing, setCompleting] = useState<number | null>(null)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const { dday } = useDday()

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.TEAM_TODAY_BOARD)) as TeamTodayBoardDto
      setBoard(res)
    } catch {
      setBoard(null)
    }
  }, [])

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        setProfile(p)
      } catch {
        /* 프로필 미구성 */
      }
    })()
  }, [load])

  const complete = async (task: TodayTaskDto): Promise<void> => {
    setCompleting(task.id)
    try {
      await window.api.invoke(window.api.channels.OBLIGATION_COMPLETE, {
        id: task.id,
        doneBy: profile?.defaultAuthor || undefined
      })
      await load()
    } catch {
      /* 실패 시 화면 유지 */
    } finally {
      setCompleting(null)
    }
  }

  const openForm = (formCode: string): void => {
    setSelectedFormCode(formCode)
    setPage('form-builder')
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 오늘 할 일 집계 중...
      </div>
    )
  }

  const { totals } = board
  const denom = totals.done + totals.open
  const ratePct = denom > 0 ? Math.round((totals.done / denom) * 100) : null
  const dateLabel = (() => {
    const d = new Date(`${board.date}T00:00:00`)
    const day = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()]
    return `${d.getMonth() + 1}/${d.getDate()} (${day})`
  })()

  return (
    <div className="max-w-[1600px] mx-auto space-y-4 break-keep">
      {/* 회사 밴드 — 딥블루는 점(앵커)에 */}
      <div className="rounded-2xl px-7 py-5 text-white flex items-center gap-6 flex-wrap bg-gradient-to-r from-[#1c4d80] to-[#2a78d6]">
        <div className="min-w-0">
          <div className="text-[12.5px] font-semibold opacity-80 truncate">
            {profile?.companyName || 'IATF 16949 품질경영시스템'} · {dateLabel}
          </div>
          {/* 톤 원칙(코워크 09 검토 반영): 하루가 끝나기 전 이행률은 경보가 아니라 진행 현황 — 위기어는 연체에만 */}
          <h1 className="text-[21px] font-extrabold leading-snug tracking-[-0.02em] mt-0.5">
            {denom === 0
              ? '오늘 도래한 정기 업무가 없습니다'
              : `오늘 ${totals.done} / ${denom}건 완료 — 진행 중${totals.overdue > 0 ? ` · 연체 ${totals.overdue}건` : ''}`}
          </h1>
        </div>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setOnlyOpen((v) => !v)}
          className={cn(
            'h-9 px-4 rounded-lg text-[12.5px] font-bold border transition-colors',
            onlyOpen
              ? 'bg-white text-[#1c4d80] border-white'
              : 'bg-white/15 border-white/40 hover:bg-white/25'
          )}
          title="미이행(오늘 마감·연체) 업무만 표시"
        >
          {onlyOpen ? '전체 보기' : '미이행만 보기'}
        </button>
        <button
          type="button"
          onClick={() => setPage('obligations')}
          className="h-9 px-4 rounded-lg text-[12.5px] font-bold bg-white/15 border border-white/40 hover:bg-white/25 transition-colors"
          title="정기 의무 등록·수정 — 팀별 일상 업무를 여기서 등록"
        >
          정기 의무 관리 ›
        </button>
      </div>

      {/* KPI 타일 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Kpi label="오늘 이행률 (전사)" value={ratePct == null ? '—' : `${ratePct}%`} sub={denom === 0 ? '오늘 도래 업무 없음' : `${totals.done} / ${denom}건 완료 · 실시간 집계`} />
        <Kpi label="남은 업무 (오늘 마감)" value={String(totals.open)} sub="완료 처리 전 — 하루 안엔 정상" />
        <Kpi label="연체 (기한 경과)" value={String(totals.overdue)} bad={totals.overdue > 0} sub="가장 먼저 해소" />
        <button
          type="button"
          onClick={() => setPage('sq-readiness')}
          className="text-left bg-card border border-border rounded-xl px-5 py-4 hover:shadow-md transition-shadow"
          title="심사 준비는 '심사 대응' 탭에서 — SQ 42항목"
        >
          <div className="text-[12px] font-semibold text-muted-foreground inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 심사 대비 <span className="opacity-70">(항목)</span>
          </div>
          <div className="text-[26px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1">
            D-{Math.abs(dday)}
          </div>
          <div className="text-[12px] font-semibold text-primary mt-1.5 inline-flex items-center">
            SQ 준비도 보기 <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 위젯: 주간 완료 추이 + 팀별 오늘 이행률 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="text-[12.5px] font-bold text-muted-foreground mb-3.5">주간 완료 추이 (전사)</div>
          <TrendBars trend={board.trend} />
        </div>
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="mb-3.5 flex items-baseline">
            <span className="flex-1 text-[12.5px] font-bold text-muted-foreground">팀별 오늘 이행률</span>
            <button
              type="button"
              onClick={() => setPage('team-hub')}
              className="text-[12px] font-bold text-primary"
            >
              팀별 허브 ›
            </button>
          </div>
          <div className="grid gap-2">
            {board.teams.map((t) => {
              const theme = teamTheme(t.teamId)
              const d = t.done + t.open
              const pct = d > 0 ? Math.round((t.done / d) * 100) : null
              return (
                <div key={t.teamId} className="flex items-center gap-3 text-[12.5px]">
                  <span className="w-[104px] font-semibold truncate" style={{ color: theme.darkText }}>
                    {theme.label}
                  </span>
                  <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    {pct != null && (
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: theme.border }}
                      />
                    )}
                  </span>
                  <span className="w-14 text-right tabular-nums text-[12px] text-muted-foreground">
                    {d === 0 ? '없음' : `${t.done}/${d}건`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 메인: 팀별 오늘 할 일 보드 */}
      <div>
        <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
          <span className="text-[14.5px] font-extrabold tracking-[-0.01em]">
            팀별 오늘 할 일 — 했는지 · 안 했는지
          </span>
          <span className="text-[12px] font-medium text-muted-foreground">
            ✓ = 완료 처리 또는 연결 양식의 오늘 작성 기록 · 심사(SQ) 연계는 배지로만
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
          {board.teams.map((team) => {
            const theme = teamTheme(team.teamId)
            const denomT = team.done + team.open
            const pct = denomT > 0 ? Math.round((team.done / denomT) * 100) : null
            const tasks = onlyOpen
              ? team.tasks.filter((t) => t.status === 'due' || t.status === 'overdue')
              : team.tasks
            return (
              <div
                key={team.teamId}
                className="bg-card rounded-xl overflow-hidden flex flex-col"
                style={{ border: `1px solid ${theme.border}` }}
              >
                <div
                  className="px-4 py-2.5 text-[13px] font-bold flex items-center"
                  style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
                >
                  <span className="flex-1 truncate">{theme.label}</span>
                  <span className="text-[11.5px] font-semibold tabular-nums opacity-85 shrink-0">
                    {denomT === 0 ? `예정 ${team.upcoming}` : `${team.done}/${denomT}건`}
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="px-4 py-3.5 text-[12px] leading-relaxed text-muted-foreground">
                    {onlyOpen
                      ? '미이행 없음 👍'
                      : denomT === 0 && team.upcoming === 0
                        ? '오늘 할 일 없음 — 정기 의무에서 이 팀 일상 업무를 등록하세요'
                        : '오늘 할 일 없음'}
                  </div>
                ) : (
                  <div className="flex-1">
                    {tasks.map((task) => (
                      <TaskRow
                        key={task.id}
                        task={task}
                        completing={completing === task.id}
                        onComplete={() => void complete(task)}
                        onOpenForm={openForm}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-auto px-4 py-2.5 border-t border-border flex items-center gap-2.5 text-[11.5px] text-muted-foreground">
                  <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    {pct != null && (
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: theme.border }}
                      />
                    )}
                  </span>
                  <span className="tabular-nums">{pct == null ? '—' : `${pct}%`}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 팀 미배정 의무 — 정직 노출 */}
      {board.unassigned.length > 0 && (
        <button
          type="button"
          onClick={() => setPage('obligations')}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-[12px] text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
          담당 팀이 지정되지 않은 오늘 업무 <b>{board.unassigned.length}건</b> — 정기 의무에서 담당을
          지정하면 보드에 나타납니다 ›
        </button>
      )}
    </div>
  )
}

function Kpi({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }): JSX.Element {
  return (
    <div className="bg-card border border-border rounded-xl px-5 py-4">
      <div className="text-[12px] font-semibold text-muted-foreground">{label}</div>
      <div
        className={cn(
          'text-[26px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1',
          bad && 'text-destructive'
        )}
      >
        {value}
      </div>
      <div className="text-[12px] text-muted-foreground mt-1.5">{sub}</div>
    </div>
  )
}

/** 최근 7일 완료 건수 미니 바 차트 (0063 이력 — 오늘부터 쌓임). */
function TrendBars({ trend }: { trend: TeamTodayBoardDto['trend'] }): JSX.Element {
  const max = Math.max(1, ...trend.map((t) => t.done))
  const allZero = trend.every((t) => t.done === 0)
  return (
    <div>
      <div className="flex items-end gap-2 h-[72px]">
        {trend.map((t) => {
          const d = new Date(`${t.date}T00:00:00`)
          return (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[10px] tabular-nums text-muted-foreground">{t.done > 0 ? t.done : ''}</span>
              <div
                className="w-full max-w-[38px] rounded-t bg-primary/80"
                style={{ height: `${Math.max(t.done > 0 ? 8 : 2, (t.done / max) * 48)}px` }}
              />
              <span className="text-[10px] text-muted-foreground">{`${d.getMonth() + 1}/${d.getDate()}`}</span>
            </div>
          )
        })}
      </div>
      {allZero && (
        <div className="text-[11px] text-muted-foreground mt-2">
          이행 이력은 오늘부터 쌓입니다 — [완료] 처리가 기록되면 추이가 채워집니다.
        </div>
      )}
    </div>
  )
}

// 색 원칙: 빨강은 연체(기한 경과)에만 — 오늘 마감 미이행은 아직 위기가 아니므로 앰버 (코워크 09 검토 반영)
const STATUS_STYLE: Record<TodayTaskDto['status'], { bg: string; icon: typeof Check; label: string }> = {
  done: { bg: '#4f9e3c', icon: Check, label: '이행됨' },
  due: { bg: '#dd8f2d', icon: X, label: '오늘 마감 — 아직 미완료' },
  overdue: { bg: '#c03636', icon: AlertCircle, label: '연체' },
  upcoming: { bg: '#b9c8d8', icon: Clock, label: '예정' }
}

function TaskRow({
  task,
  completing,
  onComplete,
  onOpenForm
}: {
  task: TodayTaskDto
  completing: boolean
  onComplete: () => void
  onOpenForm: (formCode: string) => void
}): JSX.Element {
  const st = STATUS_STYLE[task.status]
  const Icon = st.icon
  const isOpen = task.status === 'due' || task.status === 'overdue'
  return (
    <div className="px-4 py-[9px] border-t border-border first:border-t-0 flex items-center gap-2.5 text-[12.5px]">
      <span
        className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: st.bg }}
        title={st.label}
      >
        <Icon className="w-3 h-3" />
      </span>
      <span className="flex-1 min-w-0 truncate" title={`${task.title} · ${task.cadence} 주기`}>
        {task.title}
        {task.status === 'overdue' && task.daysLeft != null && (
          <em className="not-italic text-destructive font-bold text-[11.5px]"> 연체 {Math.abs(task.daysLeft)}일</em>
        )}
        {task.status === 'upcoming' && task.daysLeft != null && (
          <span className="text-muted-foreground text-[11.5px] tabular-nums"> D-{task.daysLeft}</span>
        )}
      </span>
      {task.sqBadges.length > 0 && (
        <span
          className="text-[10px] font-bold bg-secondary text-secondary-foreground rounded px-1.5 py-px shrink-0 tabular-nums"
          title={`SQ 연계 항목: ${task.sqBadges.join(', ')} — 심사는 항목 각주로만`}
        >
          SQ {task.sqBadges[0]}
          {task.sqBadges.length > 1 && ` +${task.sqBadges.length - 1}`}
        </span>
      )}
      {task.status === 'done' ? (
        <span className="text-[11px] text-muted-foreground shrink-0" title={task.doneSource === 'form' ? '연결 양식의 오늘 작성 기록 감지' : '완료 처리됨'}>
          {task.doneSource === 'form' ? '작성기록' : '완료'}
        </span>
      ) : isOpen ? (
        <span className="flex items-center gap-1 shrink-0">
          {task.formCode && (
            <button
              type="button"
              onClick={() => onOpenForm(task.formCode!)}
              className="h-7 px-2 rounded-md text-[11px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1"
              title={`연결 양식(${task.formCode}) 바로 작성`}
            >
              <FileEdit className="w-3 h-3" /> 작성
            </button>
          )}
          <button
            type="button"
            onClick={onComplete}
            disabled={completing}
            className="h-7 px-2.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:brightness-95 disabled:opacity-50 inline-flex items-center gap-1"
            title="이행 완료 처리 — 다음 도래일 자동 전진 + 이력 기록"
          >
            {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : '완료'}
          </button>
        </span>
      ) : null}
    </div>
  )
}
