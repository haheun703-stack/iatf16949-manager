import { useEffect, useMemo, useState } from 'react'
import { ListChecks, AlertTriangle, Loader2, FileText, ShieldCheck, ShieldAlert } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { StatBand, StatTile, SearchBar, FilterSelect, ListShell, EmptyResult } from '../shared/list/ListKit'
import { TEAMS } from '@shared/team-theme'
import type { ClauseCoverageDto } from '@shared/ipc-types'

// 책임팀 배지 색 — team-theme 정본에서 파생(부서명 → 팀 고유색). 임의 색 재정의 금지.
const DEPT_STYLE: Record<string, { backgroundColor: string; color: string }> = {}
for (const t of TEAMS) {
  for (const dept of t.deptKeys) {
    DEPT_STYLE[dept] = { backgroundColor: t.tintBg, color: t.darkText }
  }
}
// 프로세스 코드 → 짧은 이름 칩
const PROC_NAME: Record<string, string> = {
  'CP-01': '영업', 'CP-02': '개발', 'CP-03': '생산',
  'MP-01': '경영', 'MP-02': '리스크', 'MP-03': '인적',
  'SP-01': '구매', 'SP-02': '검사', 'SP-03': '개선'
}

type Quick = 'all' | 'covered' | 'gap'

/**
 * IATF 조항(4~10)별 커버리지 — 정본 품질환경매뉴얼 0.7 매트릭스 기반.
 * "이 조항, 우리가 어떤 규정/프로세스로 커버하나"를 한 화면에. 심사 대응용.
 * 템플릿 B(19번): 숫자 밴드(클릭=필터) → 검색·팀 필터 → 조항별 행 리스트.
 */
export function ClauseCoverageView(): JSX.Element {
  const [data, setData] = useState<ClauseCoverageDto[] | null>(null)
  const [quick, setQuick] = useState<Quick>('all')
  const [q, setQ] = useState('')
  const [dept, setDept] = useState<string>('all')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(
          window.api.channels.CLAUSE_COVERAGE
        )) as ClauseCoverageDto[]
        if (alive) setData(res)
      } catch {
        if (alive) setData([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const totals = useMemo(() => {
    const all = data ?? []
    return {
      clauses: all.length,
      regs: new Set(all.flatMap((c) => c.regs.map((r) => r.regCode))).size,
      covered: all.filter((c) => c.regs.length > 0).length,
      gap: all.filter((c) => c.regs.length === 0).length
    }
  }, [data])

  const deptOptions = useMemo(() => {
    const s = new Set<string>()
    for (const c of data ?? []) for (const r of c.regs) if (r.respDept) s.add(r.respDept)
    return [...s].sort()
  }, [data])

  const narrowed = q.trim() !== '' || dept !== 'all'

  // 검색·부서 필터는 규정 행 단위로 적용하되, **커버/미커버 판정은 언제나 원본(totalRegs) 기준**이다.
  // 걸러진 결과를 갭으로 세면 심사 화면이 없는 갭을 보고한다.
  const view = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const filtered = (data ?? []).map((c) => {
      let regs = c.regs
      if (dept !== 'all') regs = regs.filter((r) => r.respDept === dept)
      if (kw)
        regs = regs.filter(
          (r) => r.name.toLowerCase().includes(kw) || r.regCode.toLowerCase().includes(kw)
        )
      return { ...c, regs, totalRegs: c.regs.length }
    })
    if (quick === 'gap') return filtered.filter((c) => c.totalRegs === 0)
    if (quick === 'covered')
      return filtered.filter((c) => c.totalRegs > 0 && (!narrowed || c.regs.length > 0))
    // 전체 보기에서 검색·부서 필터가 걸렸으면 결과 없는 조항은 감춘다(원래 미커버 조항도 함께 감춤 —
    // 검색 중에는 "검색 결과"만 보여야 하고, 갭 확인은 미커버 타일로 한다)
    if (narrowed) return filtered.filter((c) => c.regs.length > 0)
    return filtered
  }, [data, quick, q, dept, narrowed])

  const resetFilters = (): void => {
    setQuick('all')
    setQ('')
    setDept('all')
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        icon={<ListChecks className="w-5 h-5" />}
        title="IATF 조항별 커버리지"
        sub={`품질환경매뉴얼 0.7 프로세스 매트릭스(조항) 기준 · IATF 4~10장에 어떤 규정·프로세스가 걸려있는지 · 총 ${totals.regs}개 규정`}
      />

      {/* ① 숫자 요약 밴드 — 클릭 = 필터 점프 */}
      <StatBand>
        <StatTile
          label="조항 (4~10장)"
          value={totals.clauses}
          icon={<ListChecks className="w-[18px] h-[18px]" />}
          active={quick === 'all'}
          onClick={() => setQuick('all')}
        />
        <StatTile
          label="연결 규정"
          value={totals.regs}
          icon={<FileText className="w-[18px] h-[18px]" />}
          tone="primary"
        />
        <StatTile
          label="커버된 조항"
          value={totals.covered}
          icon={<ShieldCheck className="w-[18px] h-[18px]" />}
          tone="ok"
          active={quick === 'covered'}
          onClick={() => setQuick('covered')}
        />
        <StatTile
          label="미커버 조항"
          value={totals.gap}
          icon={<ShieldAlert className="w-[18px] h-[18px]" />}
          tone={totals.gap > 0 ? 'bad' : 'muted'}
          active={quick === 'gap'}
          onClick={() => setQuick('gap')}
        />
      </StatBand>

      {/* ② 검색 + 필터 */}
      <SearchBar value={q} onChange={setQ} placeholder="규정명·규정코드 검색">
        <FilterSelect
          value={dept}
          onChange={setDept}
          className="max-w-[200px]"
          options={[
            { value: 'all', label: '책임부서 · 전체' },
            ...deptOptions.map((d) => ({ value: d, label: d }))
          ]}
        />
      </SearchBar>

      {/* ③ 조항별 행 리스트 */}
      {view.length === 0 ? (
        <EmptyResult message="조건에 맞는 조항이 없습니다." onReset={resetFilters} />
      ) : (
        <div className="space-y-3">
          {view.map((c) => (
            <ListShell key={c.clause}>
              <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2.5">
                <span className="inline-flex items-center justify-center min-w-[40px] h-9 px-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
                  {c.clause}장
                </span>
                <span className="font-semibold">{c.title}</span>
                <span
                  className={cn(
                    'ml-auto text-xs font-bold px-2 py-0.5 rounded-full',
                    c.totalRegs ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink'
                  )}
                  title={narrowed ? '검색·필터 결과 / 이 조항의 전체 규정' : undefined}
                >
                  규정 {narrowed && c.regs.length !== c.totalRegs ? `${c.regs.length} / ${c.totalRegs}` : c.totalRegs}
                </span>
              </div>
              {c.totalRegs === 0 ? (
                <div className="px-4 py-4 flex items-center gap-2 text-sm text-bad-ink">
                  <AlertTriangle className="w-4 h-4" /> 이 조항을 커버하는 규정이 없습니다.
                </div>
              ) : c.regs.length === 0 ? (
                <div className="px-4 py-4 text-sm text-muted-foreground">
                  검색·필터 조건에 맞는 규정이 없습니다 — 이 조항은 규정 {c.totalRegs}건으로 커버되어 있습니다.
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {c.regs.map((r) => (
                    <li
                      key={r.regCode}
                      className="px-4 py-2 flex items-center gap-3 text-sm hover:bg-muted/30"
                    >
                      <span className="font-mono font-bold text-[12px] text-primary w-24 shrink-0">
                        {r.regCode}
                      </span>
                      <span className="flex-1 min-w-0 truncate" title={r.name}>
                        {r.name}
                      </span>
                      {r.respDept && (
                        <span
                          className={cn(
                            'text-[11px] font-semibold px-2 py-0.5 rounded shrink-0',
                            !DEPT_STYLE[r.respDept] && 'bg-muted text-muted-foreground'
                          )}
                          style={DEPT_STYLE[r.respDept]}
                        >
                          {r.respDept}
                        </span>
                      )}
                      <div className="hidden sm:flex gap-1 shrink-0 w-44 justify-end flex-wrap">
                        {r.processes.map((p) => (
                          <span
                            key={p}
                            title={p}
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/70"
                          >
                            {PROC_NAME[p] ?? p}
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </ListShell>
          ))}
        </div>
      )}
    </div>
  )
}
