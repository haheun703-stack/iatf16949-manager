import { BookOpen } from 'lucide-react'
import { useFormStore } from '../../stores/formStore'

export function RegulationViewer(): JSX.Element {
  const { currentForm, currentRegulationSections } = useFormStore()

  if (!currentForm) return <></>

  return (
    <section className="bg-card border border-border rounded-lg p-5 h-full flex flex-col">
      <header className="mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-mono font-bold text-muted-foreground">
            규정 {currentForm.regCode}
          </span>
        </div>
        <h3 className="text-base font-bold">관련 규정 원문</h3>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {currentRegulationSections.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            해당 규정의 원문이 아직 등록되지 않았습니다.
          </div>
        ) : (
          currentRegulationSections.map((s) => (
            <div key={s.id} className="text-sm leading-relaxed">
              <h4 className="font-semibold text-primary mb-1">{s.sectionTitle}</h4>
              <p className="whitespace-pre-wrap text-foreground/80 text-[13px]">
                {s.sectionBody}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
