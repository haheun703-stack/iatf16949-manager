import { useCallback, useEffect, useState } from 'react'
import { todayKST, ymdAddKST } from '@shared/date-kst'
import type { SemimesEquipCheckDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { useUIStore } from '../../stores/uiStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #10 설비일상점검내역 (정본 그림48 · 전면).
 * 원천 2축 병렬(정직 구분): MES = mac_daily(점검 항목·점검자·확인 항목 수 — 덤프 기준) ·
 * 앱 = L1100-07 작성 기록(양식 직행 링크). SQ 3_1 · 점검자/확인 2단 열 = mac_daily 실측 열 그대로.
 * 확인율 = confirmed/items (원천 값 — 재해석 없음).
 */

export function EquipCheckHistoryView(): JSX.Element {
  const { setPage, setSelectedFormCode } = useUIStore()
  const today = todayKST()
  const [from, setFrom] = useState(ymdAddKST(today, -13))
  const [to, setTo] = useState(today)
  const [data, setData] = useState<SemimesEquipCheckDto | null>(null)
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
      const res = (await window.api.invoke(window.api.channels.SEMIMES_EQUIP_CHECK_LIST, { from, to })) as SemimesEquipCheckDto
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

  const openForm = (): void => {
    setSelectedFormCode('L1100-07')
    setPage('form-builder')
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'
  const dateCls = 'h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">설비 일상점검 내역</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 3_1</span>
        <span className="text-[13px] text-muted-foreground">원천 2축 병렬 — MES(mac_daily · 덤프 기준) + 앱 작성(L1100-07) · 재해석 없음</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setFrom(ymdAddKST(today, -13)); setTo(today) }}
          onSearch={() => void load()}
          onAdd={openForm}
          onExcel={data && data.mes.length > 0 ? () => downloadCsv(`설비일상점검_${from}_${to}.csv`, ['일자', '라인', '점검 항목', '점검자 수', '확인 항목'], data.mes.map((m) => [m.ymd, m.lineNo, m.items, m.checkers, m.confirmedItems])) : undefined}
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

      {/* 앱 작성 축 — 실시간 원천(오늘 기록은 여기부터) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-[14px] font-extrabold">앱 작성 기록 (L1100-07 — 실시간)</h2>
          <button type="button" onClick={openForm} className="ml-auto h-8 px-3 rounded-lg bg-mega-active text-white text-[12px] font-bold">오늘 점검표 작성 →</button>
        </div>
        {(data?.app ?? []).length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground py-2">기간 내 앱 작성 기록 없음 — [추가] 또는 위 버튼으로 점검표를 작성하세요.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {(data?.app ?? []).map((a) => (
              <button key={a.id} type="button" onClick={openForm} className="py-2 flex items-center gap-3 text-left text-[13px] hover:bg-muted/40 rounded">
                <b className="tabular-nums">{a.ymd}</b>
                <span className="text-muted-foreground">설비 일상 점검표 #{a.id}</span>
                <span className="ml-auto text-muted-foreground">{a.createdBy ?? '작성자 미기록'}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MES 축 — 덤프 기준(정직 구분) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <div className="px-3 pt-3 text-[14px] font-extrabold">MES 기록 (mac_daily — 덤프 기준{data && !data.mesAvailable ? ' · 원천 없음' : ''})</div>
        {data && !data.mesAvailable ? (
          <p className="text-[12.5px] text-muted-foreground px-3 py-4">MES 사이드카가 이 설치에 없습니다 — 앱 작성 축만 표시(정직 축소).</p>
        ) : (
          <table className="w-full text-[12.5px] border-collapse min-w-[640px]">
            <thead><tr>{['일자', '라인', '점검 항목', '점검자 수', '확인 항목', '확인율'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {(data?.mes ?? []).length === 0 && <tr><td colSpan={6} className="py-6 text-center text-muted-foreground text-[12.5px]">기간 내 MES 점검 기록 없음(덤프 범위 확인 — 7/30 이후는 미반입 구간)</td></tr>}
              {(data?.mes ?? []).map((m, i) => {
                const rate = m.items > 0 ? Math.round((m.confirmedItems / m.items) * 100) : null
                return (
                  <tr key={i}>
                    <td className={cn(TD, 'tabular-nums font-semibold')}>{m.ymd}</td>
                    <td className={cn(TD, 'font-bold text-mega-active')}>{m.lineNo ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{m.items}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{m.checkers}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{m.confirmedItems}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-bold', rate == null ? 'text-muted-foreground' : rate >= 100 ? 'text-ok-ink' : 'text-warn-ink')}>
                      {rate == null ? '—' : `${rate}%`}
                    </td>
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
