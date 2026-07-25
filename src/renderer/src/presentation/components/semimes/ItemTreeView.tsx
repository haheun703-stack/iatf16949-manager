import { useEffect, useMemo, useState } from 'react'
import { ListTree, ChevronRight, ChevronDown, Search } from 'lucide-react'
import type { SemimesItemDetailDto, SemimesSummaryDto, SemimesTreeDto } from '@shared/ipc-types'
import { PageHeader } from '../shared/PageHeader'
import { cn } from '../../../lib/utils'

/**
 * 품번 트리 (반-MES M0) — 제조 기준정보의 첫 화면.
 * 좌측 = BOM 트리(운영/2021 소스 뱃지), 우측 = 품목 상세(라우팅·구성·사용처).
 * 데이터 = 0101 코어스키마 (2021 기초 시드 + tspmes POP_BOM 갱신 파이프라인).
 */

const TYPE_DOT: Record<string, string> = {
  '완제품/조립': 'bg-blue-600',
  반제품: 'bg-slate-400',
  '원자재/기타': 'bg-amber-500'
}

type SourceFilter = 'all' | 'popbom' | '2021'

export function ItemTreeView(): JSX.Element {
  const [summary, setSummary] = useState<SemimesSummaryDto | null>(null)
  const [tree, setTree] = useState<SemimesTreeDto | null>(null)
  const [detail, setDetail] = useState<SemimesItemDetailDto | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [srcFilter, setSrcFilter] = useState<SourceFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [s, t] = await Promise.all([
          window.api.invoke(window.api.channels.SEMIMES_SUMMARY) as Promise<SemimesSummaryDto>,
          window.api.invoke(window.api.channels.SEMIMES_TREE) as Promise<SemimesTreeDto>
        ])
        if (!alive) return
        setSummary(s)
        setTree(t)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    let alive = true
    void (async () => {
      const d = (await window.api.invoke(window.api.channels.SEMIMES_ITEM, {
        itemCode: selected
      })) as SemimesItemDetailDto | null
      if (alive) setDetail(d)
    })()
    return () => {
      alive = false
    }
  }, [selected])

  // 자식 맵 (소스 필터 적용, 활성 간선만)
  const childMap = useMemo(() => {
    const m = new Map<string, { child: string; qty: number; source: string | null }[]>()
    if (!tree) return m
    for (const e of tree.edges) {
      if (!e.active) continue
      if (srcFilter !== 'all' && e.source !== srcFilter) continue
      const arr = m.get(e.parent) ?? []
      arr.push({ child: e.child, qty: e.qty, source: e.source })
      m.set(e.parent, arr)
    }
    for (const arr of m.values()) arr.sort((a, b) => a.child.localeCompare(b.child))
    return m
  }, [tree, srcFilter])

  // 루트 (필터 반영 재계산 + 검색: 하위 어딘가에 매칭 품번이 있는 루트만)
  const roots = useMemo(() => {
    if (!tree) return []
    const parents = new Set(childMap.keys())
    const children = new Set<string>()
    for (const arr of childMap.values()) for (const c of arr) children.add(c.child)
    let rs = [...parents].filter((p) => !children.has(p)).sort()
    const q = query.trim().toUpperCase()
    if (q) {
      const hit = (code: string, depth: number): boolean => {
        if (code.toUpperCase().includes(q)) return true
        if (depth > 12) return false
        return (childMap.get(code) ?? []).some((c) => hit(c.child, depth + 1))
      }
      rs = rs.filter((r) => hit(r, 0))
    }
    return rs
  }, [tree, childMap, query])

  const toggle = (code: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  const q = query.trim().toUpperCase()

  function Node({ code, qty, depth }: { code: string; qty?: number; depth: number }): JSX.Element {
    const kids = childMap.get(code) ?? []
    const open = expanded.has(code) || (!!q && depth < 3)
    const [type, source] = tree?.items[code] ?? ['', '']
    const matched = !!q && code.toUpperCase().includes(q)
    return (
      <li>
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-md px-1.5 py-0.5 cursor-pointer hover:bg-slate-100',
            selected === code && 'bg-blue-50 ring-1 ring-blue-200',
            matched && 'bg-amber-50'
          )}
          onClick={() => setSelected(code)}
        >
          {kids.length > 0 ? (
            <button
              className="p-0.5 text-slate-400 hover:text-slate-700"
              onClick={(e) => {
                e.stopPropagation()
                toggle(code)
              }}
              aria-label={open ? '접기' : '펼치기'}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[22px]" />
          )}
          <span className={cn('w-2 h-2 rounded-full shrink-0', TYPE_DOT[type] ?? 'bg-slate-300')} />
          <span className="font-mono text-[13px] text-slate-800">{code}</span>
          {qty !== undefined && qty !== 1 && (
            <span className="text-[11px] text-slate-500">×{qty}</span>
          )}
          {source === '2021' && (
            <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800">2021</span>
          )}
        </div>
        {open && kids.length > 0 && depth < 12 && (
          <ul className="pl-4 border-l border-dotted border-slate-200 ml-2.5">
            {kids.map((k) => (
              <Node key={code + '>' + k.child} code={k.child} qty={k.qty} depth={depth + 1} />
            ))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <div>
      <PageHeader
        icon={<ListTree size={22} />}
        title="품번 트리 (반-MES)"
        sub="제조 기준정보 — BOM·라우팅·공정 · 원천: 2021 기초 시드 + tspmes 운영(POP_BOM) 갱신 파이프라인"
      />

      {/* 요약 밴드 */}
      {summary && (
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            ['품목', summary.items],
            ['BOM 간선(활성)', summary.edgesActive],
            ['라우팅', summary.routingSteps],
            ['공정', summary.processes],
            ['거래처(활성)', summary.partners],
            ['불량유형', summary.defectTypes]
          ].map(([label, n]) => (
            <div key={label as string} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              <span className="text-[12px] text-slate-500 mr-1.5">{label}</span>
              <span className="text-[15px] font-bold text-slate-800 tabular-nums">
                {(n as number).toLocaleString()}
              </span>
            </div>
          ))}
          {summary.lastImport && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[12px] text-emerald-900">
              최근 임포트 {summary.lastImport.runAt} · {summary.lastImport.source} — 신규{' '}
              {summary.lastImport.added} · 갱신 {summary.lastImport.updated} · 소멸{' '}
              {summary.lastImport.deactivated}
            </div>
          )}
        </div>
      )}

      {/* 컨트롤 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="품번 검색 (부분일치)"
            className="pl-8 pr-3 py-1.5 w-64 rounded-lg border border-slate-300 text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        {(
          [
            ['all', '전체'],
            ['popbom', '운영(tspmes)'],
            ['2021', '2021 설계']
          ] as [SourceFilter, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSrcFilter(key)}
            className={cn(
              'px-2.5 py-1 rounded-full text-[12px] border',
              srcFilter === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            )}
          >
            {label}
          </button>
        ))}
        <span className="text-[12px] text-slate-500 ml-1">
          최상위 {roots.length.toLocaleString()}품번
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-600" />완제품</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" />반제품</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />원자재</span>
        </span>
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4 items-start">
        {/* 트리 */}
        <div className="rounded-xl border border-slate-200 bg-white p-3 min-h-[300px] max-h-[62vh] overflow-auto">
          {loading && <div className="text-slate-500 text-sm p-4">불러오는 중…</div>}
          {!loading && roots.length === 0 && (
            <div className="text-slate-500 text-sm p-4">
              {summary && summary.items === 0
                ? '반-MES 기준정보가 아직 비어 있습니다 — scripts/semimes-seed.cjs 로 시드를 적재하세요.'
                : '조건에 맞는 품번이 없습니다.'}
            </div>
          )}
          <ul className="space-y-0.5">
            {roots.map((r) => (
              <Node key={r} code={r} depth={0} />
            ))}
          </ul>
        </div>

        {/* 상세 패널 */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 sticky top-2">
          {!detail && <div className="text-slate-500 text-sm">품번을 선택하면 상세가 표시됩니다.</div>}
          {detail && (
            <div className="space-y-3">
              <div>
                <div className="font-mono text-[15px] font-bold text-slate-900">{detail.itemCode}</div>
                <div className="text-[12px] text-slate-500 mt-0.5">
                  {detail.itemType}
                  {detail.itemName ? ` · ${detail.itemName}` : ''}
                  {detail.carType ? ` · ${detail.carType}` : ''}
                  {detail.source ? ` · 원천 ${detail.source}` : ''}
                </div>
                <div className="flex gap-1.5 mt-1.5 flex-wrap">
                  {detail.traceGbn === 1 && <Chip tone="blue">LOT 추적</Chip>}
                  {detail.inlotuse === 1 && <Chip tone="emerald">업체LOT 승계</Chip>}
                  {detail.outYn === 1 && <Chip tone="amber">외주</Chip>}
                  {detail.active === 0 && <Chip tone="rose">비활성</Chip>}
                </div>
              </div>

              <Section title={`라우팅 ${detail.routing.length ? `(${detail.routing.length}공정)` : ''}`}>
                {detail.routing.length === 0 && <Empty>라우팅 없음</Empty>}
                {detail.routing.length > 0 && (
                  <ol className="space-y-1">
                    {detail.routing.map((r) => (
                      <li key={r.seq + r.procCode} className="flex items-center gap-2 text-[13px]">
                        <span className="w-8 text-right text-slate-400 tabular-nums">{r.seq}</span>
                        <span className="font-mono text-slate-700">{r.procCode}</span>
                        <span className="text-slate-800">{r.procName ?? ''}</span>
                        {r.outYn === 1 && <Chip tone="amber">외주</Chip>}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title={`구성 (하위 ${detail.children.length})`}>
                {detail.children.length === 0 && <Empty>하위 품목 없음</Empty>}
                <CodeList rows={detail.children} onPick={setSelected} />
              </Section>

              <Section title={`사용처 (상위 ${detail.usedBy.length})`}>
                {detail.usedBy.length === 0 && <Empty>사용처 없음 — 최상위</Empty>}
                <CodeList rows={detail.usedBy} onPick={setSelected} />
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Chip({ tone, children }: { tone: 'blue' | 'emerald' | 'amber' | 'rose'; children: React.ReactNode }): JSX.Element {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700'
  }
  return <span className={cn('text-[11px] px-1.5 py-0.5 rounded', tones[tone])}>{children}</span>
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <div className="text-[12px] font-semibold text-slate-500 mb-1">{title}</div>
      {children}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }): JSX.Element {
  return <div className="text-[12px] text-slate-400">{children}</div>
}

function CodeList({
  rows,
  onPick
}: {
  rows: { code: string; qty: number; active: number }[]
  onPick: (code: string) => void
}): JSX.Element {
  if (rows.length === 0) return <></>
  return (
    <ul className="space-y-0.5 max-h-40 overflow-auto">
      {rows.map((r) => (
        <li key={r.code}>
          <button
            onClick={() => onPick(r.code)}
            className={cn(
              'font-mono text-[12.5px] text-slate-700 hover:text-blue-700 hover:underline',
              r.active === 0 && 'line-through opacity-50'
            )}
          >
            {r.code}
          </button>
          {r.qty !== 1 && <span className="text-[11px] text-slate-400 ml-1">×{r.qty}</span>}
        </li>
      ))}
    </ul>
  )
}
