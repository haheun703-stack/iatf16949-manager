import { useState } from 'react'
import { FormListPanel } from './FormListPanel'
import { FormCanvas } from './FormCanvas'
import { AnswerPanel } from '../guide/AnswerPanel'
import { ResizableSplit } from '../shared/ResizableSplit'
import { useFormStore } from '../../stores/formStore'
import { FileEdit } from 'lucide-react'

// P5 — 정답 패널 접기 상태(좁은 노트북 대비, 로컬 영속)
const FOLD_KEY = 'answer_folded'

export function FormBuilderPage(): JSX.Element {
  const currentForm = useFormStore((s) => s.currentForm)
  const [folded, setFoldedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FOLD_KEY) === '1'
    } catch {
      return false
    }
  })
  const setFolded = (v: boolean): void => {
    try {
      localStorage.setItem(FOLD_KEY, v ? '1' : '0')
    } catch {
      /* 무시 */
    }
    setFoldedState(v)
  }

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex">
      <FormListPanel />

      {!currentForm ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <FileEdit className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-40" />
            <h2 className="text-lg font-bold mb-2">양식을 선택하세요</h2>
            <p className="text-sm text-muted-foreground">
              왼쪽 목록에서 작성할 양식을 클릭하면 <b>왼쪽=모범 정답, 오른쪽=실제 작성</b> 화면이 열립니다.
            </p>
          </div>
        </div>
      ) : folded ? (
        // 정답 접힘 — 작성 캔버스만(우측 헤더에 [» 정답 보기])
        <div className="flex-1 p-5">
          <FormCanvas onUnfoldAnswer={() => setFolded(false)} />
        </div>
      ) : (
        <ResizableSplit
          storageKey="formbuilder-answer"
          initial={42}
          min={28}
          max={62}
          className="flex-1 p-5"
          left={<AnswerPanel onFold={() => setFolded(true)} />}
          right={<FormCanvas />}
        />
      )}
    </div>
  )
}
