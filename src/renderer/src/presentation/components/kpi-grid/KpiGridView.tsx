import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Palette, RefreshCw, Save } from 'lucide-react'
import type { KpiIndicatorDto, KpiMonthValueDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { useHeatColors } from '../../hooks/useHeatColors'

/**
 * PB2 ⓔ-2 — KPI 실적 그리드 ("엑셀처럼 적고 저장" — 4차 노트 §3 3합:
 * 보는 표(병합 헤더·부호 착색) + 적는 표(인그리드 편집·저장) + 내보내기(엑셀 다운로드)).
 * 부호 착색 2단(8/4 사장님 확정): 목표 대비 **불리 = 빨강 · 유리 = 파랑**(direction 반영 —
 * 낮을수록 좋은 지표는 초과가 빨강). 판정 신호등과 섞지 않는다(4차 §1).
 * 셀 = 채움칸 베이지(fillable — 사람이 적는 칸 문법). 빈칸 = 미입력 정직(가짜 숫자 금지).
 */

const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))

export function KpiGridView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [colors, toggleColors] = useHeatColors()

  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(String(thisYear))
  const [inds, setInds] = useState<KpiIndicatorDto[]>([])
  const [values, setValues] = useState<Record<string, string>>({}) // `${id}|${MM}` → 입력 문자열
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setLoading(true)
    setMsg(null)
    try {
      const indicators = (await window.api.invoke(window.api.channels.KPI_HOME)) as KpiIndicatorDto[]
      setInds(indicators)
      const next: Record<string, string> = {}
      // 8/6 검수 Minor: 12회 직렬 → 병렬(월별 독립 조회)
      const perMonth = await Promise.all(
        MONTHS.map(async (mm) => ({
          mm,
          rows: (await window.api.invoke(window.api.channels.KPI_MONTH, { period: `${year}-${mm}` })) as KpiMonthValueDto[]
        }))
      )
      for (const { mm, rows } of perMonth) {
        for (const r of rows) next[`${r.indicatorId}|${mm}`] = String(r.value)
      }
      setValues(next)
      setDirty(new Set())
    } catch {
      setInds([])
    } finally {
      setLoading(false)
    }
  }, [year])

  useEffect(() => {
    void load()
  }, [load])

  const setCell = (id: number, mm: string, v: string): void => {
    const k = `${id}|${mm}`
    setValues((prev) => ({ ...prev, [k]: v }))
    setDirty((prev) => new Set(prev).add(k))
  }

  async function saveAll(): Promise<void> {
    if (saving) return // 8/6 검수 M-9: 저장 연타 = 이중 배치 차단
    setMsg(null)
    // 월별로 묶어 일괄 저장(kpi:save-batch — 변경분만·값 유효분만)
    const byMonth = new Map<string, { indicatorId: number; value: number }[]>()
    for (const k of dirty) {
      const [idStr, mm] = k.split('|')
      const raw = (values[k] ?? '').trim()
      if (raw === '') continue // 빈칸 = 미입력 유지(삭제 아님 — 정정은 값으로만)
      const v = Number(raw)
      if (!Number.isFinite(v)) {
        setMsg({ tone: 'bad', text: `숫자가 아닌 값이 있습니다 (${mm}월)` })
        return
      }
      const arr = byMonth.get(mm) ?? []
      arr.push({ indicatorId: Number(idStr), value: v })
      byMonth.set(mm, arr)
    }
    if (byMonth.size === 0) {
      setMsg({ tone: 'bad', text: '저장할 변경이 없습니다.' })
      return
    }
    setSaving(true)
    let saved = 0
    try {
      for (const [mm, entries] of byMonth) {
        const res = (await window.api.invoke(window.api.channels.KPI_SAVE_BATCH, {
          period: `${year}-${mm}`,
          entries,
          enteredBy: userName
        })) as { success: boolean; saved: number }
        if (!res.success) {
          // M-9: 부분 성공 정직 안내 — 이미 반영된 월을 숨기지 않는다(재조회로 동기화)
          setMsg({ tone: 'bad', text: `${mm}월 저장 실패 — 이전 저장분 ${saved}칸은 반영됨. 기입 주체(사용자 선택)를 확인하세요.` })
          await load()
          return
        }
        saved += res.saved
      }
      setMsg({ tone: 'ok', text: `저장 완료 — ${saved}칸 (기록 주체 = ${userName ?? '세션 사용자'})` })
      await load()
    } catch {
      setMsg({ tone: 'bad', text: `통신 오류 — 이전 저장분 ${saved}칸은 반영됨(조회로 확인). 다시 시도하세요.` })
    } finally {
      setSaving(false)
    }
  }

  /** M-9: 연도 전환 시 미저장 편집 무확인 파기 방지 (커스텀 확인창 일괄 교체는 confirm-교체 배치에서) */
  function changeYear(y: string): void {
    if (y === year) return
    if (dirty.size > 0 && !window.confirm(`미저장 변경 ${dirty.size}칸이 있습니다 — ${y}년으로 이동하며 버릴까요?`)) return
    setYear(y)
  }

  async function exportXlsx(): Promise<void> {
    setMsg(null)
    const res = (await window.api.invoke(window.api.channels.KPI_EXPORT_XLSX, { year })) as {
      success: boolean
      canceled?: boolean
      error?: string
    }
    if (res.success) setMsg({ tone: 'ok', text: '엑셀 저장 완료 (부호 착색 동봉)' })
    else if (!res.canceled) setMsg({ tone: 'bad', text: res.error ?? '엑셀 저장 실패' })
  }

  /** 부호 판정: 목표 대비 불리 = 'bad'(빨강) · 유리 = 'good'(파랑) · 목표 없음/빈칸 = null */
  const signOf = (ind: KpiIndicatorDto, raw: string | undefined): 'bad' | 'good' | null => {
    if (ind.target == null || raw == null || raw.trim() === '') return null
    const v = Number(raw)
    if (!Number.isFinite(v)) return null
    const bad = ind.direction === 'lower' ? v > ind.target : v < ind.target
    return bad ? 'bad' : 'good'
  }

  const years = useMemo(() => [String(thisYear - 1), String(thisYear), String(thisYear + 1)], [thisYear])

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">KPI 실적 그리드</h1>
        <span className="text-[13px] text-muted-foreground">
          엑셀처럼 적고 저장 — 빨강 = 목표 대비 불리 · 파랑 = 유리 (지표 방향 반영) · 빈칸 = 미입력
        </span>
      </div>

      {/* 툴바 — 기간(연도) 칩 · 저장 · 엑셀 · 색상 토글 (4차 §2·§3) */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-1.5 flex-wrap">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => changeYear(y)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[12px] font-bold border',
              year === y ? 'bg-secondary text-secondary-foreground border-primary/40' : 'border-border text-muted-foreground hover:bg-muted'
            )}
          >
            {y}년
          </button>
        ))}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-bold flex items-center gap-1 hover:bg-muted"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> 조회
        </button>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={dirty.size === 0 || saving}
          className={cn(
            'px-3 py-1.5 rounded-lg text-[12px] font-bold flex items-center gap-1',
            dirty.size > 0 && !saving ? 'bg-primary text-white' : 'border border-border bg-muted/40 text-muted-foreground/50 cursor-not-allowed'
          )}
        >
          <Save className="w-3 h-3" /> {saving ? '저장 중…' : `저장${dirty.size > 0 ? ` (${dirty.size})` : ''}`}
        </button>
        <button
          type="button"
          onClick={() => void exportXlsx()}
          className="px-3 py-1.5 rounded-lg border border-border text-[12px] font-bold flex items-center gap-1 hover:bg-muted"
        >
          <Download className="w-3 h-3" /> 엑셀
        </button>
        <button
          type="button"
          onClick={toggleColors}
          className={cn(
            'ml-auto px-3 py-1.5 rounded-lg border text-[12px] font-bold flex items-center gap-1',
            colors ? 'border-primary/40 bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground'
          )}
        >
          <Palette className="w-3 h-3" /> 색상 {colors ? 'ON' : 'OFF'}
        </button>
      </div>

      {msg && (
        <div
          className={cn(
            'rounded-lg px-3 py-2 text-[12.5px] font-semibold',
            msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink'
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[1080px]">
          <thead>
            {/* 병합 헤더(4차 §3): 1행 = 지표·단위·목표 + 분기 그룹, 2행 = 월 */}
            <tr>
              <th rowSpan={2} className="text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap">지표</th>
              <th rowSpan={2} className="font-bold text-secondary-foreground bg-secondary/60 py-2 px-2">단위</th>
              <th rowSpan={2} className="font-bold text-secondary-foreground bg-secondary/60 py-2 px-2">목표</th>
              {[1, 2, 3, 4].map((q) => (
                <th key={q} colSpan={3} className={cn('font-bold text-secondary-foreground py-1.5 px-2', q % 2 ? 'bg-secondary/60' : 'bg-secondary/40')}>
                  {q}분기
                </th>
              ))}
            </tr>
            <tr>
              {MONTHS.map((mm, i) => (
                <th key={mm} className={cn('font-bold text-secondary-foreground py-1.5 px-1 text-center', Math.floor(i / 3) % 2 ? 'bg-secondary/40' : 'bg-secondary/60')}>
                  {Number(mm)}월
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inds.length === 0 && !loading && (
              <tr>
                <td colSpan={15} className="py-8 text-center text-muted-foreground text-[13px]">
                  KPI 지표가 없습니다 — 지표 정의(0066 시드)를 확인하세요.
                </td>
              </tr>
            )}
            {inds.map((ind) => (
              <tr key={ind.id}>
                <th className="text-left font-normal py-1.5 px-3 whitespace-nowrap border-b border-border/60 bg-muted/20">
                  <b>{ind.name}</b>
                  {ind.ownerTeam && <span className="ml-1.5 text-[11px] text-muted-foreground">{ind.ownerTeam}</span>}
                </th>
                <td className="text-center py-1.5 px-2 border-b border-border/60 text-muted-foreground">{ind.unit}</td>
                <td className="text-center py-1.5 px-2 border-b border-border/60 font-bold tabular-nums">
                  {ind.target != null ? ind.target : <span className="text-muted-foreground/50">—</span>}
                </td>
                {MONTHS.map((mm) => {
                  const k = `${ind.id}|${mm}`
                  const raw = values[k]
                  const sign = signOf(ind, raw)
                  return (
                    <td key={mm} className="p-0 border-b border-border/40 border-r border-r-border/20">
                      <input
                        value={raw ?? ''}
                        onChange={(e) => setCell(ind.id, mm, e.target.value)}
                        inputMode="decimal"
                        className={cn(
                          'w-full h-9 px-1 text-center text-[12.5px] tabular-nums font-semibold outline-none border-0',
                          'bg-fillable/70 focus:ring-2 focus:ring-primary/40', // 채움칸 베이지 — 사람이 적는 칸
                          // 미저장 = 색 + 점선 밑줄(색 단독 금지 — 8/6 검수 Minor 색약 접근성)
                          dirty.has(k) && 'bg-secondary/50 underline decoration-dashed decoration-2 underline-offset-4',
                          colors && sign === 'bad' && 'text-bad-ink bg-bad-tint/60',
                          colors && sign === 'good' && 'text-[#2467b3] bg-secondary/40',
                          !colors && sign === 'bad' && 'text-bad-ink',
                          !colors && sign === 'good' && 'text-[#2467b3]'
                        )}
                        title={sign === 'bad' ? '목표 대비 불리(빨강)' : sign === 'good' ? '목표 대비 유리(파랑)' : undefined}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-muted-foreground">
        베이지 칸 = 사람이 적는 칸 · 하늘 칸+점선 밑줄 = 미저장 변경 · 빨강/파랑 = 목표 대비 부호(판정 신호등과 별개 축 — 4차 §1) ·
        저장은 변경분만 월 단위 일괄, 기록 주체는 세션 사용자로 각인됩니다.
      </p>
    </div>
  )
}
