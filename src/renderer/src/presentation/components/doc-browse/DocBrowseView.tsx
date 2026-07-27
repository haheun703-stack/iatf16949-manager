import { useEffect, useMemo, useState } from 'react'
import {
  Loader2, BookOpen, ChevronRight, ArrowLeft, PencilLine, Sparkles, CircleCheck, CircleAlert,
  FileText, ListChecks, LayoutGrid, Rows3
} from 'lucide-react'
import { TEAMS, normalizeTeam, teamTheme, ALERT_RED, type TeamId } from '@shared/team-theme'
import type { RegBrowseDto, TeamRegFormDto, RegulationSectionDto, FormListItemDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { PageHeader } from '../shared/PageHeader'
import { StatBand, StatTile, SearchBar, FilterSelect, ListShell, EmptyResult } from '../shared/list/ListKit'

/**
 * 문서 작성 — 규정·양식 찾아보기 (포털 2단계).
 * P10(§0.9, 사장님 벤치마크): 기본 = 양식(form) 단위 행 리스트(숫자 요약 밴드·검색/필터·내 관련순 정렬).
 *   [규정별 보기]로 전환하면 기존 규정 카드 → 규정 본문+하위 양식(RegDetail) 흐름 유지.
 */
export function DocBrowseView(): JSX.Element {
  const [mode, setMode] = useState<'forms' | 'regs'>('forms')
  return mode === 'forms' ? (
    <FormBrowse onRegs={() => setMode('regs')} />
  ) : (
    <RegBrowse onForms={() => setMode('forms')} />
  )
}

/* ─────────────────────── P10 양식 행 리스트(기본) ─────────────────────── */

type Quick = 'all' | 'fillable' | 'hasExample' | 'obligation'
type Sort = 'relevance' | 'recent' | 'code' | 'name'

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const d = iso.slice(0, 10)
  return d
}

function FormBrowse({ onRegs }: { onRegs: () => void }): JSX.Element {
  const [forms, setForms] = useState<FormListItemDto[] | null>(null)
  const [quick, setQuick] = useState<Quick>('all')
  const [q, setQ] = useState('')
  const [team, setTeam] = useState<TeamId | 'all'>('all')
  const [reg, setReg] = useState<string>('all')
  const [sort, setSort] = useState<Sort>('relevance')

  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  // 내 관련순 = 활성 사용자 팀 책임 우선. 없으면 의무·작성가능만으로 정렬.
  const myTeam = useActiveUserStore((s) => {
    const u = s.users.find((x) => x.id === s.activeUserId)
    return u?.teamDept ? (normalizeTeam(u.teamDept) as TeamId | null) : null
  })

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.FORM_LIST)) as FormListItemDto[]
        if (alive) setForms(res.filter((f) => !f.deprecated))
      } catch {
        if (alive) setForms([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const teamOf = (f: FormListItemDto): TeamId | null =>
    f.respDept ? (normalizeTeam(f.respDept) as TeamId | null) : null

  // 요약 밴드 집계(필터 전 전체 기준)
  const totals = useMemo(() => {
    const all = forms ?? []
    return {
      all: all.length,
      fillable: all.filter((f) => f.fieldsCount > 0).length,
      hasExample: all.filter((f) => f.hasExample).length,
      obligation: all.filter((f) => f.obligationLinked).length
    }
  }, [forms])

  const regOptions = useMemo(() => {
    const s = new Set<string>()
    for (const f of forms ?? []) if (f.regCode) s.add(f.regCode)
    return [...s].sort()
  }, [forms])

  const view = useMemo(() => {
    let list = forms ?? []
    if (quick === 'fillable') list = list.filter((f) => f.fieldsCount > 0)
    else if (quick === 'hasExample') list = list.filter((f) => f.hasExample)
    else if (quick === 'obligation') list = list.filter((f) => f.obligationLinked)
    if (team !== 'all') list = list.filter((f) => teamOf(f) === team)
    if (reg !== 'all') list = list.filter((f) => f.regCode === reg)
    const kw = q.trim().toLowerCase()
    if (kw) list = list.filter((f) => f.name.toLowerCase().includes(kw) || f.code.toLowerCase().includes(kw))

    const relevance = (f: FormListItemDto): number =>
      (myTeam && teamOf(f) === myTeam ? 4 : 0) +
      (f.obligationLinked ? 2 : 0) +
      (f.fieldsCount > 0 ? 1 : 0)

    const sorted = [...list]
    if (sort === 'relevance')
      sorted.sort(
        (a, b) => relevance(b) - relevance(a) || (b.lastWrittenAt ?? '').localeCompare(a.lastWrittenAt ?? '') || a.code.localeCompare(b.code)
      )
    else if (sort === 'recent')
      sorted.sort((a, b) => (b.lastWrittenAt ?? '').localeCompare(a.lastWrittenAt ?? '') || a.code.localeCompare(b.code))
    else if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else sorted.sort((a, b) => a.code.localeCompare(b.code))
    return sorted
  }, [forms, quick, team, reg, q, sort, myTeam])

  const write = (f: FormListItemDto): void => {
    if (f.fieldsCount === 0) return
    setSelectedFormCode(f.code)
    setPage('form-builder')
  }

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        title="문서 작성"
        sub={`양식 ${totals.all}종 — 검색·필터로 찾아 바로 작성합니다${myTeam ? ' · 기본 정렬 = 내 관련순' : ''}`}
        actions={
          <button
            type="button"
            onClick={onRegs}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted"
          >
            <LayoutGrid className="w-3.5 h-3.5" /> 규정별 보기
          </button>
        }
      />

      {/* ① 숫자 요약 밴드 — 클릭 = 필터 점프 (건수 붙은 탭 겸용) */}
      <StatBand>
        <StatTile label="전체 양식" value={totals.all} active={quick === 'all'} onClick={() => setQuick('all')} icon={<FileText className="w-[18px] h-[18px]" />} />
        <StatTile label="작성 가능" value={totals.fillable} active={quick === 'fillable'} onClick={() => setQuick('fillable')} icon={<PencilLine className="w-[18px] h-[18px]" />} tone="ok" />
        <StatTile label="예시 있음" value={totals.hasExample} active={quick === 'hasExample'} onClick={() => setQuick('hasExample')} icon={<BookOpen className="w-[18px] h-[18px]" />} tone="warn" />
        <StatTile label="내 의무 연결" value={totals.obligation} active={quick === 'obligation'} onClick={() => setQuick('obligation')} icon={<ListChecks className="w-[18px] h-[18px]" />} tone="primary" />
      </StatBand>

      {/* ② 검색 + 필터 */}
      <SearchBar value={q} onChange={setQ} placeholder="양식명·코드 검색">
        <FilterSelect
          value={team}
          onChange={setTeam}
          options={[
            { value: 'all' as TeamId | 'all', label: '책임팀 · 전체' },
            ...TEAMS.map((t) => ({ value: t.id as TeamId | 'all', label: t.label }))
          ]}
        />
        <FilterSelect
          value={reg}
          onChange={setReg}
          className="max-w-[180px]"
          options={[
            { value: 'all', label: '규정 · 전체' },
            ...regOptions.map((rc) => ({ value: rc, label: rc }))
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={setSort}
          options={[
            { value: 'relevance' as Sort, label: '내 관련순' },
            { value: 'recent' as Sort, label: '최근 작성순' },
            { value: 'name' as Sort, label: '이름순' },
            { value: 'code' as Sort, label: '코드순' }
          ]}
        />
      </SearchBar>

      {/* ④ 위계 있는 행 리스트 */}
      {!forms ? (
        <div className="flex items-center justify-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 양식 목록 불러오는 중...
        </div>
      ) : view.length === 0 ? (
        <EmptyResult
          message="조건에 맞는 양식이 없습니다."
          onReset={() => { setQuick('all'); setTeam('all'); setReg('all'); setQ('') }}
        />
      ) : (
        <ListShell
          cols={
            <>
              {/* 우측 고정 칼럼 정렬(P10-fix ①) */}
              <span className="w-[72px] shrink-0">책임팀</span>
              <span className="flex-1 min-w-0">양식명 · 코드 · 규정</span>
              <span className="w-[54px] text-center shrink-0">정기의무</span>
              <span className="w-[46px] text-center shrink-0">예시</span>
              <span className="w-[52px] text-right shrink-0">작성본</span>
              <span className="w-[84px] text-right shrink-0 hidden md:block">최근작성</span>
              <span className="w-[68px] text-center shrink-0">상태</span>
              <span className="w-4 shrink-0" />
            </>
          }
        >
          {view.map((f, i) => {
            const tid = teamOf(f)
            const th = tid ? teamTheme(tid) : null
            const ok = f.fieldsCount > 0
            const mine = myTeam && tid === myTeam
            return (
              <button
                key={f.code}
                type="button"
                onClick={() => write(f)}
                disabled={!ok}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                  i > 0 && 'border-t border-border',
                  ok ? 'hover:bg-muted/60 cursor-pointer' : 'cursor-default opacity-70'
                )}
              >
                {/* 팀색 뱃지 — 내 팀은 아웃라인(별도 '내 팀' 뱃지 폐지, ④) */}
                <span
                  className="shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-md w-[72px] text-center truncate"
                  style={
                    th
                      ? { backgroundColor: th.tintBg, color: th.darkText, ...(mine ? { outline: `2px solid ${th.border}`, outlineOffset: '-2px' } : {}) }
                      : { backgroundColor: 'var(--color-muted)', color: 'var(--color-muted-foreground)' }
                  }
                  title={(th?.label ?? '미지정') + (mine ? ' · 내 팀' : '')}
                >
                  {th?.label ?? '미지정'}
                </span>
                {/* 양식명(굵게) + 코드·규정만(부가설명 슬림, ①) */}
                <span className="flex-1 min-w-0">
                  <span className="block text-[13.5px] font-bold truncate">{f.name}</span>
                  <span className="block text-[11px] text-muted-foreground truncate">
                    <span className="font-mono">{f.code}</span> · 규정 {f.regCode}
                  </span>
                </span>
                {/* 우측 고정 칼럼 그리드 — 값 없으면 '—'로 칸 유지 */}
                <span className="w-[54px] text-center shrink-0">
                  {f.obligationLinked ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">의무</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>
                <span className="w-[46px] text-center shrink-0">
                  {f.hasExample ? (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">예시</span>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </span>
                <span className="w-[52px] text-right shrink-0 text-[11.5px] tabular-nums text-muted-foreground">
                  {f.draftCount > 0 ? `${f.draftCount}건` : <span className="text-muted-foreground/40">—</span>}
                </span>
                <span className="w-[84px] text-right shrink-0 text-[11.5px] tabular-nums text-muted-foreground hidden md:block">
                  {f.lastWrittenAt ? fmtDate(f.lastWrittenAt) : <span className="text-muted-foreground/40">—</span>}
                </span>
                <span className="w-[68px] text-center shrink-0">
                  {ok ? (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 text-[11.5px]">
                      <CircleCheck className="w-3.5 h-3.5" /> 작성
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-[11.5px]" style={{ color: ALERT_RED.border }}>
                      <CircleAlert className="w-3.5 h-3.5" /> 등록만
                    </span>
                  )}
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/40" />
              </button>
            )
          })}
        </ListShell>
      )}
    </div>
  )
}

/* ─────────────────────── 규정별 보기(기존 흐름 유지) ─────────────────────── */

function RegBrowse({ onForms }: { onForms: () => void }): JSX.Element {
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
        actions={
          <button
            type="button"
            onClick={onForms}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted"
          >
            <Rows3 className="w-3.5 h-3.5" /> 양식 목록
          </button>
        }
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
