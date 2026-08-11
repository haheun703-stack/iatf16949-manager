import { useEffect, useState } from 'react'
import type { SemimesCodeGroupDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑵ — #4 코드관리 (정본 그림3~5 · **골격만** — 대조표 명기).
 * 무른모의 대분류/소분류 2단 코드 스키마는 미보유(3차 §2) — 기존 코드성 마스터(불량유형·공정 등)를
 * 2단 조회 골격에 정직 표출한다. 편집·신설은 코드 2단 스키마 확보 후(대조표 그대로 — 추정 구현 금지).
 */

export function CodeMasterView(): JSX.Element {
  const [groups, setGroups] = useState<SemimesCodeGroupDto[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    setBusy(true)
    setErr(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_CODE_GROUPS)) as SemimesCodeGroupDto[]
      setGroups(res)
      if (!sel && res.length > 0) setSel(res[0].key)
    } catch {
      setErr('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const cur = groups.find((g) => g.key === sel) ?? null
  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-1.5 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">코드관리</h1>
        <span className="inline-block text-[10.5px] font-bold rounded px-1.5 py-[1px] bg-warn-tint text-warn-ink">골격만</span>
        <span className="text-[13px] text-muted-foreground">대분류/소분류 2단 코드 스키마 미보유 — 기존 코드성 마스터 조회 표출 · 편집·신설은 스키마 확보 후(대조표 #4)</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onExcel={cur && cur.codes.length > 0 ? () => downloadCsv(`코드_${cur.label}.csv`, ['코드', '명칭', '활성'], cur.codes.map((c) => [c.code, c.name, c.active])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
      </div>

      {err && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{err}</div>}

      <div className="grid md:grid-cols-[280px_1fr] gap-3">
        {/* 좌 — 코드분류(2단 골격의 1단) */}
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-hidden">
          <div className="px-3 py-2 text-[12px] font-bold text-secondary-foreground bg-secondary/60">코드분류</div>
          {groups.map((g) => (
            <button key={g.key} type="button" onClick={() => setSel(g.key)}
              className={cn('w-full text-left px-3 py-2.5 border-b border-border/50 last:border-b-0 transition-colors',
                sel === g.key ? 'bg-secondary/50 font-extrabold text-mega-active' : 'hover:bg-muted/60')}>
              <span className="block text-[13px]">{g.label}</span>
              <span className="block text-[11px] text-muted-foreground">{g.note} · {g.codes.length}건</span>
            </button>
          ))}
        </div>
        {/* 우 — 코드 목록(2단) */}
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['코드', '명칭', '활성'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {(!cur || cur.codes.length === 0) && !busy && (
                <tr><td colSpan={3} className="py-8 text-center text-muted-foreground text-[13px]">코드가 없습니다.</td></tr>
              )}
              {cur?.codes.map((c) => (
                <tr key={c.code} className={cn(c.active !== 1 && 'opacity-45')}>
                  <td className={cn(TD, 'font-bold text-mega-active')}>{c.code}</td>
                  <td className={TD}>{c.name ?? '—'}</td>
                  <td className={cn(TD, 'font-bold', c.active === 1 ? 'text-ok-ink' : 'text-muted-foreground')}>{c.active === 1 ? '활성' : '비활성'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
