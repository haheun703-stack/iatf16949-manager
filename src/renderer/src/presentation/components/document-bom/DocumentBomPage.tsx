import { BomStatsStrip } from './BomStatsStrip'
import { BomDocList } from './BomDocList'
import { BomDocDetailPanel } from './BomDocDetailPanel'
import { PageHeader } from '../shared/PageHeader'

/**
 * 문서 BOM — 템플릿 C(좌목록·우상세, 7/28 코워크 재판정 확정 = 판정① 일관).
 * 정보 구조는 현행 그대로(좌 문서 트리 + 우 상세) — 좌폭만 C 공통 규격 380px 고정,
 * 미선택 시 요약 카드는 BomDocDetailPanel 에서(규칙④ 공백 금지).
 */
export function DocumentBomPage(): JSX.Element {
  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <PageHeader
          title="문서 BOM"
          sub="IATF 16949 / ISO45001 시스템 문서 105건 · 관련양식 405건 · 자동 현행화 점검"
        />
        <div className="mt-4">
          <BomStatsStrip />
        </div>
      </header>

      <div className="flex-1 min-h-0 flex gap-4 px-6 py-4">
        <div className="w-[380px] shrink-0 min-h-0 h-full">
          <BomDocList />
        </div>
        <div className="flex-1 min-w-0 min-h-0 h-full">
          <BomDocDetailPanel />
        </div>
      </div>
    </div>
  )
}
