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
      <section className="bg-card border border-border rounded-lg shrink-0">
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
          <div className="p-2 max-h-[200px] overflow-y-auto">
            {detail.forms.map((f) => {
              const active = selectedFormCode === f.formCode
              return (
                <button
                  key={f.formCode}
                  type="button"
                  onClick={() => handleFormClick(f.formCode)}
                  className={cn(
                    'w-full text-left p-2.5 rounded-md mb-1 transition-colors flex items-center gap-3',
                    active
                      ? 'bg-primary/10 border border-primary/30'
                      : 'border border-transparent hover:bg-muted'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex items-center justify-center min-w-[64px] px-1.5 py-0.5 rounded text-[10px] font-mono font-bold',
                      active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                    )}
                  >
                    {f.formCode}
                  </span>
                  <span className={cn('flex-1 text-sm', active ? 'font-semibold text-primary' : '')}>
                    {f.formName}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    필드 {f.fieldsCount}
                  </span>
                  {f.draftCount > 0 && (
                    <span className="text-[11px] text-warning font-semibold tabular-nums">
                      초안 {f.draftCount}
                    </span>
                  )}
                  <ChevronRight
                    className={cn(
                      'w-3.5 h-3.5 shrink-0',
                      active ? 'text-primary' : 'text-muted-foreground'
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
          <div className="h-full bg-card border border-border rounded-lg flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              위 목록에서 양식을 선택하면 작성 화면이 열립니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
