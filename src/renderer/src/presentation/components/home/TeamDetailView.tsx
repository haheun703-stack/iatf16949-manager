import { useEffect, useState } from 'react'
import {
  ChevronRight, ChevronDown, Loader2, ArrowLeft, BookOpen,
  PencilLine, Sparkles, CircleCheck, CircleAlert
} from 'lucide-react'
import { teamTheme, ALERT_RED } from '@shared/team-theme'
import type {
  TeamSummaryDto, TeamSqItemDto, SqItemDetailDto, RegulationSectionDto, TeamRegDto
} from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { useDday } from '../../hooks/useDday'
import { cn } from '../../../lib/utils'

const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  red: { label: '미충족', cls: '' },
  yellow: { label: '진행중', cls: 'bg-amber-100 text-amber-700' },
  green: { label: '충족', cls: 'bg-emerald-100 text-emerald-700' },
  gray: { label: '측정불가', cls: 'bg-muted text-muted-foreground' }
}

/**
 * 팀 상세 — 번호 단계(그 팀 책임 SQ 항목, 배점순).
 * 단계 클릭 → 요구사항 → 지침(지배규정, 본문 열람) → 필요 양식(작성/AI초안) 순차 노출.
 */
export function TeamDetailView(): JSX.Element {
  const selectedTeam = useUIStore((s) => s.selectedTeam)
  const setPage = useUIStore((s) => s.setPage)
  const [data, setData] = useState<TeamSummaryDto[] | null>(null)
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

      <div className="grid grid-cols-3 gap-2.5">
        <Stat
          label="준비도"
          value={summary?.readinessPct == null ? '측정 전' : `${summary.readinessPct}%`}
          color={theme.darkText}
        />
        <Stat label="심사까지" value={`D-${Math.abs(dday)}`} />
        <Stat label="할 일" value={String((summary?.redCount ?? 0) + (summary?.dueCount ?? 0))} />
      </div>

      {/* ── ① 심사 단계 (SQ 렌즈) ── */}
      <div className="text-[12px] font-bold text-muted-foreground pt-1">
        심사 단계 <span className="font-normal">— SQ 점검항목, 배점 큰 순</span>
      </div>
      {!data ? (
        <div className="flex items-center justify-center gap-2 py-14 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
        </div>
      ) : !summary || summary.items.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
          이 팀에 배정된 SQ 항목이 없습니다 — 아래 책임 규정·양식으로 관리합니다.
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

      {/* ── ② 책임 규정·양식 (문서 BOM 의 팀 렌즈) ── */}
      <TeamRegSection teamId={selectedTeam} theme={theme} />

      <p className="text-[11px] text-muted-foreground text-center pt-1">
        번호 = 처리 순서(배점 큰 순) · 빨강 = 미충족 · 지침 펼침 → 본문 → 하위 양식 → 작성
      </p>
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
      <div className="text-[12px] font-bold text-muted-foreground mb-2">
        책임 규정·양식{' '}
        <span className="font-normal">
          — 이 팀이 관리하는 지침과 하위 양식 {regs ? `(규정 ${regs.length}종)` : ''}
        </span>
      </div>
      {!regs ? (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-6 justify-center">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> 규정 트리 불러오는 중...
        </div>
      ) : regs.length === 0 ? (
        <div className="rounded-xl border border-border bg-card px-4 py-6 text-center text-[13px] text-muted-foreground">
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
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-left hover:bg-muted/30"
      >
        <BookOpen className="w-4 h-4 shrink-0" style={{ color: theme.darkText }} />
        <span className="text-[12px] font-mono font-bold shrink-0" style={{ color: theme.darkText }}>
          {reg.regCode}
        </span>
        <span className="text-[13px] font-semibold flex-1 min-w-0 truncate">{reg.regName}</span>
        {reg.iatfClause && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
            {reg.iatfClause}장
          </span>
        )}
        <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">양식 {reg.forms.length}</span>
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
            <div className="text-[11.5px] text-muted-foreground">등록된 규정 본문이 없습니다.</div>
          )}
          {reg.forms.length > 0 && (
            <div className="space-y-1.5">
              {reg.forms.map((f) => {
                const fillable = f.fieldsCount > 0
                return (
                  <div
                    key={f.code}
                    className="flex items-center gap-2.5 bg-card border rounded-lg px-3 py-2"
                    style={{ borderColor: fillable ? 'var(--border, #e5e7eb)' : ALERT_RED.border + '66' }}
                  >
                    {fillable ? (
                      <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <CircleAlert className="w-4 h-4 shrink-0" style={{ color: ALERT_RED.border }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-semibold truncate">
                        <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{f.code}</span>
                        {f.name}
                      </div>
                      <div className="text-[10.5px] text-muted-foreground">
                        {fillable ? `작성 가능 · 작성본 ${f.draftCount}건` : '문서 등록만 — 작성 양식 준비 전'}
                      </div>
                    </div>
                    {fillable && (
                      <>
                        <button
                          type="button"
                          onClick={() => write(f.code)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border hover:bg-muted"
                        >
                          <PencilLine className="w-3 h-3" /> 작성
                        </button>
                        <button
                          type="button"
                          onClick={() => openAuthor(true)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
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

  useEffect(() => {
    // deps 에 loading/detail 을 넣으면 setLoading(true)가 effect 를 재실행시켜
    // cleanup(alive=false)이 진행 중 요청을 죽임 → 영원히 '불러오는 중'. open 기준으로만.
    if (!open || detail) return
    let alive = true
    setLoading(true)
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.SQ_ITEM_DETAIL, {
          code: item.code
        })) as SqItemDetailDto | null
        if (alive) setDetail(res)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.code])

  return (
    <div
      className="bg-card rounded-xl overflow-hidden transition-colors"
      style={{ border: open ? `1px solid ${theme.border}` : '1px solid var(--border, #e5e7eb)' }}
    >
      <button type="button" onClick={onToggle} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-muted/30">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[12.5px] font-bold shrink-0 tabular-nums"
          style={
            open
              ? { backgroundColor: theme.border, color: '#fff' }
              : { backgroundColor: theme.tintBg, color: theme.darkText }
          }
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
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t border-border bg-muted/20 px-4 py-3.5 space-y-4">
          {loading || !detail ? (
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-3">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> 항목 상세 불러오는 중...
            </div>
          ) : (
            <>
              {/* ① 요구사항 */}
              {detail.requirement && (
                <section>
                  <div className="text-[11px] font-bold text-muted-foreground mb-1.5">이 항목이 요구하는 것</div>
                  <div className="text-[12px] leading-relaxed whitespace-pre-wrap bg-card border border-border/60 rounded-lg px-3 py-2.5 max-h-44 overflow-y-auto">
                    {detail.requirement}
                  </div>
                </section>
              )}

              {/* ② 지침(지배 규정) — 본문 열람 */}
              <section>
                <div className="text-[11px] font-bold text-muted-foreground mb-1.5">지침 (지배 규정)</div>
                <div className="space-y-1.5">
                  {item.regs.map((reg) => (
                    <RegRow key={reg} regCode={reg} theme={theme} />
                  ))}
                </div>
              </section>

              {/* ③ 필요 양식 */}
              <section>
                <div className="text-[11px] font-bold text-muted-foreground mb-1.5">
                  필요 양식 ({detail.forms.length})
                </div>
                <FormList forms={detail.forms} teamRegs={item.regs} />
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
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40"
      >
        <BookOpen className="w-3.5 h-3.5 shrink-0" style={{ color: theme.darkText }} />
        <span className="text-[12px] font-mono font-bold" style={{ color: theme.darkText }}>
          {regCode}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground">{open ? '본문 닫기' : '본문 보기'}</span>
        {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40" />}
      </button>
      {open && (
        <div className="border-t border-border/60 px-3 py-2.5 max-h-72 overflow-y-auto space-y-2.5">
          {!secs ? (
            <div className="text-[11.5px] text-muted-foreground flex items-center gap-1.5 py-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 규정 본문 불러오는 중...
            </div>
          ) : secs.length === 0 ? (
            <div className="text-[11.5px] text-muted-foreground py-1">등록된 본문이 없습니다.</div>
          ) : (
            secs.map((s) => (
              <div key={s.id}>
                <div className="text-[11px] font-bold mb-0.5">{s.sectionTitle}</div>
                <div className="text-[11.5px] leading-relaxed whitespace-pre-wrap text-foreground/80">
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
        className="flex items-center gap-2 text-[12px] rounded-lg px-3 py-2.5"
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
            className="flex items-center gap-2.5 bg-card border rounded-lg px-3 py-2"
            style={{ borderColor: fillable ? 'var(--border, #e5e7eb)' : ALERT_RED.border + '66' }}
          >
            {fillable ? (
              <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <CircleAlert className="w-4 h-4 shrink-0" style={{ color: ALERT_RED.border }} />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-semibold truncate">
                <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{f.formCode}</span>
                {f.formName}
              </div>
              <div className="text-[10.5px] text-muted-foreground">
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
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md border border-border hover:bg-muted"
                  title="양식 작성 화면으로 (입력/엑셀 뷰)"
                >
                  <PencilLine className="w-3 h-3" /> 작성
                </button>
                <button
                  type="button"
                  onClick={() => openAuthor(true)}
                  className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
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
        <div className="text-[11px] text-muted-foreground text-center">외 {sorted.length - 12}종…</div>
      )}
    </div>
  )
}
