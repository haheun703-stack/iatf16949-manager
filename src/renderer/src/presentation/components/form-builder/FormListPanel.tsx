import { useEffect } from 'react'
import { FileEdit, ChevronRight } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'

export function FormListPanel(): JSX.Element {
  const { formList, formListLoading, loadFormList, loadFormDefinition } = useFormStore()
  const { selectedFormCode, setSelectedFormCode } = useUIStore()

  useEffect(() => {
    loadFormList()
  }, [loadFormList])

  // Auto-load definition when external code selection happens (e.g. from dashboard click)
  useEffect(() => {
    if (selectedFormCode) {
      loadFormDefinition(selectedFormCode)
    }
  }, [selectedFormCode, loadFormDefinition])

  const handleClick = (code: string): void => {
    setSelectedFormCode(code)
  }

  return (
    <aside className="w-80 bg-card border-r border-border flex flex-col shrink-0">
      <header className="px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-bold flex items-center gap-2 tracking-tight">
          <FileEdit className="w-4 h-4 text-primary" />
          양식 목록
        </h2>
        <p className="text-xs text-muted-foreground mt-1">총 {formList.length}개 · 클릭하여 작성</p>
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
        {formList.map((f) => {
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
