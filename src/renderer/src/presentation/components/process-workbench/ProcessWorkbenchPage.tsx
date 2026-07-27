import { useEffect } from 'react'
import { Factory, Image as ImageIcon, FileText } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { useProcessStore } from '../../stores/processStore'
import { useUIStore } from '../../stores/uiStore'
import { ProcessImageViewer } from './ProcessImageViewer'
import { ProcessFormsPanel } from './ProcessFormsPanel'
import { ResizableSplit } from '../shared/ResizableSplit'

const CATEGORY_LABEL: Record<string, string> = {
  CP: '핵심 프로세스',
  MP: '경영 프로세스',
  SP: '지원 프로세스'
}

const CATEGORY_COLOR: Record<string, string> = {
  CP: 'bg-primary/10 text-primary',
  MP: 'bg-warn-tint text-warn-ink',
  SP: 'bg-ok-tint text-ok-ink'
}

/**
 * 프로세스 작업장 — 기본서(흐름도)를 보면서 하위 양식을 차례로 작성.
 * 템플릿 C: 좌 프로세스 목록 380px / 우 작업장(이미지|양식 분할)·미선택 요약.
 * 이미지 뷰어가 h-full 스택으로 확정 높이를 요구 → 이 화면은 뷰포트 고정 높이(-m-6+calc, TopBar 52px) 유지.
 */
export function ProcessWorkbenchPage(): JSX.Element {
  const { list, listLoading, loadList } = useProcessStore()
  const detail = useProcessStore((s) => s.detail)
  const detailLoading = useProcessStore((s) => s.detailLoading)
  const loadDetail = useProcessStore((s) => s.loadDetail)
  const selectedProcessCode = useUIStore((s) => s.selectedProcessCode)
  const setSelectedProcessCode = useUIStore((s) => s.setSelectedProcessCode)

  useEffect(() => {
    loadList()
  }, [loadList])

  // Page-level responsibility: load detail when selection changes.
  useEffect(() => {
    if (selectedProcessCode) {
      void loadDetail(selectedProcessCode)
    }
  }, [selectedProcessCode, loadDetail])

  const grouped = list.reduce<Record<string, typeof list>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  return (
    <div className="-m-6 h-[calc(100vh-52px)] px-6 pt-6 pb-4 flex flex-col min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<Factory className="w-5 h-5" />}
          title="프로세스 작업장"
          sub={`기본서(흐름도)를 보면서 하위 양식을 차례로 작성합니다 · 프로세스 ${list.length}개`}
        />
      </div>

      {/* 템플릿 C (19번): 좌 프로세스 목록 380px 고정 / 우 작업장(이미지|양식) */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1">
          {listLoading && list.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-12">불러오는 중...</div>
          )}
          {(['CP', 'MP', 'SP'] as const).map((cat) => (
            <div key={cat}>
              <div className="px-1 pt-3 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-faint">
                {CATEGORY_LABEL[cat]}
              </div>
              <div className="space-y-1.5">
                {(grouped[cat] || []).map((p) => {
                  const active = selectedProcessCode === p.code
                  return (
                    <button
                      key={p.code}
                      type="button"
                      onClick={() => setSelectedProcessCode(p.code)}
                      className={cn(
                        'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
                        active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[52px] px-1.5 py-0.5 rounded text-[11px] font-mono font-bold shrink-0',
                            CATEGORY_COLOR[cat]
                          )}
                        >
                          {p.code}
                        </span>
                        <span className="text-[13.5px] font-semibold truncate">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10.5px] text-muted-foreground tabular-nums">
                        <span className="flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          페이지 {p.pagesCount}
                          {!p.hasImages && p.pagesCount > 0 && (
                            <span className="text-warn-ink ml-0.5">(이미지 없음)</span>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          양식 {p.formsCount}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          {selectedProcessCode ? (
            detailLoading || !detail ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                불러오는 중...
              </div>
            ) : (
              <>
                <div className="shrink-0 bg-card border border-border rounded-[14px] shadow-card px-4 py-2.5 mb-3 flex items-center gap-3">
                  <span className="inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-primary text-primary-foreground">
                    {detail.code}
                  </span>
                  <h2 className="text-[15px] font-bold tracking-tight truncate">{detail.name}</h2>
                  {detail.docNo && (
                    <span className="text-[11px] text-muted-foreground font-mono ml-auto shrink-0">
                      {detail.docNo}
                    </span>
                  )}
                </div>
                {/* 좌 이미지·우 양식 — 경계 드래그로 재배분 */}
                <ResizableSplit
                  storageKey="process-workbench"
                  initial={55}
                  min={35}
                  max={70}
                  className="flex-1 min-h-0"
                  left={<ProcessImageViewer />}
                  right={<ProcessFormsPanel />}
                />
              </>
            )
          ) : (
            /* 미선택 요약(19번 공백 금지) */
            <div className="grid gap-4 content-start">
              <CardShell title="프로세스 구성" cap="기본서·하위 양식 현황">
                <div className="px-[18px] pb-4 pt-1 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                  {(['CP', 'MP', 'SP'] as const).map((cat) => (
                    <div key={cat}>
                      {CATEGORY_LABEL[cat]}{' '}
                      <b className="text-[15px] tabular-nums">{(grouped[cat] || []).length}</b>개
                    </div>
                  ))}
                </div>
              </CardShell>
              <CardShell title="사용법" cap="좌측에서 프로세스를 선택하세요">
                <div className="px-[18px] pb-4 pt-1 text-[13px] text-muted-foreground leading-relaxed">
                  프로세스를 선택하면 기본서(흐름도) 이미지와 하위 양식 목록이 나란히 열립니다. 흐름도를 보면서
                  양식을 차례로 작성하세요 — 가운데 경계를 드래그해 화면 배분을 조절할 수 있습니다.
                </div>
              </CardShell>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
