import { useCallback, useEffect, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import type { SemimesItemSearchRowDto, SemimesWorkOrderRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'

/**
 * PC — 작업지시관리 (사무실 그리드 · 관리자 문법). 지시 = 실적의 경량 앵커(15번 §2 —
 * 수주·납기 최적화 확장 금지). 발번 WO-YYMMDD-nn. 상태 전이·수량 갱신 허용(기록 5종과 구분).
 */
const STATUSES = ['대기', '진행', '완료', '취소'] as const

export function WorkOrderView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name

  const [rows, setRows] = useState<SemimesWorkOrderRowDto[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_LIST, {
        status: statusFilter || undefined
      })) as SemimesWorkOrderRowDto[]
      setRows(res)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function addOrder(): Promise<void> {
    setMsg(null)
    const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_UPSERT, {
      itemCode: newItem.trim(),
      orderQty: newQty.trim() === '' ? null : Number(newQty),
      createdBy: userName
    })) as { success: boolean; orderNo?: string; error?: string }
    if (!res.success) {
      setMsg({ tone: 'bad', text: res.error ?? '등록 실패' })
      return
    }
    setMsg({ tone: 'ok', text: `작업지시 발번 — ${res.orderNo}` })
    setAdding(false)
    setNewItem('')
    setNewQty('')
    await load()
  }

  async function setStatus(id: number, status: string): Promise<void> {
    const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_UPSERT, { id, status })) as {
      success: boolean
      error?: string
    }
    if (!res.success) setMsg({ tone: 'bad', text: res.error ?? '상태 변경 실패' })
    await load()
  }

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">작업지시관리</h1>
        <span className="text-[13px] text-muted-foreground">실적의 앵커 — 발번 WO-YYMMDD-nn · 진척 = 연결 실적 양품 합(취소 제외)</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-1.5 flex-wrap">
        <button type="button" onClick={() => void load()} disabled={loading} className="px-3 py-1.5 rounded-lg border border-primary/40 bg-secondary text-secondary-foreground text-[12px] font-bold flex items-center gap-1">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> 조회
        </button>
        <button type="button" onClick={() => setAdding((v) => !v)} className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-bold flex items-center gap-1 hover:bg-muted">
          <Plus className="w-3 h-3" /> 추가
        </button>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
          <option value="">전체 상태</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <span className="ml-auto text-[12px] text-muted-foreground">{rows.length}건</span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-border bg-card shadow-card p-3 flex items-end gap-2 flex-wrap">
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground flex-1 min-w-[220px]">
            품번 (마스터 검색)
            <input
              list="wo-items"
              value={newItem}
              onChange={(e) => {
                setNewItem(e.target.value)
                const q = e.target.value.trim()
                if (q.length >= 2) {
                  void (async () => {
                    try {
                      setSuggest(
                        (await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, { query: q, limit: 20 })) as SemimesItemSearchRowDto[]
                      )
                    } catch {
                      /* 무시 */
                    }
                  })()
                }
              }}
              className="h-10 px-3 rounded-lg border border-border bg-card text-[13.5px]"
            />
            <datalist id="wo-items">
              {suggest.map((s) => (
                <option key={s.itemCode} value={s.itemCode}>{s.itemName ?? ''}</option>
              ))}
            </datalist>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground w-[140px]">
            지시 수량
            <input value={newQty} onChange={(e) => setNewQty(e.target.value)} inputMode="numeric" className="h-10 px-3 rounded-lg border border-border bg-card text-[13.5px] text-center tabular-nums" />
          </label>
          <button type="button" onClick={() => void addOrder()} className="h-10 px-5 rounded-lg bg-primary text-white text-[13.5px] font-bold">
            발번·등록
          </button>
        </div>
      )}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[860px]">
          <thead>
            <tr>
              {['지시번호', '품번', '품명', '수량', '진척(양품)', '시작', '상태', '상태 변경', '작성'].map((h) => (
                <th key={h} className="text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-muted-foreground text-[13px]">작업지시가 없습니다 — [추가]로 발번하세요.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={cn(r.status === '취소' && 'opacity-50')}>
                <td className="py-2 px-3 font-bold whitespace-nowrap border-b border-border/60">{r.orderNo}</td>
                <td className="py-2 px-3 font-semibold whitespace-nowrap border-b border-border/60">{r.itemCode}</td>
                <td className="py-2 px-3 text-muted-foreground border-b border-border/60 max-w-[220px] truncate">{r.itemName ?? ''}</td>
                <td className="py-2 px-3 text-right tabular-nums border-b border-border/60">{r.orderQty?.toLocaleString() ?? '—'}</td>
                <td className="py-2 px-3 text-right tabular-nums font-bold border-b border-border/60">
                  {r.okSum.toLocaleString()}
                  {r.orderQty ? <small className="text-muted-foreground font-medium"> / {r.orderQty.toLocaleString()}</small> : null}
                </td>
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap border-b border-border/60">{r.startDate ?? '—'}</td>
                <td className="py-2 px-3 border-b border-border/60">
                  <span className={cn(
                    'inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold',
                    r.status === '진행' ? 'bg-ok-tint text-ok-ink' : r.status === '완료' ? 'bg-secondary text-secondary-foreground' : r.status === '취소' ? 'bg-bad-tint text-bad-ink' : 'bg-muted text-muted-foreground'
                  )}>
                    {r.status}
                  </span>
                </td>
                <td className="py-2 px-3 border-b border-border/60 whitespace-nowrap">
                  {STATUSES.filter((s) => s !== r.status).map((s) => (
                    <button key={s} type="button" onClick={() => void setStatus(r.id, s)} className="mr-1 px-2 py-0.5 rounded-md border border-border text-[11.5px] font-semibold text-muted-foreground hover:bg-muted">
                      {s}
                    </button>
                  ))}
                </td>
                <td className="py-2 px-3 text-muted-foreground whitespace-nowrap border-b border-border/60">{r.createdBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
