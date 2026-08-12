import { useCallback, useEffect, useState } from 'react'
import { todayKST } from '@shared/date-kst'
import type { CompanyProfile, SemimesProdAggRowDto, SemimesProdRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { MesToolbar } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #17 문서형 리포트 (정본 그림17 · 골격 — 일일 실적현황 1종 우선).
 * 결재란(담당/검토/승인 — 서명은 종이 몫) + 회사명 헤더 + 인쇄 CSS. **판매금액 열 제외(돈 경계)**.
 * 원천 = prodList(detail — 취소 행은 정직 표기 후 합산 제외). 월별 생산판매(그림18)는 후속.
 */

export function DailyReportView(): JSX.Element {
  const today = todayKST()
  const [ymd, setYmd] = useState(today)
  const [rows, setRows] = useState<SemimesProdRowDto[]>([])
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (d: string = ymd): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PROD_LIST, { from: d, to: d, mode: 'detail' })) as { rows: SemimesProdRowDto[]; agg: SemimesProdAggRowDto[] }
      if (!seq.isCurrent(token)) return
      setRows(res.rows)
    } catch {
      if (seq.isCurrent(token)) setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [ymd, seq])

  useEffect(() => {
    void load(ymd)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ymd])

  useEffect(() => {
    void (async () => {
      try {
        setProfile((await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile)
      } catch {
        /* 프로필 미구성 — 헤더 공란 정직 */
      }
    })()
  }, [])

  const live = rows.filter((r) => !r.canceled)
  const okSum = live.reduce((s, r) => s + r.okQty, 0)
  const ngSum = live.reduce((s, r) => s + r.ngQty, 0)
  // 품번별 소계(보고서 본문)
  const byItem = new Map<string, { itemName: string | null; ok: number; ng: number; lots: number }>()
  for (const r of live) {
    const e = byItem.get(r.itemCode) ?? { itemName: r.itemName, ok: 0, ng: 0, lots: 0 }
    e.ok += r.okQty
    e.ng += r.ngQty
    e.lots += 1
    byItem.set(r.itemCode, e)
  }

  const TH = 'border border-foreground/60 px-2 py-1.5 text-[12px] font-bold bg-secondary/40 text-center'
  const TD = 'border border-foreground/40 px-2 py-1 text-[12px]'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap print:hidden">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">일일 실적현황 (문서형)</h1>
        <span className="text-[13px] text-muted-foreground">결재란 인쇄 서식 · 판매금액 열 제외(돈 경계) · 월별 생산판매(그림18)는 후속</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap print:hidden">
        <MesToolbar onSearch={() => void load()} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input type="date" value={ymd} onChange={(e) => setYmd(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold" />
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink print:hidden">{msg}</div>}

      {/* ══ 인쇄 지면 (A4 문법 — 화면에서도 동일 지면 미리보기) ══ */}
      <div className="bg-white text-black rounded-[6px] border border-border shadow-card p-6 max-w-[860px] print:border-0 print:shadow-none print:p-0">
        {/* 헤더: 제목 + 결재란 */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[22px] font-extrabold tracking-[0.3em]">일 일 실 적 현 황</h2>
            <p className="text-[12px] mt-1">
              {profile?.companyName || ''} {profile?.factoryName ? `· ${profile.factoryName}` : ''} · 실적일 <b className="tabular-nums">{ymd}</b>
            </p>
          </div>
          <table className="border-collapse shrink-0">
            <tbody>
              <tr>
                <td rowSpan={2} className="border border-foreground/60 px-1 py-1 text-[10px] font-bold [writing-mode:vertical-rl]">결재</td>
                {['담당', '검토', '승인'].map((h) => <td key={h} className="border border-foreground/60 px-4 py-0.5 text-[11px] font-bold text-center">{h}</td>)}
              </tr>
              <tr>
                {['담당', '검토', '승인'].map((h) => <td key={h} className="border border-foreground/60 h-[52px] min-w-[64px]" />)}
              </tr>
            </tbody>
          </table>
        </div>

        {/* 요약 줄 */}
        <p className="text-[12.5px] mt-3 mb-2">
          생산 <b className="tabular-nums">{live.length}</b>건 · 양품 <b className="tabular-nums">{okSum.toLocaleString()}</b> ·
          불량 <b className="tabular-nums">{ngSum.toLocaleString()}</b>
          {okSum + ngSum > 0 ? <> · 불량률 <b className="tabular-nums">{((ngSum / (okSum + ngSum)) * 100).toFixed(2)}%</b></> : null}
          {rows.some((r) => r.canceled) && <span className="text-[11px]"> · 취소 {rows.filter((r) => r.canceled).length}건(합산 제외·하단 명세)</span>}
        </p>

        {/* 품번별 소계 */}
        <table className="w-full border-collapse mb-3">
          <thead><tr>{['품번', '품명', '기록 건', '양품', '불량', '불량률(%)'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {byItem.size === 0 && <tr><td colSpan={6} className={cn(TD, 'text-center py-4')}>당일 실적 없음</td></tr>}
            {Array.from(byItem.entries()).map(([code, e]) => (
              <tr key={code}>
                <td className={cn(TD, 'font-bold')}>{code}</td>
                <td className={TD}>{e.itemName ?? ''}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{e.lots}</td>
                <td className={cn(TD, 'text-right tabular-nums font-bold')}>{e.ok.toLocaleString()}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{e.ng.toLocaleString()}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{e.ok + e.ng > 0 ? ((e.ng / (e.ok + e.ng)) * 100).toFixed(2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 상세 명세 (취소 행 = 흐림 + 표기 — 숨기지 않는다) */}
        <table className="w-full border-collapse">
          <thead><tr>{['LOT', '공정', '양품', '불량', '불량유형', '주야', '작업자', '비고'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={8} className={cn(TD, 'text-center py-4')}>당일 기록 없음</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className={cn(r.canceled && 'opacity-50')}>
                <td className={cn(TD, 'font-semibold')}>{r.lotNo ?? '—'}</td>
                <td className={TD}>{r.procCode ?? '—'}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{r.okQty.toLocaleString()}</td>
                <td className={cn(TD, 'text-right tabular-nums')}>{r.ngQty.toLocaleString()}</td>
                <td className={TD}>{r.defectCode ?? ''}</td>
                <td className={TD}>{r.shift ?? ''}</td>
                <td className={TD}>{r.worker ?? ''}</td>
                <td className={cn(TD, 'text-[11px]')}>{r.canceled ? '취소(합산 제외)' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[10.5px] mt-2 text-black/60">
          원천 = 데일리Q 생산실적(prod_record · 취소 제외 합산 · 취소 행 정직 병기) · 판매금액 열 없음(돈 경계) · 출력일 {today}
        </p>
      </div>
    </div>
  )
}
