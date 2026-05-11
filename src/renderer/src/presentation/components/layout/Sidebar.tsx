import { useEffect, useMemo } from 'react'
import { Search } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useClauseStore } from '../../stores/clauseStore'
import { CLAUSE_ICONS } from '@/domain/entities/Clause'

export function Sidebar(): JSX.Element {
  const {
    selectedClauseId,
    setSelectedClause,
    sidebarSearch,
    setSidebarSearch,
    expandedIds,
    toggleExpanded,
    setActiveTab
  } = useUIStore()

  const { clauses, loadClauses } = useClauseStore()

  useEffect(() => {
    loadClauses()
  }, [loadClauses])

  const visibleClauses = useMemo(() => {
    const lowerSearch = sidebarSearch.toLowerCase()

    return clauses.filter((clause) => {
      // Root-level items are always visible
      if (!clause.parentId) {
        if (lowerSearch) {
          return clause.id.toLowerCase().includes(lowerSearch) || clause.title.toLowerCase().includes(lowerSearch)
        }
        return true
      }

      // Check if all ancestors are expanded
      let parentId: string | null = clause.parentId
      while (parentId) {
        if (!expandedIds.has(parentId)) return false
        const parent = clauses.find((c) => c.id === parentId)
        parentId = parent?.parentId ?? null
      }

      // Search filter
      if (lowerSearch) {
        return clause.id.toLowerCase().includes(lowerSearch) || clause.title.toLowerCase().includes(lowerSearch)
      }

      return true
    })
  }, [clauses, expandedIds, sidebarSearch])

  return (
    <div className="w-[340px] min-w-[340px] bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <h1 className="text-[15px] font-bold tracking-wide text-primary">IATF 16949 : 2016</h1>
        <p className="text-[11px] text-muted-foreground mt-1">품질경영시스템 요구사항 관리</p>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            className="w-full bg-background border border-border rounded-md py-1.5 pl-8 pr-3 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            placeholder="항목 검색 (예: 8.5.1, 관리계획서...)"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2">
        {visibleClauses.map((clause) => {
          const chapter = clause.id.split('.')[0]
          const icon = clause.depth === 0 ? CLAUSE_ICONS[chapter] : undefined
          const isSelected = selectedClauseId === clause.id
          const isExpanded = expandedIds.has(clause.id)

          return (
            <div
              key={clause.id}
              className={`flex items-center py-1.5 cursor-pointer transition-colors text-[13px] border-l-2 ${
                isSelected ? 'bg-muted border-l-primary' : 'border-l-transparent hover:bg-muted/50'
              }`}
              style={{ paddingLeft: `${12 + clause.depth * 16}px`, paddingRight: '12px' }}
              onClick={() => {
                if (clause.hasChildren) toggleExpanded(clause.id)
                setSelectedClause(clause.id)
                setActiveTab('detail')
              }}
            >
              {/* Expand/Collapse indicator */}
              <span className="w-4 text-muted-foreground text-[10px] mr-0.5 text-center shrink-0">
                {clause.hasChildren ? (isExpanded ? '▾' : '▸') : ''}
              </span>

              {/* Icon for root chapters */}
              {icon && <span className="mr-1 text-[13px]">{icon}</span>}

              {/* Clause ID */}
              <span className="text-primary font-semibold min-w-[48px] text-[12px] shrink-0">
                {clause.id}
              </span>

              {/* Title */}
              <span
                className={`truncate ${
                  clause.hasChildren ? 'font-semibold text-foreground' : 'text-foreground/80'
                }`}
              >
                {clause.title}
              </span>

              {/* Document count badge */}
              {clause.documentCount > 0 && (
                <span className="ml-auto shrink-0 bg-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded-full">
                  {clause.documentCount}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-border text-[11px] text-muted-foreground">
        전체 {clauses.length}개 항목
      </div>
    </div>
  )
}
