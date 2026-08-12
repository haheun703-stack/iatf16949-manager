import { Fragment, useEffect, useState } from 'react'
import type { SemimesTraceBandDto, SemimesWorkOrderRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { useUIStore } from '../../stores/uiStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑶ — #16 추적 공정 흐름 밴드 (정본 그림26·27 · 전면).
 * 지시수량 → 공정별 수량 열산 밴드 + 공정별 LOT 그리드. SQ 5_1 · IATF 8.5.2.
 * 판매수량 열 = 수주/판매 원천 부재 — 만들지 않는다(15번 §2 확장 금지·돈 경계, 화면 명기).
 * 라우팅 밖 공정 기록(offRoute)·공정 미지정 기록은 숨기지 않는다(정직).
 * 자재 LOT 계보(역방향 소급)는 기존 'LOT 계보 조회'(mes-trace)가 담당 — 상단 바로가기.
 */

export function TraceBandView(): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const [orderNo, setOrderNo] = useState('')
  const [orders, setOrders] = useState<SemimesWorkOrderRowDto[]>([])
  const [band, setBand] = useState<SemimesTraceBandDto | null>(null)
  const [openProc, setOpenProc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 지시번호 제안 — 최근 지시 목록(콤보 원천)
  useEffect(() => {
    void (async () => {
      try {
        setOrders((await window.api.invoke(window.api.channels.SEMIMES_WORK_ORDER_LIST, { limit: 100 })) as SemimesWorkOrderRowDto[])
      } catch {
        /* 제안 실패 — 직접 입력 유지 */
      }
    })()
  }, [])

  const seq = useSeqGuard()
  async function load(no: string = orderNo): Promise<void> {
    const q = no.trim()
    if (!q) {
      setMsg('지시번호를 입력하세요 (WO-YYMMDD-nn).')
      return
    }
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_TRACE_BAND, { orderNo: q })) as SemimesTraceBandDto
      if (!seq.isCurrent(token)) return
      setBand(res)
      setOpenProc(null)
      if (!res.found) setMsg(`지시(${q})를 찾지 못했습니다 — 작업지시관리에서 번호를 확인하세요.`)
    } catch {
      if (seq.isCurrent(token)) setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }

  const procs = band?.found ? band.procs ?? [] : []
  const offRoute = band?.found ? band.offRoute ?? [] : []
  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">추적 공정 흐름</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 5_1</span>
        <span className="text-[13px] text-muted-foreground">
          지시수량 → 공정별 수량 열산(취소 제외) · 판매수량 열 = 원천 부재로 미표기(돈 경계) ·
          자재 LOT 소급은 <button type="button" onClick={() => setPage('mes-trace')} className="underline underline-offset-2 font-bold text-primary">LOT 계보 조회</button>
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setOrderNo(''); setBand(null); setMsg(null) }}
          onSearch={() => void load()}
          onExcel={procs.length > 0 ? () => downloadCsv(
            `추적흐름_${band?.orderNo ?? ''}.csv`,
            ['순번', '공정', '공정명', '양품', '불량', '기록', 'LOT 수'],
            procs.map((p) => [p.seq, p.procCode, p.procName, p.ok, p.ng, p.hasRecords ? '있음' : '없음', p.lots.length])
          ) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 ml-auto">
          <input
            list="trace-orders"
            value={orderNo}
            onChange={(e) => setOrderNo(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void load() }}
            placeholder="지시번호 (WO-YYMMDD-nn)"
            className="h-8 w-[210px] px-2 rounded-lg border border-border bg-card text-[12px]"
          />
          <datalist id="trace-orders">
            {orders.map((o) => <option key={o.id} value={o.orderNo}>{o.itemCode} · {o.status}</option>)}
          </datalist>
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{msg}</div>}

      {band?.found && (
        <>
          {/* 지시 헤더 */}
          <div className="rounded-[14px] border border-border bg-card shadow-card px-4 py-3 flex items-center gap-3 flex-wrap text-[13.5px]">
            <b className="text-[15px] text-mega-active">{band.orderNo}</b>
            <span className="font-semibold">{band.itemCode}</span>
            <span className="text-muted-foreground">{band.itemName ?? ''}</span>
            <span className={cn('inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold',
              band.status === '진행' ? 'bg-ok-tint text-ok-ink' : band.status === '완료' ? 'bg-secondary text-secondary-foreground' : band.status === '취소' ? 'bg-bad-tint text-bad-ink' : 'bg-muted text-muted-foreground')}>
              {band.status}
            </span>
            <span className="ml-auto text-[12.5px] text-muted-foreground">지시수량 <b className="text-foreground tabular-nums text-[14px]">{band.orderQty?.toLocaleString() ?? '—'}</b></span>
          </div>

          {/* 열산 밴드 (그림26 문법 — 지시 → 공정 순 흐름) */}
          <div className="rounded-[14px] border border-border bg-card shadow-card p-4 overflow-x-auto">
            <div className="flex items-stretch gap-1.5 min-w-max">
              <div className="rounded-xl border-2 border-mega-active bg-secondary/40 px-3.5 py-2.5 flex flex-col justify-center min-w-[110px]">
                <span className="text-[11px] font-bold text-muted-foreground">작업지시</span>
                <b className="text-[18px] tabular-nums text-mega-active">{band.orderQty?.toLocaleString() ?? '—'}</b>
              </div>
              {procs.map((p) => {
                const short = band.orderQty != null && p.hasRecords && p.ok < band.orderQty
                return (
                  <Fragment key={p.procCode}>
                    <span className="self-center text-muted-foreground font-bold" aria-hidden="true">→</span>
                    <button
                      type="button"
                      onClick={() => setOpenProc(openProc === p.procCode ? null : p.procCode)}
                      className={cn(
                        'rounded-xl border px-3.5 py-2.5 flex flex-col justify-center min-w-[110px] text-left transition-colors',
                        openProc === p.procCode ? 'border-mega-active ring-1 ring-mega-active' : 'border-border hover:bg-muted/50',
                        !p.hasRecords && 'opacity-55'
                      )}
                      title={p.hasRecords ? 'LOT 그리드 펼치기' : '이 공정 기록 없음'}
                    >
                      <span className="text-[11px] font-bold text-muted-foreground">{p.seq}. {p.procName ?? p.procCode}</span>
                      {p.hasRecords ? (
                        <>
                          <b className={cn('text-[18px] tabular-nums', short ? 'text-warn-ink' : 'text-foreground')}>{p.ok.toLocaleString()}</b>
                          <span className="text-[10.5px] tabular-nums">
                            {p.ng > 0 ? <b className="text-bad-ink">불량 {p.ng.toLocaleString()}</b> : <span className="text-muted-foreground">불량 0</span>}
                            <span className="text-muted-foreground"> · LOT {p.lots.length}</span>
                          </span>
                        </>
                      ) : (
                        <b className="text-[13px] text-muted-foreground">기록 없음</b>
                      )}
                    </button>
                  </Fragment>
                )
              })}
              {procs.length === 0 && <span className="self-center text-[12.5px] text-muted-foreground px-2">이 품번의 활성 라우팅이 없습니다 — 기준정보(품번 트리)에서 라우팅을 확인하세요.</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">공정 카드 클릭 = 공정별 LOT 그리드 · 지시수량 미달 = 주황(진행 중일 수 있음 — 판정 아님)</p>
          </div>

          {/* 라우팅 밖 기록 — 숨기지 않는다 */}
          {offRoute.length > 0 && (
            <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-warn-tint text-warn-ink">
              ⚠ 라우팅 밖 공정 기록: {offRoute.map((o) => `${o.procCode}(양품 ${o.ok.toLocaleString()}${o.ng > 0 ? `·불량 ${o.ng.toLocaleString()}` : ''})`).join(' · ')} —
              공정 선택 오기입이거나 라우팅 미등재입니다(정비 대상).
            </div>
          )}

          {/* 공정별 LOT 그리드 (그림27) */}
          {openProc && (() => {
            const p = procs.find((x) => x.procCode === openProc)
            if (!p) return null
            return (
              <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
                <div className="px-3 pt-3 text-[13px] font-bold">{p.seq}. {p.procName ?? p.procCode} — LOT {p.lots.length}건</div>
                <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
                  <thead><tr>{['실적일', 'LOT', '양품', '불량', '작업자', '상태'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {p.lots.map((l, i) => (
                      <tr key={i} className={cn(l.canceled && 'opacity-50')}>
                        <td className={cn(TD, 'text-muted-foreground')}>{l.recordDate}</td>
                        <td className={cn(TD, 'font-bold text-primary')}>{l.lotNo ?? '—'}</td>
                        <td className={cn(TD, 'text-right tabular-nums font-bold')}>{l.ok.toLocaleString()}</td>
                        <td className={cn(TD, 'text-right tabular-nums', l.ng > 0 ? 'font-bold text-bad-ink' : 'text-muted-foreground')}>{l.ng.toLocaleString()}</td>
                        <td className={TD}>{l.worker ?? '—'}</td>
                        <td className={TD}>{l.canceled ? <span className="inline-block px-1.5 py-0.5 rounded bg-bad-tint text-bad-ink text-[10.5px] font-bold">취소</span> : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </>
      )}
    </div>
  )
}
