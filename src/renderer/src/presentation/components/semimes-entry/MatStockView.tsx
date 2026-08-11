import { useCallback, useEffect, useState } from 'react'
import type { SemimesMatStockRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 32호 1차분 ⑥ — 재고현황(자재) (그림18~20).
 * 잔량 = 입고(mat_receipt, 취소 제외) − 투입(mat_input) 실계산 — 추정 기입 없음.
 * 부호 착색(8/4 확정 문법): 잔량 음수 = 빨강(부족·기록 결손 신호) · 양수 = 파랑.
 * 안전재고 기준은 마스터 미보유 — '미등록' 정직 표기(대조표 ⑥), 기준 등록 UI는 후속.
 */

export function MatStockView(): JSX.Element {
  const [itemCode, setItemCode] = useState('')
  const [rows, setRows] = useState<SemimesMatStockRowDto[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setBusy(true)
    setErr(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_MAT_STOCK, {
        itemCode: itemCode.trim() || undefined
      })) as SemimesMatStockRowDto[]
      setRows(res)
    } catch {
      setErr('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }, [itemCode])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const excel = (): void => {
    downloadCsv(
      '재고현황_자재.csv',
      ['품번', '품명', '유형', '입고 합', '투입 합', '잔량', '최근 입고일', '안전재고'],
      rows.map((r) => [r.itemCode, r.itemName, r.itemType, r.receiptSum, r.inputSum, r.balance, r.lastReceiptDate, '미등록'])
    )
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">재고현황 (자재)</h1>
        <span className="text-[13px] text-muted-foreground">잔량 = 입고 − 투입 실계산 · 취소 수불 제외 · 안전재고 기준은 미등록 정직 표기</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar onReset={() => setItemCode('')} onSearch={() => void load()} onExcel={excel} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input value={itemCode} onChange={(e) => setItemCode(e.target.value)} placeholder="품번" className="h-8 w-[160px] px-2 rounded-lg border border-border bg-card text-[12px]" />
          <span>{rows.length}품목</span>
        </span>
      </div>

      {err && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{err}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
          <thead>
            <tr>{['품번', '품명', '유형', '입고 합', '투입 합', '잔량', '최근 입고일', '안전재고'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-[13px]">수불 이력이 있는 자재가 없습니다 — 수집함 태깅·투입 기록이 원천입니다.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.itemCode}>
                <td className={cn(TD, 'font-bold text-mega-active')}>{r.itemCode}</td>
                <td className={cn(TD, 'text-muted-foreground max-w-[220px] truncate')}>{r.itemName ?? ''}</td>
                <td className={TD}>{r.itemType ?? '—'}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{r.receiptSum.toLocaleString()}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{r.inputSum.toLocaleString()}</td>
                <td className={cn(TD, 'text-right tabular-nums font-extrabold', r.balance < 0 ? 'text-bad-ink' : 'text-primary')}>
                  {r.balance.toLocaleString()}
                </td>
                <td className={cn(TD, 'text-muted-foreground')}>{r.lastReceiptDate ?? '—'}</td>
                <td className={TD}>
                  <span className="inline-block text-[10.5px] font-bold rounded px-1.5 py-[1px] bg-muted text-muted-foreground">미등록</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
