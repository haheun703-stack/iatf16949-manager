import { useCallback, useEffect, useState } from 'react'
import { Loader2, RefreshCw, ShieldCheck, ChevronDown, ChevronRight } from 'lucide-react'
import type { IntegrityReportDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'

/**
 * 정합성 점검 (7/19 검수 체계 1층) — 팀→프로세스→규정→양식→의무→SQ 체인의
 * 결정론 검사 11종 결과. "문제 0건"이 정상 상태. 검사 정의는 main/integrity-handlers.
 * AI 검수 에이전트(.claude/agents/integrity-auditor)는 이 결과를 근거로 판단(결정론 우선).
 */

const STATUS_STYLE = {
  ok: { label: '정상', bg: '#e2f3e2', fg: '#1d6b1d' },
  warn: { label: '주의', bg: '#faeeda', fg: '#7a4d05' },
  fail: { label: '문제', bg: '#fcebeb', fg: '#a32d2d' }
} as const

export function IntegrityView(): JSX.Element {
  const [report, setReport] = useState<IntegrityReportDto | null>(null)
  const [running, setRunning] = useState(false)
  const [openKey, setOpenKey] = useState<string | null>(null)

  const run = useCallback(async () => {
    setRunning(true)
    try {
      const res = (await window.api.invoke(window.api.channels.INTEGRITY_CHECK)) as IntegrityReportDto
      setReport(res)
    } catch {
      setReport(null)
    } finally {
      setRunning(false)
    }
  }, [])

  useEffect(() => {
    void run()
  }, [run])

  const t = report?.totals

  return (
    <div className="space-y-6 break-keep">
      <PageHeader
        icon={<ShieldCheck size={18} />}
        title="정합성 점검"
        sub="팀 → 프로세스 → 규정 → 양식 → 의무 → SQ 체인의 결정론 검사 — 전부 '정상'이 기본 상태입니다"
        actions={
          <button
            type="button"
            onClick={() => void run()}
            disabled={running}
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold bg-primary text-primary-foreground px-3.5 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', running && 'animate-spin')} /> 다시 검사
          </button>
        }
      />

      {!report ? (
        <div className="flex items-center justify-center gap-2 py-24 text-[14.5px] text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> 검사 중...
        </div>
      ) : (
        <>
          {/* 요약 */}
          <div className="grid grid-cols-3 gap-5 max-w-[720px]">
            {(['ok', 'warn', 'fail'] as const).map((s) => (
              <div key={s} className="bg-card border border-border rounded-xl px-6 py-5">
                <div className="text-[16.5px] font-bold text-foreground">{STATUS_STYLE[s].label}</div>
                <div
                  className="text-[40px] font-extrabold tabular-nums leading-tight mt-1"
                  style={{ color: s === 'ok' ? '#1d6b1d' : s === 'warn' ? '#7a4d05' : '#a32d2d' }}
                >
                  {t ? t[s] : 0}
                </div>
                <div className="text-[13.5px] text-muted-foreground">/ {report.rows.length}개 검사</div>
              </div>
            ))}
          </div>

          {/* 검사 목록 */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {report.rows.map((r) => {
              const st = STATUS_STYLE[r.status]
              const open = openKey === r.key
              return (
                <div key={r.key} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenKey(open ? null : r.key)}
                    className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-muted/40"
                  >
                    {r.count > 0 ? (
                      open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />
                    ) : (
                      <span className="w-4 shrink-0" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="text-[15.5px] font-bold text-foreground">{r.name}</span>
                      <span className="block text-[13.5px] text-muted-foreground mt-0.5 leading-snug">{r.note}</span>
                    </span>
                    {r.count > 0 && (
                      <span className="text-[15px] font-extrabold tabular-nums shrink-0" style={{ color: st.fg }}>
                        {r.count}건
                      </span>
                    )}
                    <span
                      className="text-[12.5px] font-bold px-2.5 py-1 rounded-full shrink-0"
                      style={{ backgroundColor: st.bg, color: st.fg }}
                    >
                      {st.label}
                    </span>
                  </button>
                  {open && r.details.length > 0 && (
                    <ul className="px-6 pb-4 pl-[52px] space-y-1.5">
                      {r.details.map((d) => (
                        <li key={d} className="text-[14px] text-foreground leading-snug list-disc">
                          {d}
                        </li>
                      ))}
                      {r.count > r.details.length && (
                        <li className="text-[13px] text-muted-foreground list-none">
                          외 {r.count - r.details.length}건…
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-[13.5px] text-muted-foreground">
            마지막 검사: {new Date(report.ranAt).toLocaleString('ko-KR')} — 마이그레이션·시드 추가 후에는 이
            화면을 다시 실행해 <b>문제 0건</b>을 확인하세요. 검사 항목 정의는 개발 문서(integrity-handlers) 참조.
          </p>
        </>
      )}
    </div>
  )
}
