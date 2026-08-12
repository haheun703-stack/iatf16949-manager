import { useCallback, useEffect, useState } from 'react'
import { todayKST } from '@shared/date-kst'
import type { SemimesPerfIndicatorDto, SemimesPerfIndicatorsDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑶ — #15 성과 지표 표준형 (정본 그림19~25 · 골격).
 * 공통 프레임 1개 + 지표 2종 우선(양품률·수입검사부적합 PPM — 건 축, 화면 명기).
 * 계약: 실적 없는 달 = null(가짜 0/100 금지) · 연간값 = 분자·분모 재합산(월평균 아님) ·
 * OEE 3분해는 가동시간 원천 확보 후 — 만들지 않는다(대조표 #15). 부호 착색 = 목표 축 미보유라
 * 방향 표기만(값 자체에 유불리 색 없음 — 가짜 판정 금지).
 */

export function PerfIndicatorsView(): JSX.Element {
  const thisYear = todayKST().slice(0, 4)
  const [year, setYear] = useState(thisYear)
  const [data, setData] = useState<SemimesPerfIndicatorsDto | null>(null)
  const [active, setActive] = useState<SemimesPerfIndicatorDto['key']>('yieldRate')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (y: string = year): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PERF_INDICATORS, { year: y })) as SemimesPerfIndicatorsDto
      if (!seq.isCurrent(token)) return
      setData(res)
    } catch {
      if (seq.isCurrent(token)) setMsg('조회 실패 — 통신 오류. 다시 시도하세요.')
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [year, seq])

  useEffect(() => {
    void load(year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  const ind = data?.indicators.find((i) => i.key === active) ?? null
  const withVal = ind?.months.filter((m) => m.value != null) ?? []
  const maxVal = Math.max(...withVal.map((m) => m.value ?? 0), 1)
  const maxDenom = Math.max(...(ind?.months.map((m) => m.denom) ?? []), 1)

  // 콤보차트 좌표(그림19~25 문법 — 바 = 분모 규모·라인 = 지표값)
  const W = 640
  const H = 170
  const PAD = 30
  const x = (mi: number): number => PAD + ((W - PAD * 2) * mi) / 11
  const y = (v: number): number => H - PAD - (H - PAD * 2) * (v / maxVal)
  const yBar = (d: number): number => (H - PAD * 2) * (d / maxDenom)
  const points = (ind?.months ?? [])
    .map((m, i) => (m.value != null ? `${x(i).toFixed(1)},${y(m.value).toFixed(1)}` : null))
    .filter(Boolean)
    .join(' ')

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">성과 지표</h1>
        <span className="text-[13px] text-muted-foreground">
          지표 2종 골격(양품률·수입검사부적합 PPM) · 실적 없는 달 = 공란 정직 · OEE 3분해는 가동시간 원천 확보 후
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onExcel={ind ? () => downloadCsv(`성과지표_${ind.label}_${year}.csv`, ['월', '분자', '분모', `값(${ind.unit})`], ind.months.map((m) => [m.month, m.numer, m.denom, m.value])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 ml-auto">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            {[String(Number(thisYear) - 1), thisYear].map((yy) => <option key={yy} value={yy}>{yy}년</option>)}
          </select>
        </span>
      </div>

      {msg && <div className="rounded-lg px-3 py-2 text-[12.5px] font-semibold bg-bad-tint text-bad-ink">{msg}</div>}

      {/* 지표 선택 카드(공통 프레임 — 지표 추가 = 카드 추가만) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {(data?.indicators ?? []).map((i) => (
          <button key={i.key} type="button" onClick={() => setActive(i.key)}
            className={cn('rounded-2xl border shadow-card px-4 py-3 text-left transition-colors',
              active === i.key ? 'border-mega-active ring-1 ring-mega-active bg-secondary/30' : 'border-border bg-card hover:bg-muted/40')}>
            <span className="block text-[11.5px] font-bold text-muted-foreground">{i.label}</span>
            <b className="block text-[24px] tabular-nums tracking-[-0.02em] text-mega-active">
              {i.yearValue != null ? `${i.yearValue}${i.unit === '%' ? '%' : ''}` : '—'}
              {i.unit !== '%' && i.yearValue != null && <small className="text-[12px] font-bold text-muted-foreground"> {i.unit}</small>}
            </b>
            <span className="block text-[11px] text-muted-foreground">
              {year}년 누계(분자·분모 재합산) · {i.direction === 'higher' ? '높을수록 양호' : '낮을수록 양호'}
            </span>
          </button>
        ))}
      </div>

      {/* 연간 콤보차트 — 바(분모 규모) + 라인(지표값) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
        <div className="text-[13px] font-bold mb-2">
          {ind?.label ?? '—'} 월별 추이 <span className="text-[11.5px] font-semibold text-muted-foreground">— 회색 바 = 분모 규모({active === 'yieldRate' ? '생산수량' : '검사 건수'}) · 라인 = 값</span>
        </div>
        {withVal.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground py-6 text-center">기간 내 실적이 없습니다 — 기록이 쌓이면 자동 표시됩니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[780px]" role="img" aria-label={`${ind?.label ?? ''} 월별 추이`}>
              {(ind?.months ?? []).map((m, i) => (
                m.denom > 0 && (
                  <rect key={`b${m.month}`} x={x(i) - 9} y={H - PAD - yBar(m.denom)} width={18} height={yBar(m.denom)} rx={2} className="fill-muted-foreground/25" fill="currentColor" />
                )
              ))}
              <polyline points={points} fill="none" stroke="currentColor" className="text-mega-active" strokeWidth="2.2" strokeLinejoin="round" />
              {(ind?.months ?? []).map((m, i) => m.value != null && (
                <g key={`p${m.month}`}>
                  <circle cx={x(i)} cy={y(m.value)} r="3.4" className="fill-mega-active" fill="currentColor" />
                  <text x={x(i)} y={y(m.value) - 8} textAnchor="middle" className="text-[10px] font-bold tabular-nums fill-mega-active">{m.value}</text>
                </g>
              ))}
              {Array.from({ length: 12 }, (_, i) => (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="text-[10px] fill-current text-muted-foreground">{i + 1}월</text>
              ))}
            </svg>
          </div>
        )}
      </div>

      {/* 월별 표 — 분자·분모 동봉(값만 던지지 않는다 — 산식 검증 가능) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[680px]">
          <thead>
            <tr>
              <th className={TH}>구분</th>
              {Array.from({ length: 12 }, (_, i) => <th key={i} className={cn(TH, 'text-right')}>{i + 1}월</th>)}
              <th className={cn(TH, 'text-right')}>연간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className={cn(TD, 'font-bold')}>값({ind?.unit ?? ''})</td>
              {(ind?.months ?? []).map((m) => (
                <td key={m.month} className={cn(TD, 'text-right tabular-nums font-bold', m.value == null && 'text-muted-foreground')}>{m.value ?? '—'}</td>
              ))}
              <td className={cn(TD, 'text-right tabular-nums font-extrabold text-mega-active')}>{ind?.yearValue ?? '—'}</td>
            </tr>
            <tr>
              <td className={cn(TD, 'text-muted-foreground')}>분자</td>
              {(ind?.months ?? []).map((m) => <td key={m.month} className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{m.denom > 0 ? m.numer.toLocaleString() : '—'}</td>)}
              <td className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{(ind?.months ?? []).reduce((s, m) => s + m.numer, 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td className={cn(TD, 'text-muted-foreground')}>분모</td>
              {(ind?.months ?? []).map((m) => <td key={m.month} className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{m.denom > 0 ? m.denom.toLocaleString() : '—'}</td>)}
              <td className={cn(TD, 'text-right tabular-nums text-muted-foreground')}>{(ind?.months ?? []).reduce((s, m) => s + m.denom, 0).toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-[11.5px] text-muted-foreground">
        수입검사부적합 PPM은 <b>건 축</b>(불합격 건/검사 건)입니다 — 시료 수량 원천 확보 전까지 수량 축 PPM은 만들지 않습니다(정직).
        목표선·부호 착색은 지표별 목표 등록(KPI 기준정보 — 배치⑷ #13) 후 잇습니다.
      </p>
    </div>
  )
}
