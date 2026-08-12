import { useCallback, useEffect, useState } from 'react'
import { todayKST, ymdAddKST } from '@shared/date-kst'
import type { SemimesProdChartDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑶ — #12 생산현황 차트 (정본 그림61 · 골격 — 생산수량 축 우선).
 * UPH·가동률 축은 표준 UPH/가동시간 원천 없음 — 만들지 않는다(정직, 대조표 #12).
 * 일별 스택 바(양품 파랑·불량 빨강 — 색+위치 2중) + 품번별 표. 조업일수 = 달력 등록분만(0139).
 */

export function ProdChartView(): JSX.Element {
  const today = todayKST()
  const [from, setFrom] = useState(ymdAddKST(today, -29))
  const [to, setTo] = useState(today)
  const [data, setData] = useState<SemimesProdChartDto | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (): Promise<void> => {
    if (!from || !to || from > to) {
      setMsg('기간을 확인하세요 — 시작일이 종료일보다 늦습니다.')
      return
    }
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PROD_CHART, { from, to })) as SemimesProdChartDto
      if (!seq.isCurrent(token)) return
      setData(res)
    } catch {
      if (seq.isCurrent(token)) setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [from, to, seq])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const days = data?.days ?? []
  const maxDay = Math.max(...days.map((d) => d.ok + d.ng), 1)
  const totOk = days.reduce((s, d) => s + d.ok, 0)
  const totNg = days.reduce((s, d) => s + d.ng, 0)

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'
  const dateCls = 'h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">생산현황 차트</h1>
        <span className="text-[13px] text-muted-foreground">
          생산수량 축(취소 제외) · UPH/가동률 축은 표준 원천 확보 전 미표기 — 정직
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setFrom(ymdAddKST(today, -29)); setTo(today) }}
          onSearch={() => void load()}
          onExcel={days.length > 0 ? () => downloadCsv(`생산현황_${from}_${to}.csv`, ['일자', '양품', '불량', '품목수'], days.map((d) => [d.ymd, d.ok, d.ng, d.items])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={dateCls} />
          ~
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={dateCls} />
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{msg}</div>}

      {/* 요약 타일 — 조업일수는 달력 등록분만(미등록 = 정직 표기) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '기간 양품 합', value: totOk.toLocaleString(), tone: 'text-mega-active' },
          { label: '기간 불량 합', value: totNg.toLocaleString(), tone: totNg > 0 ? 'text-bad-ink' : 'text-muted-foreground' },
          { label: '기록 일수', value: `${days.length}일`, tone: 'text-foreground' },
          {
            label: '조업일수 (달력)',
            value: data?.calendarWorkDays != null ? `${data.calendarWorkDays}일` : '미등록',
            tone: data?.calendarWorkDays != null ? 'text-foreground' : 'text-warn-ink',
            sub: data?.calendarWorkDays != null ? '0139 등록분' : '조업달력에 등록하면 표시'
          }
        ].map((t) => (
          <div key={t.label} className="rounded-2xl border border-border bg-card shadow-card px-4 py-3">
            <span className="block text-[11.5px] font-bold text-muted-foreground">{t.label}</span>
            <b className={cn('block text-[22px] tabular-nums tracking-[-0.02em]', t.tone)}>{t.value}</b>
            {t.sub && <span className="block text-[11px] text-muted-foreground">{t.sub}</span>}
          </div>
        ))}
      </div>

      {/* 일별 스택 바 — 양품(아래·파랑) + 불량(위·빨강): 색+위치 2중 표기 */}
      <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
        <div className="text-[13px] font-bold mb-2">일별 생산수량 <span className="text-[11.5px] font-semibold text-muted-foreground">— 아래 = 양품 · 위 = 불량</span></div>
        {days.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground py-6 text-center">기간 내 실적이 없습니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-[3px] h-[150px] min-w-[480px] pr-2">
              {days.map((d) => {
                const hOk = Math.round((d.ok / maxDay) * 130)
                const hNg = Math.round((d.ng / maxDay) * 130)
                return (
                  <div key={d.ymd} className="flex flex-col items-center justify-end flex-1 min-w-[14px] h-full" title={`${d.ymd} — 양품 ${d.ok.toLocaleString()} · 불량 ${d.ng.toLocaleString()} · 품목 ${d.items}`}>
                    {d.ng > 0 && <span className="w-full bg-bad-ink/70 rounded-t-sm" style={{ height: `${Math.max(hNg, 2)}px` }} />}
                    <span className={cn('w-full bg-mega-active/80', d.ng > 0 ? '' : 'rounded-t-sm')} style={{ height: `${Math.max(hOk, 2)}px` }} />
                    <span className="text-[9px] text-muted-foreground tabular-nums mt-0.5">{d.ymd.slice(8)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 품번별 표 (기간 합산 상위 30) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
          <thead><tr>{['품번', '품명', '양품', '불량', '불량률(%)'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {(data?.byItem ?? []).length === 0 && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-[12.5px]">실적 없음</td></tr>}
            {(data?.byItem ?? []).map((r) => {
              const tot = r.ok + r.ng
              return (
                <tr key={r.itemCode}>
                  <td className={cn(TD, 'font-bold text-mega-active')}>{r.itemCode}</td>
                  <td className={cn(TD, 'text-muted-foreground max-w-[220px] truncate')}>{r.itemName ?? ''}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{r.ok.toLocaleString()}</td>
                  <td className={cn(TD, 'text-right tabular-nums', r.ng > 0 ? 'font-bold text-bad-ink' : 'text-muted-foreground')}>{r.ng.toLocaleString()}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{tot > 0 ? ((r.ng / tot) * 100).toFixed(2) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
