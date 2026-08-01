import { useEffect, useState } from 'react'
import { FormListPanel } from './FormListPanel'
import { FormCanvas, type ViewMode } from './FormCanvas'
import { RecentFormsBar } from './RecentFormsBar'
import { AnswerPanel } from '../guide/AnswerPanel'
import { ResizableSplit } from '../shared/ResizableSplit'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'
import { FileEdit } from 'lucide-react'

// P5 — 정답 패널 접기 상태(좁은 노트북 대비, 로컬 영속)
const FOLD_KEY = 'answer_folded'
// P8 — 양식 목록 접기 상태(작성 캔버스 폭 확보, 로컬 영속)
const LIST_KEY = 'formlist_collapsed'

export function FormBuilderPage(): JSX.Element {
  const currentForm = useFormStore((s) => s.currentForm)
  const pushRecentForm = useUIStore((s) => s.pushRecentForm)

  // 열린 양식을 최근 목록에 기록(P12). 어느 경로로 열렸든(목록·검색·다음 양식·최근 칩)
  // 여기 한 곳만 지나므로 진입점마다 넣지 않는다. code/name 변화에만 반응.
  const code = currentForm?.code
  const name = currentForm?.name
  useEffect(() => {
    if (code && name) pushRecentForm({ code, name })
  }, [code, name, pushRecentForm])

  // 작성/문서/엑셀 뷰 모드 — 부모에서 관장해 목록·정답 패널과 함께 조율(P8①)
  const [viewMode, setViewMode] = useState<ViewMode>('input')

  // 사용자가 직접 접은 "수동" 상태(영속). 엑셀·문서 뷰의 자동 접힘과는 별개로 보존한다.
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
  const [listCollapsed, setListCollapsedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LIST_KEY) === '1'
    } catch {
      return false
    }
  })
  const setListCollapsed = (v: boolean): void => {
    try {
      localStorage.setItem(LIST_KEY, v ? '1' : '0')
    } catch {
      /* 무시 */
    }
    setListCollapsedState(v)
  }

  // P8① — 엑셀·문서 뷰에서는 목록+정답을 "자동으로" 접어 원본 양식이 한눈에 보이게 한다.
  //  수동 상태(folded/listCollapsed)는 건드리지 않으므로, [입력]으로 돌아오면 그대로 복원된다.
  const roomy = viewMode !== 'input'
  const answerHidden = roomy || folded
  const listFolded = roomy || listCollapsed

  return (
    // P8 — 작성 화면은 중앙 1400px 틀을 벗어나 모니터 전체 폭을 쓴다(AppShell에서 full-bleed 처리).
    // P12 — 최상단에 '최근 연 양식' 줄, 그 아래가 기존 3분할(목록·정답·작성).
    <div className="h-[calc(100vh-3.5rem)] flex flex-col w-full min-w-0">
      <RecentFormsBar />
      <div className="flex flex-1 min-h-0 w-full min-w-0">
        <FormListPanel
          collapsed={listFolded}
          // 엑셀·문서 뷰의 자동 접힘 중에는 수동 펼치기를 감춘다([입력]으로 복귀).
          canToggle={!roomy}
          onToggle={() => setListCollapsed(!listCollapsed)}
        />

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
        ) : answerHidden ? (
          // 정답 접힘(수동) 또는 엑셀·문서 뷰(자동) — 작성 캔버스만 전체 폭으로
          <div className="flex-1 min-w-0 p-5">
            <FormCanvas
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              // 자동 접힘(roomy) 중에는 [정답 보기]를 숨긴다(입력으로 돌아오면 복원되므로).
              onUnfoldAnswer={roomy ? undefined : () => setFolded(false)}
            />
          </div>
        ) : (
          <ResizableSplit
            storageKey="formbuilder-answer"
            initial={42}
            min={28}
            max={62}
            className="flex-1 p-5"
            left={<AnswerPanel onFold={() => setFolded(true)} />}
            right={<FormCanvas viewMode={viewMode} onViewModeChange={setViewMode} />}
          />
        )}
      </div>
    </div>
  )
}
