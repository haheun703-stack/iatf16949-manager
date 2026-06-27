import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, FileDown, ShieldCheck, CalendarClock, FileEdit, Gauge, ChevronRight, Sparkles } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useDashboardStore } from '../../stores/dashboardStore'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { KpiStrip } from './KpiStrip'
import { BriefingCard } from './BriefingCard'
import { ReadinessCard } from './ReadinessCard'
import { AbsenceCard } from './AbsenceCard'
import { FlywheelCard } from './FlywheelCard'
import { ScoreDistributionPanel } from './ScoreDistributionPanel'
import { RecentScoresPanel } from './RecentScoresPanel'
import { NeedsAttentionList } from './NeedsAttentionList'
import type { ReportExportResult } from '@shared/ipc-types'

export function Dashboard(): JSX.Element {
  const { load, loading, error, data } = useDashboardStore()
  const [exporting, setExporting] = useState(false)
  const { dday, auditDate } = useDday()
  const auditDateStr = `${auditDate.getFullYear()}.${String(auditDate.getMonth() + 1).padStart(2, '0')}.${String(auditDate.getDate()).padStart(2, '0')}`
  const scored = data?.formsScored ?? 0
  const total = data?.formsTotal ?? 0
  const readyPct = total > 0 ? Math.round((scored / total) * 100) : 0
  const setPage = useUIStore((s) => s.setPage)

  const nextActions: {
    icon: typeof FileEdit
    step: string
    title: string
    desc: string
    tone: string
    page: PageId
  }[] = [
    { icon: FileEdit, step: 'STEP 1', title: '양식 작성하기', desc: `${total}개 양식 중 작성을 시작하세요`, tone: 'from-violet-500 to-indigo-500', page: 'form-builder' },
    { icon: Gauge, step: 'STEP 2', title: 'AI 채점 받기', desc: '작성본을 IATF 16949 기준으로 평가', tone: 'from-emerald-500 to-teal-500', page: 'form-builder' },
    { icon: CalendarClock, step: 'STEP 3', title: '심사 일정 점검', desc: `D-${Math.abs(dday)} · 남은 일정을 캘린더로 확인`, tone: 'from-amber-500 to-orange-500', page: 'schedule' }
  ]

  useEffect(() => {
    void load()
  }, [load])

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
    <div className="space-y-8 max-w-[1400px] mx-auto">
      {/* Hero — 프로그램 아이덴티티: 심사 카운트다운 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-700 text-white px-7 py-6 shadow-lg shadow-violet-600/25">
        <div aria-hidden className="absolute -right-10 -top-24 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div aria-hidden className="absolute right-52 -bottom-28 w-64 h-64 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold bg-white/15 px-2.5 py-1 rounded-full mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              IATF 16949 품질경영시스템 · TPC AM사업부
            </div>
            <h1 className="text-[30px] font-bold tracking-tight leading-[1.1]">심사 준비 현황</h1>
            <p className="text-[13px] text-white/70 mt-2">2026년 정기 IATF 16949 인증심사 대비</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-4">
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting || !data || data.formsScored === 0}
              title={data && data.formsScored === 0 ? '채점된 양식이 있어야 내보낼 수 있습니다' : 'AI 채점 결과를 Excel로 내보냅니다'}
              className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-white/15 hover:bg-white/25 border border-white/25 text-white disabled:opacity-50 flex items-center gap-1.5 transition-colors backdrop-blur-sm"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              리포트 내보내기
            </button>
            <div className="text-right">
              <div className="flex items-baseline gap-0.5 justify-end leading-none">
                <span className="text-3xl font-bold text-white/75">{dday >= 0 ? 'D-' : 'D+'}</span>
                <span className="text-[60px] font-black tabular-nums tracking-tighter">{Math.abs(dday)}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 justify-end text-[11px] text-white/75">
                <CalendarClock className="w-3.5 h-3.5" />
                정기 인증심사 · {auditDateStr}
              </div>
            </div>
          </div>
        </div>

        {/* 준비도 — AI 채점 완료율 */}
        <div className="relative mt-6">
          <div className="flex items-center justify-between text-[11px] text-white/75 mb-1.5">
            <span className="flex items-center gap-1.5">
              {loading && <Loader2 className="w-3 h-3 animate-spin" />}
              AI 채점 완료율
            </span>
            <span className="tabular-nums font-semibold text-white">
              {scored} / {total} 양식 · {readyPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 transition-all duration-500"
              style={{ width: `${readyPct}%` }}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>대시보드 집계 실패: {error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BriefingCard />
        <ReadinessCard />
      </div>

      <AbsenceCard />
      <FlywheelCard />

      <KpiStrip />

      {/* 지금 할 일 — 다음 액션 가이드 */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-primary" />
          지금 할 일
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {nextActions.map((a) => {
            const Icon = a.icon
            return (
              <button
                key={a.title}
                type="button"
                onClick={() => setPage(a.page)}
                className="group text-left bg-card border border-border rounded-xl shadow-sm p-5 hover:shadow-md hover:border-primary/30 transition-all flex items-start gap-3.5"
              >
                <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0 shadow-sm', a.tone)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-muted-foreground tracking-wide">{a.step}</div>
                  <div className="text-[15px] font-bold mt-0.5">{a.title}</div>
                  <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{a.desc}</div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ScoreDistributionPanel />
        </div>
        <div>
          <RecentScoresPanel />
        </div>
      </div>

      <NeedsAttentionList />

      {data && (
        <p className="text-[11px] text-muted-foreground text-center pt-1">
          문서 BOM {data.bomTotalDocs}건 · 관련양식 {data.bomTotalForms}건 · 작성 초안 {data.formsWithDraft}건 보유
        </p>
      )}
    </div>
  )
}
