import { BookOpen } from 'lucide-react'
import { useFormStore } from '../../stores/formStore'

export function RegulationViewer(): JSX.Element {
  const { currentForm, currentRegulationSections } = useFormStore()

  if (!currentForm) return <></>

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm p-6 h-full flex flex-col">
      <header className="mb-5 pb-4 border-b border-border">
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen className="w-4 h-4 text-primary" />
          <span className="text-[11px] font-mono font-bold text-muted-foreground tracking-tight">
            규정 {currentForm.regCode}
          </span>
        </div>
        <h3 className="text-lg font-bold tracking-tight">관련 규정 원문</h3>
      </header>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {currentRegulationSections.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-10">
            해당 규정의 원문이 아직 등록되지 않았습니다.
          </div>
        ) : (
          currentRegulationSections.map((s) => (
            <div key={s.id}>
              <h4 className="flex items-center gap-2 font-semibold text-[15px] text-foreground mb-2">
                <span aria-hidden className="w-1 h-4 rounded-full bg-primary/70 shrink-0" />
                {s.sectionTitle}
              </h4>
              <p className="whitespace-pre-wrap text-foreground/75 text-sm leading-7 pl-3">
                {s.sectionBody}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  )
}
