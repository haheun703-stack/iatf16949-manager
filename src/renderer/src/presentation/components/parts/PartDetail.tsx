import { useMemo, useState } from 'react'
import {
  Loader2, Sparkles, CheckCircle2, XCircle, Package, ShieldAlert, ClipboardList, AlertTriangle
} from 'lucide-react'
import type {
  PartDetailDto, ControlPlanItemDto, IsirExplainResponse
} from '@shared/ipc-types'

function Stat({ label, value }: { label: string; value: string | number | null }): JSX.Element {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-[13px] font-semibold truncate">{value ?? '—'}</div>
    </div>
  )
}

export function PartDetail({ detail }: { detail: PartDetailDto }): JSX.Element {
  const { completeness: comp, controlPlan, defects } = detail
  const pkg = comp.pkg
  const [diag, setDiag] = useState<string | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)

  const askAi = async (): Promise<void> => {
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

  // 관리계획서 공정별 그룹
  const groups = useMemo(() => {
    const m = new Map<string, ControlPlanItemDto[]>()
    for (const it of controlPlan) {
      const key = it.processName || '(공정 미상)'
      if (!m.has(key)) m.set(key, [])
      m.get(key)!.push(it)
    }
    return [...m.entries()]
  }, [controlPlan])

  const missing = comp.docs.filter((d) => d.status === 'missing')

  return (
    <div className="space-y-5">
      {/* ── 헤더 ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold font-mono">{detail.partNo}</h2>
              {pkg && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {pkg.submitTypeLabel}
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">{detail.partName}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          <Stat label="고객" value={detail.customer} />
          <Stat label="차종" value={detail.model} />
          <Stat label="수요자" value={pkg?.customerRecipient ?? null} />
          <Stat label="IRE 위험도" value={pkg?.ireRisk ?? null} />
          <Stat label="사양" value={pkg?.revCode ?? null} />
          <Stat label="제출일" value={pkg?.submittedAt ?? null} />
          <Stat label="품질보증책임자" value={pkg?.qaManager ?? null} />
          <Stat label="관리항목" value={`${comp.cpItemCount}개 / ${comp.processCount}공정`} />
        </div>
      </div>

      {/* ── ISIR 완비도(26종) ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-primary" />
            ISIR 완비도
            <span className="text-[11px] font-normal text-muted-foreground">제출유형 기준 필수 문서</span>
          </h3>
          {pkg && (
            <button
              type="button"
              onClick={() => void askAi()}
              disabled={loadingAi}
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border border-primary/40 text-primary hover:bg-primary/5 disabled:opacity-50 flex items-center gap-1.5"
            >
              {loadingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI 진단
            </button>
          )}
        </div>

        {!pkg ? (
          <p className="text-[12px] text-muted-foreground py-2">이 품번의 ISIR 제출본이 아직 적재되지 않았습니다.</p>
        ) : (
          <>
            <div className="flex gap-4 text-[12px] mb-3">
              <span className="font-semibold">필수 {comp.summary.totalRequired}종</span>
              <span className="text-emerald-600 font-semibold">제출 {comp.summary.present}</span>
              <span className="text-red-600 font-semibold">미제출 {comp.summary.missing}</span>
            </div>

            {diag && (
              <div className="mb-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-[13px] whitespace-pre-wrap leading-relaxed">
                {diag}
              </div>
            )}

            {missing.length > 0 && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-700">
                <b>미제출 {missing.length}종:</b> {missing.map((d) => `${d.docNo}.${d.docName}`).join(', ')}
              </div>
            )}

            {/* 26종 그리드 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
              {comp.docs.map((d) => {
                const dim = !d.required
                const Icon = d.present ? CheckCircle2 : XCircle
                const cls = !d.required
                  ? 'text-muted-foreground/50'
                  : d.present
                    ? 'text-emerald-600'
                    : 'text-red-600'
                return (
                  <div key={d.docNo} className={`flex items-center gap-2 text-[12px] py-0.5 ${dim ? 'opacity-50' : ''}`}>
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${cls}`} />
                    <span className="font-mono text-[10px] text-muted-foreground w-5 shrink-0 text-right">{d.docNo}</span>
                    <span className="flex-1 min-w-0 truncate">{d.docName}</span>
                    {!d.required && <span className="text-[10px] text-muted-foreground shrink-0">해당무</span>}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 관리계획서(Control Plan) ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3">
          <ClipboardList className="w-4 h-4 text-primary" />
          관리계획서 <span className="text-[11px] font-normal text-muted-foreground">{controlPlan.length}개 관리항목 · SQ 공정감사 기준</span>
        </h3>
        {controlPlan.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-2">관리계획서 항목이 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {groups.map(([proc, rows]) => (
              <div key={proc} className="rounded-lg border border-border overflow-hidden">
                <div className="bg-muted/50 px-3 py-1.5 text-[12px] font-bold">{proc}</div>
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left font-medium px-3 py-1 w-[26%]">관리항목</th>
                      <th className="text-left font-medium px-2 py-1 w-[30%]">규격</th>
                      <th className="text-left font-medium px-2 py-1 w-[14%]">확인방법</th>
                      <th className="text-left font-medium px-2 py-1 w-[14%]">주기</th>
                      <th className="text-left font-medium px-2 py-1">관리방안</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((it) => (
                      <tr key={it.seq} className="border-b border-border/50 last:border-0 align-top">
                        <td className="px-3 py-1.5">
                          <span className="font-medium">{it.controlItem || '—'}</span>
                          {it.special && <span className="ml-1 text-[9px] px-1 rounded bg-amber-100 text-amber-700">특별</span>}
                        </td>
                        <td className="px-2 py-1.5 text-muted-foreground">{it.spec || '—'}</td>
                        <td className="px-2 py-1.5">{it.method || '—'}</td>
                        <td className="px-2 py-1.5">{it.frequency || '—'}</td>
                        <td className="px-2 py-1.5 text-muted-foreground">{it.controlMethod || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 불량 이력 ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold flex items-center gap-1.5 mb-3">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          불량 개선대책 이력 <span className="text-[11px] font-normal text-muted-foreground">{defects.length}건</span>
        </h3>
        {defects.length === 0 ? (
          <p className="text-[12px] text-muted-foreground py-2">등록된 불량 케이스가 없습니다.</p>
        ) : (
          <div className="rounded-lg border border-border divide-y divide-border">
            {defects.map((d, i) => (
              <div key={d.caseNo ?? i} className="flex items-center gap-2.5 px-3 py-2 text-[12px]">
                <span className="font-mono text-[10px] text-muted-foreground w-24 shrink-0">{d.caseNo ?? '—'}</span>
                <span className="flex-1 min-w-0 truncate">{d.title || d.defectDesc || '—'}</span>
                <span className="text-[11px] text-muted-foreground shrink-0">{d.occurredDate ?? ''}</span>
                <span className={`text-[10px] font-semibold shrink-0 px-1.5 py-0.5 rounded ${d.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {d.status ?? ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
