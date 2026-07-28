import { useEffect, useState } from 'react'
import {
  ChevronRight, ChevronDown, Loader2, ArrowLeft, BookOpen,
  PencilLine, Sparkles, CircleCheck, CircleAlert
} from 'lucide-react'
import { teamTheme, ALERT_RED } from '@shared/team-theme'
import type {
  TeamSummaryDto, TeamSqItemDto, SqItemDetailDto, RegulationSectionDto, TeamRegDto,
  TeamTodayBoardDto, TodayTaskDto, ObligationMatrixDto
} from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { useDday } from '../../hooks/useDday'
import { cn } from '../../../lib/utils'
import { WriteGuidePanel } from '../guide/WriteGuidePanel'
import { CardShell, KpiTile, MatrixBoard, MatrixLegend } from '../shared/dash/DashKit'

const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  red: { label: '미충족', cls: '' },
  yellow: { label: '진행중', cls: 'bg-amber-100 text-amber-700' },
  green: { label: '충족', cls: 'bg-emerald-100 text-emerald-700' },
  gray: { label: '측정불가', cls: 'bg-muted text-muted-foreground' }
}

/**
 * 팀 상세 — 템플릿 A(대시보드형), 홈 골격 공유의 팀 범위판 (19번 추기②).
 * KPI 타일·이행 매트릭스는 홈과 같은 부품(DashKit) — 범위 파라미터(이 팀)만 다르다.
 * 서브 = 심사 단계(SQ 렌즈, 배점순 아코디언) + 책임 규정·양식(문서 BOM 팀 렌즈).
 */
export function TeamDetailView(): JSX.Element {
  const selectedTeam = useUIStore((s) => s.selectedTeam)
  const setPage = useUIStore((s) => s.setPage)
  const [data, setData] = useState<TeamSummaryDto[] | null>(null)
  const [board, setBoard] = useState<TeamTodayBoardDto | null>(null)
  const [matrix, setMatrix] = useState<ObligationMatrixDto | null>(null)
  const [matrixStatus, setMatrixStatus] = useState<'ready' | 'loading' | 'error'>('loading')
  const [expanded, setExpanded] = useState<string | null>(null)
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
    // 이행 매트릭스 — 홈과 같은 채널, 렌더에서 이 팀만 필터(채널 시그니처 무변)
    void (async () => {
      try {
        const m = (await Promise.race([
          window.api.invoke(window.api.channels.OBLIGATION_MATRIX, {}),
          new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
        ])) as ObligationMatrixDto
        if (!alive) return
        setMatrix(m)
        setMatrixStatus('ready')
      } catch {
        if (!alive) return
        setMatrix(null)
        setMatrixStatus('error')
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
        <button type="button" className="text-primary font-semibold" onClick={() => setPage('team-hub')}>
          팀별 허브로
        </button>
      </div>
    )
  }
  const theme = teamTheme(selectedTeam)
  const summary = data?.find((d) => d.teamId === selectedTeam)

  // ── 팀 범위 파생 수치 (홈과 같은 계산, 이 팀만) ──
  const teamBoard = board?.teams.find((t) => t.teamId === selectedTeam) ?? null
  const denomT = teamBoard ? teamBoard.done + teamBoard.open : 0
  const ratePct = denomT > 0 ? Math.round(((teamBoard?.done ?? 0) / denomT) * 100) : null
  const teamMatrix: ObligationMatrixDto | null = matrix
    ? { ...matrix, teams: matrix.teams.filter((t) => t.teamId === selectedTeam) }
    : null
  const todayTasks = (teamBoard?.tasks ?? []).filter((t) => t.status !== 'upcoming')

  return (
    <div className="space-y-4 break-keep">
      {/* ── 헤더 밴드 — 브레드크럼 + 팀 정체 + 우측 상태 칩 ── */}
      <button
        type="button"
        onClick={() => setPage('team-hub')}
        className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> 팀별 허브
        <ChevronRight className="w-3 h-3" />
        <span style={{ color: theme.darkText }} className="font-semibold">
          {theme.label}
        </span>
      </button>

      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{ backgroundColor: theme.tintBg, color: theme.darkText }}
        >
          {theme.label.slice(0, 1)}
        </div>
        <div className="min-w-0">
          <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">{theme.label}</h1>
          <p className="text-[13.5px] text-muted-foreground">
            {theme.desc} · SQ {summary?.itemCount ?? 0}항목 · 양식 {summary?.formsTotal ?? 0}종
          </p>
        </div>
        <span className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
          심사 D-{Math.abs(dday)}
        </span>
      </div>

      {/* ── KPI 스탯 타일 — 홈과 같은 부품, 이 팀 범위 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiTile
          icon="✓" iconTint="bg-secondary text-primary" label="오늘 완료율"
          value={ratePct == null ? '—' : ratePct} unit={ratePct == null ? undefined : '%'}
          chip={denomT === 0 ? '오늘 도래 없음' : `${teamBoard?.done ?? 0}/${denomT}건 · 실시간`}
          chipTone={ratePct != null && ratePct >= 50 ? 'up' : 'fx'}
        />
        <KpiTile
          icon="◎" iconTint="bg-ok-tint text-ok-ink" label="SQ 준비도"
          value={summary?.readinessPct == null ? '—' : summary.readinessPct}
          unit={summary?.readinessPct == null ? undefined : '%'}
          chip={summary?.readinessPct == null ? '측정 전' : '신호등 가중점수'} chipTone="fx"
        />
        <KpiTile
          icon="!" iconTint="bg-bad-tint text-bad-ink" label="미충족 + 도래 의무"
          value={(summary?.redCount ?? 0) + (summary?.dueCount ?? 0)} unit="건"
          chip={teamBoard && teamBoard.overdue > 0 ? `연체 ${teamBoard.overdue}건` : '연체 없음'}
          chipTone={(summary?.redCount ?? 0) + (summary?.dueCount ?? 0) > 0 ? 'dn' : 'up'}
        />
        <KpiTile
          icon="▤" iconTint="bg-data-tint text-data-ink" label="작성 가능 양식"
          value={summary?.formsFillable ?? 0} unit={`/${summary?.formsTotal ?? 0}`}
          chip="팀 책임 양식 기준" chipTone="fx"
        />
      </div>

      {/* ── 메인: 이행 매트릭스(이 팀) | 우측 레일(오늘 할 일) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 items-start">
        <CardShell
          title="이행 매트릭스"
          cap={`${theme.label} · 최근 ${matrix ? matrix.days.length : 7}일 — 했는지 · 안 했는지`}
          status={matrixStatus}
        >
          {teamMatrix && teamMatrix.teams.length > 0 ? (
            <>
              <MatrixBoard matrix={teamMatrix} />
              <MatrixLegend />
            </>
          ) : (
            <div className="px-[18px] py-10 text-[13px] text-muted-foreground">
              이 팀에 배정된 의무가 없습니다 — 정기 의무에서 등록하세요.
            </div>
          )}
        </CardShell>

        <CardShell
          title="오늘 할 일"
          cap={`${theme.label} · 처리는 홈 관제탑에서`}
          actions={
            <button type="button" onClick={() => setPage('home')} className="text-[12px] font-bold text-primary">
              관제탑 ›
            </button>
          }
        >
          <TeamTodayRail tasks={todayTasks} loaded={board != null} />
        </CardShell>
      </div>

      {/* ── 서브: 심사 단계 (SQ 렌즈) | 책임 규정·양식 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <div>
          <div className="text-[16.5px] font-bold text-foreground mb-2">
            심사 단계 <span className="font-normal text-[13px] text-muted-foreground">— SQ 점검항목, 배점 큰 순</span>
          </div>
          {!data ? (
            <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
            </div>
          ) : !summary || summary.items.length === 0 ? (
            <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[14.5px] text-muted-foreground">
              이 팀에 배정된 SQ 항목이 없습니다 — 우측 책임 규정·양식으로 관리합니다.
            </div>
          ) : (
            <div className="space-y-2">
              {summary.items.map((it, i) => (
                <StepCard
                  key={it.code}
                  idx={i + 1}
                  item={it}
                  theme={theme}
                  open={expanded === it.code}
                  onToggle={() => setExpanded(expanded === it.code ? null : it.code)}
                />
              ))}
            </div>
          )}
        </div>

        <TeamRegSection teamId={selectedTeam} theme={theme} />
      </div>

      <p className="text-[13px] text-muted-foreground text-center pt-1">
        번호 = 처리 순서(배점 큰 순) · 빨강 = 미충족 · 지침 펼침 → 본문 → 하위 양식 → 작성
      </p>
    </div>
  )
}

/** 우측 레일 — 이 팀의 오늘 할 일(읽기 전용 요약). 완료·작성 처리는 홈 관제탑이 정본. */
function TeamTodayRail({ tasks, loaded }: { tasks: TodayTaskDto[]; loaded: boolean }): JSX.Element {
  if (!loaded) {
    return <div className="px-[18px] pb-[18px] pt-1 text-[13px] text-muted-foreground">집계 중...</div>
  }
  if (tasks.length === 0) {
    return <div className="px-[18px] pb-[18px] pt-1 text-[13px] text-muted-foreground">오늘 할 일 없음 👍</div>
  }
  const shown = tasks.slice(0, 8)
  return (
    <div className="px-[18px] pb-4 pt-1 grid gap-2">
      {shown.map((task) => {
        const badge =
          task.status === 'done'
            ? { cls: 'bg-ok-tint text-ok-ink', label: task.doneSource === 'form' ? '작성기록 ✓' : '완료 ✓' }
            : task.gapCount || task.triggerIssueId
              ? { cls: 'bg-data-tint text-data-ink', label: '데이터' }
              : task.status === 'overdue'
                ? { cls: 'bg-bad-tint text-bad-ink', label: `연체 ${Math.abs(task.daysLeft ?? 0)}일` }
                : { cls: 'bg-warn-tint text-warn-ink', label: '오늘' }
        return (
          <div key={task.id} className="flex items-center gap-2.5 border border-border rounded-[11px] px-3 py-2.5">
            <span className="flex-1 min-w-0 leading-snug">
              <b className="block text-[12.5px] truncate">{task.title}</b>
              <span className="text-[11px] text-faint">
                {task.cadence} 주기{task.assignee ? ` · ${task.assignee}` : ''}
              </span>
            </span>
            <span className={cn('text-[10.5px] font-extrabold px-2 py-0.5 rounded-md shrink-0 whitespace-nowrap', badge.cls)}>
              {badge.label}
            </span>
          </div>
        )
      })}
      {tasks.length > shown.length && (
        <div className="text-[11px] text-faint">+{tasks.length - shown.length}건 더 — 관제탑에서</div>
      )}
    </div>
  )
}

/** 팀 책임 규정(지침) → 하위 양식 트리 — 문서 BOM 데이터 그대로 */
function TeamRegSection({
  teamId,
  theme
}: {
  teamId: string
  theme: ReturnType<typeof teamTheme>
}): JSX.Element {
  const [regs, setRegs] = useState<TeamRegDto[] | null>(null)
  const [openReg, setOpenReg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setRegs(null)
    setOpenReg(null)
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.TEAM_REGS, { teamId })) as TeamRegDto[]
        if (alive) setRegs(res)
      } catch {
        if (alive) setRegs([])
      }
    })()
    return () => {
      alive = false
    }
  }, [teamId])

  return (
    <div>
      <div className="text-[16.5px] font-bold text-foreground mb-2">
        책임 규정·양식{' '}
        <span className="font-normal text-[13px] text-muted-foreground">
          — 이 팀이 관리하는 지침과 하위 양식 {regs ? `(규정 ${regs.length}종)` : ''}
        </span>
      </div>
      {!regs ? (
        <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-6 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> 규정 트리 불러오는 중...
        </div>
      ) : regs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[14.5px] text-muted-foreground">
          책임 규정이 없습니다.
        </div>
      ) : (
        <div className="space-y-1.5">
          {regs.map((r) => (
            <RegGroup
              key={r.regCode}
              reg={r}
              theme={theme}
              open={openReg === r.regCode}
              onToggle={() => setOpenReg(openReg === r.regCode ? null : r.regCode)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function RegGroup({
  reg,
  theme,
  open,
  onToggle
}: {
  reg: TeamRegDto
  theme: ReturnType<typeof teamTheme>
  open: boolean
  onToggle: () => void
}): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const openAuthor = useAiAuthorStore((s) => s.setOpen)

  const write = (code: string): void => {
    setSelectedFormCode(code)
    setPage('form-builder')
  }

  return (
    <div
      className="bg-card rounded-xl overflow-hidden"
      style={{ border: open ? `1px solid ${theme.border}` : '1px solid var(--border, #e5e7eb)' }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left hover:bg-muted/30"
      >
        <BookOpen className="w-4 h-4 shrink-0" style={{ color: theme.darkText }} />
        <span className="text-[13px] font-mono font-bold shrink-0" style={{ color: theme.darkText }}>
          {reg.regCode}
        </span>
        <span className="text-[14.5px] font-semibold flex-1 min-w-0 break-keep leading-snug">{reg.regName}</span>
        {reg.iatfClause && (
          <span className="text-[11.5px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {reg.iatfClause}장
          </span>
        )}
        <span className="text-[13px] text-muted-foreground shrink-0 tabular-nums">양식 {reg.forms.length}</span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 px-3.5 py-3 space-y-3">
          {reg.hasBody ? (
            <RegRow regCode={reg.regCode} theme={theme} />
          ) : (
            <div className="text-[13px] text-muted-foreground">등록된 규정 본문이 없습니다.</div>
          )}
          {reg.forms.length > 0 && (
            <div className="space-y-1.5">
              {reg.forms.map((f) => {
                const fillable = f.fieldsCount > 0
                return (
                  <div
                    key={f.code}
                    className="flex items-center gap-2.5 bg-card border rounded-lg px-3 py-2.5"
                    style={{ borderColor: fillable ? 'var(--border, #e5e7eb)' : ALERT_RED.border + '66' }}
                  >
                    {fillable ? (
                      <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <CircleAlert className="w-4 h-4 shrink-0" style={{ color: ALERT_RED.border }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[14.5px] font-semibold break-keep leading-snug">
                        <span className="font-mono text-[12.5px] text-muted-foreground mr-1.5">{f.code}</span>
                        {f.name}
                      </div>
                      <div className="text-[13px] text-muted-foreground">
                        {fillable ? `작성 가능 · 작성본 ${f.draftCount}건` : '문서 등록만 — 작성 양식 준비 전'}
                      </div>
                    </div>
                    {fillable && (
                      <>
                        <button
                          type="button"
                          onClick={() => write(f.code)}
                          className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md border border-border hover:bg-muted"
                        >
                          <PencilLine className="w-3 h-3" /> 작성
                        </button>
                        <button
                          type="button"
                          onClick={() => openAuthor(true)}
                          className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          <Sparkles className="w-3 h-3" /> AI 초안
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepCard({
  idx,
  item,
  theme,
  open,
  onToggle
}: {
  idx: number
  item: TeamSqItemDto
  theme: ReturnType<typeof teamTheme>
  open: boolean
  onToggle: () => void
}): JSX.Element {
  const badge = SIGNAL_BADGE[item.signal] ?? SIGNAL_BADGE.gray
  const [detail, setDetail] = useState<SqItemDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    // deps 에 loading/detail 을 넣으면 setLoading(true)가 effect 를 재실행시켜
    // cleanup(alive=false)이 진행 중 요청을 죽임 → 영원히 '불러오는 중'. open 기준으로만.
    if (!open || detail) return
    let alive = true
    setLoading(true)
    setFailed(false)
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.SQ_ITEM_DETAIL, {
          code: item.code
        })) as SqItemDetailDto | null
        if (!alive) return
        // null 응답(항목 없음)도 실패로 표시 — detail=null 로 남기면 영구 스피너
        if (res) setDetail(res)
        else setFailed(true)
      } catch {
        if (alive) setFailed(true)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.code, retryKey])

  return (
    <div
      className="bg-card rounded-xl overflow-hidden transition-colors"
      style={{ border: open ? `1px solid ${theme.border}` : '1px solid var(--border, #e5e7eb)' }}
    >
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-muted/30">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold shrink-0 tabular-nums"
          style={
            open
              ? { backgroundColor: theme.border, color: '#fff' }
              : { backgroundColor: theme.tintBg, color: theme.darkText }
          }
        >
          {String(idx).padStart(2, '0')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14.5px] font-semibold break-keep leading-snug">
            {item.title} <span className="text-muted-foreground font-normal">{item.points}점</span>
          </div>
          <div className="text-[13px] text-muted-foreground break-keep leading-snug">
            지침 {item.regs.join(' · ') || '—'}
          </div>
        </div>
        <span
          className={cn('text-[12px] font-semibold px-2 py-0.5 rounded-full shrink-0', badge.cls)}
          style={
            item.signal === 'red'
              ? { backgroundColor: ALERT_RED.tintBg, color: ALERT_RED.darkText }
              : undefined
          }
        >
          {badge.label}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-3.5 space-y-4">
          {failed ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-3">
              항목 상세를 불러오지 못했습니다.
              <button
                type="button"
                onClick={() => setRetryKey((k) => k + 1)}
                className="underline underline-offset-2 hover:text-foreground"
              >
                다시 시도
              </button>
            </div>
          ) : loading || !detail ? (
            <div className="flex items-center gap-2 text-[13px] text-muted-foreground py-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 항목 상세 불러오는 중...
            </div>
          ) : (
            <>
              {/* ① 요구사항 */}
              {detail.requirement && (
                <section>
                  <div className="text-[16.5px] font-bold text-foreground mb-1.5">이 항목이 요구하는 것</div>
                  <div className="text-[14.5px] leading-relaxed whitespace-pre-wrap bg-card border border-border/60 rounded-lg px-3 py-2.5 max-h-44 overflow-y-auto">
                    {detail.requirement}
                  </div>
                </section>
              )}

              {/* ② 지침(지배 규정) — 본문 열람 */}
              <section>
                <div className="text-[16.5px] font-bold text-foreground mb-1.5">지침 (지배 규정)</div>
                <div className="space-y-1.5">
                  {item.regs.map((reg) => (
                    <RegRow key={reg} regCode={reg} theme={theme} />
                  ))}
                </div>
              </section>

              {/* ③ 필요 양식 */}
              <section>
                <div className="text-[16.5px] font-bold text-foreground mb-1.5">
                  필요 양식 ({detail.forms.length})
                </div>
                <FormList forms={detail.forms} teamRegs={item.regs} />
              </section>

              {/* ④ 작성 가이드 (코워크 07번 Phase A) — 체크 → 이행상태 제안 */}
              <section>
                <div className="text-[16.5px] font-bold text-foreground mb-1.5">
                  작성 가이드 — 이렇게 작성하세요
                </div>
                <WriteGuidePanel itemCode={item.code} />
              </section>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** 규정 행 — [본문 보기] 토글로 regulation_sections 인라인 열람 */
function RegRow({ regCode, theme }: { regCode: string; theme: ReturnType<typeof teamTheme> }): JSX.Element {
  const [open, setOpen] = useState(false)
  const [secs, setSecs] = useState<RegulationSectionDto[] | null>(null)

  useEffect(() => {
    if (!open || secs) return
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.REGULATION_GET_SECTIONS, {
          regCode
        })) as RegulationSectionDto[]
        if (alive) setSecs(res)
      } catch {
        if (alive) setSecs([])
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, regCode])

  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-muted/40"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: theme.darkText }} />
        <span className="text-[13.5px] font-mono font-bold" style={{ color: theme.darkText }}>
          {regCode}
        </span>
        <span className="ml-auto text-[13px] text-muted-foreground">{open ? '본문 닫기' : '본문 보기'}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2.5 max-h-72 overflow-y-auto space-y-2.5">
          {!secs ? (
            <div className="text-[13px] text-muted-foreground flex items-center gap-1.5 py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 규정 본문 불러오는 중...
            </div>
          ) : secs.length === 0 ? (
            <div className="text-[13px] text-muted-foreground py-1">등록된 본문이 없습니다.</div>
          ) : (
            secs.map((s) => (
              <div key={s.id}>
                <div className="text-[15px] font-bold mb-0.5">{s.sectionTitle}</div>
                <div className="text-[14px] leading-relaxed whitespace-pre-wrap text-foreground/80">
                  {s.sectionBody.length > 900 ? s.sectionBody.slice(0, 900) + ' …' : s.sectionBody}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

/** 양식 목록 — 작성가능(✏작성·✨AI초안) / 등록만 구분. 팀 책임 규정 소속을 앞에. */
function FormList({
  forms,
  teamRegs
}: {
  forms: SqItemDetailDto['forms']
  teamRegs: string[]
}): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const openAuthor = useAiAuthorStore((s) => s.setOpen)

  const teamSet = new Set(teamRegs)
  const sorted = [...forms].sort((a, b) => {
    const at = teamSet.has(a.regCode) ? 0 : 1
    const bt = teamSet.has(b.regCode) ? 0 : 1
    if (at !== bt) return at - bt
    return (b.fieldsCount ?? 0) - (a.fieldsCount ?? 0)
  })

  const write = (code: string): void => {
    setSelectedFormCode(code)
    setPage('form-builder')
  }

  if (sorted.length === 0) {
    return (
      <div
        className="flex items-center gap-2 text-[14px] rounded-lg px-3 py-2.5"
        style={{ backgroundColor: ALERT_RED.tintBg, color: ALERT_RED.darkText }}
      >
        <CircleAlert className="w-4 h-4 shrink-0" />
        매핑된 양식이 없습니다 — 신규 양식 수집/등록이 필요합니다.
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {sorted.slice(0, 12).map((f) => {
        const fillable = (f.fieldsCount ?? 0) > 0
        return (
          <div
            key={f.formCode}
            className="flex items-center gap-2.5 bg-card border rounded-lg px-3 py-2.5"
            style={{ borderColor: fillable ? 'var(--border, #e5e7eb)' : ALERT_RED.border + '66' }}
          >
            {fillable ? (
              <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <CircleAlert className="w-4 h-4 shrink-0" style={{ color: ALERT_RED.border }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[14.5px] font-semibold break-keep leading-snug">
                <span className="font-mono text-[12.5px] text-muted-foreground mr-1.5">{f.formCode}</span>
                {f.formName}
              </div>
              <div className="text-[13px] text-muted-foreground">
                {fillable
                  ? `작성 가능 · 작성본 ${f.draftCount}건`
                  : '문서 등록만 — 작성 양식 준비 전'}
              </div>
            </div>
            {fillable && (
              <>
                <button
                  type="button"
                  onClick={() => write(f.formCode)}
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md border border-border hover:bg-muted"
                  title="양식 작성 화면으로 (입력/엑셀 뷰)"
                >
                  <PencilLine className="w-3 h-3" /> 작성
                </button>
                <button
                  type="button"
                  onClick={() => openAuthor(true)}
                  className="shrink-0 inline-flex items-center gap-1 text-[12px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                  title="메모를 던지면 AI가 초안을 만듭니다 (승인 후 반영)"
                >
                  <Sparkles className="w-3 h-3" /> AI 초안
                </button>
              </>
            )}
          </div>
        )
      })}
      {sorted.length > 12 && (
        <div className="text-[13px] text-muted-foreground text-center">외 {sorted.length - 12}종…</div>
      )}
    </div>
  )
}
