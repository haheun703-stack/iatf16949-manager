import { useEffect } from 'react'
import { Package, RefreshCw, ShieldAlert, ClipboardList, AlertTriangle } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { usePartsStore } from '../../stores/partsStore'
import { PartDetail } from './PartDetail'

/**
 * 품번/ISIR — 부품 단위 통제(ISIR·관리계획서) 통합 뷰.
 * ISIR = 고객과 협의한 통제 패키지(근간). 좌측 품번 선택 → 우측 완비도·관리계획서·불량 이력.
 */
export function PartsView(): JSX.Element {
  const { list, loadingList, loadList, selected, detail, loadingDetail, select } = usePartsStore()

  useEffect(() => {
    void loadList()
  }, [loadList])

  // 목록 로드 후 미선택이면 첫 품번 자동 선택
  useEffect(() => {
    if (!selected && list.length > 0) void select(list[0].partNo)
  }, [list, selected, select])

  return (
    <div className="flex flex-col h-full min-h-0">
      <header className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Package className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold tracking-tight">품번 / ISIR</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            ISIR(검사협정·관리계획서) = 고객 협의 통제의 근간 · {list.length}개 품번 — SQ 공정감사가 이걸로 진행
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadList()}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
          title="새로고침"
        >
          <RefreshCw className={cn('w-4 h-4', loadingList && 'animate-spin')} />
        </button>
      </header>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 — 품번 목록 */}
        <div className="w-[340px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {loadingList && list.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
          )}
          {!loadingList && list.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              적재된 품번이 없습니다.<br />
              <span className="text-[11px]">ISIR을 적재하면 여기 표시됩니다.</span>
            </div>
          )}
          {list.map((p) => {
            const active = selected === p.partNo
            return (
              <button
                key={p.partNo}
                type="button"
                onClick={() => void select(p.partNo)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2.5 transition-colors border',
                  active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[13px] font-bold">{p.partNo}</span>
                  {p.defectCount > 0 && (
                    <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                      <AlertTriangle className="w-3 h-3" />{p.defectCount}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">{p.partName}</div>
                <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-0.5"><ShieldAlert className="w-3 h-3" />ISIR {p.isirCount}</span>
                  <span className="flex items-center gap-0.5"><ClipboardList className="w-3 h-3" />관리항목 {p.cpItemCount}</span>
                  {p.customer && <span className="truncate">· {p.customer}</span>}
                </div>
              </button>
            )
          })}
        </div>

        {/* 우측 — 통합 상세 */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {loadingDetail && !detail ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">불러오는 중...</div>
          ) : detail ? (
            <PartDetail detail={detail} />
          ) : (
            <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
              <div>
                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                좌측에서 품번을 선택하면<br />ISIR 완비도·관리계획서·불량 이력이 표시됩니다.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
