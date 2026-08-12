import { useState } from 'react'
import type { SemimesItemSearchRowDto, SemimesXbarRDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useDebouncedCallback, useSeqGuard } from '../../lib/asyncGuard'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #8 X BAR R 관리도 (정본 그림37 · 골격).
 * 서브그룹 = 검사기록 1건(같은 항목 시료 2~10 — n<2 군은 제외·정직 카운트).
 * 관리한계 = 군 크기 최빈값으로 통일 계산(A2·D3·D4 — n 혼합 시 섞지 않는다).
 * 데이터가 모자라면 차트를 그리지 않는다(가짜 한계선 금지) — Cpk 스파이크 이식은 후속 검토.
 */

export function XbarRView(): JSX.Element {
  const [itemCode, setItemCode] = useState('')
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [inspItem, setInspItem] = useState('')
  const [data, setData] = useState<SemimesXbarRDto | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const seq = useSeqGuard()
  async function load(item: string = inspItem): Promise<void> {
    if (!itemCode.trim()) {
      setMsg('품번을 입력하세요.')
      return
    }
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_XBAR_R, {
        itemCode: itemCode.trim(), inspItem: item || undefined
      })) as SemimesXbarRDto
      if (!seq.isCurrent(token)) return
      setData(res)
      if (res.inspItem) setInspItem(res.inspItem)
      if (res.items.length === 0) setMsg('이 품번의 측정값 기록이 없습니다 — 검사 등록(시료 2개 이상)이 쌓이면 표시됩니다.')
    } catch {
      if (seq.isCurrent(token)) setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }

  const searchItems = useDebouncedCallback((q: string): void => {
    if (q.trim().length < 2) return
    void (async () => {
      try {
        setSuggest((await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, { query: q.trim(), limit: 20 })) as SemimesItemSearchRowDto[])
      } catch {
        /* 제안 실패 — 직접 입력 유지 */
      }
    })()
  })

  const pts = data?.points ?? []
  const lim = data?.limits ?? null

  // 차트 좌표 (xbar 상 · R 하 — 그림37 2단 문법)
  const W = 640
  const H = 130
  const PAD = 34
  const chart = (vals: number[], cl: number | null, ucl: number | null, lcl: number | null): { y: (v: number) => number; min: number; max: number } => {
    const all = [...vals, ...(cl != null ? [cl] : []), ...(ucl != null ? [ucl] : []), ...(lcl != null ? [lcl] : [])]
    const min = Math.min(...all)
    const max = Math.max(...all)
    const span = max - min || 1
    return { y: (v: number) => H - PAD / 2 - (H - PAD) * ((v - min) / span), min, max }
  }
  const x = (i: number): number => PAD + ((W - PAD * 1.5) * i) / Math.max(pts.length - 1, 1)

  const renderChart = (kind: 'xbar' | 'r'): JSX.Element | null => {
    if (pts.length === 0) return null
    const vals = pts.map((p) => (kind === 'xbar' ? p.xbar : p.r))
    const c = chart(vals, kind === 'xbar' ? lim?.xbarCl ?? null : lim?.rCl ?? null, kind === 'xbar' ? lim?.xbarUcl ?? null : lim?.rUcl ?? null, kind === 'xbar' ? lim?.xbarLcl ?? null : lim?.rLcl ?? null)
    const [cl, ucl, lcl] = kind === 'xbar' ? [lim?.xbarCl, lim?.xbarUcl, lim?.xbarLcl] : [lim?.rCl, lim?.rUcl, lim?.rLcl]
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[780px]" role="img" aria-label={kind === 'xbar' ? 'X bar 관리도' : 'R 관리도'}>
        {ucl != null && <line x1={PAD} x2={W - PAD / 2} y1={c.y(ucl)} y2={c.y(ucl)} stroke="currentColor" className="text-bad-ink/70" strokeDasharray="5 4" strokeWidth="1.1" />}
        {lcl != null && <line x1={PAD} x2={W - PAD / 2} y1={c.y(lcl)} y2={c.y(lcl)} stroke="currentColor" className="text-bad-ink/70" strokeDasharray="5 4" strokeWidth="1.1" />}
        {cl != null && <line x1={PAD} x2={W - PAD / 2} y1={c.y(cl)} y2={c.y(cl)} stroke="currentColor" className="text-muted-foreground" strokeDasharray="2 3" strokeWidth="1" />}
        <polyline
          points={pts.map((p, i) => `${x(i).toFixed(1)},${c.y(kind === 'xbar' ? p.xbar : p.r).toFixed(1)}`).join(' ')}
          fill="none" stroke="currentColor" className="text-mega-active" strokeWidth="2" strokeLinejoin="round"
        />
        {pts.map((p, i) => {
          const v = kind === 'xbar' ? p.xbar : p.r
          const out = (ucl != null && v > ucl) || (lcl != null && v < lcl)
          return (
            <g key={p.recordId}>
              {out ? (
                <polygon points={`${x(i)},${c.y(v) - 4.4} ${x(i) - 4.2},${c.y(v) + 3.2} ${x(i) + 4.2},${c.y(v) + 3.2}`} className="fill-bad-ink" fill="currentColor">
                  <title>{`${p.inspDate} #${p.recordId} — 관리한계 이탈`}</title>
                </polygon>
              ) : (
                <circle cx={x(i)} cy={c.y(v)} r="3" className="fill-mega-active" fill="currentColor" />
              )}
            </g>
          )
        })}
        {ucl != null && <text x={W - PAD / 2 + 2} y={c.y(ucl) + 3} className="text-[9px] fill-current text-bad-ink">UCL</text>}
        {cl != null && <text x={W - PAD / 2 + 2} y={c.y(cl) + 3} className="text-[9px] fill-current text-muted-foreground">CL</text>}
        {lcl != null && <text x={W - PAD / 2 + 2} y={c.y(lcl) + 3} className="text-[9px] fill-current text-bad-ink">LCL</text>}
      </svg>
    )
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">X BAR R 관리도</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 4_x</span>
        <span className="text-[13px] text-muted-foreground">서브그룹 = 검사기록 1건(시료 2~10) · 군 부족 시 차트 없음(가짜 한계선 금지)</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setItemCode(''); setInspItem(''); setData(null); setMsg(null) }}
          onSearch={() => void load()}
          onExcel={pts.length > 0 ? () => downloadCsv(`XbarR_${itemCode.trim()}_${inspItem}.csv`, ['검사일', '기록#', 'n', 'X bar', 'R'], pts.map((p) => [p.inspDate, p.recordId, p.n, p.xbar, p.r])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 ml-auto">
          <input
            list="xbar-items"
            value={itemCode}
            onChange={(e) => { setItemCode(e.target.value); searchItems(e.target.value) }}
            onKeyDown={(e) => { if (e.key === 'Enter') void load() }}
            placeholder="품번 (마스터 검색)"
            className="h-8 w-[190px] px-2 rounded-lg border border-border bg-card text-[12px]"
          />
          <datalist id="xbar-items">{suggest.map((s) => <option key={s.itemCode} value={s.itemCode}>{s.itemName ?? ''}</option>)}</datalist>
          <select value={inspItem} onChange={(e) => { setInspItem(e.target.value); void load(e.target.value) }} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            <option value="">검사항목 (조회 후 선택)</option>
            {(data?.items ?? []).map((it) => <option key={it} value={it}>{it}</option>)}
          </select>
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{msg}</div>}

      {data && data.inspItem && (
        <>
          <div className="flex items-center gap-2 flex-wrap text-[12.5px] font-semibold">
            <span className="px-2.5 py-1 rounded-lg bg-secondary text-secondary-foreground">군 {pts.length}개{lim ? ` · n=${lim.n}` : ''}</span>
            {lim && <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground tabular-nums">X̄ CL {lim.xbarCl} · UCL {lim.xbarUcl} · LCL {lim.xbarLcl}</span>}
            {data.skippedSmall > 0 && <span className="px-2.5 py-1 rounded-lg bg-warn-tint text-warn-ink">시료 1개 기록 {data.skippedSmall}건 제외(군 성립 불가 — 정직)</span>}
          </div>

          {pts.length === 0 ? (
            <p className="text-[12.5px] text-muted-foreground py-4">시료 2개 이상 기록이 아직 없습니다 — 검사 등록에서 같은 항목 시료를 2개 이상 기록하면 군이 성립합니다.</p>
          ) : (
            <>
              <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
                <div className="text-[13px] font-bold mb-1">X̄ 관리도 {!lim && <span className="text-[11.5px] font-semibold text-warn-ink">— 군 2개 미만: 관리한계 미계산(가짜 한계선 금지)</span>}</div>
                <div className="overflow-x-auto">{renderChart('xbar')}</div>
              </div>
              <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
                <div className="text-[13px] font-bold mb-1">R 관리도</div>
                <div className="overflow-x-auto">{renderChart('r')}</div>
              </div>
              <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[520px]">
                  <thead><tr>{['검사일', '기록#', 'n', 'X̄', 'R', '판정'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
                  <tbody>
                    {pts.map((p) => {
                      const out = lim != null && (p.xbar > lim.xbarUcl || p.xbar < lim.xbarLcl || p.r > lim.rUcl)
                      return (
                        <tr key={p.recordId} className={cn(out && 'bg-bad-tint/30')}>
                          <td className={cn(TD, 'tabular-nums')}>{p.inspDate}</td>
                          <td className={cn(TD, 'tabular-nums text-muted-foreground')}>#{p.recordId}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{p.n}</td>
                          <td className={cn(TD, 'text-right tabular-nums font-bold')}>{p.xbar}</td>
                          <td className={cn(TD, 'text-right tabular-nums')}>{p.r}</td>
                          <td className={cn(TD, 'font-bold', out ? 'text-bad-ink' : 'text-ok-ink')}>{lim == null ? '—' : out ? '▲ 이탈' : '관리'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
