import { useEffect, useMemo, useState } from 'react'
import { X, Save, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { normalizeTeam, teamTheme } from '@shared/team-theme'
import { todayKST } from '@shared/date-kst'
import type { KpiIndicatorDto, KpiMonthValueDto } from '@shared/ipc-types'

/**
 * KPI 월별 실적 일괄 입력 (7/21) — 35지표를 한 화면에서 채운다.
 * 자동산출 불가(MES 판정·불량 부재) → 수기 집계값을 월별로 기록. 빈칸=미입력 유지(가짜 숫자 금지),
 * 값 있는 지표만 upsert(같은 월 재입력=정정). 지표별 [입력] 낱개 대비 대량 입력에 최적.
 */
/** 8/11 검수 Minor: 브라우저 로컬 축 → 기록 날짜 축(KST)으로 통일 */
function nowPeriod(): string {
  return todayKST().slice(0, 7)
}

export function KpiBatchEntryModal({
  indicators,
  enteredBy,
  onClose,
  onSaved
}: {
  indicators: KpiIndicatorDto[]
  enteredBy?: string
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [period, setPeriod] = useState(nowPeriod())
  const [values, setValues] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  // 선택 월의 기존 실적을 프리필(그 위에 정정 입력)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setMsg(null)
    void (async () => {
      try {
        const rows = (await window.api.invoke(window.api.channels.KPI_MONTH, { period })) as KpiMonthValueDto[]
        if (!alive) return
        const map: Record<number, string> = {}
        for (const r of rows) map[r.indicatorId] = String(r.value)
        setValues(map)
      } catch {
        if (alive) setValues({})
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [period])

  const filled = useMemo(
    () => Object.values(values).filter((v) => v.trim() !== '' && Number.isFinite(Number(v))).length,
    [values]
  )

  const setVal = (id: number, v: string): void => setValues((prev) => ({ ...prev, [id]: v }))

  const save = async (): Promise<void> => {
    const entries = indicators
      .map((k) => ({ indicatorId: k.id, raw: values[k.id] }))
      .filter((e) => e.raw != null && e.raw.trim() !== '' && Number.isFinite(Number(e.raw)))
      .map((e) => ({ indicatorId: e.indicatorId, value: Number(e.raw) }))
    if (entries.length === 0) {
      setMsg('입력된 값이 없습니다 — 채운 지표만 저장됩니다.')
      return
    }
    setSaving(true)
    try {
      const res = (await window.api.invoke(window.api.channels.KPI_SAVE_BATCH, {
        period,
        entries,
        enteredBy
      })) as { success: boolean; saved: number }
      if (res.success) {
        setMsg(`✓ ${res.saved}개 지표 ${period.slice(5)}월 실적 저장 완료`)
        onSaved()
      } else {
        setMsg('저장 실패 — 다시 시도해 주세요.')
      }
    } finally {
      setSaving(false)
    }
  }

  const meets = (k: KpiIndicatorDto, raw?: string): boolean | null => {
    if (raw == null || raw.trim() === '' || k.target == null) return null
    const v = Number(raw)
    if (!Number.isFinite(v)) return null
    return k.direction === 'lower' ? v <= k.target : v >= k.target
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={onClose}
    >
      <div
        className="bg-card w-full max-w-3xl max-h-[86vh] rounded-xl shadow-2xl border border-border flex flex-col"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight">KPI 월별 실적 일괄 입력</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              값 있는 지표만 저장 · 빈칸=미입력 유지 · 같은 월 재입력=정정
            </p>
          </div>
          <label className="flex items-center gap-1.5 text-[12.5px] font-semibold shrink-0">
            대상 월
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="input-field !text-[12.5px] !py-1 !px-2"
            />
          </label>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-muted shrink-0"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* 본문 — 지표 목록(팀별 구분) */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {period.slice(5)}월 실적 불러오는 중...
            </div>
          ) : (
            <div className="space-y-0.5">
              {indicators.map((k, i) => {
                const prevTeam = i > 0 ? normalizeTeam(indicators[i - 1].ownerTeam) : null
                const team = normalizeTeam(k.ownerTeam)
                const showHeader = i === 0 || team !== prevTeam
                const theme = team ? teamTheme(team) : null
                const ok = meets(k, values[k.id])
                return (
                  <div key={k.id}>
                    {showHeader && (
                      <div className="flex items-center gap-1.5 mt-3 mb-1 first:mt-0">
                        {theme && (
                          <span
                            className="inline-block w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.border }}
                          />
                        )}
                        <span className="text-[11.5px] font-bold text-muted-foreground tracking-tight">
                          {theme ? theme.label : k.ownerTeam || '기타'}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-foreground leading-tight break-keep">
                          {k.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                          {k.target != null
                            ? `목표 ${k.target.toLocaleString()}${k.unit} ${k.direction === 'lower' ? '이하' : '이상'}`
                            : '목표 미설정'}
                        </div>
                      </div>
                      {ok != null && (
                        <span
                          className={cn(
                            'text-[11px] font-bold shrink-0',
                            ok ? 'text-emerald-600' : 'text-destructive'
                          )}
                        >
                          {ok ? '달성' : '미달'}
                        </span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          value={values[k.id] ?? ''}
                          onChange={(e) => setVal(k.id, e.target.value)}
                          placeholder="미입력"
                          className={cn(
                            'input-field !text-[13px] !py-1 !px-2 w-28 text-right tabular-nums',
                            ok === false && '!border-destructive/60'
                          )}
                        />
                        <span className="text-[11px] text-muted-foreground w-10">{k.unit}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-3.5 border-t border-border flex items-center gap-3">
          <div className="text-[12.5px] text-muted-foreground flex-1 min-w-0">
            {msg ? (
              <span className={cn('font-semibold', msg.startsWith('✓') ? 'text-emerald-600' : 'text-foreground')}>
                {msg}
              </span>
            ) : (
              <span>
                입력됨 <b className="text-foreground tabular-nums">{filled}</b> / {indicators.length}지표
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-border hover:bg-muted"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="text-[13px] font-bold px-4 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {period.slice(5)}월 실적 저장
          </button>
        </div>
      </div>
    </div>
  )
}
