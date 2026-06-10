import { FileText, ChevronRight, Inbox } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useProcessStore } from '../../stores/processStore'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'
import { FormCanvas } from '../form-builder/FormCanvas'

export function ProcessFormsPanel(): JSX.Element {
  const detail = useProcessStore((s) => s.detail)
  const currentForm = useFormStore((s) => s.currentForm)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)
  const selectedFormCode = useUIStore((s) => s.selectedFormCode)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)

  const handleFormClick = (code: string): void => {
    setSelectedFormCode(code)
    void loadFormDefinition(code)
  }

  if (!detail) return <></>

  return (
    <div className="h-full flex flex-col gap-3">
      {/* Forms list (top) */}
      <section className="bg-card border border-border rounded-xl shadow-sm shrink-0">
        <header className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            이 프로세스의 양식 ({detail.forms.length})
          </h3>
        </header>

        {detail.forms.length === 0 ? (
          <div className="p-6 text-center">
            <Inbox className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-xs text-muted-foreground">
              이 프로세스에 등록된 양식이 없습니다.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              ※ 향후 33개 규정 × 192개 양식 전부 등록 예정
            </p>
          </div>
        ) : (
          <div className="p-2 max-h-[260px] overflow-y-auto">
            {detail.forms.map((f) => {
              const active = selectedFormCode === f.formCode
              return (
                <button
                  key={f.formCode}
                  type="button"
                  onClick={() => handleFormClick(f.formCode)}
                  className={cn(
                    'relative w-full text-left pl-3.5 pr-2.5 py-2.5 rounded-lg mb-0.5 transition-colors flex items-center gap-2.5',
                    active ? 'bg-muted' : 'hover:bg-muted/60'
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-primary"
                    />
                  )}
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[60px] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight shrink-0',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {f.formCode}
                  </span>
                  <span className="flex-1 min-w-0 truncate text-sm font-medium text-foreground">
                    {f.formName}
                  </span>
                  {f.fieldsCount > 0 && (
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0">
                      필드 {f.fieldsCount}
                    </span>
                  )}
                  {f.draftCount > 0 && (
                    <span className="text-[10px] font-semibold text-warning bg-warning/10 px-1.5 py-0.5 rounded shrink-0">
                      초안 {f.draftCount}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'w-4 h-4 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground/40'
                    )}
                  />
                </button>
              )
            })}
          </div>
        )}
      </section>

      {/* Selected form canvas (bottom, flex-1) */}
      <div className="flex-1 min-h-0">
        {currentForm && detail.forms.some((f) => f.formCode === currentForm.code) ? (
          <FormCanvas />
        ) : (
          <div className="h-full bg-card border border-border rounded-xl shadow-sm flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              위 목록에서 양식을 선택하면 작성 화면이 열립니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
