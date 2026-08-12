import { useCallback, useEffect, useState } from 'react'
import { todayKST } from '@shared/date-kst'
import type { SemimesProdAggRowDto, SemimesProdRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 32호 1차분 ③ — 생산실적 (그림24 상세현황 + 그림25 일별/월별 탭 · SQ 1_4).
 * 원천 = prod_record(직접 기록). UPH 열은 표준 UPH 원천 없음 — 만들지 않는다(정직, 대조표 ③).
 * 33호 문법: 번호/LOT = 진한 강조 · 양품 = 파랑 · 불량 = 빨강 · 취소 행 = 흐림 + 배지.
 */

type Tab = 'detail' | 'daily' | 'monthly'
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'detail', label: '상세현황' },
  { key: 'daily', label: '일별 집계' },
  { key: 'monthly', label: '월별 집계' }
]

/** KST 기준 오늘±days (8/6 검수 M-날짜 규약 — toISOString 단독 절단 금지, todayKST 축) */
function ymdAdd(days: number): string {
  const base = new Date(`${todayKST()}T00:00:00+09:00`)
  return new Date(base.getTime() + days * 86400e3 + 9 * 3600e3).toISOString().slice(0, 10)
}

export function ProdHistoryView(): JSX.Element {
  const [tab, setTab] = useState<Tab>('detail')
  const [from, setFrom] = useState(ymdAdd(-6))
  const [to, setTo] = useState(ymdAdd(0))
  const [itemCode, setItemCode] = useState('')
  const [rows, setRows] = useState<SemimesProdRowDto[]>([])
  const [agg, setAgg] = useState<SemimesProdAggRowDto[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 8/11 검수 Minor: 탭 연타 시 늦은 응답이 다른 탭 화면에 앉는다 — seq 가드(공용 프레임)
  const seq = useSeqGuard()
  const load = useCallback(
    async (t: Tab = tab): Promise<void> => {
      const token = seq.begin()
      setBusy(true)
      setErr(null)
      try {
        const res = (await window.api.invoke(window.api.channels.SEMIMES_PROD_LIST, {
          from, to, itemCode: itemCode.trim() || undefined, mode: t
        })) as { rows: SemimesProdRowDto[]; agg: SemimesProdAggRowDto[] }
        if (!seq.isCurrent(token)) return
        setRows(res.rows)
        setAgg(res.agg)
      } catch {
        if (seq.isCurrent(token)) setErr('조회 실패 — 통신 오류. 다시 시도하세요.')
      } finally {
        if (seq.isCurrent(token)) setBusy(false)
      }
    },
    [from, to, itemCode, tab, seq]
  )

  useEffect(() => {
    void load(tab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const excel = (): void => {
    if (tab === 'detail') {
      downloadCsv(
        `생산실적_상세_${from}_${to}.csv`,
        ['실적일', '지시번호', '품번', '품명', 'LOT', '공정', '양품', '불량', '불량유형', '주야', '작업자', '취소'],
        rows.map((r) => [r.recordDate, r.orderNo, r.itemCode, r.itemName, r.lotNo, r.procCode, r.okQty, r.ngQty, r.defectCode, r.shift, r.worker, r.canceled ? '취소' : ''])
      )
    } else {
      downloadCsv(
        `생산실적_${tab === 'daily' ? '일별' : '월별'}_${from}_${to}.csv`,
        ['구간', '건수', '양품 합', '불량 합', '불량률(%)'],
        agg.map((a) => [a.bucket, a.rows, a.okSum, a.ngSum, a.okSum + a.ngSum > 0 ? ((a.ngSum / (a.okSum + a.ngSum)) * 100).toFixed(2) : '0'])
      )
    }
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">생산실적</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 1_4</span>
        <span className="text-[13px] text-muted-foreground">원천 = 직접 기록(prod_record) · 취소분 정직 표기 · UPH는 표준 원천 확보 전 미표기</span>
      </div>

      {/* 32호 §1-4 8버튼 툴바 + §1-5 조회조건 바 */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar onReset={() => { setItemCode(''); setFrom(ymdAdd(-6)); setTo(ymdAdd(0)) }} onSearch={() => void load(tab)} onExcel={excel} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          기간
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          ~
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="품번" className="h-8 w-[140px] px-2 rounded-lg border border-border bg-card text-[12px]" />
        </span>
      </div>

      <div className="flex items-center gap-1">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => setTab(t.key)}
            className={cn('px-3 py-1.5 rounded-t-lg text-[12.5px] font-bold border-b-2',
              tab === t.key ? 'border-mega-active text-mega-active bg-secondary/50' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {err && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{err}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        {tab === 'detail' ? (
          <table className="w-full text-[12.5px] border-collapse min-w-[900px]">
            <thead>
              <tr>{['실적일', '지시번호', '품번', '품명', 'LOT', '공정', '양품', '불량', '불량유형', '주야', '작업자'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.length === 0 && !busy && (
                <tr><td colSpan={11} className="py-8 text-center text-muted-foreground text-[13px]">기간 내 실적이 없습니다.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className={cn(r.canceled && 'opacity-45')}>
                  <td className={TD}>{r.recordDate}{r.canceled && <span className="ml-1.5 inline-block text-[10.5px] font-bold rounded px-1.5 bg-bad-tint text-bad-ink">취소</span>}</td>
                  <td className={cn(TD, 'font-bold text-mega-active')}>{r.orderNo ?? '—'}</td>
                  <td className={cn(TD, 'font-semibold')}>{r.itemCode}</td>
                  <td className={cn(TD, 'text-muted-foreground max-w-[200px] truncate')}>{r.itemName ?? ''}</td>
                  <td className={cn(TD, 'font-bold text-primary')}>{r.lotNo ?? '—'}</td>
                  <td className={TD}>{r.procCode ?? '—'}</td>
                  <td className={cn(TD, 'text-right tabular-nums font-bold text-ok-ink')}>{r.okQty.toLocaleString()}</td>
                  <td className={cn(TD, 'text-right tabular-nums font-bold', r.ngQty > 0 ? 'text-bad-ink' : 'text-muted-foreground')}>{r.ngQty.toLocaleString()}</td>
                  <td className={TD}>{r.defectCode ?? '—'}</td>
                  <td className={TD}>{r.shift ?? '—'}</td>
                  <td className={TD}>{r.worker ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
            <thead>
              <tr>{[tab === 'daily' ? '일자' : '월', '건수', '양품 합', '불량 합', '불량률'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {agg.length === 0 && !busy && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground text-[13px]">기간 내 실적이 없습니다.</td></tr>
              )}
              {agg.map((a) => {
                const total = a.okSum + a.ngSum
                const ngPct = total > 0 ? (a.ngSum / total) * 100 : 0
                return (
                  <tr key={a.bucket}>
                    <td className={cn(TD, 'font-bold text-mega-active')}>{a.bucket}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{a.rows.toLocaleString()}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-bold text-ok-ink')}>{a.okSum.toLocaleString()}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-bold', a.ngSum > 0 ? 'text-bad-ink' : 'text-muted-foreground')}>{a.ngSum.toLocaleString()}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-semibold', ngPct > 0 ? 'text-bad-ink' : 'text-muted-foreground')}>{ngPct.toFixed(2)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
