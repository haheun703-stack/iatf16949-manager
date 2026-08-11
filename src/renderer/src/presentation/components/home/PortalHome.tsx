import { useCallback, useEffect, useState } from 'react'
import {
  Check, X, AlertCircle, Clock, Loader2, FileEdit, Users, User, Network,
  UserCircle2, Lock, ClipboardList
} from 'lucide-react'
import { TEAMS, normalizeTeam, teamTheme, type TeamId } from '@shared/team-theme'
import type {
  CompanyProfile,
  TeamTodayBoardDto,
  TeamTodayDto,
  TodayTaskDto,
  KpiIndicatorDto,
  MesRecordsStatusDto,
  AppUserDto,
  ObligationMatrixDto
} from '@shared/ipc-types'
import { SqAuditView } from '../sq-audit/SqAuditView'
import { CardShell, KpiTile as StatTile, TeamDonut, MatrixBoard, MatrixLegend, SegTabs } from '../shared/dash/DashKit'
import { cn } from '../../../lib/utils'
import { traceDeepLink } from '../../../lib/deeplink'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { KpiBatchEntryModal } from './KpiBatchEntryModal'
import { confirmDialog } from '../shared/ConfirmDialog'

type Entry = { task: TodayTaskDto; teamId: TeamId | null }
const PROMPT_SEEN_KEY = 'user_prompt_seen'

/**
 * 홈 = 사장님 관제탑 (포털 1단계, v4 목업 확정 2026-07-16).
 * 메인 = 팀별 오늘 할 일의 이행 여부(✓/✕) — 품질·심사만이 아닌 전사 정기 업무.
 * ✓ 판정 = 완료 처리(0063 이력) 또는 연결 양식의 오늘 작성 기록(눈속임 아님).
 * SQ/IATF 는 할 일 옆 배지로만(항목 강등) — 심사 중심 화면은 '심사 대응' 탭.
 * PageHeader 예외: 대시보드형 밴드가 헤더 역할(P2 예외 4종과 동일 근거).
 */
export function PortalHome({ mode = 'home' }: { mode?: 'home' | 'board' } = {}): JSX.Element {
  const [board, setBoard] = useState<TeamTodayBoardDto | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [kpis, setKpis] = useState<KpiIndicatorDto[]>([])
  // KPI 필터: 'rep'=대표 6종(0066) / TeamId=팀별(0082 v4 §04) — 35종 평면 나열 방지
  const [kpiFilter, setKpiFilter] = useState<'rep' | TeamId>('rep')
  const [onlyOpen, setOnlyOpen] = useState(false)
  const [boardView, setBoardView] = useState<'team' | 'person'>('team')
  const [completing, setCompleting] = useState<number | null>(null)
  const [mesStatus, setMesStatus] = useState<MesRecordsStatusDto | null>(null)
  const [matrix, setMatrix] = useState<ObligationMatrixDto | null>(null)
  const [matrixStatus, setMatrixStatus] = useState<'ready' | 'loading' | 'error'>('loading')
  const [matrixView, setMatrixView] = useState<'team' | 'person'>('team')
  const [showPrompt, setShowPrompt] = useState(false)
  const [kpiBatchOpen, setKpiBatchOpen] = useState(false)
  // P1 ⓔ — 사람 의무 존 하단 탭(오늘 할 일 보드 ⇄ 이행 매트릭스, 정보 손실 0)
  const [homeTab, setHomeTab] = useState<'board' | 'matrix'>('board')
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setSelectedTeam = useUIStore((s) => s.setSelectedTeam)
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
    // 이행 매트릭스(17번 §3-2) — 보드와 함께 갱신. 5초 타임아웃 → 에러 상태(말 없는 공백 금지)
    setMatrixStatus('loading')
    try {
      const m = (await Promise.race([
        window.api.invoke(window.api.channels.OBLIGATION_MATRIX, {}),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
      ])) as ObligationMatrixDto
      setMatrix(m)
      setMatrixStatus('ready')
    } catch {
      setMatrix(null)
      setMatrixStatus('error')
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
    // 기준정보 집계는 31호 §3에 따라 홈 제거 — 기준정보 첫 화면(품번 트리)이 동일 수치 표출(손실 0)
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
      const ok = await confirmDialog({
        title: `담당은 ${task.assignee}입니다`,
        body: `${currentUser.name} 이름으로 대리 완료를 기록할까요? (누가 대신 완료했는지 정직 기록)`,
        okLabel: '대리 완료'
      })
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

  // ── 템플릿 A 파생 수치 (17번 §3-1 스탯 타일 — 기존 채널 재사용) ──
  const longGap = allEntries.reduce((a, e) => a + (e.task.gapCount ?? 0), 0)
  const dataCount =
    longGap + allEntries.filter((e) => e.task.triggerIssueId && e.task.status !== 'done').length
  const writtenToday = allEntries.filter(
    (e) => e.task.hasFormRecord || e.task.doneSource === 'form'
  ).length
  const upcomingSum = board.teams.reduce((a, t) => a + t.upcoming, 0)
  const denomAll = board.teams.reduce((a, t) => a + t.done + t.open, 0)
  const donutSegs = board.teams.map((t) => ({
    teamId: t.teamId,
    share: denomAll > 0 ? t.done / denomAll : 0,
    done: t.done,
    denom: t.done + t.open
  }))
  return (
    <div className="space-y-4 break-keep">
      {/* ── 템플릿 A 헤더 밴드 (19번 규칙②) — 제목+캡션+우측 상태 칩 ── */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">
          {mode === 'board' ? '오늘 할 일 — 전체 보드' : '관제탑'}
        </h1>
        <span className="text-[13px] text-muted-foreground">
          {profile?.companyName || '데일리Q'} · {dateLabel}
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setShowPrompt(true)}
          className="inline-flex items-center gap-2 bg-card border border-border rounded-full pl-1.5 pr-3.5 py-1 shadow-card text-[13px] font-bold"
          title="사용자 전환 — 완료·작성 기록에 남는 이름"
        >
          <span className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[13px] font-extrabold">
            {currentUser ? currentUser.name.charAt(0) : <UserCircle2 className="w-4 h-4" />}
          </span>
          {currentUser ? `${currentUser.name} · ${currentUser.teamDept ?? ''}` : '사용자 선택'}
        </button>
      </div>

      {/* ══ 31호 §2 — 홈 구조(8/6 통합검수 확정): ①문제 배너 ②TOP5 ③도넛 ④심사뷰 ⑤KPI = 5블록.
          팀별 보드·매트릭스 존은 '오늘 할 일 보드' 화면으로 이관(§5 상한 준수 — 검수 회신 §3).
          §5 정량 가드(UI 헌법): 홈 위젯 ≤5 · one-in-one-out · 동일 데이터 2회 표출 금지 ·
          카드당 배지 1+숫자 1. 위젯 신규 추가 시 기존 1개 제거/강등을 같은 커밋에 명시할 것. */}
      {mode === 'home' && (
        <>
      {/* ── 1층: 문제 배너 (조건부 — 문제만 크게. 상태 칩 4종·미반입 반복 표출을 여기로 집약) ── */}
      {(() => {
        const problems: Array<{ tone: 'bad' | 'warn'; text: string; onClick: () => void }> = []
        const mesLag =
          mesStatus?.available && mesStatus.dataEndYmd && board.date > mesStatus.dataEndYmd
            ? Math.round(
                (new Date(`${board.date}T00:00:00`).getTime() - new Date(`${mesStatus.dataEndYmd}T00:00:00`).getTime()) /
                  86400000
              )
            : 0
        if (mesLag >= 2) {
          problems.push({
            tone: 'warn',
            text: `MES 미반입 ${mesLag}일째 (기준 ${mesStatus!.dataEndYmd!.slice(5)})`,
            onClick: () => setPage('mes-records')
          })
        } else if (mesStatus && !mesStatus.available) {
          problems.push({ tone: 'warn', text: 'MES 사이드카 미가용 — 앱 기록만 집계', onClick: () => setPage('mes-records') })
        }
        if (totals.overdue > 0 || dataCount > 0) {
          problems.push({
            tone: totals.overdue > 0 ? 'bad' : 'warn',
            text: `할 일 ${totals.open}건 · 연체 ${totals.overdue}건 · 데이터 발행 ${dataCount}건`,
            onClick: () => {
              setOnlyOpen(true)
              setPage('today-board') // 보드 존 이관(8/6 검수 §3) — 전체 보드 화면으로
            }
          })
        }
        // 심사 D-day 는 상단 TopBar DdayBadge 가 상시 표출 — 여기 중복 금지(§5-2)
        return problems.length > 0 ? (
          <div className="flex flex-wrap gap-2" data-testid="problem-banner">
            {problems.map((p) => (
              <button
                key={p.text}
                type="button"
                onClick={p.onClick}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] font-extrabold border transition-colors',
                  p.tone === 'bad'
                    ? 'bg-bad-tint text-bad-ink border-bad-ink/25 hover:brightness-95'
                    : 'bg-warn-tint text-warn-ink border-warn-ink/25 hover:brightness-95'
                )}
              >
                ⚠ {p.text} <span className="text-[11.5px] font-semibold opacity-70">바로가기 →</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-4 py-2.5 text-[13px] font-bold bg-ok-tint text-ok-ink" data-testid="problem-banner">
            ● 오늘 기록 정상 진행 중 — 문제 항목 없음
          </div>
        )
      })()}

      {/* ── 2층: 오늘 할 일 TOP5 (연체 → 오늘 due → 확인 대기 순 · ✓는 사람) ── */}
      {(() => {
        const rank = (t: TodayTaskDto): number =>
          t.status === 'overdue' ? 0 : t.triggerResolved ? 2 : t.status === 'due' ? 1 : 3
        const top5 = allEntries
          .filter((e) => e.task.status === 'overdue' || e.task.status === 'due')
          .sort((a, b) => rank(a.task) - rank(b.task) || (a.task.daysLeft ?? 0) - (b.task.daysLeft ?? 0))
          .slice(0, 5)
        return (
          <div className="rounded-[14px] border border-border bg-card shadow-card p-4" data-testid="today-top5">
            <div className="flex items-center gap-2 mb-2.5">
              <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">오늘 할 일 TOP {top5.length}</h2>
              <span className="text-[12px] text-muted-foreground">연체 → 오늘 → 확인 대기 순</span>
              <button
                type="button"
                onClick={() => setPage('today-board')}
                className="ml-auto text-[12.5px] font-bold text-primary hover:underline"
              >
                전체 보드 →
              </button>
            </div>
            {top5.length === 0 ? (
              <p className="text-[13px] text-muted-foreground py-2">열린 할 일이 없습니다 — 오늘 몫은 끝났습니다.</p>
            ) : (
              <div className="flex flex-col divide-y divide-border/60">
                {top5.map(({ task, teamId }) => (
                  <div key={`${task.id}-${task.title}`} className="flex items-center gap-2.5 py-2">
                    <span
                      className={cn(
                        'shrink-0 text-[11px] font-bold rounded-md px-1.5 py-0.5',
                        task.status === 'overdue' ? 'bg-bad-tint text-bad-ink' : task.triggerResolved ? 'bg-ok-tint text-ok-ink' : 'bg-warn-tint text-warn-ink'
                      )}
                    >
                      {task.status === 'overdue'
                        ? `연체 ${task.daysLeft != null ? -task.daysLeft : ''}일`
                        : task.triggerResolved
                          ? '확인 대기'
                          : '오늘'}
                    </span>
                    <span className="min-w-0 truncate text-[13px] font-semibold">{task.title}</span>
                    {teamId && (
                      <span
                        className="shrink-0 text-[11px] font-bold rounded-md px-1.5 py-0.5"
                        style={{ background: teamTheme(teamId).tintBg, color: teamTheme(teamId).darkText }}
                      >
                        {teamTheme(teamId).label}
                      </span>
                    )}
                    <span className="flex-1" />
                    {task.formCode && (
                      <button
                        type="button"
                        onClick={() => openForm(task.formCode!)}
                        className="shrink-0 text-[12px] font-bold text-primary hover:underline"
                      >
                        작성
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={completing === task.id}
                      onClick={() => void complete(task)}
                      className="shrink-0 h-7 px-2.5 rounded-lg bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 disabled:opacity-50"
                    >
                      ✓ 처리
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })()}

      {/* ── 32호 §2·§5: 이 화면 = 심사대응 첫 화면(관제탑). 도넛 7카드는 홈 제거 →
          전광판 모드로 흡수 대기(§7-3 후순위 — ProcessLiveDonuts 파일 존치). 심사 뷰 임베드 유지. */}
      <SqAuditView />

      {/* ── P1 ⓓ 데이터 트리거 보드 승격 (M3 — 시스템 발행, ✓는 사람 몫) ── */}
      {(() => {
        const triggerTasks = allEntries.filter((e) => e.task.triggerIssueId && e.task.status !== 'done')
        return (
          <CardShell
            title="데이터 할 일 — 시스템 발행"
            cap="행렬 공백·심사 갭에서 자동 발행 — 국내 SME MES에 없는 계층 · ✓ 처리는 사람"
          >
            {triggerTasks.length === 0 ? (
              <div className="px-[18px] pb-4 text-[13px] text-muted-foreground">공백 신호 없음 👍</div>
            ) : (
              <div className="px-[18px] pb-3 space-y-1.5">
                {triggerTasks.map((e) => (
                  <div
                    key={e.task.id}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[11px] font-extrabold">
                      데이터
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] font-semibold truncate">{e.task.title}</span>
                    {/* 원천이 이미 해소한 건은 연체로 몰지 않는다 — 남은 일은 사람 ✓ 뿐(§3-2 자동완료 금지).
                        팀 보드 행(TaskRow)과 같은 문법으로 통일. */}
                    {e.task.triggerResolved ? (
                      <span
                        className="shrink-0 text-[12px] font-bold text-emerald-700"
                        title="원천 데이터가 조건을 해소했습니다 — 확인 후 ✓ 처리하면 사라집니다"
                      >
                        해소됨 — 확인 대기
                      </span>
                    ) : e.task.daysLeft != null && e.task.daysLeft < 0 ? (
                      <span className="shrink-0 text-[12px] font-bold text-bad-ink">연체 {-e.task.daysLeft}일</span>
                    ) : null}
                    <button
                      type="button"
                      disabled={completing === e.task.id}
                      onClick={() => void complete(e.task)}
                      className="shrink-0 h-7 px-3 rounded-md text-[12px] font-bold bg-primary text-primary-foreground disabled:opacity-50"
                      title="해소 확인 — 사람이 ✓(M3 규율)"
                    >
                      {completing === e.task.id ? '처리 중…' : '✓ 처리'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardShell>
        )
      })()}

      {/* ── KPI 스탯 타일 5 (17번 §3-1) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatTile
          icon="✓" iconTint="bg-secondary text-primary" label="오늘 완료율"
          value={ratePct == null ? '—' : ratePct} unit={ratePct == null ? undefined : '%'}
          chip={denom === 0 ? '오늘 도래 없음' : `${totals.done}/${denom}건 · 실시간`}
          chipTone={ratePct != null && ratePct >= 50 ? 'up' : 'fx'}
        />
        <StatTile
          icon="!" iconTint="bg-bad-tint text-bad-ink" label="연체 의무"
          value={totals.overdue} unit="건"
          chip={longGap > 0 ? `장기 7일+ ${longGap}건` : '장기 연체 없음'}
          chipTone={totals.overdue > 0 ? 'dn' : 'up'}
        />
        <StatTile
          icon="⚡" iconTint="bg-data-tint text-data-ink" label="데이터 할 일"
          value={dataCount} unit="건" chip="시스템 발행 — 국내 SME MES에 없는 계층" chipTone="fx"
        />
        <StatTile
          icon="▤" iconTint="bg-ok-tint text-ok-ink" label="오늘 작성 기록"
          value={writtenToday} unit="건" chip="연결 양식 작성 감지" chipTone={writtenToday > 0 ? 'up' : 'fx'}
        />
        <StatTile
          icon="◷" iconTint="bg-warn-tint text-warn-ink" label="이번주 도래"
          value={upcomingSum} unit="건" chip="리드타임 내 예정" chipTone="fx"
          onClick={() => setPage('obligations')}
        />
      </div>

      {/* (P1 ⓔ) 이행 매트릭스+우측 레일 그리드 = 하단 탭으로 이동(정보 손실 0) — 아래 homeTab 'matrix' 분기 */}

      {/* (구)회사밴드·경영지표 위젯 = 헤더 밴드·KPI 타일·도넛·스파크로 흡수(정보손실 0 확인표).
          미이행만 보기·정기 의무 관리 버튼은 아래 '오늘 할 일 보드' 헤더로 이동. */}


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
        </>
      )}

      {mode === 'board' && (
        <>
      {/* ── P1 ⓔ 사람 의무 존 — '오늘 할 일 보드' 화면으로 이관(8/6 검수 §3 — 탭·기능 무변) ── */}
      <div className="flex items-center gap-2.5 pt-1">
        <SegTabs
          value={homeTab}
          options={[
            { key: 'board', label: '오늘 할 일 보드' },
            { key: 'matrix', label: '이행 매트릭스' }
          ]}
          onChange={setHomeTab}
        />
        <span className="text-[12.5px] text-muted-foreground">사람 의무 존 — 반-MES 실황 아래 상시(탭 전환·삭제 없음)</span>
      </div>

      {homeTab === 'matrix' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
          <CardShell
            title="이행 매트릭스"
            cap={`사람 × 최근 ${matrix ? matrix.days.length : 7}일 — 했는지 · 안 했는지`}
            status={matrixStatus}
            onRetry={() => void load()}
            actions={
              <SegTabs
                value={matrixView}
                options={[
                  { key: 'team', label: '팀별' },
                  { key: 'person', label: '개인별' }
                ]}
                onChange={setMatrixView}
              />
            }
          >
            {matrix && matrix.teams.length > 0 ? (
              <>
                <MatrixBoard matrix={matrix} personView={matrixView === 'person'} />
                <MatrixLegend />
              </>
            ) : (
              <div className="px-[18px] py-10 text-[13px] text-muted-foreground">
                표시할 의무가 없습니다 — 정기 의무에서 등록하세요.
              </div>
            )}
          </CardShell>

          <div className="grid gap-4">
            <CardShell title="전사 이행률" cap="오늘">
              <TeamDonut
                segments={donutSegs}
                centerPct={ratePct}
                centerCap="오늘"
                onPickTeam={(id) => {
                  setSelectedTeam(id)
                  setPage('team-detail')
                }}
              />
              <div className="px-[18px] pb-4">
                <div className="text-[12px] font-semibold text-muted-foreground mb-1.5">주간 완료 추이</div>
                <TrendBars trend={board.trend} />
              </div>
            </CardShell>

            <CardShell
              title="내 할 일"
              cap={currentUser ? `${currentUser.name} · 오늘` : '사용자 미선택'}
              actions={
                <button
                  type="button"
                  onClick={() => setBoardView('person')}
                  className="text-[12px] font-bold text-primary"
                  title="보드를 개인별 보기로 전환"
                >
                  전체 보기 ›
                </button>
              }
            >
              <RailTasks
                user={currentUser}
                entries={heroToday}
                mode={heroMode}
                completing={completing}
                onComplete={(t, source) => void complete(t, source)}
                onOpenForm={openForm}
                onSelectUser={() => setShowPrompt(true)}
              />
            </CardShell>
          </div>
        </div>
      )}

      {homeTab === 'board' && (
      <>
      {/* 메인: 오늘 할 일 보드 — 팀별 ⇄ 개인별 (전체 보드, 삭제 없이 유지) */}
      <div id="today-board">
        <div className="flex items-baseline gap-2.5 mb-3 flex-wrap">
          <span className="text-[19px] font-extrabold tracking-[-0.01em]">
            오늘 할 일 — 했는지 · 안 했는지
          </span>
          <span className="text-[14px] font-medium text-muted-foreground">
            ✓ = 완료 처리 또는 연결 양식의 오늘 작성 기록 · 심사(SQ) 연계는 배지로만
          </span>
          <span className="flex-1" />
          {/* (구)회사밴드에서 이동 — 기능 무변 */}
          <button
            type="button"
            onClick={() => setOnlyOpen((v) => !v)}
            className={cn(
              'h-9 px-4 rounded-lg text-[13px] font-bold border transition-colors',
              onlyOpen
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card border-border text-foreground hover:bg-muted'
            )}
            title="미이행(오늘 마감·연체) 업무만 표시"
          >
            {onlyOpen ? '전체 보기' : '미이행만 보기'}
          </button>
          <button
            type="button"
            onClick={() => setPage('obligations')}
            className="h-9 px-4 rounded-lg text-[13px] font-bold bg-card border border-border text-foreground hover:bg-muted transition-colors"
            title="정기 의무 등록·수정"
          >
            정기 의무 관리 ›
          </button>
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
                        onShowOverdue={task.gapCount ? () => setOnlyOpen(true) : undefined}
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
      </>
      )}
        </>
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

// ── 우측 레일: 내 할 일(컴팩트) — 기존 히어로의 액션(완료·작성·확인) 보존 ──
function RailTasks({
  user,
  entries,
  mode,
  completing,
  onComplete,
  onOpenForm,
  onSelectUser
}: {
  user: AppUserDto | null
  entries: Entry[]
  mode: 'assignee' | 'team'
  completing: number | null
  onComplete: (t: TodayTaskDto, source: 'manual' | 'form') => void
  onOpenForm: (formCode: string) => void
  onSelectUser: () => void
}): JSX.Element {
  if (!user) {
    return (
      <div className="px-[18px] pb-[18px] pt-1 text-[13px] text-muted-foreground leading-relaxed">
        이름을 선택하면 오늘 내 할 일이 보입니다.
        <button
          type="button"
          onClick={onSelectUser}
          className="block mt-2.5 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold"
        >
          사용자 선택
        </button>
      </div>
    )
  }
  if (entries.length === 0) {
    return <div className="px-[18px] pb-[18px] pt-1 text-[13px] text-muted-foreground">오늘 내 할 일 없음 👍</div>
  }
  const shown = entries.slice(0, 7)
  return (
    <div className="px-[18px] pb-4 pt-1 grid gap-2">
      {mode === 'team' && (
        <div className="text-[11px] text-faint -mt-1">담당 지정 업무가 없어 팀 공동 업무를 보여드립니다</div>
      )}
      {shown.map(({ task, teamId }) => {
        const done = task.status === 'done'
        const badge = done
          ? { cls: 'bg-ok-tint text-ok-ink', label: task.doneSource === 'form' ? '작성기록 ✓' : '완료 ✓' }
          : task.gapCount
            ? { cls: 'bg-data-tint text-data-ink', label: '데이터' }
            : task.triggerIssueId
              ? { cls: 'bg-data-tint text-data-ink', label: task.triggerResolved ? '해소됨' : '데이터' }
              : task.status === 'overdue'
                ? { cls: 'bg-bad-tint text-bad-ink', label: `연체 ${Math.abs(task.daysLeft ?? 0)}일` }
                : task.status === 'due'
                  ? { cls: 'bg-warn-tint text-warn-ink', label: '오늘' }
                  : { cls: 'bg-muted text-muted-foreground', label: `D-${task.daysLeft ?? ''}` }
        return (
          <div key={task.id} className="flex items-center gap-2.5 border border-border rounded-[11px] px-3 py-2.5">
            <span
              className="w-1 h-8 rounded-full shrink-0"
              style={{ backgroundColor: task.gapCount || task.triggerIssueId ? 'var(--color-data)' : teamId ? teamTheme(teamId).border : 'var(--color-border)' }}
            />
            <span className="flex-1 min-w-0 leading-snug">
              <b className="block text-[12.5px] truncate">{task.title}</b>
              <span className="text-[11px] text-faint">{task.cadence} 주기{task.assignee ? ` · ${task.assignee}` : ''}</span>
            </span>
            <span className={cn('text-[10.5px] font-extrabold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap', badge.cls)}>
              {badge.label}
            </span>
            {!done && !task.gapCount && (
              task.formCode ? (
                task.hasFormRecord ? (
                  <button
                    type="button"
                    onClick={() => onComplete(task, 'form')}
                    disabled={completing === task.id}
                    className="h-7 px-2 rounded-md text-[11px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 shrink-0"
                    title="오늘 작성기록으로 완료 확정"
                  >
                    확정
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenForm(task.formCode!)}
                    className="h-7 px-2 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                    title={`연결 양식(${task.formCode}) 정답 보고 작성`}
                  >
                    작성
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => onComplete(task, 'manual')}
                  disabled={completing === task.id}
                  className="h-7 px-2 rounded-md text-[11px] font-bold bg-primary/10 text-primary hover:bg-primary/20 shrink-0"
                  title="이행 완료 처리"
                >
                  {completing === task.id ? '…' : '완료'}
                </button>
              )
            )}
          </div>
        )
      })}
      {entries.length > shown.length && (
        <div className="text-[11px] text-faint">+{entries.length - shown.length}건 더 — [전체 보기 ›]</div>
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
  teamDot,
  onShowOverdue
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
  /** [심사 갭] 집계 행의 드릴다운 — 미이행만 보기 전환(팀별 보드 전용) */
  onShowOverdue?: () => void
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
      {(task.triggerIssueId || task.gapCount) && (
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
      {task.gapCount ? (
        // [심사 갭] 팀당 집계 행(판단①-b) — 완료 개념 없음(원 의무 완료로 자동 소멸)
        <span className="flex items-center gap-1.5 shrink-0">
          <span
            className="hidden md:inline text-[11px] font-semibold text-muted-foreground"
            title="원 연체 의무들이 완료되면 건수가 줄고 0이면 이 행이 사라집니다(자동 소멸형)"
          >
            원 의무 완료 시 자동 소멸
          </span>
          {onShowOverdue && (
            <button
              type="button"
              onClick={onShowOverdue}
              className="h-8 px-2.5 rounded-md text-[12px] font-bold bg-destructive/10 text-destructive hover:bg-destructive/20 inline-flex items-center gap-1"
              title="연체 목록으로 드릴다운 — 미이행만 보기로 전환"
            >
              연체 보기
            </button>
          )}
        </span>
      ) : task.status === 'done' ? (
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
  const [err, setErr] = useState<string | null>(null)

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
    // 8/6 검수 M-7: 빈 값 Enter → Number('')===0 가짜 0 저장 차단(버튼 disabled 와 이중 방어)
    if (val.trim() === '') return
    const v = Number(val)
    if (!Number.isFinite(v) || !period) return
    setSaving(true)
    try {
      const res = (await window.api.invoke(window.api.channels.KPI_SAVE, {
        indicatorId: kpi.id,
        period,
        value: v,
        enteredBy
      })) as { success: boolean }
      if (!res.success) {
        setErr('저장 실패 — 기입 주체(사용자 선택)·값을 확인하세요.')
        return
      }
      setErr(null)
      setEditing(false)
      setVal('')
      onSaved()
    } catch {
      setErr('저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.')
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
          {err && <p className="text-[10.5px] font-semibold text-bad-ink">{err}</p>}
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
