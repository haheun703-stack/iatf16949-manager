import { useEffect, useMemo, useRef, useState } from 'react'
import { FileEdit, ChevronRight, Search, X, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'

export function FormListPanel({
  collapsed = false,
  canToggle = true,
  onToggle
}: {
  /** 접힘 상태 — 얇은 레일만 표시 */
  collapsed?: boolean
  /** 펼치기 버튼 노출 여부(엑셀·문서 뷰 자동 접힘 중에는 false) */
  canToggle?: boolean
  onToggle?: () => void
} = {}): JSX.Element {
  const { formList, formListLoading, loadFormList, loadFormDefinition, loadSubmission } = useFormStore()
  const { selectedFormCode, setSelectedFormCode, pendingSubmissionId, setPendingSubmissionId } =
    useUIStore()
  const [query, setQuery] = useState('')

  useEffect(() => {
    loadFormList()
  }, [loadFormList])

  // 코드·이름 동시 검색(대소문자/공백 무시). 양식이 200개+라 목록에서 바로 거른다.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return formList
    return formList.filter(
      (f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)
    )
  }, [formList, query])

  // 외부 진입 시 자동 로드: 분배된 작성본 [열기]면 그 작성본을, 아니면 새 양식 정의를.
  // ⚠️ pending 소비(null 세팅)가 이펙트를 한 번 더 돌리므로, 그 재실행이 방금 연 초안을
  //    빈 양식으로 덮지 않도록 ref 로 1회 스킵한다(검수 7/30 렌더러 C — 초안 경합 파괴).
  const consumedPendingRef = useRef(false)
  useEffect(() => {
    if (pendingSubmissionId != null) {
      consumedPendingRef.current = true
      void loadSubmission(pendingSubmissionId)
      setPendingSubmissionId(null)
    } else if (selectedFormCode) {
      if (consumedPendingRef.current) {
        consumedPendingRef.current = false // pending 소비 직후의 재실행 — 초안 유지
        return
      }
      void loadFormDefinition(selectedFormCode)
    } else {
      consumedPendingRef.current = false // 선택 양식 없음 — 스킵 플래그 잔존 방지
    }
  }, [selectedFormCode, pendingSubmissionId, loadFormDefinition, loadSubmission, setPendingSubmissionId])

  // 목록에서 직접 클릭 = 새 작성(빈 양식). 혹시 남은 pending 작성본은 비운다.
  const handleClick = (code: string): void => {
    setPendingSubmissionId(null)
    consumedPendingRef.current = false
    if (code === selectedFormCode) {
      void loadFormDefinition(code) // 같은 양식 재클릭 = 새 작성(상태 불변이라 이펙트가 안 돌므로 직접 로드)
    } else {
      setSelectedFormCode(code)
    }
  }

  // P8 — 접힘: 얇은 레일만. 엑셀·문서 뷰 자동 접힘(canToggle=false) 중엔 펼치기 버튼을 감춘다.
  if (collapsed) {
    return (
      <aside className="w-11 bg-card border-r border-border flex flex-col items-center py-3 shrink-0">
        {canToggle && onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            title="양식 목록 펼치기"
            className="text-muted-foreground/70 hover:text-primary p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        ) : (
          <FileEdit className="w-4 h-4 text-muted-foreground/50" />
        )}
        <span className="[writing-mode:vertical-rl] text-[11px] text-muted-foreground/70 mt-3 tracking-wider select-none">
          양식 목록
        </span>
      </aside>
    )
  }

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col shrink-0">
      <header className="px-5 py-4 border-b border-border">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold flex items-center gap-2 tracking-tight">
            <FileEdit className="w-4 h-4 text-primary" />
            양식 목록
          </h2>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              title="양식 목록 접기 (작성 화면 넓게)"
              className="text-muted-foreground/70 hover:text-foreground p-1 -mr-1 rounded-md hover:bg-muted transition-colors"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* 코드·이름 검색 */}
        <div className="relative mt-2.5">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="코드 또는 이름 검색 (예: B2100, 시정조치)"
            className="w-full pl-8 pr-7 py-3 text-sm rounded-lg bg-fillable border border-border focus:border-primary/50 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="검색 지우기"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {query ? `${filtered.length} / ${formList.length}개` : `총 ${formList.length}개`} · 클릭하여 작성
        </p>
      </header>

      <div className="flex-1 overflow-y-auto p-2.5">
        {formListLoading && (
          <div className="text-center text-xs text-muted-foreground py-8">불러오는 중...</div>
        )}
        {!formListLoading && formList.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            등록된 양식이 없습니다
          </div>
        )}
        {!formListLoading && formList.length > 0 && filtered.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            &lsquo;{query}&rsquo; 검색 결과 없음
          </div>
        )}
        {filtered.map((f) => {
          const active = selectedFormCode === f.code
          return (
            <button
              key={f.code}
              type="button"
              onClick={() => handleClick(f.code)}
              className={cn(
                'relative w-full text-left px-3.5 py-3 rounded-lg mb-1 transition-colors group',
                active ? 'bg-muted' : 'hover:bg-muted/60'
              )}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary"
                />
              )}
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[60px] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight',
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {f.code}
                </span>
                {f.draftCount > 0 && (
                  <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded">
                    초안 {f.draftCount}
                  </span>
                )}
                <ChevronRight
                  className={cn(
                    'w-4 h-4 ml-auto transition-transform',
                    active
                      ? 'text-primary translate-x-0.5'
                      : 'text-muted-foreground/40 group-hover:text-muted-foreground'
                  )}
                />
              </div>
              <div className="text-sm font-semibold text-foreground leading-snug">
                {f.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5 tabular-nums">
                <span>규정 {f.regCode}</span>
                {f.fieldsCount > 0 && (
                  <>
                    <span className="opacity-40">·</span>
                    <span>필드 {f.fieldsCount}</span>
                  </>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
