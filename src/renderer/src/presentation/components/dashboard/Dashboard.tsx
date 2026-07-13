import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, AlertCircle, FileDown, ChevronDown, ChevronRight, Gauge } from 'lucide-react'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useDday } from '../../hooks/useDday'
import { KpiStrip } from './KpiStrip'
import { ScoreDistributionPanel } from './ScoreDistributionPanel'
import { RecentScoresPanel } from './RecentScoresPanel'
import { NeedsAttentionList } from './NeedsAttentionList'
import { HeaderBand } from './v3/HeaderBand'
import { KpiTiles, type KpiTileSpec } from './v3/KpiTiles'
import {
  TeamRail,
  DonutUnmet,
  TeamSignalColumns,
  UnmetHeatmap,
  TopUnmet,
  TrajectoryChart,
  TeamFormsFunnel
} from './v3/ChartPanels'
import { TodoStrip } from './v3/TodoStrip'
import { AiInsightsFold } from './v3/AiInsightsFold'
import { useV3Data, overallReadinessPct, codeToCategoryIndex } from './v3/useV3Data'
import type { ReportExportResult } from '@shared/ipc-types'

/**
 * 대시보드 v3 (2026-07-07 확정 목업 c8a47661) — Power BI 틀 + 시크릿 통합.
 * 원칙: AI는 카드(자리)가 아니라 데이터 옆 ✦각주·버튼으로.
 * 마이크로 인사이트는 결정론 룰(전부 산수), AI 문장은 접이식 카드 안(일 1회 캐시).
 */
export function Dashboard(): JSX.Element {
  const { load, loading, error, data } = useDashboardStore()
  const { readiness, teams, board } = useV3Data()
  const { dday, auditDate } = useDday()
  const [selectedCat, setSelectedCat] = useState<number | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [scoresOpen, setScoresOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const aiFoldRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void load()
  }, [load])

  const auditDateStr = `${auditDate.getFullYear()}.${String(auditDate.getMonth() + 1).padStart(2, '0')}.${String(auditDate.getDate()).padStart(2, '0')}`

  const codeToCat = useMemo(() => codeToCategoryIndex(readiness), [readiness])
  const readyPct = overallReadinessPct(readiness)

  // ── 결정론 산수(✦각주 근거) ──
  const allItems = useMemo(() => readiness?.categories.flatMap((c) => c.items) ?? [], [readiness])
  const measurable = allItems.filter((i) => i.signal !== 'gray')
  const metCount = measurable.filter((i) => i.signal === 'green').length
  const redItems = measurable.filter((i) => i.signal === 'red')
  const maxRedPoints = redItems.length > 0 ? Math.max(...redItems.map((i) => i.points)) : 0

  // E1 각주: 미충족 배점이 가장 큰 카테고리 → "해소 시 +N점 사정권"
  const topCatNote = useMemo(() => {
    if (!readiness) return undefined
    let best: { name: string; pts: number } | null = null
    for (const c of readiness.categories) {
      const pts = c.items.filter((i) => i.signal === 'red').reduce((s, i) => s + i.points, 0)
      if (pts > 0 && (!best || pts > best.pts)) best = { name: c.name, pts }
    }
    return best ? `${best.name} 해소 시 +${best.pts}점 사정권` : undefined
  }, [readiness])

  // 준비도 궤적: 필요 페이스(산수) vs 현 페이스(최근 4주 SQ 작성 이력)
  const weeksLeft = Math.max(1, Math.ceil(Math.max(0, dday) / 7))
  const projectedPct = useMemo(() => {
    if (readyPct == null) return 0
    const wsum = measurable.reduce((s, i) => s + i.points, 0)
    if (wsum === 0 || redItems.length === 0) return readyPct
    const avgRedPts = redItems.reduce((s, i) => s + i.points, 0) / redItems.length
    const itemsPerWeek = (data?.sqNewDrafts4w ?? 0) / 4 // 양식≈항목 1:1 근사
    const gain = ((itemsPerWeek * weeksLeft * avgRedPts) / wsum) * 100
    return Math.min(95, Math.round(readyPct + gain))
  }, [readyPct, measurable, redItems, data?.sqNewDrafts4w, weeksLeft])

  const monthLabels = useMemo(() => {
    const out: string[] = []
    const d = new Date()
    d.setDate(1)
    for (let i = 0; i < 12 && out.length < 6; i++) {
      out.push(`${d.getMonth() + 1}월`)
      if (d.getFullYear() === auditDate.getFullYear() && d.getMonth() === auditDate.getMonth()) break
      d.setMonth(d.getMonth() + 1)
    }
    return out
  }, [auditDate])

  const obligationsCount = (board?.overdue.length ?? 0) + (board?.dueSoon.length ?? 0)
  const coveragePct =
    data && data.formsTotal > 0 ? Math.round(((data.formsFillable ?? 0) / data.formsTotal) * 100) : 0

  const tiles: KpiTileSpec[] = [
    {
      key: 'dday',
      label: '심사까지',
      value: `${dday >= 0 ? 'D-' : 'D+'}${Math.abs(dday)}`,
      sub: `${auditDateStr} 정기심사`,
      tone: 'accent',
      page: 'schedule'
    },
    {
      key: 'readiness',
      label: 'SQ 준비도',
      value: readyPct != null ? String(readyPct) : '–',
      unit: '%',
      sub: `측정가능 ${measurable.length} 중 충족 ${metCount}`,
      aiNote: topCatNote,
      tone: 'accent',
      page: 'sq-readiness'
    },
    {
      key: 'unmet',
      label: '미충족 항목',
      value: String(redItems.length),
      sub: `${allItems.length}항목 중 · 최고 ${maxRedPoints}점`,
      tone: 'hot',
      valueTone: 'crit',
      page: 'sq-readiness'
    },
    {
      key: 'obligations',
      label: '정기 의무',
      value: String(obligationsCount),
      sub: `연체 ${board?.overdue.length ?? 0} · 임박 ${board?.dueSoon.length ?? 0}`,
      tone: 'warm',
      valueTone: obligationsCount > 0 ? 'warn' : undefined,
      page: 'obligations'
    },
    {
      key: 'cases',
      label: '미결 불량',
      value: String(data?.openCases ?? 0),
      sub: '접수·처리중 케이스',
      aiNote: (data?.openCases ?? 0) > 0 ? '과거 유사사례 매칭 가능' : undefined,
      tone: 'hot',
      valueTone: (data?.openCases ?? 0) > 0 ? 'crit' : undefined,
      page: 'case-work'
    },
    {
      key: 'coverage',
      label: '작성 커버리지',
      value: String(coveragePct),
      unit: '%',
      sub: `${data?.formsTotal ?? 0}양식 중 ${data?.formsFillable ?? 0} 작성가능`,
      tone: 'accent',
      page: 'form-builder'
    }
  ]

  const openAiFold = (): void => {
    setAiOpen(true)
    setTimeout(() => aiFoldRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = (await window.api.invoke(
        window.api.channels.REPORT_EXPORT_SCORES
      )) as ReportExportResult
      if (res.success) {
        alert(`AI 채점 리포트 ${res.count}건을 저장했습니다.\n\n${res.filePath}`)
      } else if (!res.canceled) {
        alert(`내보내기 실패: ${res.error ?? '알 수 없는 오류'}`)
      }
    } catch (err) {
      alert(`내보내기 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3 max-w-[2200px] mx-auto">
      <HeaderBand
        auditDateStr={auditDateStr}
        dday={dday}
        categories={readiness?.categories ?? []}
        selectedCat={selectedCat}
        onSelectCat={setSelectedCat}
      />

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>대시보드 집계 실패: {error}</span>
        </div>
      )}

      <KpiTiles tiles={tiles} />

      {readiness && (
        <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr_1.1fr_1.3fr] gap-3 lg:auto-rows-[minmax(320px,auto)]">
          <TeamRail />
          <DonutUnmet readiness={readiness} selectedCat={selectedCat} />
          <TeamSignalColumns teams={teams} codeToCat={codeToCat} selectedCat={selectedCat} />
          <UnmetHeatmap
            teams={teams}
            readiness={readiness}
            codeToCat={codeToCat}
            onHotspotClick={openAiFold}
          />
          <TopUnmet readiness={readiness} selectedCat={selectedCat} />
          <TrajectoryChart
            currentPct={readyPct ?? 0}
            projectedPct={projectedPct}
            weeksLeft={weeksLeft}
            redCount={redItems.length}
            monthLabels={monthLabels}
          />
          <TeamFormsFunnel teams={teams} />
        </div>
      )}
      {!readiness && (
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-6 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> 집계 불러오는 중...
        </div>
      )}

      {board && <TodoStrip board={board} onOpenAiFold={openAiFold} />}

      <AiInsightsFold ref={aiFoldRef} open={aiOpen} onToggle={() => setAiOpen(!aiOpen)} />

      {/* AI 채점 현황 — 접이식(양식 채점 파이프라인 리포트) */}
      <div className="bg-card border border-dashed border-border rounded-xl shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setScoresOpen(!scoresOpen)}
          className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        >
          <Gauge className="w-4 h-4 text-primary shrink-0" />
          <span className="text-[12px] font-bold text-muted-foreground">
            AI 채점 현황 — 평균점수 · 등급분포 · 최근채점 · 보완필요{loading && ' (집계 중...)'}
          </span>
          {scoresOpen ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 ml-auto shrink-0" />
          )}
        </button>
        {scoresOpen && (
          <div className="border-t border-border p-4 space-y-4 bg-muted/20">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting || !data || data.formsScored === 0}
                title={
                  data && data.formsScored === 0
                    ? '채점된 양식이 있어야 내보낼 수 있습니다'
                    : 'AI 채점 결과를 Excel로 내보냅니다'
                }
                className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 transition-colors"
              >
                {exporting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                리포트 내보내기
              </button>
            </div>
            <KpiStrip />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2">
                <ScoreDistributionPanel />
              </div>
              <div>
                <RecentScoresPanel />
              </div>
            </div>
            <NeedsAttentionList />
          </div>
        )}
      </div>

      <p className="text-[10.5px] text-muted-foreground text-center pt-1 pb-2">
        {data && (
          <>
            문서 BOM {data.bomTotalDocs}건 · 관련양식 {data.bomTotalForms}건 · 작성 초안{' '}
            {data.formsWithDraft}건 보유 ·{' '}
          </>
        )}
        ✦ = AI · 마이크로 인사이트는 결정론 룰 우선, AI 문장은 접이식 안(일 1회 캐시)
      </p>
    </div>
  )
}
