import { useCallback, useEffect, useState } from 'react'
import { todayKST } from '@shared/date-kst'
import type { SemimesPpmDashDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑴ — #14 부적합 PPM 대시보드 (33호 그림12 문법 — KPI 4 + 추이 + 제품별 + 유형별).
 * v1 원천 = 생산실적 불량(prod_record, 취소 제외) — 화면에 원천 명기(정직). 검사 불량 축은 후속.
 * 목표 PPM = 인라인 저장(app_config · 기입 주체 세션 각인) · 초과 = 빨강(부호 착색 문법).
 * 차트 = 자체 SVG(라인+목표선)·가로 바(유형별 — CVD 안전) — 외부 라이브러리 0.
 */

export function PpmDashView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const thisYear = todayKST().slice(0, 4)
  const [year, setYear] = useState(thisYear)
  const [dash, setDash] = useState<SemimesPpmDashDto | null>(null)
  const [target, setTarget] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  // 연도 전환 연타 = KpiGrid 와 같은 경합(늦은 응답이 새 연도 라벨 아래 앉음) — 공용 seq 가드
  const seq = useSeqGuard()
  const load = useCallback(async (y: string = year): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PPM_DASH, { year: y })) as SemimesPpmDashDto
      if (!seq.isCurrent(token)) return
      setDash(res)
      setTarget(res.targetPpm != null ? String(res.targetPpm) : '')
    } catch {
      if (seq.isCurrent(token)) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [year, seq])

  useEffect(() => {
    void load(year)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year])

  async function saveTarget(): Promise<void> {
    if (saving) return // 8/11 검수 Minor: 저장 연타 = 같은 값 이중 기입(주체 각인 중복)
    if (target.trim() === '') {
      // 빈 값은 거부 — 0 은 사람이 적는다(8/11 총평 수치 입력 공통 규약)
      setMsg({ tone: 'bad', text: '목표 PPM 을 입력하세요 — 빈 값은 저장하지 않습니다.' })
      return
    }
    const v = Number(target)
    if (!Number.isFinite(v) || v < 0) {
      setMsg({ tone: 'bad', text: '목표 PPM 은 0 이상 수치여야 합니다.' })
      return
    }
    setSaving(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PPM_TARGET_SAVE, { value: v, savedBy: userName })) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `목표 PPM ${Math.round(v)} 저장 (기입 주체 각인)` })
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  const months = dash?.months ?? []
  const tgt = dash?.targetPpm ?? null
  const withPpm = months.filter((m) => m.ppm != null)
  const best = dash && dash.byItem.length > 0 ? [...dash.byItem].filter((i) => i.ppm != null).sort((a, b) => (a.ppm ?? 0) - (b.ppm ?? 0)) : []
  const maxPpm = Math.max(...withPpm.map((m) => m.ppm ?? 0), tgt ?? 0, 1)
  const maxNg = Math.max(...(dash?.byDefect.map((d) => d.ng) ?? []), 1)
  const curOver = dash?.currentMonthPpm != null && tgt != null && dash.currentMonthPpm > tgt

  // 12칸 고정 X축(1~12월) SVG 좌표
  const W = 560
  const H = 150
  const PAD = 28
  const x = (mi: number): number => PAD + ((W - PAD * 2) * mi) / 11
  const y = (ppm: number): number => H - PAD - (H - PAD * 2) * (ppm / maxPpm)
  const points = withPpm
    .map((m) => `${x(Number(m.month.slice(5)) - 1).toFixed(1)},${y(m.ppm ?? 0).toFixed(1)}`)
    .join(' ')

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">부적합 PPM 대시보드</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 6_6</span>
        <span className="text-[13px] text-muted-foreground">원천 = 생산실적 불량(취소 제외 · v1) — 검사 불량 축은 후속 편성 · PPM = 불량/(양품+불량)×10⁶</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onExcel={dash ? () => downloadCsv(`부적합PPM_${year}.csv`, ['월', '양품', '불량', 'PPM'], months.map((m) => [m.month, m.ok, m.ng, m.ppm])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            {[String(Number(thisYear) - 1), thisYear].map((yy) => <option key={yy} value={yy}>{yy}년</option>)}
          </select>
        </span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* KPI 4타일 (그림12 문법 — 목표 인라인 저장) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-card shadow-card px-4 py-3">
          <span className="block text-[11.5px] font-bold text-muted-foreground">목표 PPM</span>
          <span className="flex items-center gap-1.5 mt-1">
            <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="numeric"
              onKeyDown={(e) => { if (e.key === 'Enter') void saveTarget() }}
              className="w-[90px] h-8 px-2 rounded-lg border border-border bg-fillable/70 text-[16px] font-extrabold tabular-nums" />
            <button type="button" onClick={() => void saveTarget()} disabled={saving} className="h-8 px-2.5 rounded-lg bg-mega-active text-white text-[11.5px] font-bold disabled:opacity-50">
              {saving ? '저장 중…' : '저장'}
            </button>
          </span>
          {/* 8/11 검수 Minor: 초과를 색 단독으로 알리던 자리 — 색+기호+라벨 3중(CVD 안전 · 인쇄 흑백 안전) */}
          <span className="block text-[11px] text-muted-foreground mt-1">{tgt == null ? '미설정 — 정직 표기' : '초과 = 빨강 + ▲ 표식'}</span>
        </div>
        <div className={cn('rounded-2xl border shadow-card px-4 py-3', curOver ? 'bg-bad-tint border-bad-ink/25' : 'bg-card border-border')}>
          <span className="block text-[11.5px] font-bold text-muted-foreground">현재 월 PPM</span>
          <b className={cn('block text-[24px] tabular-nums tracking-[-0.02em]', curOver ? 'text-bad-ink' : 'text-mega-active')}>
            {curOver && <span aria-hidden="true" className="text-[16px] mr-1">▲</span>}
            {dash?.currentMonthPpm ?? '—'}
          </b>
          <span className="block text-[11px] text-muted-foreground">
            {curOver ? `목표 ${tgt} 초과 · ` : ''}{todayKST().slice(0, 7)} · 실적 없으면 —
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-card px-4 py-3">
          <span className="block text-[11.5px] font-bold text-muted-foreground">최저 PPM 제품</span>
          <b className="block text-[15px] truncate text-ok-ink">{best[0]?.itemCode ?? '—'}</b>
          <span className="block text-[11px] text-muted-foreground tabular-nums">{best[0]?.ppm != null ? `${best[0].ppm} PPM` : '실적 축적 대기'}</span>
        </div>
        <div className="rounded-2xl border border-border bg-card shadow-card px-4 py-3">
          <span className="block text-[11.5px] font-bold text-muted-foreground">최고 PPM 제품</span>
          <b className="block text-[15px] truncate text-bad-ink">{best.length > 0 ? best[best.length - 1].itemCode : '—'}</b>
          <span className="block text-[11px] text-muted-foreground tabular-nums">{best.length > 0 && best[best.length - 1].ppm != null ? `${best[best.length - 1].ppm} PPM` : '실적 축적 대기'}</span>
        </div>
      </div>

      {/* 월별 추이 (SVG 라인 + 목표 점선) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
        <div className="text-[13px] font-bold mb-2">월별 불량 PPM 추이 {tgt != null && <span className="text-[11.5px] font-semibold text-muted-foreground">— 점선 = 목표 {tgt}</span>}</div>
        {withPpm.length === 0 ? (
          <p className="text-[12.5px] text-muted-foreground py-6 text-center">기간 내 실적이 없습니다 — 생산실적이 쌓이면 자동 표시됩니다.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[720px]" role="img" aria-label="월별 PPM 추이">
              {tgt != null && (
                <line x1={PAD} x2={W - PAD} y1={y(Math.min(tgt, maxPpm))} y2={y(Math.min(tgt, maxPpm))} stroke="currentColor" className="text-muted-foreground" strokeDasharray="5 4" strokeWidth="1.2" />
              )}
              <polyline points={points} fill="none" stroke="currentColor" className="text-mega-active" strokeWidth="2.2" strokeLinejoin="round" />
              {withPpm.map((m) => {
                const over = tgt != null && (m.ppm ?? 0) > tgt
                const mi = Number(m.month.slice(5)) - 1
                const cx = x(mi)
                const cy = y(m.ppm ?? 0)
                return (
                  <g key={m.month}>
                    {/* 초과 = 색 + 모양(▲) 2중 — 색 단독 판독 금지(8/11 검수 Minor) */}
                    {over ? (
                      <polygon points={`${cx},${cy - 4.6} ${cx - 4.4},${cy + 3.4} ${cx + 4.4},${cy + 3.4}`} className="fill-bad-ink" fill="currentColor">
                        <title>{`${m.month} — 목표 ${tgt} 초과`}</title>
                      </polygon>
                    ) : (
                      <circle cx={cx} cy={cy} r="3.6" className="fill-mega-active" fill="currentColor" />
                    )}
                    <text x={cx} y={cy - 8} textAnchor="middle" className={cn('text-[10px] font-bold tabular-nums', over ? 'fill-bad-ink' : 'fill-mega-active')}>
                      {over ? `▲${m.ppm}` : m.ppm}
                    </text>
                  </g>
                )
              })}
              {Array.from({ length: 12 }, (_, i) => (
                <text key={i} x={x(i)} y={H - 8} textAnchor="middle" className="text-[10px] fill-current text-muted-foreground">{i + 1}월</text>
              ))}
            </svg>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* 제품별 PPM — 초과 빨강 */}
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse">
            <thead><tr>{['품번', '양품', '불량', 'PPM'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {(dash?.byItem ?? []).length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground text-[12.5px]">실적 축적 대기</td></tr>}
              {(dash?.byItem ?? []).map((r) => {
                const over = tgt != null && r.ppm != null && r.ppm > tgt
                return (
                  <tr key={r.itemCode}>
                    <td className={cn(TD, 'font-semibold max-w-[180px] truncate')} title={r.itemName ?? ''}>{r.itemCode}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.ok.toLocaleString()}</td>
                    <td className={cn(TD, 'text-right tabular-nums', r.ng > 0 ? 'font-bold text-bad-ink' : 'text-muted-foreground')}>{r.ng.toLocaleString()}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-extrabold', over ? 'text-bad-ink' : 'text-mega-active')} title={over ? `목표 ${tgt} 초과` : undefined}>
                      {over && <span aria-hidden="true">▲ </span>}{r.ppm ?? '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* 불량 유형별 — 가로 바(CVD 안전) */}
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
          <div className="text-[13px] font-bold mb-2">불량 유형별 수량</div>
          {(dash?.byDefect ?? []).length === 0 && <p className="text-[12.5px] text-muted-foreground py-4 text-center">불량 기록 축적 대기</p>}
          <div className="flex flex-col gap-1.5">
            {(dash?.byDefect ?? []).map((d) => (
              <div key={d.code} className="flex items-center gap-2">
                <span className="w-[140px] text-[12px] font-semibold truncate" title={d.code}>{d.name ?? d.code}</span>
                <span className="flex-1 h-3.5 rounded-full bg-muted overflow-hidden">
                  <span className="block h-full rounded-full bg-bad-ink/70" style={{ width: `${(d.ng / maxNg) * 100}%` }} />
                </span>
                <span className="w-[52px] text-right text-[12px] font-bold tabular-nums">{d.ng.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
