import { useCallback, useEffect, useState } from 'react'
import {
  Check, X, AlertCircle, Clock, Loader2, ShieldCheck, ChevronRight, FileEdit, Users, User, Network,
  Database, Download, UserCircle2, ChevronDown, Lock, ClipboardList
} from 'lucide-react'
import { TEAMS, normalizeTeam, teamTheme, type TeamId } from '@shared/team-theme'
import type {
  CompanyProfile,
  TeamTodayBoardDto,
  TeamTodayDto,
  TodayTaskDto,
  KpiIndicatorDto,
  MesRecordsStatusDto,
  AppUserDto
} from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { traceDeepLink } from '../../../lib/deeplink'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { KpiBatchEntryModal } from './KpiBatchEntryModal'

/** 'YYYY-MM-DD' 두 날짜 사이 일수(b-a). */
function daysBetweenYmd(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}
/** 'YYYY-MM-DD' → 'M/D' */
function shortYmd(ymd: string): string {
  const [, m, d] = ymd.split('-')
  return `${Number(m)}/${Number(d)}`
}
type Entry = { task: TodayTaskDto; teamId: TeamId | null }
const PROMPT_SEEN_KEY = 'user_prompt_seen'

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
  const [kpis, setKpis] = useState<KpiIndicatorDto[]>([])
  // KPI 필터: 'rep'=대표 6종(0066) / TeamId=팀별(0082 v4 §04) — 35종 평면 나열 방지
  const [kpiFilter, setKpiFilter] = useState<'rep' | TeamId>('rep')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [boardView, setBoardView] = useState<'team' | 'person'>('team')
  const [completing, setCompleting] = useState<number | null>(null)
  const [mesStatus, setMesStatus] = useState<MesRecordsStatusDto | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [kpiBatchOpen, setKpiBatchOpen] = useState(false)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setSelectedTeam = useUIStore((s) => s.setSelectedTeam)
  const { dday } = useDday()
  // 활성 사용자 — 원시값 셀렉터로 구독(currentUser() 셀렉터 함정 회피, 렌더러 리뷰 메모)
  const users = useActiveUserStore((s) => s.users)
  const activeUserId = useActiveUserStore((s) => s.activeUserId)
  const setActiveUser = useActiveUserStore((s) => s.setActiveUser)
  const usersLoaded = useActiveUserStore((s) => s.loaded)
  const currentUser = users.find((u) => u.id === activeUserId) ?? null

  const load = useCallback(async (): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.TEAM_TODAY_BOARD)) as TeamTodayBoardDto
      setBoard(res)
    } catch {
      setBoard(null)
    }
  }, [])

  const loadKpis = useCallback(async (): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.KPI_HOME)) as KpiIndicatorDto[]
      setKpis(res)
    } catch {
      setKpis([])
    }
  }, [])

  useEffect(() => {
    void load()
    void loadKpis()
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        setProfile(p)
      } catch {
        /* 프로필 미구성 */
      }
    })()
    void (async () => {
      try {
        const s = (await window.api.invoke(window.api.channels.MES_RECORDS_STATUS)) as MesRecordsStatusDto
        setMesStatus(s)
      } catch {
        setMesStatus(null)
      }
    })()
  }, [load, loadKpis])

  // §4 — 첫 실행 시 사용자 선택 모달 1회(건너뛰기 허용). 선택 후·본 뒤엔 재노출 안 함.
  useEffect(() => {
    if (!usersLoaded) return
    if (activeUserId != null) return
    let seen = false
    try {
      seen = localStorage.getItem(PROMPT_SEEN_KEY) === '1'
    } catch {
      /* 접근 불가 시 표시 안 함 */
    }
    if (!seen && users.length > 0) setShowPrompt(true)
  }, [usersLoaded, activeUserId, users.length])

  const dismissPrompt = (): void => {
    try {
      localStorage.setItem(PROMPT_SEEN_KEY, '1')
    } catch {
      /* 무시 */
    }
    setShowPrompt(false)
  }

  // source='form' = [작성기록으로 확정](§0.6 결정2) / 'manual' = 무연결 의무 수동 완료.
  // 기록 주체 = 활성 사용자 우선, 없으면 defaultAuthor 폴백(§4).
  const complete = async (task: TodayTaskDto, source: 'manual' | 'form' = 'manual'): Promise<void> => {
    // 데이터 트리거 이슈(M3) — 의무와 별도 대장(obligation_trigger_issues). ✓는 사람만(§3-2).
    if (task.triggerIssueId) {
      setCompleting(task.id)
      try {
        await window.api.invoke(window.api.channels.OBLIGATION_TRIGGER_COMPLETE, {
          issueId: task.triggerIssueId,
          doneBy: currentUser?.name || profile?.defaultAuthor || undefined
        })
        await load()
      } catch {
        /* 실패 시 화면 유지 */
      } finally {
        setCompleting(null)
      }
      return
    }
    // 대리 완료 confirm(P3-fix, 코워크): 담당이 타인인 업무는 확인 1회 — 차단이 아니라
    // "누가 누구 대신 완료했는지" 정직 기록이 목적. 본인·미지정 업무는 원클릭 유지.
    if (task.assignee && currentUser && task.assignee !== currentUser.name) {
      const ok = window.confirm(
        `이 업무의 담당은 ${task.assignee}입니다.\n${currentUser.name} 이름으로 대리 완료를 기록할까요?`
      )
      if (!ok) return
    }
    setCompleting(task.id)
    try {
      await window.api.invoke(window.api.channels.OBLIGATION_COMPLETE, {
        id: task.id,
        doneBy: currentUser?.name || profile?.defaultAuthor || undefined,
        source
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

  // 히어로 = 내 할 일: 활성 사용자 assignee 우선, 없으면 소속 팀 공동 업무 폴백(§0.6 결정1)
  const allEntries: Entry[] = [
    ...board.teams.flatMap((t) => t.tasks.map((task) => ({ task, teamId: t.teamId }))),
    // 팀 미지정이지만 담당자가 지정된 업무도 히어로/개인보드에 표시(M4 — 담당자가 자기 일을 놓치지 않게)
    ...board.unassigned.map((task) => ({ task, teamId: null }))
  ]
  const myTeamId = currentUser ? normalizeTeam(currentUser.teamDept) : null
  let heroEntries: Entry[] = []
  let heroMode: 'assignee' | 'team' = 'assignee'
  if (currentUser) {
    const byName = allEntries.filter((e) => e.task.assignee === currentUser.name)
    if (byName.length > 0) {
      heroEntries = byName
      heroMode = 'assignee'
    } else {
      heroEntries = myTeamId ? allEntries.filter((e) => e.teamId === myTeamId) : []
      heroMode = 'team'
    }
  }
  const heroToday = heroEntries.filter((e) => e.task.status !== 'upcoming') // 오늘 것만(예정 제외)

  return (
    <div className="space-y-5 break-keep">
      {/* 1. 히어로 — 내 할 일(활성 사용자). 목업 v2 화면① 최상단 */}
      <Hero
        user={currentUser}
        entries={heroToday}
        mode={heroMode}
        teamLabel={myTeamId ? teamTheme(myTeamId).label : null}
        dateLabel={dateLabel}
        completing={completing}
        onComplete={(t, source) => void complete(t, source)}
        onOpenForm={openForm}
        onOpenPage={setPage}
        onSelectUser={() => setShowPrompt(true)}
        currentName={currentUser?.name ?? null}
      />

      {/* 2. 타팀 스트립 — 5팀 한 줄(내 팀은 아웃라인) */}
      <TeamStrip
        teams={board.teams}
        myTeamId={myTeamId}
        onOpenTeam={(id) => {
          setSelectedTeam(id)
          setPage('team-detail')
        }}
      />

      {/* MES 기록 커버리지 한 줄 — ⚠️dmp 스냅샷이라 기준일 표기(오늘 아님). 7일+ 묵으면 앰버→다운로드 의무 */}
      <MesCoverageStrip status={mesStatus} today={board.date} onDownload={() => setPage('obligations')} />

      {/* 3. 경영지표 — 접힘(role=executive 자동 펼침). 기존 위젯 삭제 없이 이동만 */}
      <details open={currentUser?.role === 'executive'} className="group rounded-2xl border border-border bg-card">
        <summary className="cursor-pointer select-none list-none flex items-center gap-2 px-6 py-4 text-[15px] font-bold hover:bg-muted/40 rounded-2xl transition-colors">
          <ChevronDown className="w-4 h-4 shrink-0 transition-transform group-open:rotate-180" />
          경영지표
          <span className="ml-1 text-[13px] font-medium text-muted-foreground">
            전사 이행률 {ratePct == null ? '—' : `${ratePct}%`} · 심사 D-{Math.abs(dday)}
          </span>
        </summary>
        <div className="space-y-5 px-6 pb-6 pt-1">
      {/* 회사 밴드 — 파스텔 면(7/16 사장님: 전체 파스텔 밝게). 딥블루는 활성 버튼 점에만 */}
      <div className="rounded-2xl px-8 py-6 flex items-center gap-6 flex-wrap border border-border bg-gradient-to-r from-white via-[#eaf3fc] to-[#dcebfa]">
        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-muted-foreground break-keep leading-snug">
            {profile?.companyName || 'IATF 16949 품질경영시스템'} · {dateLabel}
          </div>
          {/* 톤 원칙(코워크 09 검토 반영): 하루가 끝나기 전 이행률은 경보가 아니라 진행 현황 — 위기어는 연체에만 */}
          <h1 className="text-[23px] font-extrabold leading-snug tracking-[-0.02em] mt-1">
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
            'h-10 px-5 rounded-lg text-[13.5px] font-bold border transition-colors',
            onlyOpen
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-white border-border text-foreground hover:bg-muted'
          )}
          title="미이행(오늘 마감·연체) 업무만 표시"
        >
          {onlyOpen ? '전체 보기' : '미이행만 보기'}
        </button>
        <button
          type="button"
          onClick={() => setPage('obligations')}
          className="h-10 px-5 rounded-lg text-[13.5px] font-bold bg-white border border-border text-foreground hover:bg-muted transition-colors"
          title="정기 의무 등록·수정 — 팀별 일상 업무를 여기서 등록"
        >
          정기 의무 관리 ›
        </button>
      </div>

      {/* KPI 타일 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="오늘 이행률 (전사)" value={ratePct == null ? '—' : `${ratePct}%`} sub={denom === 0 ? '오늘 도래 업무 없음' : `${totals.done} / ${denom}건 완료 · 실시간 집계`} />
        <Kpi label="남은 업무 (오늘 마감)" value={String(totals.open)} sub="완료 처리 전 — 하루 안엔 정상" />
        <Kpi label="연체 (기한 경과)" value={String(totals.overdue)} bad={totals.overdue > 0} sub="가장 먼저 해소" />
        <button
          type="button"
          onClick={() => setPage('sq-readiness')}
          className="text-left bg-card border border-border rounded-xl px-6 py-5 hover:shadow-md transition-shadow"
          title="심사 준비는 '심사 대응' 탭에서 — SQ 42항목"
        >
          <div className="text-[16.5px] font-bold text-foreground inline-flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 심사 대비 <span className="opacity-70">(항목)</span>
          </div>
          <div className="text-[30px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1">
            D-{Math.abs(dday)}
          </div>
          <div className="text-[13px] font-semibold text-primary mt-1.5 inline-flex items-center">
            SQ 준비도 보기 <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </button>
      </div>

      {/* 위젯: 주간 완료 추이 + 팀별 오늘 이행률 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-[16.5px] font-bold text-foreground mb-3.5">주간 완료 추이 (전사)</div>
          <TrendBars trend={board.trend} />
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="mb-3.5 flex items-baseline">
            <span className="flex-1 text-[16.5px] font-bold text-foreground">팀별 오늘 이행률</span>
            <button
              type="button"
              onClick={() => setPage('team-hub')}
              className="text-[13px] font-bold text-primary"
            >
              팀별 허브 ›
            </button>
          </div>
          <div className="grid gap-3">
            {board.teams.map((t) => {
              const theme = teamTheme(t.teamId)
              const d = t.done + t.open
              const pct = d > 0 ? Math.round((t.done / d) * 100) : null
              return (
                <div key={t.teamId} className="flex items-center gap-3 text-[14.5px]">
                  <span className="w-[118px] font-semibold break-keep leading-snug" style={{ color: theme.darkText }}>
                    {theme.label}
                  </span>
                  <span className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                    {pct != null && (
                      <span
                        className="block h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: theme.border }}
                      />
                    )}
                  </span>
                  <span className="w-16 text-right tabular-nums text-[14px] text-muted-foreground">
                    {d === 0 ? '없음' : `${t.done}/${d}건`}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* KPI 지수 스트립 (0066 대표 + 0082 v4 §04 팀별) — 목표 대비 실적, 미입력=정직 회색 */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-3.5 flex items-baseline flex-wrap gap-2">
          <span className="flex-1 text-[16.5px] font-bold text-foreground">KPI 지수 — 목표 대비 월 실적</span>
          <span className="text-[13px] text-muted-foreground">빈칸=미입력 정직 표시 · 자동산출 불가분은 수기 집계</span>
          <button
            type="button"
            onClick={() => setKpiBatchOpen(true)}
            className="text-[12.5px] font-bold px-3 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 shrink-0"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            월별 실적 일괄 입력
          </button>
        </div>
        <div className="mb-3.5 flex items-center flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setKpiFilter('rep')}
            className={cn(
              'text-[12.5px] font-bold px-3 py-1.5 rounded-full border transition-colors',
              kpiFilter === 'rep'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            대표 지표
          </button>
          {TEAMS.map((t) => {
            const active = kpiFilter === t.id
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setKpiFilter(t.id)}
                className={cn(
                  'text-[12.5px] font-bold px-3 py-1.5 rounded-full border transition-colors',
                  !active && 'border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                style={active ? { backgroundColor: t.tintBg, borderColor: t.border, color: t.darkText } : undefined}
              >
                {t.label}
              </button>
            )
          })}
        </div>
        {(() => {
          const shown =
            kpiFilter === 'rep'
              ? kpis.filter((k) => k.sortOrder < 100)
              : kpis.filter((k) => normalizeTeam(k.ownerTeam) === kpiFilter)
          return shown.length === 0 ? (
            <div className="text-[13px] text-muted-foreground">지표 없음</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {shown.map((k) => (
                <KpiTile
                  key={k.id}
                  kpi={k}
                  enteredBy={profile?.defaultAuthor || undefined}
                  onSaved={loadKpis}
                  onOpenPage={setPage}
                />
              ))}
            </div>
          )
        })()}
      </div>

      {kpiBatchOpen && (
        <KpiBatchEntryModal
          indicators={kpis}
          enteredBy={profile?.defaultAuthor || currentUser?.name || undefined}
          onClose={() => setKpiBatchOpen(false)}
          onSaved={loadKpis}
        />
      )}
        </div>
      </details>

      {/* 메인: 오늘 할 일 보드 — 팀별 ⇄ 개인별 (전체 보드, 삭제 없이 유지) */}
      <div>
        <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
          <span className="text-[19px] font-extrabold tracking-[-0.01em]">
            오늘 할 일 — 했는지 · 안 했는지
          </span>
          <span className="text-[14px] font-medium text-muted-foreground">
            ✓ = 완료 처리 또는 연결 양식의 오늘 작성 기록 · 심사(SQ) 연계는 배지로만
          </span>
          <span className="flex-1" />
          <span className="inline-flex rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setBoardView('team')}
              className={cn(
                'h-9 px-4 text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors',
                boardView === 'team' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <Users className="w-3.5 h-3.5" /> 팀별
            </button>
            <button
              type="button"
              onClick={() => setBoardView('person')}
              className={cn(
                'h-9 px-4 text-[13px] font-bold inline-flex items-center gap-1.5 transition-colors',
                boardView === 'person' ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:bg-muted'
              )}
            >
              <User className="w-3.5 h-3.5" /> 개인별
            </button>
          </span>
        </div>
        {boardView === 'person' ? (
          <PersonBoard
            teams={board.teams}
            unassignedTasks={board.unassigned}
            onlyOpen={onlyOpen}
            completing={completing}
            onComplete={(t, source) => void complete(t, source)}
            onOpenForm={openForm}
            onOpenPage={setPage}
            onGoObligations={() => setPage('obligations')}
            currentName={currentUser?.name ?? null}
          />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
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
                className="bg-card rounded-xl overflow-hidden flex flex-col border border-border"
              >
                <div
                  className="px-5 py-3 text-[16.5px] font-bold flex items-center"
                  style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
                >
                  <span className="flex-1 break-keep leading-snug">{theme.label}</span>
                  <span className="text-[13.5px] font-semibold tabular-nums opacity-85 shrink-0">
                    {denomT === 0 ? `예정 ${team.upcoming}` : `${team.done}/${denomT}건`}
                  </span>
                </div>

                {tasks.length === 0 ? (
                  <div className="px-5 py-4 text-[14.5px] leading-relaxed text-muted-foreground">
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
                        onComplete={(source) => void complete(task, source)}
                        onOpenForm={openForm}
                        onOpenPage={setPage}
                        currentName={currentUser?.name ?? null}
                      />
                    ))}
                  </div>
                )}

                <div className="mt-auto px-5 py-3 border-t border-border flex items-center gap-2.5 text-[13.5px] text-muted-foreground">
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
        )}
      </div>

      {/* 팀 미배정 의무 — 정직 노출 */}
      {board.unassigned.length > 0 && (
        <button
          type="button"
          onClick={() => setPage('obligations')}
          className="w-full text-left bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-[14.5px] text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <AlertCircle className="w-3.5 h-3.5 inline -mt-0.5 mr-1.5" />
          담당 팀이 지정되지 않은 오늘 업무 <b>{board.unassigned.length}건</b> — 정기 의무에서 담당을
          지정하면 보드에 나타납니다 ›
        </button>
      )}

      {/* §4 — 첫 실행 시 사용자 선택 모달 1회(건너뛰기 허용) */}
      {showPrompt && (
        <UserPromptModal
          users={users}
          onPick={(id) => {
            setActiveUser(id)
            dismissPrompt()
          }}
          onClose={dismissPrompt}
        />
      )}
    </div>
  )
}

// ── 히어로: 내 할 일(활성 사용자 중심) ──────────────────────────────
function Hero({
  user,
  entries,
  mode,
  teamLabel,
  dateLabel,
  completing,
  onComplete,
  onOpenForm,
  onOpenPage,
  onSelectUser,
  currentName
}: {
  user: AppUserDto | null
  entries: Entry[]
  mode: 'assignee' | 'team'
  teamLabel: string | null
  dateLabel: string
  completing: number | null
  onComplete: (t: TodayTaskDto, source: 'manual' | 'form') => void
  onOpenForm: (formCode: string) => void
  onOpenPage: (page: PageId) => void
  onSelectUser: () => void
  currentName: string | null
}): JSX.Element {
  if (!user) {
    return (
      <div className="rounded-2xl px-8 py-7 border border-amber-200 bg-amber-50 flex items-center gap-5 flex-wrap">
        <UserCircle2 className="w-9 h-9 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[21px] font-extrabold tracking-[-0.01em] leading-snug">
            사용자를 선택하면 내 할 일이 보입니다
          </h1>
          <p className="text-[13.5px] text-amber-800 mt-1">
            완료·작성 기록에 남길 이름을 골라주세요 — 우측 상단에서 언제든 전환할 수 있습니다
          </p>
        </div>
        <button
          type="button"
          onClick={onSelectUser}
          className="h-10 px-5 rounded-lg text-[13.5px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-opacity shrink-0"
        >
          사용자 선택
        </button>
      </div>
    )
  }

  const done = entries.filter((e) => e.task.status === 'done').length
  const total = entries.length
  const pct = total > 0 ? Math.round((done / total) * 100) : null
  const overdue = entries.filter((e) => e.task.status === 'overdue').length

  return (
    <div className="rounded-2xl px-8 py-6 border border-border bg-gradient-to-r from-white via-[#eaf3fc] to-[#dcebfa]">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-[23px] font-extrabold leading-snug tracking-[-0.02em]">
          {total === 0 ? (
            <>{user.name}님, 오늘 도래한 할 일이 없습니다</>
          ) : (
            <>
              {user.name}님, 오늘 할 일 <b className="text-primary">{total}건</b> 중{' '}
              <b className="text-primary">{done}건</b> 끝냈어요
            </>
          )}
        </h1>
        <span className="text-[13.5px] text-muted-foreground">
          {dateLabel} · {user.teamDept ?? ''}
          {overdue > 0 && <span className="text-destructive font-bold"> · 연체 {overdue}건</span>}
        </span>
      </div>

      {mode === 'team' && total > 0 && (
        <div className="mt-1 text-[12.5px] text-muted-foreground">
          담당 지정 업무가 없어 <b>{teamLabel ?? '소속 팀'}</b> 공동 업무를 보여드립니다
        </div>
      )}

      {total > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <span className="flex-1 h-2.5 rounded-full bg-white/70 overflow-hidden">
            {pct != null && (
              <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
            )}
          </span>
          <span className="text-[13px] font-bold tabular-nums text-primary">{pct ?? 0}%</span>
        </div>
      )}

      {entries.length > 0 && (
        <div className="mt-3 bg-card rounded-xl border border-border overflow-hidden">
          {entries.map(({ task }) => (
            <TaskRow
              key={task.id}
              task={task}
              completing={completing === task.id}
              onComplete={(source) => onComplete(task, source)}
              onOpenForm={onOpenForm}
              onOpenPage={onOpenPage}
              currentName={currentName}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 타팀 스트립: 5팀 한 줄(내 팀 아웃라인, 연체 1건 노출) ──────────
function TeamStrip({
  teams,
  myTeamId,
  onOpenTeam
}: {
  teams: TeamTodayDto[]
  myTeamId: TeamId | null
  onOpenTeam: (id: TeamId) => void
}): JSX.Element {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {teams.map((t) => {
        const theme = teamTheme(t.teamId)
        const d = t.done + t.open
        const pct = d > 0 ? Math.round((t.done / d) * 100) : null
        const firstOverdue = t.tasks.find((x) => x.status === 'overdue')
        const isMine = t.teamId === myTeamId
        return (
          <button
            key={t.teamId}
            type="button"
            onClick={() => onOpenTeam(t.teamId)}
            title={`${theme.label} 상세 보기`}
            className={cn(
              'flex-1 min-w-[150px] text-left rounded-xl border bg-card px-3.5 py-2.5 hover:shadow-md transition-shadow',
              isMine ? 'border-2' : 'border-border'
            )}
            style={isMine ? { borderColor: theme.border } : undefined}
          >
            <div className="flex items-center gap-1.5 text-[13.5px] font-bold" style={{ color: theme.darkText }}>
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: theme.border }} />
              <span className="truncate">{theme.label}</span>
              {isMine && <span className="text-[10px] font-semibold text-muted-foreground">내 팀</span>}
              <span className="ml-auto text-[12.5px] tabular-nums text-muted-foreground shrink-0">
                {d === 0 ? '없음' : `${t.done}/${d}`}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              {pct != null && (
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: theme.border }} />
              )}
            </div>
            {firstOverdue ? (
              <div className="mt-1.5 text-[11.5px] text-destructive font-semibold truncate" title={firstOverdue.title}>
                연체 · {firstOverdue.title}
              </div>
            ) : (
              <div className="mt-1.5 text-[11.5px] text-muted-foreground">
                {d === 0 ? '오늘 도래 없음' : pct === 100 ? '오늘 다 함 👍' : '진행 중'}
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ── MES 커버리지 한 줄: dmp 스냅샷 기준일 표기 + 7일+ 앰버 → 다운로드 의무 딥링크 ──
function MesCoverageStrip({
  status,
  today,
  onDownload
}: {
  status: MesRecordsStatusDto | null
  today: string
  onDownload: () => void
}): JSX.Element | null {
  if (!status || !status.available || !status.dataEndYmd) return null
  const end = status.dataEndYmd
  const staleDays = daysBetweenYmd(end, today)
  const stale = staleDays >= 7
  // 커버리지 대상 4종만(출하 O는 MES 무기록이라 제외)
  const shown = status.types.filter((t) => ['W', 'I', 'P', 'MAC'].includes(t.key))
  const fmt = (n: number): string => (n >= 10000 ? `${(n / 10000).toFixed(1)}만` : n.toLocaleString())

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-2.5 flex items-center gap-x-3 gap-y-1 flex-wrap text-[13px]',
        stale ? 'border-amber-300 bg-amber-50' : 'border-border bg-card'
      )}
    >
      <span className="inline-flex items-center gap-1.5 font-bold shrink-0">
        <Database className={cn('w-3.5 h-3.5', stale ? 'text-amber-600' : 'text-muted-foreground')} />
        MES 기록
      </span>
      <span className={cn('font-semibold tabular-nums', stale ? 'text-amber-700' : 'text-foreground')}>
        {shortYmd(end)} 기준
      </span>
      <span className="text-muted-foreground">·</span>
      {shown.map((t) => (
        <span key={t.key} className="tabular-nums text-muted-foreground">
          {t.label} <b className="text-foreground">{fmt(t.totalItems)}</b>
        </span>
      ))}
      <span className="text-[11.5px] text-muted-foreground/70">(누적 · 정기 의무 ✓와 별개)</span>
      {stale && (
        <button
          type="button"
          onClick={onDownload}
          className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-amber-700 hover:bg-amber-100 rounded px-2 py-1 transition-colors shrink-0"
          title="MES 데이터가 오래됨 — 새 덤프 반입 필요(MES 다운로드 정기 의무)"
        >
          <Download className="w-3.5 h-3.5" /> {staleDays}일 지남 — MES 다운로드 필요 ›
        </button>
      )}
    </div>
  )
}

// ── §4 사용자 선택 모달(첫 실행 1회) ──────────────────────────────
function UserPromptModal({
  users,
  onPick,
  onClose
}: {
  users: AppUserDto[]
  onPick: (id: number) => void
  onClose: () => void
}): JSX.Element {
  const active = users.filter((u) => u.active)
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-6" onMouseDown={onClose}>
      <div
        className="w-full max-w-md bg-popover border border-border rounded-2xl shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-border">
          <div className="text-[15px] font-bold">누구세요?</div>
          <div className="text-[12.5px] text-muted-foreground mt-0.5">
            완료·작성 기록에 이 이름이 남습니다 — 골라주시면 내 할 일이 보입니다
          </div>
        </div>
        <div className="max-h-[56vh] overflow-y-auto p-2 grid grid-cols-2 gap-1.5">
          {active.map((u) => {
            const tid = normalizeTeam(u.teamDept)
            const th = tid ? teamTheme(tid) : null
            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onPick(u.id)}
                className="flex items-center gap-2 text-left rounded-lg px-2.5 py-2 hover:bg-muted transition-colors"
              >
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                  style={{ background: th?.tintBg ?? '#EEF0F3', color: th?.darkText ?? '#3F4650' }}
                >
                  {u.name.trim().charAt(0) || '?'}
                </span>
                <span className="leading-tight min-w-0">
                  <span className="block text-[13px] font-semibold truncate">{u.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">{u.teamDept ?? ''}</span>
                </span>
              </button>
            )
          })}
        </div>
        <div className="px-5 py-3 border-t border-border text-right">
          <button
            type="button"
            onClick={onClose}
            className="text-[12.5px] font-semibold text-muted-foreground hover:text-foreground px-3 py-1.5"
          >
            나중에
          </button>
        </div>
      </div>
    </div>
  )
}

function Kpi({ label, value, sub, bad }: { label: string; value: string; sub: string; bad?: boolean }): JSX.Element {
  return (
    <div className="bg-card border border-border rounded-xl px-6 py-5">
      <div className="text-[16.5px] font-bold text-foreground">{label}</div>
      <div
        className={cn(
          'text-[30px] font-extrabold tabular-nums tracking-[-0.02em] leading-tight mt-1',
          bad && 'text-destructive'
        )}
      >
        {value}
      </div>
      <div className="text-[13px] text-muted-foreground mt-1.5">{sub}</div>
    </div>
  )
}

/** 최근 7일 완료 건수 미니 바 차트 (0063 이력 — 오늘부터 쌓임). */
function TrendBars({ trend }: { trend: TeamTodayBoardDto['trend'] }): JSX.Element {
  const max = Math.max(1, ...trend.map((t) => t.done))
  const allZero = trend.every((t) => t.done === 0)
  return (
    <div>
      <div className="flex items-end gap-2 h-[88px]">
        {trend.map((t) => {
          const d = new Date(`${t.date}T00:00:00`)
          return (
            <div key={t.date} className="flex-1 flex flex-col items-center gap-1 min-w-0">
              <span className="text-[12px] tabular-nums text-muted-foreground">{t.done > 0 ? t.done : ''}</span>
              <div
                className="w-full max-w-[42px] rounded-t bg-primary/80"
                style={{ height: `${Math.max(t.done > 0 ? 10 : 2, (t.done / max) * 58)}px` }}
              />
              <span className="text-[12px] text-muted-foreground">{`${d.getMonth() + 1}/${d.getDate()}`}</span>
            </div>
          )
        })}
      </div>
      {allZero && (
        <div className="text-[13px] text-muted-foreground mt-2">
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
  onOpenForm,
  onOpenPage,
  currentName,
  teamDot
}: {
  task: TodayTaskDto
  completing: boolean
  /** source='form'=작성기록으로 확정(§0.6 결정2) / 'manual'=무연결 의무 수동 완료 */
  onComplete: (source: 'manual' | 'form') => void
  onOpenForm: (formCode: string) => void
  /** 도구 딥링크(예: 모의 역추적 훈련 → LOT 계보 조회) */
  onOpenPage: (page: PageId) => void
  /** 무연결 의무 수동 완료 버튼의 기록 주체 표기(활성 사용자) */
  currentName: string | null
  /** 개인별 보드에서 소속 팀 표시(팀 고유색 점) */
  teamDot?: { color: string; label: string }
}): JSX.Element {
  const st = STATUS_STYLE[task.status]
  const Icon = st.icon
  const isOpen = task.status === 'due' || task.status === 'overdue'
  const link = traceDeepLink(task.title)
  return (
    <div className="px-5 py-3 border-t border-border first:border-t-0 flex items-center gap-2.5 text-[14.5px]">
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
        style={{ backgroundColor: st.bg }}
        title={st.label}
      >
        <Icon className="w-3.5 h-3.5" />
      </span>
      {teamDot && (
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: teamDot.color }}
          title={teamDot.label}
        />
      )}
      <span className="flex-1 min-w-0 break-keep leading-snug line-clamp-2" title={`${task.title} · ${task.cadence} 주기`}>
        {task.title}
        {task.status === 'overdue' && task.daysLeft != null && (
          <em className="not-italic text-destructive font-bold text-[13.5px]"> 연체 {Math.abs(task.daysLeft)}일</em>
        )}
        {task.status === 'upcoming' && task.daysLeft != null && (
          <span className="text-muted-foreground text-[13.5px] tabular-nums"> D-{task.daysLeft}</span>
        )}
      </span>
      {task.triggerIssueId && (
        <span
          className="text-[11px] font-bold bg-violet-100 text-violet-800 rounded px-1.5 py-0.5 shrink-0"
          title="데이터 트리거 발행 건(M3) — 데이터가 만든 할 일"
        >
          데이터
        </span>
      )}
      {task.triggerResolved && task.status !== 'done' && (
        <span
          className="text-[11px] font-semibold text-emerald-700 shrink-0"
          title="원천 데이터가 조건을 해소했습니다 — 완료 ✓ 확정은 사람이 합니다(자동 완료 금지)"
        >
          데이터로 해소됨
        </span>
      )}
      {task.sqBadges.length > 0 && (
        <span
          className="text-[11px] font-bold bg-secondary text-secondary-foreground rounded px-1.5 py-0.5 shrink-0 tabular-nums"
          title={`SQ 연계 항목: ${task.sqBadges.join(', ')} — 심사는 항목 각주로만`}
        >
          SQ {task.sqBadges[0]}
          {task.sqBadges.length > 1 && ` +${task.sqBadges.length - 1}`}
        </span>
      )}
      {link && task.status !== 'done' && (
        <button
          type="button"
          onClick={() => onOpenPage(link.page)}
          className="h-8 px-2.5 rounded-md text-[12px] font-bold text-primary hover:bg-primary/10 inline-flex items-center gap-1 shrink-0"
          title={link.hint}
        >
          <Network className="w-3 h-3" /> {link.label}
        </button>
      )}
      {task.status === 'done' ? (
        <span
          className="text-[13px] font-semibold shrink-0"
          style={{ color: task.doneSource === 'form' ? '#4f9e3c' : undefined }}
          title={task.doneSource === 'form' ? '연결 양식 작성기록으로 확정됨' : '완료 처리됨'}
        >
          {task.doneSource === 'form' ? '작성기록 ✓' : '완료 ✓'}
        </span>
      ) : isOpen ? (
        task.formCode ? (
          task.hasFormRecord ? (
            // 작성기록 있음 · 미확정 — 앰버 확정(§0.6 결정2: 표시만 done 금지, 확정=도래일 전진)
            <span className="flex items-center gap-1.5 shrink-0">
              <span className="hidden md:inline text-[11px] font-semibold text-amber-700">작성기록 있음</span>
              <button
                type="button"
                onClick={() => onComplete('form')}
                disabled={completing}
                className="h-8 px-2.5 rounded-md text-[12px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 inline-flex items-center gap-1"
                title="오늘 연결 양식 작성기록이 있습니다 — 완료로 확정(다음 도래일 전진)"
              >
                {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : '작성기록으로 확정'}
              </button>
            </span>
          ) : (
            // 연결 양식 · 작성기록 없음 — 수동 완료 없음(눈속임 차단), 정답 보고 작성만
            <span className="flex items-center gap-1.5 shrink-0">
              <span
                className="hidden md:inline-flex items-center gap-0.5 text-[11px] font-semibold text-muted-foreground"
                title="이 업무는 완료 버튼이 아니라 연결 양식 작성기록으로만 ✓ 됩니다(눈속임 차단)"
              >
                <Lock className="w-3 h-3" /> 작성기록으로만 ✓
              </span>
              <button
                type="button"
                onClick={() => onOpenForm(task.formCode!)}
                className="h-8 px-2.5 rounded-md text-[12px] font-bold bg-primary/10 text-primary hover:bg-primary/20 inline-flex items-center gap-1"
                title={`연결 양식(${task.formCode}) 정답 보고 작성`}
              >
                <FileEdit className="w-3 h-3" /> 정답 보고 작성
              </button>
            </span>
          )
        ) : (
          // 무연결 의무 — 수동 완료(기록 주체 명시)
          <button
            type="button"
            onClick={() => onComplete('manual')}
            disabled={completing}
            className="h-8 px-3 rounded-md text-[12px] font-bold bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 inline-flex items-center gap-1 shrink-0"
            title="이행 완료 처리 — 다음 도래일 자동 전진 + 이력 기록"
          >
            {completing ? <Loader2 className="w-3 h-3 animate-spin" /> : <>완료{currentName ? ` (기록: ${currentName})` : ''}</>}
          </button>
        )
      ) : null}
    </div>
  )
}

/** 개인별 보드 — 담당자(0066)가 지정된 업무를 사람 단위로 재그룹. 미지정은 카드 대신 안내. */
function PersonBoard({
  teams,
  unassignedTasks,
  onlyOpen,
  completing,
  onComplete,
  onOpenForm,
  onOpenPage,
  onGoObligations,
  currentName
}: {
  teams: TeamTodayDto[]
  /** 팀 미지정 업무(board.unassigned) — 담당자가 있으면 사람 카드에 포함(M4) */
  unassignedTasks: TodayTaskDto[]
  onlyOpen: boolean
  completing: number | null
  onComplete: (task: TodayTaskDto, source: 'manual' | 'form') => void
  onOpenForm: (formCode: string) => void
  onOpenPage: (page: PageId) => void
  onGoObligations: () => void
  currentName: string | null
}): JSX.Element {
  type PEntry = { task: TodayTaskDto; teamId: TeamId | null }
  const persons = new Map<string, PEntry[]>()
  let unassigned = 0
  const collect = (task: TodayTaskDto, teamId: TeamId | null): void => {
    if (onlyOpen && task.status !== 'due' && task.status !== 'overdue') return
    if (!task.assignee) {
      unassigned++
      return
    }
    if (!persons.has(task.assignee)) persons.set(task.assignee, [])
    persons.get(task.assignee)!.push({ task, teamId })
  }
  for (const team of teams) for (const task of team.tasks) collect(task, team.teamId)
  // 팀 미지정이지만 담당자 지정된 업무도 사람 카드에(M4)
  for (const task of unassignedTasks) collect(task, null)
  const names = [...persons.keys()].sort((a, b) => a.localeCompare(b, 'ko'))

  if (names.length === 0) {
    return (
      <button
        type="button"
        onClick={onGoObligations}
        className="w-full text-left bg-card border border-border rounded-xl px-6 py-7 text-[14.5px] leading-relaxed text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        담당자가 지정된 업무가 아직 없습니다 — <b className="text-foreground">정기 의무 관리</b>에서 각 업무에
        담당자(개인)를 지정하면 여기에 사람별 보드가 나타납니다 ›
        {unassigned > 0 && <span className="block mt-1 text-[13px]">오늘 업무 중 담당자 미지정 {unassigned}건</span>}
      </button>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {names.map((name) => {
          const entries = persons.get(name)!
          const done = entries.filter((e) => e.task.status === 'done').length
          const open = entries.filter((e) => e.task.status === 'due' || e.task.status === 'overdue').length
          const denom = done + open
          const pct = denom > 0 ? Math.round((done / denom) * 100) : null
          return (
            <div key={name} className="bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="px-5 py-3 text-[16.5px] font-bold flex items-center bg-secondary text-secondary-foreground">
                <span className="flex-1 break-keep leading-snug">{name}</span>
                <span className="text-[13.5px] font-semibold tabular-nums opacity-85 shrink-0">
                  {denom === 0 ? `예정 ${entries.length}` : `${done}/${denom}건`}
                </span>
              </div>
              <div className="flex-1">
                {entries.map(({ task, teamId }) => {
                  const theme = teamId ? teamTheme(teamId) : null
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      completing={completing === task.id}
                      onComplete={(source) => onComplete(task, source)}
                      onOpenForm={onOpenForm}
                      onOpenPage={onOpenPage}
                      currentName={currentName}
                      teamDot={theme ? { color: theme.border, label: theme.label } : undefined}
                    />
                  )
                })}
              </div>
              <div className="mt-auto px-5 py-3 border-t border-border flex items-center gap-2.5 text-[13.5px] text-muted-foreground">
                <span className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  {pct != null && <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />}
                </span>
                <span className="tabular-nums">{pct == null ? '—' : `${pct}%`}</span>
              </div>
            </div>
          )
        })}
      </div>
      {unassigned > 0 && (
        <button
          type="button"
          onClick={onGoObligations}
          className="mt-4 w-full text-left bg-muted/60 border border-border rounded-xl px-5 py-3 text-[14.5px] text-muted-foreground hover:bg-muted transition-colors"
        >
          담당자 미지정 업무 {unassigned}건 — 정기 의무에서 담당자(개인)를 지정하면 개인별 보드에 나타납니다 ›
        </button>
      )}
    </>
  )
}

/** KPI 타일 — 목표 대비 최신 실적, 미입력=회색, [입력]=월별 값 기록(같은 달 재입력 시 정정) */
function KpiTile({
  kpi,
  enteredBy,
  onSaved,
  onOpenPage
}: {
  kpi: KpiIndicatorDto
  enteredBy?: string
  onSaved: () => void
  /** 실측 도구 딥링크(예: 역추적 소요시간 → LOT 계보 조회) */
  onOpenPage?: (page: PageId) => void
}): JSX.Element {
  const link = traceDeepLink(kpi.name)
  const nowPeriod = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })()
  const [editing, setEditing] = useState(false)
  const [period, setPeriod] = useState(nowPeriod)
  const [val, setVal] = useState('')
  const [saving, setSaving] = useState(false)

  const fmt = (n: number): string => n.toLocaleString()
  const ok =
    kpi.latest && kpi.target != null
      ? kpi.direction === 'lower'
        ? kpi.latest.value <= kpi.target
        : kpi.latest.value >= kpi.target
      : null
  const diff = kpi.latest && kpi.prev ? kpi.latest.value - kpi.prev.value : null
  const improved = diff != null && diff !== 0 ? (kpi.direction === 'lower' ? diff < 0 : diff > 0) : null

  const save = async (): Promise<void> => {
    const v = Number(val)
    if (!Number.isFinite(v) || !period) return
    setSaving(true)
    try {
      await window.api.invoke(window.api.channels.KPI_SAVE, {
        indicatorId: kpi.id,
        period,
        value: v,
        enteredBy
      })
      setEditing(false)
      setVal('')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-border rounded-lg px-4 py-4 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className="flex-1 text-[14.5px] font-bold text-foreground break-keep leading-snug" title={`${kpi.name}${kpi.ownerTeam ? ` · ${kpi.ownerTeam}` : ''}${kpi.note ? ` — ${kpi.note}` : ''}`}>
          {kpi.name}
        </span>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-[11.5px] font-bold text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 shrink-0"
        >
          {editing ? '닫기' : '입력'}
        </button>
      </div>

      {editing ? (
        <div className="mt-2 space-y-1.5">
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="input-field !text-[11.5px] !py-1 !px-1.5" />
          <div className="flex gap-1.5">
            <input
              type="number"
              value={val}
              onChange={(e) => setVal(e.target.value)}
              placeholder={`값 (${kpi.unit})`}
              className="input-field !text-[11.5px] !py-1 !px-1.5 min-w-0"
              onKeyDown={(e) => {
                if (e.key === 'Enter') void save()
              }}
            />
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || val === ''}
              className="h-[26px] px-2 rounded-md text-[10.5px] font-bold bg-primary text-primary-foreground disabled:opacity-50 shrink-0"
            >
              {saving ? '…' : '저장'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div
            className={cn(
              'text-[22px] font-extrabold tabular-nums tracking-[-0.01em] mt-1 leading-tight',
              !kpi.latest && 'text-muted-foreground/60 font-bold text-[17px]',
              ok === false && 'text-destructive'
            )}
          >
            {kpi.latest ? (
              <>
                {fmt(kpi.latest.value)} <small className="text-[12px] font-semibold text-muted-foreground">{kpi.unit}</small>
              </>
            ) : (
              '미입력'
            )}
          </div>
          <div className="text-[12.5px] text-muted-foreground mt-1.5 tabular-nums flex items-center gap-1.5 flex-wrap">
            <span>{kpi.target != null ? `목표 ${fmt(kpi.target)}` : '목표 미설정'}</span>
            {diff != null && diff !== 0 && (
              <span className={cn('font-bold', improved ? 'text-[#0a7a0a]' : 'text-destructive')}>
                {diff > 0 ? '▲' : '▼'} {fmt(Math.abs(diff))}
              </span>
            )}
            {kpi.latest && <span className="opacity-70">{kpi.latest.period.slice(5)}월</span>}
            {link && onOpenPage && (
              <button
                type="button"
                onClick={() => onOpenPage(link.page)}
                className="font-bold text-primary hover:bg-primary/10 rounded px-1.5 py-0.5 inline-flex items-center gap-1"
                title={link.hint}
              >
                <Network className="w-3 h-3" /> {link.label}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
