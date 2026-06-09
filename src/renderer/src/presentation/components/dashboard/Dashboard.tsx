import { useEffect, useState } from 'react'
import { Loader2, AlertCircle, FileDown } from 'lucide-react'
import { useDashboardStore } from '../../stores/dashboardStore'
import { KpiStrip } from './KpiStrip'
import { ScoreDistributionPanel } from './ScoreDistributionPanel'
import { RecentScoresPanel } from './RecentScoresPanel'
import { NeedsAttentionList } from './NeedsAttentionList'
import type { ReportExportResult } from '@shared/ipc-types'

export function Dashboard(): JSX.Element {
  const { load, loading, error, data } = useDashboardStore()
  const [exporting, setExporting] = useState(false)

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
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">심사 준비 현황</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            2026년 정기 IATF 16949 인증심사 대비 — TPC AM사업부
          </p>
        </div>
        <div className="flex items-center gap-3">
          {loading && (
            <span className="text-[12px] text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              집계 중...
            </span>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting || !data || data.formsScored === 0}
            title={data && data.formsScored === 0 ? '채점된 양식이 있어야 내보낼 수 있습니다' : 'AI 채점 결과를 Excel로 내보냅니다'}
            className="text-xs font-semibold px-3 py-2 rounded-md border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
          >
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            리포트 내보내기
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>대시보드 집계 실패: {error}</span>
        </div>
      )}

      <KpiStrip />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
