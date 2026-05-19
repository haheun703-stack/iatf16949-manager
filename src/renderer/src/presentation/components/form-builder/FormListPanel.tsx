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
    <aside className="w-72 bg-card border-r border-border flex flex-col shrink-0">
      <header className="p-4 border-b border-border">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <FileEdit className="w-4 h-4 text-primary" />
          양식 목록
        </h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">총 {formList.length}개 · 클릭하여 작성</p>
      </header>

      <div className="flex-1 overflow-y-auto p-2">
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
                'w-full text-left p-3 rounded-md mb-1.5 transition-colors group',
                active
                  ? 'bg-primary/10 border border-primary/30'
                  : 'border border-transparent hover:bg-muted'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    'inline-flex items-center justify-center min-w-[64px] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  {f.code}
                </span>
                <ChevronRight
                  className={cn(
                    'w-3.5 h-3.5 ml-auto transition-transform',
                    active ? 'text-primary translate-x-0.5' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className={cn('text-sm font-semibold', active && 'text-primary')}>
                {f.name}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2 tabular-nums">
                <span>규정 {f.regCode}</span>
                <span>·</span>
                <span>필드 {f.fieldsCount}</span>
                {f.draftCount > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-warning font-semibold">초안 {f.draftCount}</span>
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
