import { useCallback, useEffect, useState } from 'react'
import { todayKST, ymdAddKST } from '@shared/date-kst'
import type { SemimesReceiptRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 2차분 배치⑴ — 자재입하/입고내역조회 (32호 대조표 #6 · 정본 그림17).
 * 원천 = 수집함 태깅 결과(mat_receipt — 사진 1:N 수불). 편집 없음(정정 = 수집함 취소+재등록).
 * SQ 2_1·2_2 심기 + 수입검사 연결(T4) 안내. 취소 행 흐림+배지 정직 표기.
 */

const CLASSES = ['원자재', '외주재입고']

// P2″(슬러지): 화면별 ymdAdd 복제 → 공용 ymdAddKST 치환
const ymdAdd = (days: number): string => ymdAddKST(todayKST(), days)

export function MatReceiptsView(): JSX.Element {
  const { setPage } = useUIStore()
  const [from, setFrom] = useState(ymdAdd(-13))
  const [to, setTo] = useState(ymdAdd(0))
  const [itemCode, setItemCode] = useState('')
  const [klass, setKlass] = useState('')
  const [rows, setRows] = useState<SemimesReceiptRowDto[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setBusy(true)
    setErr(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_RECEIPT_LIST, {
        from, to, itemCode: itemCode.trim() || undefined, receiptClass: klass || undefined
      })) as SemimesReceiptRowDto[]
      setRows(res)
    } catch {
      setErr('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }, [from, to, itemCode, klass])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const excel = (): void => {
    downloadCsv(
      `자재입고내역_${from}_${to}.csv`,
      ['입고일', '구분', '품번', '품명', '거래처', '수량', '업체LOT', '사내LOT', '전표', '태깅자', '취소'],
      rows.map((r) => [r.receiptDate, r.receiptClass, r.itemCode, r.itemName, r.partnerName ?? r.partnerCode, r.qty, r.vendorLot, r.internalLot, r.captureId ? `#${r.captureId}` : '', r.createdBy, r.canceled ? '취소' : ''])
    )
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">자재입하 / 입고내역 조회</h1>
        {['2_1', '2_2'].map((s) => (
          <span key={s} className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ {s}</span>
        ))}
        <span className="text-[13px] text-muted-foreground">원천 = 수집함 태깅(사진 1:N 수불) · 정정 = 취소+재등록 · 입고분은 T4가 수입검사 도래를 자동 발행</span>
        <button type="button" className="text-[12px] font-bold text-primary underline underline-offset-2" onClick={() => setPage('receipt-inbox')}>
          수집함으로 ↗
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setItemCode(''); setKlass(''); setFrom(ymdAdd(-13)); setTo(ymdAdd(0)) }}
          onSearch={() => void load()}
          onExcel={excel}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <select value={klass} onChange={(e) => setKlass(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            <option value="">전체 구분</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          기간
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          ~
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px]" />
          <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="품번" className="h-8 w-[140px] px-2 rounded-lg border border-border bg-card text-[12px]" />
          <span>{rows.length}행</span>
        </span>
      </div>

      {err && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{err}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[920px]">
          <thead>
            <tr>{['입고일', '구분', '품번', '품명', '거래처', '수량', '업체LOT', '사내LOT', '전표', '태깅자'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-[13px]">기간 내 입고 수불이 없습니다 — 수집함에서 전표 사진을 태깅하면 여기에 쌓입니다.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={cn(r.canceled && 'opacity-45')}>
                <td className={TD}>{r.receiptDate}{r.canceled && <span className="ml-1.5 inline-block text-[10.5px] font-bold rounded px-1.5 bg-bad-tint text-bad-ink">취소</span>}</td>
                <td className={TD}>
                  <span className={cn('inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold', r.receiptClass === '원자재' ? 'bg-secondary text-secondary-foreground' : 'bg-iatf-tint text-iatf-ink')}>
                    {r.receiptClass ?? '—'}
                  </span>
                </td>
                <td className={cn(TD, 'font-semibold')}>{r.itemCode}</td>
                <td className={cn(TD, 'text-muted-foreground max-w-[200px] truncate')}>{r.itemName ?? ''}</td>
                <td className={TD}>{r.partnerName ?? r.partnerCode ?? '—'}</td>
                <td className={cn(TD, 'text-right tabular-nums font-bold')}>{r.qty.toLocaleString()}</td>
                <td className={cn(TD, 'font-bold text-primary')}>{r.vendorLot ?? '—'}</td>
                <td className={cn(TD, 'font-bold text-mega-active')}>{r.internalLot ?? '—'}</td>
                <td className={TD}>{r.captureId ? <span className="text-[11.5px] font-bold text-muted-foreground">사진 #{r.captureId}</span> : '—'}</td>
                <td className={TD}>{r.createdBy ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
