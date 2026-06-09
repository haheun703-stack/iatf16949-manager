import { BomStatsStrip } from './BomStatsStrip'
import { BomDocList } from './BomDocList'
import { BomDocDetailPanel } from './BomDocDetailPanel'
import { ResizableSplit } from '../shared/ResizableSplit'

export function DocumentBomPage(): JSX.Element {
  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <h1 className="text-xl font-bold">문서 BOM</h1>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          IATF 16949 / ISO45001 시스템 문서 105건 · 관련양식 405건 · 자동 현행화 점검
        </p>
        <div className="mt-4">
          <BomStatsStrip />
        </div>
      </header>

      <ResizableSplit
        storageKey="document-bom"
        initial={38}
        min={26}
        max={55}
        className="flex-1 min-h-0 px-6 py-4"
        left={<BomDocList />}
        right={<BomDocDetailPanel />}
      />
    </div>
  )
}
