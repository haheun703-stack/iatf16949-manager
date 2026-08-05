import { useEffect, useState } from 'react'
import type { MesProcessLiveDto, MesProcessLiveCol } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'

/**
 * PB2 ⓑ — 공정 실황 도넛 카드 (30번 목업 v2 상단부 · 29번 §11 "겉이 MES").
 * 도넛 = 최근 7일 **가동일 대비** 기록일 %(weekPct — 핸들러 실측, 가짜 분모 금지).
 * 상태 태그 = 색+글자(파스텔 문법 — 색만으로 말하지 않는다). 미달(공백) = 데이터 할 일 자동 발행(T 계열).
 * LOT추적 줄은 현 사이드카 집계에 LOT 원천이 없어 '—' 정직 표기 — PC 단계(기록 5종 쓰기,
 * lot_no 동반)부터 실측 표시. 상세 표(ProcessLiveMatrix)는 아래 유지 — 정보 손실 0.
 */

function shortYmd(ymd: string | null): string {
  return ymd && ymd.length >= 10 ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : '—'
}

function Donut({ col }: { col: MesProcessLiveCol }): JSX.Element {
  const pct = col.weekPct
  const isGap = col.status === 'gap'
  const isLive = col.status === 'active' || col.status === 'gap'
  const fill = isGap ? 'var(--color-donut-warn)' : 'var(--color-donut-ok)'
  return (
    <div
      className="w-[70px] h-[70px] rounded-full mx-auto my-2 flex items-center justify-center"
      style={{
        background:
          pct != null && isLive
            ? `conic-gradient(${fill} 0 ${pct}%, var(--color-donut-track) ${pct}% 100%)`
            : 'var(--color-donut-track)'
      }}
      title="최근 7일 가동일(전사 기록이 있던 날) 대비 이 공정 기록일 비율 — 실측"
    >
      <b className="bg-card w-[52px] h-[52px] rounded-full flex items-center justify-center text-[15px] font-extrabold tabular-nums">
        {pct != null && isLive ? `${pct}%` : '—'}
      </b>
    </div>
  )
}

export function ProcessLiveDonuts(): JSX.Element {
  const [data, setData] = useState<MesProcessLiveDto | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const d = (await window.api.invoke(window.api.channels.MES_RECORDS_PROCESS_LIVE, {})) as MesProcessLiveDto
        setData(d)
      } catch {
        setData(null)
      }
    })()
  }, [])

  const cols = data?.columns ?? []
  if (cols.length === 0) return <></>

  const tag = (c: MesProcessLiveCol): { label: string; cls: string } => {
    switch (c.status) {
      case 'active':
        return { label: '정상', cls: 'bg-ok-tint text-ok-ink' }
      case 'gap':
        return { label: '⚠ 미달', cls: 'bg-warn-tint text-warn-ink' }
      case 'stale':
        return { label: '미반입', cls: 'bg-muted text-muted-foreground' }
      default:
        return { label: '원천 없음', cls: 'bg-muted text-muted-foreground/70' }
    }
  }

  return (
    <section data-testid="process-live-donuts">
      <div className="flex items-baseline gap-2 mb-2.5">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em]">공정 실황</h2>
        <span className="text-[12px] text-muted-foreground">
          도넛 = 최근 7일 가동일 대비 기록일 %(실측) · 오늘 {shortYmd(data?.ymd ?? null)}
          {data?.dataEndYmd && data.ymd > data.dataEndYmd ? ` · MES 기준 ${shortYmd(data.dataEndYmd)}` : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {cols.map((c) => {
          const t = tag(c)
          return (
            <div key={c.key} className="bg-card border border-border rounded-2xl px-3 py-3.5 text-center shadow-card">
              <span className={cn('inline-block text-[11px] font-bold rounded-full px-2.5 py-[2px] mb-1', t.cls)}>
                {t.label}
              </span>
              <div className="font-extrabold text-[13.5px]">{c.label}</div>
              <Donut col={c} />
              <div className="text-[12px] text-muted-foreground text-left leading-[1.8]">
                <div>
                  오늘기록 <i className="not-italic float-right font-bold text-foreground">{c.todayRecords}건</i>
                </div>
                <div title="PC 단계(기록 쓰기 — lot_no 동반)부터 실측 표시">
                  LOT추적 <i className="not-italic float-right font-semibold text-muted-foreground/70">—</i>
                </div>
                <div>
                  최근 <i className="not-italic float-right font-bold text-foreground tabular-nums">{shortYmd(c.lastYmd)}</i>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-[12px] text-muted-foreground">
        파스텔 태그 = 상태(색+글자) · 미달(공백)이면 데이터 할 일 자동 발행 · LOT추적은 PC 단계부터 실측
      </p>
    </section>
  )
}
