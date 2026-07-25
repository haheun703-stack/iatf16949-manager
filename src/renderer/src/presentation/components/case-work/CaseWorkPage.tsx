import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Plus, RefreshCw } from 'lucide-react'
import type { CaseListItem, CaseDetailDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { CaseIntakeForm } from './CaseIntakeForm'
import { CaseDetail } from './CaseDetail'

/**
 * 불량 대책서 — 고객 불량 통보에서 시작하는 8D 흐름(접수→선별→8D→개선대책서).
 * 템플릿 C: 좌 케이스 목록 380px / 우 접수 폼·케이스 상세·미선택 요약(공백 금지).
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

  const open = list.filter((c) => c.status !== 'closed')

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<AlertTriangle className="w-5 h-5" />}
          title="불량 대책서"
          sub={`고객 불량 통보 → 접수 → 선별 → 8D 원인분석 → 개선대책서 · 진행 ${open.length} / 전체 ${list.length}건`}
          actions={
            <>
              <button
                type="button"
                onClick={() => {
                  setMode('intake')
                  setSelectedId(null)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> 새 불량 접수
              </button>
              <button
                type="button"
                onClick={() => void loadList()}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                title="새로고침"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </>
          }
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 — 케이스 목록 (템플릿 C: 380px 고정·행 확대) */}
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {list.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              접수된 불량이 없습니다.
              <br />
              <span className="text-[11px]">고객 통보가 오면 [새 불량 접수]로 시작하세요.</span>
            </div>
          )}
          {list.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openCase(c.id)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
                selectedId === c.id && mode === 'detail'
                  ? 'bg-muted border-primary/40'
                  : 'bg-card border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[11px] text-muted-foreground">{c.caseNo}</span>
                <span
                  className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-auto shrink-0',
                    c.status === 'closed' ? 'bg-secondary text-muted-foreground' : 'bg-warn-tint text-warn-ink'
                  )}
                >
                  {c.status === 'closed' ? '종결' : '진행'}
                </span>
              </div>
              <div className="text-[14px] font-semibold leading-snug line-clamp-2">{c.defectDesc || c.title}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {c.customer} · <span className="font-mono">{c.partNo}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 우측 — 접수 폼 / 상세 / 미선택 요약 */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {mode === 'intake' && <CaseIntakeForm onCreated={onCreated} onCancel={() => setMode('idle')} />}
          {mode === 'detail' && detail && (
            <CaseDetail detail={detail} onReload={() => selectedId && void loadDetail(selectedId)} />
          )}
          {mode === 'idle' && <CaseSummary list={list} onPick={openCase} onIntake={() => setMode('intake')} />}
        </div>
      </div>
    </div>
  )
}

/** 미선택 요약(19번 공백 금지) — 진행 현황 + 회신 기한 임박 + 시작 안내. */
function CaseSummary({
  list,
  onPick,
  onIntake
}: {
  list: CaseListItem[]
  onPick: (id: number) => void
  onIntake: () => void
}): JSX.Element {
  // 캡션 약속("회신 요구일이 있는 건부터")대로 정렬 — 요구일 임박순, 없는 건 뒤로
  const open = [...list.filter((c) => c.status !== 'closed')].sort((a, b) =>
    (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99')
  )
  const closed = list.length - open.length
  const today = new Date().toLocaleDateString('sv-SE')
  return (
    <div className="grid gap-4">
      <CardShell title="불량 대응 현황" cap="접수 → 선별 → 8D → 개선대책서">
        <div className="px-[18px] pb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="text-[13px]">
            진행 <b className="text-[15px] tabular-nums text-warn-ink">{open.length}</b>건
          </div>
          <div className="text-[13px]">
            종결 <b className="text-[15px] tabular-nums text-ok-ink">{closed}</b>건
          </div>
          <button
            type="button"
            onClick={onIntake}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" /> 새 불량 접수
          </button>
        </div>
      </CardShell>

      <CardShell title="진행 중인 케이스" cap="회신 요구일이 있는 건부터 마감하세요">
        <div className="px-[18px] pb-4 grid gap-1.5">
          {open.length === 0 && (
            <div className="text-[13px] text-muted-foreground pb-2">진행 중인 불량 케이스가 없습니다 👍</div>
          )}
          {open.slice(0, 6).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left border border-border hover:bg-muted/50"
            >
              <span className="font-mono text-[11px] text-muted-foreground shrink-0">{c.caseNo}</span>
              <span className="flex-1 text-[13.5px] font-medium truncate">{c.defectDesc || c.title}</span>
              {c.dueDate && (
                <span
                  className={cn(
                    'text-[10.5px] font-bold rounded-full px-1.5 py-0.5 shrink-0',
                    c.dueDate < today ? 'bg-bad-tint text-bad-ink' : 'bg-warn-tint text-warn-ink'
                  )}
                >
                  회신 {c.dueDate.slice(5)}
                </span>
              )}
              <span className="text-[11.5px] text-muted-foreground shrink-0">{c.customer}</span>
            </button>
          ))}
        </div>
      </CardShell>
    </div>
  )
}
