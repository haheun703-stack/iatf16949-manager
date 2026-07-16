import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, BookOpen, ChevronRight, ArrowLeft, PencilLine, Sparkles, CircleCheck, CircleAlert
} from 'lucide-react'
import { TEAMS, normalizeTeam, teamTheme, ALERT_RED, type TeamId } from '@shared/team-theme'
import type { RegBrowseDto, TeamRegFormDto, RegulationSectionDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { PageHeader } from '../shared/PageHeader'

/**
 * 규정·양식 찾아보기 (포털 2단계, v4 목업 확정 흐름):
 * 카드 그리드(팀 필터) → 규정 단독 뷰어(본문 + 하위 양식) → [작성]=양식 캔버스.
 * 데이터는 문서 BOM(forms·regulation_sections) 그대로 — 트리 대신 카드로 다시 그림.
 */

export function DocBrowseView(): JSX.Element {
  const [regs, setRegs] = useState<RegBrowseDto[] | null>(null)
  const [teamFilter, setTeamFilter] = useState<TeamId | 'all'>('all')
  const [selected, setSelected] = useState<RegBrowseDto | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.REG_BROWSE)) as RegBrowseDto[]
        if (alive) setRegs(res)
      } catch {
        if (alive) setRegs([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!regs) return []
    if (teamFilter === 'all') return regs
    return regs.filter((r) => r.respDepts.some((d) => normalizeTeam(d) === teamFilter))
  }, [regs, teamFilter])

  if (selected) {
    return <RegDetail reg={selected} onBack={() => setSelected(null)} />
  }

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        title="규정 · 양식 찾아보기"
        sub={`규정 ${regs?.length ?? '—'}종 — 카드를 누르면 규정 본문과 하위 양식이 열리고, 거기서 바로 작성합니다`}
      />

      {/* 팀 필터 칩 */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={teamFilter === 'all'} onClick={() => setTeamFilter('all')} label="전체" />
        {TEAMS.map((t) => (
          <FilterChip
            key={t.id}
            active={teamFilter === t.id}
            onClick={() => setTeamFilter(t.id)}
            label={t.label}
            color={teamFilter === t.id ? undefined : t.darkText}
            activeBg={t.tintBg}
            activeFg={t.darkText}
            border={t.border}
          />
        ))}
      </div>

      {!regs ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 규정 목록 불러오는 중...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((r) => {
            const teamIds = [...new Set(r.respDepts.map((d) => normalizeTeam(d)).filter(Boolean))] as TeamId[]
            return (
              <button
                key={r.regCode}
                type="button"
                onClick={() => setSelected(r)}
                className="text-left bg-card border border-border rounded-xl px-5 py-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center gap-2 text-[12px] font-mono font-bold text-muted-foreground">
                  {r.regCode}
                  {r.iatfClause && (
                    <span className="text-[10.5px] font-sans px-1.5 py-0.5 rounded bg-muted">{r.iatfClause}장</span>
                  )}
                  <ChevronRight className="w-4 h-4 ml-auto text-muted-foreground/40" />
                </div>
                <div className="text-[14.5px] font-bold mt-1 truncate" title={r.regName}>
                  {r.regName}
                </div>
                <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                  {teamIds.slice(0, 2).map((tid) => {
                    const th = teamTheme(tid)
                    return (
                      <span key={tid} className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ backgroundColor: th.tintBg, color: th.darkText }}>
                        {th.label}
                      </span>
                    )
                  })}
                  {teamIds.length > 2 && <span className="text-[11px] text-muted-foreground">+{teamIds.length - 2}</span>}
                  <span className="text-[11.5px] text-muted-foreground ml-auto tabular-nums">
                    양식 {r.formsTotal} · 작성가능 {r.formsFillable}
                    {r.draftCount > 0 && ` · 작성본 ${r.draftCount}`}
                  </span>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-14 text-[13px] text-muted-foreground">
              이 팀 책임의 규정이 없습니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  color,
  activeBg,
  activeFg,
  border
}: {
  active: boolean
  onClick: () => void
  label: string
  color?: string
  activeBg?: string
  activeFg?: string
  border?: string
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 px-3.5 rounded-full text-[12.5px] font-bold border transition-colors',
        active ? 'border-transparent' : 'bg-card border-border hover:bg-muted'
      )}
      style={
        active
          ? { backgroundColor: activeBg ?? 'var(--color-primary)', color: activeFg ?? '#fff', borderColor: border ?? 'transparent' }
          : { color }
      }
    >
      {label}
    </button>
  )
}

/** 규정 단독 뷰어 — 본문 + 하위 양식 → [작성]/[AI 초안] (v4 목업 3번째 화면) */
function RegDetail({ reg, onBack }: { reg: RegBrowseDto; onBack: () => void }): JSX.Element {
  const [forms, setForms] = useState<TeamRegFormDto[] | null>(null)
  const [secs, setSecs] = useState<RegulationSectionDto[] | null>(null)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const openAuthor = useAiAuthorStore((s) => s.setOpen)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const f = (await window.api.invoke(window.api.channels.REG_FORMS, { regCode: reg.regCode })) as TeamRegFormDto[]
        if (alive) setForms(f)
      } catch {
        if (alive) setForms([])
      }
      if (reg.hasBody) {
        try {
          const s = (await window.api.invoke(window.api.channels.REGULATION_GET_SECTIONS, {
            regCode: reg.regCode
          })) as RegulationSectionDto[]
          if (alive) setSecs(s)
        } catch {
          if (alive) setSecs([])
        }
      } else setSecs([])
    })()
    return () => {
      alive = false
    }
  }, [reg])

  const write = (code: string): void => {
    setSelectedFormCode(code)
    setPage('form-builder')
  }

  const fillable = (forms ?? []).filter((f) => f.fieldsCount > 0)
  const registered = (forms ?? []).filter((f) => f.fieldsCount === 0)

  return (
    <div className="space-y-4 break-keep">
      {/* 브레드크럼 */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-[12.5px] text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> 규정·양식
        <ChevronRight className="w-3 h-3" />
        <span className="font-mono font-bold text-foreground">{reg.regCode}</span>
      </button>

      <PageHeader
        title={reg.regName}
        sub={`${reg.regCode}${reg.iatfClause ? ` · IATF ${reg.iatfClause}장` : ''} · ${reg.respDepts.join(', ') || '책임부서 미지정'} · 하위 양식 ${reg.formsTotal}종(작성가능 ${reg.formsFillable})`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-4 items-start">
        {/* 본문 뷰어 */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-[13.5px] font-bold text-muted-foreground mb-3 inline-flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" /> 규정 본문 {reg.hasBody ? '' : '— 미등록'}
          </div>
          {!secs ? (
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> 본문 불러오는 중...
            </div>
          ) : secs.length === 0 ? (
            <div className="text-[13px] text-muted-foreground py-4">
              등록된 본문이 없습니다 — 정본 적재 대상입니다. (열람·검색은 코파일럿이 지원)
            </div>
          ) : (
            <div className="max-h-[540px] overflow-y-auto space-y-4 pr-1">
              {secs.map((s) => (
                <div key={s.id}>
                  <div className="text-[13px] font-bold mb-1">{s.sectionTitle}</div>
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/85">
                    {s.sectionBody}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 하위 양식 */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="text-[13.5px] font-bold text-muted-foreground mb-1">하위 양식</div>
          <div className="text-[11.5px] text-muted-foreground mb-3">
            ✅ = 앱에서 바로 작성 → 공식 엑셀 출력 · 등록만 = 셀맵 보강 대상
          </div>
          {!forms ? (
            <div className="flex items-center gap-2 text-[12.5px] text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" /> 양식 불러오는 중...
            </div>
          ) : forms.length === 0 ? (
            <div className="text-[13px] text-muted-foreground py-4">하위 양식이 없습니다.</div>
          ) : (
            <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
              {[...fillable, ...registered].map((f) => {
                const ok = f.fieldsCount > 0
                return (
                  <div
                    key={f.code}
                    className="flex items-center gap-2.5 bg-card border rounded-lg px-3 py-2.5"
                    style={{ borderColor: ok ? 'var(--color-border)' : ALERT_RED.border + '66' }}
                  >
                    {ok ? (
                      <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <CircleAlert className="w-4 h-4 shrink-0" style={{ color: ALERT_RED.border }} />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate">
                        <span className="font-mono text-[11.5px] text-muted-foreground mr-1.5">{f.code}</span>
                        {f.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {ok ? `작성 가능 · 작성본 ${f.draftCount}건` : '문서 등록만 — 작성 양식 준비 전'}
                      </div>
                    </div>
                    {ok && (
                      <>
                        <button
                          type="button"
                          onClick={() => write(f.code)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-md border border-border hover:bg-muted"
                        >
                          <PencilLine className="w-3 h-3" /> 작성
                        </button>
                        <button
                          type="button"
                          onClick={() => openAuthor(true)}
                          className="shrink-0 inline-flex items-center gap-1 text-[11.5px] font-bold px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20"
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
      </div>
    </div>
  )
}
