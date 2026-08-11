import { useState } from 'react'
import type { SemimesBomExplodeRowDto, SemimesItemSearchRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑵ — #3 BOM조회 정전개/역전개 (정본 그림14 · 조회 전용).
 * 정전개 = 이 품번이 무엇으로 만들어지나(하위 전개) · 역전개 = 이 품번이 어디에 쓰이나(상위 전개 — 신규 UI).
 * 원천 = bom_edge(활성 간선만 · 깊이 10 순환 방어). 편집 없음 — BOM 정정은 갱신 파이프라인이 정본.
 */

export function BomBrowseView(): JSX.Element {
  const [itemCode, setItemCode] = useState('')
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [direction, setDirection] = useState<'down' | 'up'>('down')
  const [rows, setRows] = useState<SemimesBomExplodeRowDto[]>([])
  const [queried, setQueried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function load(dir: 'down' | 'up' = direction): Promise<void> {
    if (!itemCode.trim()) {
      setMsg('품번을 입력하세요.')
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_BOM_EXPLODE, {
        itemCode: itemCode.trim(), direction: dir
      })) as SemimesBomExplodeRowDto[]
      setRows(res)
      setQueried(true)
    } catch {
      setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  const searchItems = async (q: string): Promise<void> => {
    if (q.trim().length < 2) return
    try {
      setSuggest((await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, { query: q.trim(), limit: 20 })) as SemimesItemSearchRowDto[])
    } catch {
      /* 제안 실패 — 직접 입력 유지 */
    }
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">BOM 조회 (정전개 / 역전개)</h1>
        <span className="text-[13px] text-muted-foreground">활성 간선만 · 깊이 10 · 조회 전용 — BOM 정정은 갱신 파이프라인(대사 리포트)이 정본</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setItemCode(''); setRows([]); setQueried(false) }}
          onSearch={() => void load()}
          onExcel={rows.length > 0 ? () => downloadCsv(`BOM_${direction === 'down' ? '정전개' : '역전개'}_${itemCode.trim()}.csv`, ['레벨', '모품번', '자품번', '품명', '유형', '소요량'], rows.map((r) => [r.level, r.parentCode, r.childCode, r.childName, r.childType, r.qty])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input
            list="bom-items"
            value={itemCode}
            onChange={(e) => {
              setItemCode(e.target.value)
              void searchItems(e.target.value)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') void load() }}
            placeholder="품번 (마스터 검색)"
            className="h-8 w-[200px] px-2 rounded-lg border border-border bg-card text-[12px]"
          />
          <datalist id="bom-items">
            {suggest.map((s) => <option key={s.itemCode} value={s.itemCode}>{s.itemName ?? ''}</option>)}
          </datalist>
          {(['down', 'up'] as const).map((d) => (
            <button key={d} type="button"
              onClick={() => { setDirection(d); if (itemCode.trim()) void load(d) }}
              className={cn('px-3 py-1.5 rounded-lg text-[12px] font-bold border',
                direction === d ? 'bg-mega-active text-white border-mega-active' : 'border-border text-muted-foreground hover:bg-muted')}>
              {d === 'down' ? '정전개 (하위)' : '역전개 (어디에 쓰이나)'}
            </button>
          ))}
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{msg}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
          <thead>
            <tr>{['레벨', direction === 'down' ? '모품번' : '사용처(상위)', direction === 'down' ? '자품번' : '기준 품번', '품명', '유형', '소요량'].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && queried && !busy && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-[13px]">{direction === 'down' ? '하위 구성이 없습니다 — 최말단(원자재) 품번이거나 BOM 미등록.' : '사용처가 없습니다 — 최상위(완제품) 품번이거나 BOM 미등록.'}</td></tr>
            )}
            {rows.length === 0 && !queried && !busy && (
              <tr><td colSpan={6} className="py-8 text-center text-muted-foreground text-[13px]">품번을 조회하세요 — 정전개는 하위 구성, 역전개는 사용처를 전개합니다.</td></tr>
            )}
            {rows.map((r, i) => {
              return (
                <tr key={`${r.parentCode}|${r.childCode}|${i}`}>
                  <td className={cn(TD, 'font-bold text-mega-active')}>
                    <span style={{ paddingLeft: `${(r.level - 1) * 14}px` }}>{'└'.repeat(r.level > 1 ? 1 : 0)} L{r.level}</span>
                  </td>
                  <td className={cn(TD, 'font-semibold', direction === 'up' && 'text-primary font-bold')}>{r.parentCode}</td>
                  <td className={cn(TD, 'font-semibold', direction === 'down' && 'text-primary font-bold')}>{r.childCode}</td>
                  <td className={cn(TD, 'text-muted-foreground max-w-[220px] truncate')}>{r.childName ?? '—'}</td>
                  <td className={TD}>{r.childType ?? '—'}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{r.qty ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
