import { useState } from 'react'
import { Search, Save, Ticket } from 'lucide-react'
import type { SemimesScanContextDto, SemimesTodayRecordsDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { useUIStore } from '../../stores/uiStore'

/**
 * PC — 생산실적 등록 (현장 문법 2버튼). 불량 있으면 불량유형 필수(0101 계약).
 * LOT 자체발번 = 품번-YYMMDD-차수(§8-⑦ 도장). 저장 후 "자주검사 초·중·종" 바로가기
 * (3차 노트 — 실적과 검사의 교차). append-only — 정정은 사유 취소 + 재입력.
 */
export function ProdEntryView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const setPage = useUIStore((s) => s.setPage)

  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState<SemimesScanContextDto | null>(null)
  const [lotNo, setLotNo] = useState('')
  const [procCode, setProcCode] = useState('')
  const [okQty, setOkQty] = useState('')
  const [ngQty, setNgQty] = useState('0')
  const [defectCode, setDefectCode] = useState('')
  const [shift, setShift] = useState<'주간' | '야간'>('주간')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState<SemimesTodayRecordsDto | null>(null)
  const [cancelFor, setCancelFor] = useState<{ id: number; reason: string } | null>(null)

  const inputCls = 'h-11 px-3 rounded-lg border border-border bg-card text-[14px]'

  async function lookup(): Promise<void> {
    setMsg(null)
    const res = (await window.api.invoke(window.api.channels.SEMIMES_SCAN_RESOLVE, { query })) as SemimesScanContextDto
    setCtx(res)
    if (!res.found) {
      setMsg({ tone: 'bad', text: '품번/LOT을 찾지 못했습니다 — 품목 마스터 실존 코드만 기록됩니다.' })
      return
    }
    if (res.matchedLot) setLotNo(res.matchedLot)
    setProcCode(res.routing[0]?.procCode ?? '')
    await refreshToday()
  }

  async function refreshToday(): Promise<void> {
    try {
      setToday((await window.api.invoke(window.api.channels.SEMIMES_TODAY_RECORDS, {})) as SemimesTodayRecordsDto)
    } catch {
      /* 무시 */
    }
  }

  async function issueLot(): Promise<void> {
    if (!ctx?.itemCode) return
    const res = (await window.api.invoke(window.api.channels.SEMIMES_LOT_ISSUE, {
      itemCode: ctx.itemCode, createdBy: userName
    })) as { success: boolean; lotNo?: string; error?: string }
    if (res.success && res.lotNo) {
      setLotNo(res.lotNo)
      setMsg({ tone: 'ok', text: `LOT 발번 — ${res.lotNo} (품번-YYMMDD-차수)` })
    } else {
      setMsg({ tone: 'bad', text: res.error ?? '발번 실패' })
    }
  }

  async function save(): Promise<void> {
    if (!ctx?.itemCode) return
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PROD_CREATE, {
        recordDate: new Date().toISOString().slice(0, 10),
        itemCode: ctx.itemCode,
        lotNo: lotNo || null,
        procCode: procCode || null,
        okQty: Number(okQty),
        ngQty: Number(ngQty || 0),
        defectCode: defectCode || null,
        shift,
        worker: userName
      })) as { success: boolean; id?: number; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `실적 저장 #${res.id} — 이어서 자주검사 초·중·종을 기록하세요(아래 버튼).` })
      setOkQty('')
      setNgQty('0')
      setDefectCode('')
      await refreshToday()
    } finally {
      setBusy(false)
    }
  }

  async function cancelRec(): Promise<void> {
    if (!cancelFor) return
    const res = (await window.api.invoke(window.api.channels.SEMIMES_RECORD_CANCEL, {
      kind: 'prod', id: cancelFor.id, reason: cancelFor.reason, canceledBy: userName
    })) as { success: boolean; error?: string }
    setMsg(res.success ? { tone: 'ok', text: `취소 마크 완료 — #${cancelFor.id}` } : { tone: 'bad', text: res.error ?? '취소 실패' })
    setCancelFor(null)
    await refreshToday()
  }

  return (
    <div className="flex flex-col gap-4 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">생산실적 등록</h1>
        <span className="text-[13px] text-muted-foreground">양품/불량·작업자·LOT — 불량이 있으면 불량유형 필수 · 초·중·종 검사와 교차</span>
      </div>

      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void lookup()}
          placeholder="품번 또는 LOT 번호 (스캔/입력)"
          className={cn(inputCls, 'flex-1 min-w-0')}
        />
        <button type="button" onClick={() => void lookup()} className="h-11 px-6 rounded-lg bg-primary text-white text-[15px] font-extrabold flex items-center gap-2 shrink-0">
          <Search className="w-4 h-4" /> 조회
        </button>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[13px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {ctx?.found && (
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4 flex flex-col gap-3.5">
          <div className="flex items-center gap-3 flex-wrap text-[13.5px]">
            <b className="text-[15px]">{ctx.itemCode}</b>
            <span className="text-muted-foreground">{ctx.itemName ?? ''} · {ctx.itemType}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              LOT
              <span className="flex gap-1.5">
                <input list="prod-lots" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="선택 또는 발번" className={cn(inputCls, 'flex-1 min-w-0')} />
                <button type="button" onClick={() => void issueLot()} title="자체발번 품번-YYMMDD-차수" className="h-11 px-3 rounded-lg border border-primary/40 bg-secondary text-secondary-foreground text-[13px] font-bold flex items-center gap-1 shrink-0">
                  <Ticket className="w-3.5 h-3.5" /> 발번
                </button>
              </span>
              <datalist id="prod-lots">
                {ctx.recentLots.map((l) => (
                  <option key={l.lotNo} value={l.lotNo}>{l.lotDate}</option>
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              공정
              <select value={procCode} onChange={(e) => setProcCode(e.target.value)} className={inputCls}>
                <option value="">선택 안 함</option>
                {ctx.routing.map((r) => (
                  <option key={r.seq} value={r.procCode}>{r.procName ?? r.procCode}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              양품 수량
              <input value={okQty} onChange={(e) => setOkQty(e.target.value)} inputMode="numeric" placeholder="정수" className={cn(inputCls, 'text-center font-bold tabular-nums bg-fillable/70')} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              불량 수량
              <input value={ngQty} onChange={(e) => setNgQty(e.target.value)} inputMode="numeric" className={cn(inputCls, 'text-center font-bold tabular-nums bg-fillable/70')} />
            </label>
            {Number(ngQty) > 0 && (
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground col-span-2">
                불량유형 (불량 있으면 필수)
                <select value={defectCode} onChange={(e) => setDefectCode(e.target.value)} className={inputCls}>
                  <option value="">선택</option>
                  {ctx.defects.map((d) => (
                    <option key={d.code} value={d.code}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              주/야
              <div className="flex gap-1">
                {(['주간', '야간'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setShift(s)} className={cn('h-11 flex-1 rounded-lg border text-[14px] font-bold', shift === s ? 'bg-secondary text-secondary-foreground border-primary/40' : 'border-border hover:bg-muted')}>
                    {s}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button type="button" disabled={busy} onClick={() => void save()} className="h-11 px-7 rounded-lg bg-primary text-white text-[15px] font-extrabold flex items-center gap-2 disabled:opacity-50">
              <Save className="w-4 h-4" /> 저장
            </button>
            <button type="button" onClick={() => setPage('insp-entry')} className="h-11 px-4 rounded-lg border border-border text-[13.5px] font-bold hover:bg-muted">
              자주검사 초·중·종 기록 →
            </button>
            <span className="text-[12px] text-muted-foreground">기록 주체 = {userName ?? '(사용자 미선택)'} · append-only</span>
          </div>
        </div>
      )}

      {today && today.prod.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
          <h2 className="text-[14px] font-extrabold mb-2">오늘 생산실적 ({today.ymd})</h2>
          <div className="flex flex-col divide-y divide-border/60">
            {today.prod.map((r) => (
              <div key={r.id} className={cn('py-2 flex items-center gap-2.5 flex-wrap text-[13px]', r.canceled && 'opacity-50 line-through')}>
                <b>#{r.id}</b>
                <span className="font-semibold">{r.itemCode}</span>
                {r.lotNo && <span className="text-muted-foreground">{r.lotNo}</span>}
                <span className="text-ok-ink font-bold">양품 {r.okQty}</span>
                {r.ngQty > 0 && <span className="text-bad-ink font-bold">불량 {r.ngQty}</span>}
                <span className="text-muted-foreground">{r.worker ?? '무기명'}</span>
                {!r.canceled && (
                  <button type="button" onClick={() => setCancelFor({ id: r.id, reason: '' })} className="ml-auto h-8 px-2.5 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground hover:bg-bad-tint hover:text-bad-ink">
                    취소
                  </button>
                )}
                {cancelFor?.id === r.id && (
                  <span className="w-full flex gap-2 pt-1">
                    <input
                      value={cancelFor.reason}
                      onChange={(e) => setCancelFor({ id: r.id, reason: e.target.value })}
                      placeholder="취소 사유(필수)"
                      className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]"
                    />
                    <button type="button" onClick={() => void cancelRec()} className="h-9 px-3 rounded-lg bg-bad-tint text-bad-ink text-[12.5px] font-bold">취소 확정</button>
                    <button type="button" onClick={() => setCancelFor(null)} className="h-9 px-3 rounded-lg border border-border text-[12.5px]">닫기</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
