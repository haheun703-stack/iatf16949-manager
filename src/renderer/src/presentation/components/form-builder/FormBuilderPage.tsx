import { FormListPanel } from './FormListPanel'
import { RegulationViewer } from './RegulationViewer'
import { FormCanvas } from './FormCanvas'
import { useFormStore } from '../../stores/formStore'
import { FileEdit } from 'lucide-react'

export function FormBuilderPage(): JSX.Element {
  const currentForm = useFormStore((s) => s.currentForm)

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex">
      <FormListPanel />

      {!currentForm ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h2 className="text-lg font-bold mb-2">양식을 선택하세요</h2>
            <p className="text-sm text-muted-foreground">
              왼쪽 목록에서 작성할 양식을 클릭하면 규정 원문과 함께 작성 화면이 열립니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex min-w-0 p-5 gap-5">
          <div className="w-[40%] min-w-[320px]">
            <RegulationViewer />
          </div>
          <div className="flex-1 min-w-0">
            <FormCanvas />
          </div>
        </div>
      )}
    </div>
  )
}
