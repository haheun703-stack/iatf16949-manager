import { useCallback, useEffect, useMemo, useState } from 'react'
import { ShieldCheck, RefreshCw } from 'lucide-react'
import type { SqReadinessDto, SqSignal } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { SqItemDetail } from './SqItemDetail'

const SIGNAL_BG: Record<SqSignal, string> = {
  green: 'bg-success',
  yellow: 'bg-warning',
  red: 'bg-destructive',
  gray: 'bg-muted-foreground/40'
}
const SIGNAL_TEXT: Record<SqSignal, string> = {
  green: 'text-success',
  yellow: 'text-warning',
  red: 'text-destructive',
  gray: 'text-muted-foreground'
}
const SIGNAL_LABEL: Record<SqSignal, string> = { green: '충족', yellow: '진행', red: '미충족', gray: '미해당' }

function Dot({ signal, className }: { signal: SqSignal; className?: string }): JSX.Element {
  return <span className={cn('inline-block rounded-full shrink-0', SIGNAL_BG[signal], className)} />
}

/**
 * SQ 준비도 — 삼보(HKMC) SQ 평가 Ver4 백본(6대·42항목)을 forms.reg_code 로 연결해
 * 항목별 신호등으로 "지금 심사 받으면 되나?"를 보여준다. 항목 클릭 → 우측 상세.
 */
export function SqReadinessPage(): JSX.Element {
  const [data, setData] = useState<SqReadinessDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.invoke(window.api.channels.SQ_READINESS)
      setData(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = useMemo(() => {
    const acc = { green: 0, yellow: 0, red: 0, gray: 0, total: 0 }
    if (data) {
      for (const c of data.categories)
        for (const it of c.items) {
          acc[it.signal]++
          acc.total++
        }
    }
    return acc
  }, [data])

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* 헤더 — 공통 규격(PageHeader) */}
      <div className="shrink-0">
        <PageHeader
          icon={<ShieldCheck className="w-5 h-5" />}
          title="SQ 준비도"
          sub={`삼보모터스(HKMC) SQ 평가 Ver4 · ${data?.categories.length ?? 0}대 · ${summary.total}항목 · ${data?.totalPoints ?? 0}점 — 양식 작성·표준화 현황 신호등`}
          actions={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><Dot signal="green" className="w-2.5 h-2.5" /> {summary.green}</span>
              <span className="flex items-center gap-1.5"><Dot signal="yellow" className="w-2.5 h-2.5" /> {summary.yellow}</span>
              <span className="flex items-center gap-1.5"><Dot signal="red" className="w-2.5 h-2.5" /> {summary.red}</span>
              <span className="flex items-center gap-1.5"><Dot signal="gray" className="w-2.5 h-2.5" /> {summary.gray}</span>
              <button
                type="button"
                onClick={() => void load()}
                className="ml-1 p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                title="새로고침"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </div>
          }
        />
      </div>

      {/* 본문: 템플릿 C (19번) — 좌 목록 380px 고정 / 우 상세·미선택 시 요약 카드(공백 금지 규칙④) */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 — 카테고리·항목 목록 (행 높이·글자 = B 문법으로 확대) */}
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-4">
          {loading && !data && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
          )}
          {data?.categories.map((cat) => (
            <section key={cat.id}>
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <Dot signal={cat.signal} className="w-2.5 h-2.5" />
                <h2 className="text-[14px] font-extrabold">{cat.id}. {cat.name}</h2>
                <span className="text-[11px] text-muted-foreground">{cat.points}점</span>
              </div>
              <div className="space-y-1">
                {cat.items.map((it) => {
                  const active = selected === it.code
                  return (
                    <button
                      key={it.code}
                      type="button"
                      onClick={() => setSelected(it.code)}
                      className={cn(
                        'w-full text-left rounded-[11px] px-3 py-2.5 flex items-center gap-2.5 transition-colors border',
                        active ? 'bg-secondary border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                      )}
                    >
                      <Dot signal={it.signal} className="w-3 h-3" />
                      <span className="flex-1 min-w-0 leading-snug">
                        <span className="block text-[14px] font-semibold truncate">
                          <span className="font-mono text-[11px] text-muted-foreground mr-1.5">{it.code}</span>
                          {it.title}
                        </span>
                        <span className="block text-[11px] tabular-nums text-faint mt-0.5">
                          양식 {it.formCount} · 표준화 {it.standardizedCount} · 작성 {it.draftedCount}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        {/* 우측 — 선택 시 상세 / 미선택 시 요약 카드(안내문 금지) */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {selected ? (
            <SqItemDetail code={selected} signalText={SIGNAL_TEXT} signalLabel={SIGNAL_LABEL} />
          ) : (
            <ReadinessSummary data={data} onPick={setSelected} />
          )}
        </div>
      </div>
    </div>
  )
}

/** 미선택 요약(19번 공백 금지) — 6대 영역 신호등 + 빨간 항목 TOP + 다음 할 일 */
function ReadinessSummary({
  data,
  onPick
}: {
  data: SqReadinessDto | null
  onPick: (code: string) => void
}): JSX.Element {
  if (!data) return <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
  const allItems = data.categories.flatMap((c) => c.items.map((it) => ({ ...it, catName: c.name })))
  const reds = allItems.filter((i) => i.signal === 'red').sort((a, b) => b.points - a.points)
  const actionable = reds.filter((i) => i.formCount > 0).slice(0, 3)
  return (
    <div className="grid gap-4">
      <CardShell title="6대 영역 신호등" cap="지금 심사 받으면 되나 — 한눈 요약">
        <div className="px-[18px] pb-4 grid gap-2">
          {data.categories.map((cat) => {
            const g = cat.items.filter((i) => i.signal === 'green').length
            const y = cat.items.filter((i) => i.signal === 'yellow').length
            const r = cat.items.filter((i) => i.signal === 'red').length
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => cat.items[0] && onPick(cat.items[0].code)}
                className="flex items-center gap-3 rounded-[11px] border border-border px-3.5 py-2.5 text-left hover:bg-muted/50"
                title={`${cat.name} 첫 항목 열기`}
              >
                <Dot signal={cat.signal} className="w-3 h-3" />
                <span className="flex-1 text-[14px] font-semibold truncate">
                  {cat.id}. {cat.name}
                </span>
                <span className="text-[12px] tabular-nums text-muted-foreground shrink-0">{cat.points}점</span>
                <span className="flex items-center gap-2 text-[12px] tabular-nums shrink-0">
                  <span className="text-success font-bold">{g}</span>
                  <span className="text-warning font-bold">{y}</span>
                  <span className="text-destructive font-bold">{r}</span>
                </span>
              </button>
            )
          })}
        </div>
      </CardShell>

      <CardShell title="미충족(빨강) TOP" cap="배점 큰 순 — 먼저 해소">
        <div className="px-[18px] pb-4 grid gap-1.5">
          {reds.length === 0 && <div className="text-[13px] text-muted-foreground pb-2">미충족 항목 없음 👍</div>}
          {reds.slice(0, 5).map((i) => (
            <button
              key={i.code}
              type="button"
              onClick={() => onPick(i.code)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left border border-border hover:bg-muted/50"
            >
              <Dot signal="red" className="w-2.5 h-2.5" />
              <span className="font-mono text-[11px] text-muted-foreground w-9 shrink-0">{i.code}</span>
              <span className="flex-1 text-[13.5px] font-medium truncate">{i.title}</span>
              <span className="text-[11.5px] tabular-nums text-bad-ink bg-bad-tint rounded px-1.5 py-0.5 shrink-0">
                {i.points}점
              </span>
            </button>
          ))}
        </div>
      </CardShell>

      <CardShell title="다음 할 일" cap="양식 작성으로 바로 해소 가능한 항목">
        <div className="px-[18px] pb-4 grid gap-1.5">
          {actionable.length === 0 && (
            <div className="text-[13px] text-muted-foreground pb-2">
              양식 연결된 미충족 항목 없음 — 남은 빨강은 증빙·표준화 작업입니다.
            </div>
          )}
          {actionable.map((i) => (
            <button
              key={i.code}
              type="button"
              onClick={() => onPick(i.code)}
              className="flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left bg-secondary text-secondary-foreground hover:opacity-90"
            >
              <span className="text-[13.5px] font-bold flex-1 truncate">
                {i.code} {i.title}
              </span>
              <span className="text-[12px] font-semibold shrink-0">양식 {i.formCount}종 → 작성으로 해소 ›</span>
            </button>
          ))}
        </div>
      </CardShell>
    </div>
  )
}
