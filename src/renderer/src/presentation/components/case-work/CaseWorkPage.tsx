import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Plus } from 'lucide-react'
import type { CaseListItem, CaseDetailDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { CaseIntakeForm } from './CaseIntakeForm'
import { CaseDetail } from './CaseDetail'

/**
 * 사건 작업 — 고객 불량 통보에서 시작하는 8D 흐름.
 * 좌: 케이스 목록 + 새 접수 / 우: 접수 폼 또는 케이스 상세(단계·선별·원인대책).
 */
export function CaseWorkPage(): JSX.Element {
  const [list, setList] = useState<CaseListItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detail, setDetail] = useState<CaseDetailDto | null>(null)
  const [mode, setMode] = useState<'idle' | 'intake' | 'detail'>('idle')

  const loadList = useCallback(async () => {
    const res = await window.api.invoke(window.api.channels.CASE_LIST)
    setList(res)
  }, [])

  const loadDetail = useCallback(async (id: number) => {
    const res = await window.api.invoke(window.api.channels.CASE_GET, { id })
    setDetail(res)
    setMode('detail')
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  const openCase = (id: number): void => {
    setSelectedId(id)
    void loadDetail(id)
  }

  const onCreated = (id: number): void => {
    void loadList()
    openCase(id)
  }

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* 좌측 — 케이스 목록 */}
      <aside className="w-72 shrink-0 flex flex-col bg-card border border-border rounded-xl overflow-hidden">
        <header className="px-4 py-3 border-b border-border">
          <h2 className="text-[14px] font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" /> 사건 (불량 케이스)
          </h2>
          <button
            type="button"
            onClick={() => {
              setMode('intake')
              setSelectedId(null)
            }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 text-[13px] font-semibold bg-primary text-primary-foreground rounded-lg py-2 hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> 새 불량 접수
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-2">
          {list.length === 0 && (
            <div className="text-center text-xs text-muted-foreground py-8">접수된 사건이 없습니다</div>
          )}
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openCase(c.id)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 mb-1 border transition-colors',
                selectedId === c.id ? 'bg-muted border-primary/40' : 'bg-card border-transparent hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="font-mono text-[10px] text-muted-foreground">{c.caseNo}</span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-secondary text-muted-foreground ml-auto">
                  {c.status === 'closed' ? '종결' : '진행'}
                </span>
              </div>
              <div className="text-[12px] font-semibold leading-snug line-clamp-2">{c.defectDesc || c.title}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {c.customer} · {c.partNo}
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* 우측 — 접수/상세 */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {mode === 'intake' && (
          <CaseIntakeForm onCreated={onCreated} onCancel={() => setMode('idle')} />
        )}
        {mode === 'detail' && detail && (
          <CaseDetail detail={detail} onReload={() => selectedId && void loadDetail(selectedId)} />
        )}
        {mode === 'idle' && (
          <div className="h-full flex items-center justify-center text-center text-sm text-muted-foreground">
            <div>
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              고객 불량 통보가 들어오면 <b>새 불량 접수</b>로 시작하세요.
              <br />접수 → 선별 → 8D 원인분석 → 개선대책서 흐름을 따라갑니다.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
