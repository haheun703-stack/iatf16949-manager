import { useEffect, useState } from 'react'
import { Search, X, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useBomStore } from '../../stores/bomStore'
import type { BomCategory } from '@shared/ipc-types'
import { BOM_CATEGORY_LABELS } from '@shared/ipc-types'

const CATEGORY_ORDER: BomCategory[] = ['manual', 'process', 'quality', 'safety_env']

const STATUS_BADGE: Record<string, string> = {
  '현행일치': 'bg-success/15 text-success border-success/30',
  '개정완료(목록표갱신필요)': 'bg-warning/15 text-warning border-warning/30',
  '목록표미등록(신규)': 'bg-primary/15 text-primary border-primary/30',
  '파일없음(작성/수집필요)': 'bg-destructive/15 text-destructive border-destructive/30'
}

const STATUS_SHORT: Record<string, string> = {
  '현행일치': '현행',
  '개정완료(목록표갱신필요)': '갱신',
  '목록표미등록(신규)': '신규',
  '파일없음(작성/수집필요)': '미작성'
}

export function BomDocList(): JSX.Element {
  const docs = useBomStore((s) => s.docs)
  const stats = useBomStore((s) => s.stats)
  const docsLoading = useBomStore((s) => s.docsLoading)
  const loadDocs = useBomStore((s) => s.loadDocs)
  const selectedDocNoNorm = useBomStore((s) => s.selectedDocNoNorm)
  const setSelectedDocNoNorm = useBomStore((s) => s.setSelectedDocNoNorm)
  const categoryFilter = useBomStore((s) => s.categoryFilter)
  const setCategoryFilter = useBomStore((s) => s.setCategoryFilter)

  const [query, setQuery] = useState('')
  // safety_env(ISO45001)는 거의 전부 '파일없음' → 시각적 노이즈라 기본 접힘
  const [collapsed, setCollapsed] = useState<Set<BomCategory>>(
    () => new Set<BomCategory>(['safety_env'])
  )

  useEffect(() => {
    void loadDocs()
  }, [loadDocs])

  const q = query.trim().toLowerCase()
  const matches = (d: { name: string; docNoRaw: string }): boolean =>
    !q || d.name.toLowerCase().includes(q) || d.docNoRaw.toLowerCase().includes(q)

  // Group docs by category (in current filter scope), applying search
  const grouped = CATEGORY_ORDER.map((cat) => ({
    category: cat,
    label: BOM_CATEGORY_LABELS[cat],
    items: docs.filter((d) => d.category === cat && matches(d))
  })).filter((g) => g.items.length > 0)

  // 검색 중에는 매칭 결과가 보이도록 접힘 무시
  const isCollapsed = (cat: BomCategory): boolean => !q && collapsed.has(cat)
  const toggleCollapsed = (cat: BomCategory): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg">
      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="문서번호 · 문서명 검색"
            className="w-full pl-9 pr-8 py-2 text-sm rounded-md bg-muted/50 border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-muted-foreground"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="검색어 지우기"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Category chip filter */}
      <div className="px-3 pb-2.5 border-b border-border flex flex-wrap gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setCategoryFilter(null)}
          className={cn(
            'text-[13px] font-semibold px-3.5 py-2 rounded-md border transition-colors',
            categoryFilter === null
              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
              : 'bg-card text-foreground border-border hover:bg-muted'
          )}
        >
          전체 {stats ? `(${stats.totalDocs})` : ''}
        </button>
        {stats?.byCategory.map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => setCategoryFilter(c.category)}
            className={cn(
              'text-[13px] font-semibold px-3.5 py-2 rounded-md border transition-colors',
              categoryFilter === c.category
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:bg-muted'
            )}
          >
            {c.categoryLabel.replace(/^[0-9]+\.\s*/, '')} ({c.count})
          </button>
        ))}
      </div>

      {/* Doc tree */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {docsLoading && (
          <div className="p-4 text-sm text-muted-foreground">불러오는 중...</div>
        )}
        {!docsLoading && grouped.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">조건에 맞는 문서가 없습니다.</div>
        )}
        {grouped.map((g) => {
          const collapsedNow = isCollapsed(g.category)
          return (
          <div key={g.category}>
            <button
              type="button"
              onClick={() => toggleCollapsed(g.category)}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted border-y border-border text-sm font-bold text-foreground hover:bg-muted/70 transition-colors sticky top-0 z-10"
            >
              {collapsedNow ? (
                <ChevronRight className="w-4 h-4 shrink-0" />
              ) : (
                <ChevronDown className="w-4 h-4 shrink-0" />
              )}
              <span className="text-left flex-1">{g.label}</span>
              <span className="text-muted-foreground font-semibold">{g.items.length}</span>
            </button>
            {!collapsedNow && (
            <ul>
              {g.items.map((d) => {
                const active = d.docNoNorm === selectedDocNoNorm
                const badgeClass = STATUS_BADGE[d.status] || 'bg-muted text-muted-foreground border-border'
                const short = STATUS_SHORT[d.status] || '?'
                return (
                  <li key={d.docNoNorm}>
                    <button
                      type="button"
                      onClick={() => setSelectedDocNoNorm(d.docNoNorm)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 border-b border-border/60 hover:bg-muted/60 transition-colors flex items-center gap-2.5',
                        active && 'bg-primary/10 hover:bg-primary/15'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center min-w-[78px] px-1.5 py-0.5 text-[11.5px] font-mono font-bold rounded shrink-0',
                          active
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground/80'
                        )}
                      >
                        {d.docNoRaw === '-' ? '매뉴얼' : d.docNoRaw}
                      </span>
                      <span className="text-sm flex-1 min-w-0 truncate">{d.name}</span>
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-1.5 py-0.5 rounded border shrink-0',
                          badgeClass
                        )}
                        title={d.status}
                      >
                        {short}
                      </span>
                      {d.formsCount > 0 && (
                        <span className="text-[11.5px] text-muted-foreground font-mono shrink-0">
                          {d.formsCount}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
            )}
          </div>
          )
        })}
      </div>
    </div>
  )
}
