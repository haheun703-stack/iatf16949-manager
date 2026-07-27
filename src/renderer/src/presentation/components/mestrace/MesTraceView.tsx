import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Loader2,
  Network,
  Search,
  Timer
} from 'lucide-react'
import type { MesTraceDirectionDto, MesTraceExpandDto, MesTraceLotDto, MesTraceStatusDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'

/**
 * LOT 계보 조회 (7/19 Scan-to-Trace) — "이 LOT 계보 보여줘"를 화면으로.
 * 데이터 = MES POP_TRACE 328만 링크 사이드카(mes_trace.db, scripts/mes_trace_build.py).
 * 템플릿 C(판정①): 좌 검색·LOT 목록 380px / 우 계보 전개(역·정추적)·미전개 시 상태 요약.
 * 전개 소요 ms 를 그대로 보여 심사장 "역추적 몇 ms" 시연 카드가 된다.
 */

const nf = (n: number): string => n.toLocaleString('ko-KR')

function LotChip({
  lot,
  onClick
}: {
  lot: MesTraceLotDto
  onClick?: (lot: MesTraceLotDto) => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={() => onClick?.(lot)}
      title={onClick ? '이 LOT 을 기준으로 다시 전개' : undefined}
      className="text-left rounded-lg border border-border bg-card px-2.5 py-1.5 leading-tight transition-colors hover:bg-muted/60"
    >
      <span className="block text-[13px] font-bold tabular-nums text-foreground">
        {lot.barcode}
        {lot.lotseq > 0 && <span className="text-muted-foreground font-semibold"> #{lot.lotseq}</span>}
      </span>
      <span className="block text-[11.5px] text-muted-foreground mt-0.5">
        {lot.pno ?? '품번 미상'}
        {lot.addymd && ` · ${lot.addymd}`}
      </span>
    </button>
  )
}

function DirectionPanel({
  title,
  hint,
  icon,
  dir,
  onPick
}: {
  title: string
  hint: string
  icon: JSX.Element
  dir: MesTraceDirectionDto
  onPick: (lot: MesTraceLotDto) => void
}): JSX.Element {
  return (
    <div className="bg-card border border-border rounded-[14px] shadow-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/30">
        <span className="text-primary">{icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold text-foreground">{title}</span>
          <span className="block text-[12px] text-muted-foreground">{hint}</span>
        </span>
        <span className="text-[15px] font-extrabold tabular-nums text-foreground shrink-0">
          {nf(dir.total)} LOT
        </span>
        <span
          className="inline-flex items-center gap-1 text-[12.5px] font-bold px-2 py-1 rounded-full shrink-0 bg-primary/10 text-primary"
          title="계보 그래프 전개 소요 시간"
        >
          <Timer className="w-3.5 h-3.5" /> {dir.ms} ms
        </span>
      </div>

      {dir.total === 0 ? (
        <div className="px-5 py-6 text-[13.5px] text-muted-foreground">
          전개 링크 없음 — 이 LOT 은 이 방향의 시작/끝 지점입니다.
        </div>
      ) : (
        <div className="px-5 py-4 space-y-4">
          {dir.levels.map((lv) => (
            <div key={lv.depth}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[12px] font-bold px-2 py-0.5 rounded-full bg-muted text-foreground">
                  {lv.depth}단계{lv.depth === 1 ? ' (직계)' : ''}
                </span>
                <span className="text-[12px] text-muted-foreground tabular-nums">{nf(lv.count)}건</span>
              </div>
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-1.5">
                {lv.lots.map((l) => (
                  <LotChip key={l.id} lot={l} onClick={onPick} />
                ))}
              </div>
              {lv.count > lv.lots.length && (
                <div className="text-[12px] text-muted-foreground mt-1.5">외 {nf(lv.count - lv.lots.length)}건…</div>
              )}
            </div>
          ))}
          {dir.truncated && (
            <div className="text-[12.5px] text-muted-foreground">
              ⚠️ 전개가 상한(3,000 LOT)에 도달해 이후 단계는 생략됐습니다.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function MesTraceView(): JSX.Element {
  const [status, setStatus] = useState<MesTraceStatusDto | null>(null)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<MesTraceLotDto[] | null>(null)
  const [expand, setExpand] = useState<MesTraceExpandDto | null>(null)
  const [expanding, setExpanding] = useState(false)
  const expandRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expand) expandRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [expand])

  useEffect(() => {
    void (async () => {
      try {
        setStatus((await window.api.invoke(window.api.channels.MES_TRACE_STATUS)) as MesTraceStatusDto)
      } catch {
        setStatus(null)
      }
    })()
  }, [])

  const runSearch = useCallback(async () => {
    const q = query.trim()
    if (q.length < 2) return
    setSearching(true)
    try {
      const res = (await window.api.invoke(window.api.channels.MES_TRACE_SEARCH, { query: q })) as MesTraceLotDto[]
      setResults(res)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [query])

  const runExpand = useCallback(async (lot: MesTraceLotDto) => {
    setExpanding(true)
    try {
      const res = (await window.api.invoke(window.api.channels.MES_TRACE_EXPAND, {
        lotId: lot.id
      })) as MesTraceExpandDto | null
      setExpand(res)
    } catch {
      setExpand(null)
    } finally {
      setExpanding(false)
    }
  }, [])

  return (
    <div className="flex flex-col h-full min-h-0 break-keep">
      <div className="shrink-0">
        <PageHeader
          icon={<Network size={18} />}
          title="LOT 계보 조회"
          sub="자재 LOT ↔ 생산 LOT 계보 전개(MES 계보 실측) — 리콜 시뮬레이션·모의 역추적 훈련의 데이터 기반"
          actions={
            status?.available ? (
              <span className="text-[12.5px] text-muted-foreground text-right leading-snug">
                계보 링크 <b className="text-foreground tabular-nums">{nf(status.edgeCount)}</b>
                {status.yearRange && <> · {status.yearRange}</>}
                <span className="block">
                  LOT {nf(status.lotCount)} · 빌드 {status.builtAt?.replace('T', ' ') ?? '—'}
                </span>
              </span>
            ) : undefined
          }
        />
      </div>

      {status && !status.available && (
        <div className="bg-card border border-border rounded-[14px] shadow-card px-6 py-5 space-y-2">
          <div className="text-[15.5px] font-bold text-foreground">계보 데이터가 아직 없습니다</div>
          <p className="text-[13.5px] text-muted-foreground leading-relaxed">
            MES 덤프에서 계보 사이드카를 먼저 생성하세요(관리자 1회 작업, 주기적 dmp 반입 시 재실행):
            <code className="block mt-1.5 text-[12.5px] bg-muted rounded px-2 py-1.5 select-all">
              python scripts/mes_trace_build.py &lt;dmp&gt; &lt;tables.json&gt; &quot;{status.path}&quot;
            </code>
          </p>
        </div>
      )}

      {status?.available && (
        /* 템플릿 C (19번): 좌 검색·LOT 목록 380px 고정 / 우 계보 전개 */
        <div className="flex gap-4 flex-1 min-h-0">
          <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-2">
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void runSearch()
                  }}
                  placeholder="LOT 바코드·품번 앞자리 (2자 이상)"
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-[13.5px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <button
                type="button"
                onClick={() => void runSearch()}
                disabled={searching || query.trim().length < 2}
                className="h-10 inline-flex items-center gap-1.5 text-[13px] font-bold bg-primary text-primary-foreground px-3.5 rounded-lg hover:opacity-90 disabled:opacity-50 shrink-0"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>

            {results === null && (
              <div className="text-[12px] text-muted-foreground px-1 py-2 leading-relaxed">
                예: <b>25450</b>(품번 앞자리), <b>H018</b>(바코드 앞자리) — 검색 후 LOT 을 클릭하면 우측에 계보가
                전개됩니다.
              </div>
            )}
            {results && results.length === 0 && (
              <div className="text-[13px] text-muted-foreground px-1 py-2">
                일치하는 LOT 이 없습니다 — 바코드/품번 앞자리를 다시 확인하세요.
              </div>
            )}
            {results?.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => void runExpand(r)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
                  expand?.start.id === r.id ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[13.5px] font-bold tabular-nums truncate">
                    {r.barcode}
                    {r.lotseq > 0 && <span className="text-muted-foreground"> #{r.lotseq}</span>}
                  </span>
                  <span className="text-[11px] text-muted-foreground tabular-nums ml-auto shrink-0">
                    {r.addymd ?? ''}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  {r.pno ?? '품번 미상'}
                  {r.qty != null && ` · 수량 ${nf(r.qty)}`}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-1 min-w-0 overflow-y-auto">
            {expanding && (
              <div className="flex items-center justify-center gap-2 py-16 text-[14.5px] text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> 계보 전개 중...
              </div>
            )}

            {!expanding && !expand && <TraceSummary status={status} />}

            {!expanding && expand && (
              <div className="grid gap-4">
                <div
                  ref={expandRef}
                  className="bg-card border border-border rounded-[14px] shadow-card px-6 py-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 scroll-mt-4"
                >
                  <span>
                    <span className="block text-[12px] text-muted-foreground">기준 LOT</span>
                    <span className="block text-[18px] font-extrabold tabular-nums text-foreground">
                      {expand.start.barcode}
                      {expand.start.lotseq > 0 && (
                        <span className="text-muted-foreground font-bold"> #{expand.start.lotseq}</span>
                      )}
                    </span>
                  </span>
                  <span>
                    <span className="block text-[12px] text-muted-foreground">품번</span>
                    <span className="block text-[15px] font-bold text-foreground">{expand.start.pno ?? '—'}</span>
                  </span>
                  <span>
                    <span className="block text-[12px] text-muted-foreground">등록일</span>
                    <span className="block text-[15px] font-bold tabular-nums text-foreground">
                      {expand.start.addymd ?? '—'}
                    </span>
                  </span>
                  <span className="ml-auto text-[12.5px] text-muted-foreground">
                    칩을 클릭하면 그 LOT 기준으로 재전개됩니다
                  </span>
                </div>

                <DirectionPanel
                  title="역추적 — 이 LOT 에 들어온 것"
                  hint="자재 방향(입고 LOT까지 거슬러 올라감) — 불량 원인 소급"
                  icon={<ArrowUpFromLine className="w-4.5 h-4.5" size={18} />}
                  dir={expand.up}
                  onPick={(l) => void runExpand(l)}
                />
                <DirectionPanel
                  title="정추적 — 이 LOT 이 들어간 곳"
                  hint="완제품 방향(어느 생산 LOT·출하분에 투입됐나) — 리콜 범위 확정"
                  icon={<ArrowDownToLine className="w-4.5 h-4.5" size={18} />}
                  dir={expand.down}
                  onPick={(l) => void runExpand(l)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** 미전개 요약(19번 공백 금지) — 계보 상태 + 사용법. */
function TraceSummary({ status }: { status: MesTraceStatusDto | null }): JSX.Element {
  return (
    <div className="grid gap-4">
      <CardShell title="계보 데이터 상태" cap="MES POP_TRACE 실측 사이드카 · 읽기전용">
        <div className="px-[18px] pb-4 pt-1 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
          <div>
            계보 링크 <b className="text-[15px] tabular-nums">{status ? nf(status.edgeCount) : '—'}</b>
          </div>
          <div>
            LOT <b className="text-[15px] tabular-nums">{status ? nf(status.lotCount) : '—'}</b>
          </div>
          {status?.yearRange && <div className="text-muted-foreground">{status.yearRange}</div>}
          {status?.builtAt && (
            <div className="text-muted-foreground">빌드 {status.builtAt.replace('T', ' ')}</div>
          )}
        </div>
      </CardShell>

      <CardShell title="사용법" cap="좌측에서 LOT 을 검색해 선택하세요">
        <div className="px-[18px] pb-4 pt-1 grid gap-1.5 text-[13px] leading-relaxed">
          <div>
            <b className="text-primary">역추적</b> — 이 LOT 에 들어온 자재(입고 LOT까지 소급) → 불량 원인 소급
          </div>
          <div>
            <b className="text-primary">정추적</b> — 이 LOT 이 들어간 완제품·출하분 → 리콜 범위 확정
          </div>
          <div className="text-muted-foreground">전개된 칩을 클릭하면 그 LOT 기준으로 재전개됩니다.</div>
          <div className="text-[12px] text-muted-foreground mt-1.5">
            월 1회 <b>모의 역추적 훈련</b>(정기 의무·품질팀)의 실측 도구입니다 — 훈련 후 소요시간을 홈 KPI{' '}
            <b>역추적 소요시간</b>(분)에 입력하고 의무를 완료 처리하세요. 새 덤프 반입 시{' '}
            <b>scripts/mes_trace_build.py</b> 재실행이면 앱 재시작 없이 새 데이터를 읽습니다.
          </div>
        </div>
      </CardShell>
    </div>
  )
}
