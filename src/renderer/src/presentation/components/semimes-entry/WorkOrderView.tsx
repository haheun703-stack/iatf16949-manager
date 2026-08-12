import { useCallback, useEffect, useRef, useState } from 'react'
import type { SemimesItemSearchRowDto, SemimesWorkOrderRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSingleFlight } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * PC — 작업지시관리 (사무실 그리드 · 관리자 문법). 지시 = 실적의 경량 앵커(15번 §2 —
 * 수주·납기 최적화 확장 금지). 발번 WO-YYMMDD-nn. 상태 전이·수량 갱신 허용(기록 5종과 구분).
 * 32호 1차분 ① — 8버튼 툴바 이식 + 지시대비실적 탭(그림26 — okSum 대비 달성률·부호 착색).
 */
const STATUSES = ['대기', '진행', '완료', '취소'] as const
type Tab = 'list' | 'progress'

export function WorkOrderView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name

  const [tab, setTab] = useState<Tab>('list')
  const [rows, setRows] = useState<SemimesWorkOrderRowDto[]>([])
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newItem, setNewItem] = useState('')
  const [newQty, setNewQty] = useState('')
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [statusBusy, setStatusBusy] = useState<number | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  // 8/11 검수 MA-8: catch 없음 = 통신 오류 무통지(빈 그리드를 "지시 없음"으로 오안내).
  // seq 토큰 동반 — 상태 필터 연타 시 늦은 응답이 뒤늦게 앉는 것 폐기(KpiGrid 선례).
  const loadSeq = useRef(0)
  const load = useCallback(async (): Promise<void> => {
    const seq = ++loadSeq.current
    setLoading(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_LIST, {
        status: statusFilter || undefined
      })) as SemimesWorkOrderRowDto[]
      if (seq !== loadSeq.current) return
      setRows(res)
    } catch {
      if (seq === loadSeq.current) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      if (seq === loadSeq.current) setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  // 8/12 재봉합 예방 확장: WO 발번도 LOT 와 같은 기전(state 가드 = 재렌더 전 더블클릭 미차단)
  const addFlight = useSingleFlight()
  const statusFlight = useSingleFlight()
  async function addOrder(): Promise<void> {
    if (saving) return // M-8: 연타 = 지시 이중 발번 — 진행 중 재진입 차단(표시용, 관문은 addFlight)
    setSaving(true)
    setMsg(null)
    try {
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
    } catch {
      setMsg({ tone: 'bad', text: '등록 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  // 8/11 검수 MA-9: catch·연타 가드 없음 + '취소' 전이가 오클릭 1회로 성립하던 자리.
  async function setStatus(id: number, status: string): Promise<void> {
    if (statusBusy !== null) return // 연타/교차 클릭 차단(전이 1건씩)
    if (status === '취소') {
      const row = rows.find((r) => r.id === id)
      const ok = await confirmDialog({
        title: '작업지시를 취소 처리할까요?',
        body: `${row?.orderNo ?? `#${id}`} — 취소된 지시는 진척 집계에서 제외됩니다. 되돌리려면 상태를 다시 바꿔야 합니다.`,
        okLabel: '취소 처리',
        cancelLabel: '그만두기',
        danger: true
      })
      if (!ok) return
    }
    setStatusBusy(id)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_UPSERT, { id, status })) as {
        success: boolean
        error?: string
      }
      if (!res.success) setMsg({ tone: 'bad', text: res.error ?? '상태 변경 실패' })
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '상태 변경 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setStatusBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">작업지시관리</h1>
        <span className="text-[13px] text-muted-foreground">실적의 앵커 — 발번 WO-YYMMDD-nn · 진척 = 연결 실적 양품 합(취소 제외)</span>
      </div>

      {/* 32호 §1-4 8버튼 툴바 (전 화면 고정 — 미지원 흐림) */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onAdd={tab === 'list' ? () => setAdding((v) => !v) : undefined}
          onExcel={() =>
            downloadCsv(
              '작업지시.csv',
              ['지시번호', '품번', '품명', '수량', '진척(양품)', '달성률(%)', '시작', '상태', '작성'],
              rows.map((r) => [r.orderNo, r.itemCode, r.itemName, r.orderQty, r.okSum, r.orderQty ? ((r.okSum / r.orderQty) * 100).toFixed(1) : '', r.startDate, r.status, r.createdBy])
            )
          }
          onPrint={() => window.print()}
          busy={loading}
        />
        <span className="flex items-center gap-1.5 ml-auto">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            <option value="">전체 상태</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span className="text-[12px] text-muted-foreground">{rows.length}건</span>
        </span>
      </div>

      {/* 그림26 — 지시대비실적 탭 (같은 원천, 관점 전환) */}
      <div className="flex items-center gap-1">
        {([['list', '지시 목록'], ['progress', '지시대비실적']] as Array<[Tab, string]>).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('px-3 py-1.5 rounded-t-lg text-[12.5px] font-bold border-b-2',
              tab === k ? 'border-mega-active text-mega-active bg-secondary/50' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* 8/11 검수 Minor: [추가] 는 목록 탭 전용 — 지시대비실적 탭으로 넘어가면 폼도 함께 닫는다 */}
      {adding && tab === 'list' && (
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
          <button type="button" onClick={() => void addFlight(addOrder)} disabled={saving} className="h-10 px-5 rounded-lg bg-primary text-white text-[13.5px] font-bold disabled:opacity-50">
            {saving ? '발번 중…' : '발번·등록'}
          </button>
        </div>
      )}

      {tab === 'progress' && (
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
            <thead>
              <tr>
                {['지시번호', '품번', '품명', '지시수량', '실적(양품)', '달성률', '상태'].map((h) => (
                  <th key={h} className="text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-[13px]">작업지시가 없습니다.</td></tr>
              )}
              {rows.map((r) => {
                const pct = r.orderQty ? (r.okSum / r.orderQty) * 100 : null
                return (
                  <tr key={r.id} className={cn(r.status === '취소' && 'opacity-50')}>
                    <td className="py-2 px-3 font-bold text-mega-active whitespace-nowrap border-b border-border/60">{r.orderNo}</td>
                    <td className="py-2 px-3 font-semibold whitespace-nowrap border-b border-border/60">{r.itemCode}</td>
                    <td className="py-2 px-3 text-muted-foreground border-b border-border/60 max-w-[220px] truncate">{r.itemName ?? ''}</td>
                    <td className="py-2 px-3 text-right tabular-nums border-b border-border/60">{r.orderQty?.toLocaleString() ?? '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-bold border-b border-border/60">{r.okSum.toLocaleString()}</td>
                    <td className="py-2 px-3 border-b border-border/60 min-w-[160px]">
                      {pct == null ? (
                        <span className="text-muted-foreground">지시수량 없음</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <span className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <span className={cn('block h-full rounded-full', pct >= 100 ? 'bg-primary' : 'bg-bad-ink/70')} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </span>
                          <span className={cn('tabular-nums font-extrabold text-[12px]', pct >= 100 ? 'text-primary' : 'text-bad-ink')}>{pct.toFixed(1)}%</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 border-b border-border/60">{r.status}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'list' && (
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
                    <button
                      key={s}
                      type="button"
                      onClick={() => void statusFlight(() => setStatus(r.id, s))}
                      disabled={statusBusy !== null}
                      className="mr-1 px-2 py-0.5 rounded-md border border-border text-[11.5px] font-semibold text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
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
      )}
    </div>
  )
}
