import { useEffect, useState } from 'react'
import { ShieldAlert, Sparkles, Loader2, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { IsirCompleteness, IsirExplainResponse, PartListItem } from '@shared/ipc-types'
import { useUIStore } from '../../stores/uiStore'
import { usePartsStore } from '../../stores/partsStore'

/**
 * 대시보드 — ISIR 완비도(F1 ISIR판). 레퍼런스 품번의 ISIR 제출 26종 중 미제출 = SQ 공정감사 리스크.
 */
export function IsirCompletenessCard(): JSX.Element | null {
  const [comp, setComp] = useState<IsirCompleteness | null>(null)
  const [loading, setLoading] = useState(true)
  const [diag, setDiag] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const setPage = useUIStore((s) => s.setPage)
  const select = usePartsStore((s) => s.select)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const list = (await window.api.invoke(window.api.channels.PARTS_LIST)) as PartListItem[]
        // ISIR 제출본이 있는 첫 품번
        const target = list.find((p) => p.isirCount > 0) ?? list[0]
        if (!target) {
          if (alive) setLoading(false)
          return
        }
        const c = (await window.api.invoke(window.api.channels.AI_ISIR_COMPLETENESS, {
          partNo: target.partNo
        })) as IsirCompleteness
        if (alive) setComp(c)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const askAi = async (): Promise<void> => {
    if (!comp) return
    setLoadingAi(true)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_ISIR_EXPLAIN, {
        check: comp
      })) as IsirExplainResponse
      setDiag(res.success ? res.text || '' : `진단 실패: ${res.error ?? '오류'}`)
    } catch (err) {
      setDiag(`진단 오류: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setLoadingAi(false)
    }
  }

  const openDetail = (): void => {
    if (!comp) return
    void select(comp.partNo)
    setPage('parts')
  }

  // 적재된 ISIR이 없으면 카드 자체를 숨김(노이즈 방지)
  if (!loading && (!comp || !comp.pkg)) return null

  const missing = comp?.docs.filter((d) => d.status === 'missing') ?? []

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[16.5px] font-bold flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-primary" />
          ISIR 완비도
          <span className="text-[12.5px] font-normal text-muted-foreground">고객 협의 통제 패키지의 제출 현황</span>
        </h2>
        {comp?.pkg && (
          <button
            type="button"
            onClick={() => void askAi()}
            disabled={loadingAi}
            className="text-[13.5px] font-semibold px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
          >
            {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            AI 진단
          </button>
        )}
      </div>

      {loading && (
        <div className="py-6 flex items-center justify-center text-muted-foreground text-[13.5px] gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중…
        </div>
      )}

      {comp?.pkg && (
        <>
          <button
            type="button"
            onClick={openDetail}
            className="group w-full flex items-center gap-2 mb-3 text-left"
          >
            <span className="font-mono text-[14px] font-bold">{comp.partNo}</span>
            <span className="text-[12.5px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {comp.pkg.submitTypeLabel}
            </span>
            <span className="text-[14.5px] text-muted-foreground break-keep leading-snug flex-1">{comp.partName}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>

          <div className="flex gap-4 text-[14.5px] mb-2">
            <span className="font-semibold">필수 {comp.summary.totalRequired}종</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />제출 {comp.summary.present}
            </span>
            <span className="text-red-600 font-semibold flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />미제출 {comp.summary.missing}
            </span>
            <span className="text-muted-foreground">· 관리항목 {comp.cpItemCount}개({comp.processCount}공정)</span>
          </div>

          {diag && (
            <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[14.5px] whitespace-pre-wrap leading-relaxed">
              {diag}
            </div>
          )}

          {missing.length > 0 ? (
            <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-[14.5px] text-red-700">
              <b>미제출:</b> {missing.map((d) => `${d.docNo}.${d.docName}`).join(', ')}
            </div>
          ) : (
            <p className="text-[13.5px] text-emerald-600 font-medium">필수 문서 전부 제출됨 ✓</p>
          )}
        </>
      )}
    </div>
  )
}
