import { useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useProcessStore } from '../../stores/processStore'
import { useUIStore } from '../../stores/uiStore'
import { ProcessSelector } from './ProcessSelector'
import { ProcessImageViewer } from './ProcessImageViewer'
import { ProcessFormsPanel } from './ProcessFormsPanel'
import { ResizableSplit } from '../shared/ResizableSplit'

export function ProcessWorkbenchPage(): JSX.Element {
  const detail = useProcessStore((s) => s.detail)
  const detailLoading = useProcessStore((s) => s.detailLoading)
  const loadDetail = useProcessStore((s) => s.loadDetail)
  const selectedProcessCode = useUIStore((s) => s.selectedProcessCode)
  const setSelectedProcessCode = useUIStore((s) => s.setSelectedProcessCode)

  // Page-level responsibility: load detail when selection changes.
  // Previously this was in ProcessSelector, but it unmounts the instant
  // a card is clicked — so the effect never fires.
  useEffect(() => {
    if (selectedProcessCode) {
      void loadDetail(selectedProcessCode)
    }
  }, [selectedProcessCode, loadDetail])

  // No selection → show selector grid
  if (!selectedProcessCode) {
    return <ProcessSelector />
  }

  // Selected but loading
  if (detailLoading || !detail) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Top: breadcrumb */}
      <header className="px-5 py-3 border-b border-border bg-card flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={() => setSelectedProcessCode(null)}
          className="text-xs font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          프로세스 목록
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary text-primary-foreground">
          {detail.code}
        </span>
        <h1 className="text-base font-bold">{detail.name}</h1>
        {detail.docNo && (
          <span className="text-[11px] text-muted-foreground font-mono ml-auto">
            {detail.docNo}
          </span>
        )}
      </header>

      {/* Body: left (image) + right (forms) — drag the divider to rebalance */}
      <ResizableSplit
        storageKey="process-workbench"
        initial={55}
        min={35}
        max={70}
        className="flex-1 min-h-0 p-5"
        left={<ProcessImageViewer />}
        right={<ProcessFormsPanel />}
      />
    </div>
  )
}
