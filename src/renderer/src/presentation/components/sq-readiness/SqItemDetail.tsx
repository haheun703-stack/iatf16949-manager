import { useEffect, useState } from 'react'
import { ScrollText, FileText, PenLine, Building2 } from 'lucide-react'
import type { SqItemDetailDto, SqSignal } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'

/**
 * SQ 항목 상세 — 요건(requirement) + 지배규정(sq_item_docs) + 매핑 양식.
 * 양식 [작성] 클릭 → selectedFormCode 설정 + form-builder 페이지로 이동(기존 작성 화면 재사용).
 */
export function SqItemDetail({
  code,
  signalText,
  signalLabel
}: {
  code: string
  signalText: Record<SqSignal, string>
  signalLabel: Record<SqSignal, string>
}): JSX.Element {
  const [detail, setDetail] = useState<SqItemDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)

  useEffect(() => {
    let alive = true
    setLoading(true)
    window.api.invoke(window.api.channels.SQ_ITEM_DETAIL, { code })
      .then((d) => {
        if (alive) {
          setDetail(d)
          setLoading(false)
        }
      })
      .catch(() => {
        // IPC 실패 시 무한 '불러오는 중' 방지
        if (alive) {
          setDetail(null)
          setLoading(false)
        }
      })
    return () => {
      alive = false
    }
  }, [code])

  const openForm = (formCode: string): void => {
    setSelectedFormCode(formCode)
    setPage('form-builder')
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground py-12 text-center">불러오는 중...</div>
  }
  if (!detail) {
    return <div className="text-sm text-muted-foreground py-12 text-center">항목을 찾을 수 없습니다.</div>
  }

  const standardizedCount = detail.forms.filter((f) => f.standardized).length

  return (
    <div className="bg-card border border-border rounded-xl p-5 max-w-[760px]">
      {/* 제목 */}
      <div className="flex items-start gap-3 mb-4">
        <span className="font-mono text-xs text-muted-foreground bg-muted rounded px-2 py-1 mt-0.5">
          {detail.code}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold leading-snug">{detail.title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {detail.categoryName} · {detail.points}점
          </p>
        </div>
      </div>

      {/* 요건 */}
      {detail.requirement && (
        <section className="mb-4">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground mb-1.5">
            <ScrollText className="w-3.5 h-3.5" /> 평가 요건
          </h3>
          <div className="text-[13px] leading-relaxed whitespace-pre-wrap bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
            {detail.requirement}
          </div>
        </section>
      )}

      {/* 지배 규정 */}
      {detail.docs.length > 0 && (
        <section className="mb-4">
          <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground mb-1.5">
            <Building2 className="w-3.5 h-3.5" /> 지배 규정
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {detail.docs.map((d, i) => (
              <span
                key={`${d.docCode}-${i}`}
                className="text-[11px] bg-secondary rounded px-2 py-1 text-muted-foreground"
                title={d.dept ?? undefined}
              >
                <span className="font-mono font-semibold text-foreground">{d.docCode}</span>
                {d.docName ? ` ${d.docName}` : ''}
                {d.dept ? ` · ${d.dept}` : ''}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 필요 양식유형(코워크 분류) */}
      {detail.formTypes.length > 0 && (
        <section className="mb-4">
          <h3 className="text-[12px] font-bold text-muted-foreground mb-1.5">기대 양식유형</h3>
          <div className="flex flex-wrap gap-1.5">
            {detail.formTypes.map((t, i) => (
              <span key={`${t}-${i}`} className="text-[11px] bg-primary/5 text-primary/80 rounded px-2 py-0.5">
                {t}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* 매핑 양식 */}
      <section>
        <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground mb-1.5">
          <FileText className="w-3.5 h-3.5" /> 매핑 양식 ({detail.forms.length})
          {detail.forms.length > 0 && (
            <span className="font-normal text-muted-foreground/70">
              · 표준화 {standardizedCount}/{detail.forms.length}
            </span>
          )}
        </h3>
        {detail.forms.length === 0 ? (
          <div className="text-[12px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2.5 border border-border">
            이 항목에 매핑된 양식이 아직 없습니다 (규정↔양식 매핑 또는 양식 미보유). 후속 표준화 대상.
          </div>
        ) : (
          <div className="space-y-1.5">
            {detail.forms.map((f) => (
              <div
                key={f.formCode}
                className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 bg-card"
              >
                <span className="font-mono text-[11px] text-muted-foreground w-[78px] shrink-0">{f.formCode}</span>
                <span className="flex-1 text-[13px] truncate">{f.formName}</span>
                {f.draftCount > 0 && (
                  <span className="text-[10px] font-semibold text-success bg-success/10 px-1.5 py-0.5 rounded shrink-0">
                    작성 {f.draftCount}
                  </span>
                )}
                {f.standardized ? (
                  <span className="text-[10px] text-success shrink-0">표준화 ✓</span>
                ) : (
                  <span className="text-[10px] text-warning shrink-0">표준화 필요</span>
                )}
                <button
                  type="button"
                  onClick={() => openForm(f.formCode)}
                  className={cn(
                    'shrink-0 flex items-center gap-1 text-[11px] font-semibold rounded px-2 py-1 transition-colors',
                    f.standardized
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  <PenLine className="w-3 h-3" />
                  {f.standardized ? '작성' : '열기'}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 신호 범례 */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border text-[10px] text-muted-foreground">
        {(['green', 'yellow', 'red', 'gray'] as SqSignal[]).map((s) => (
          <span key={s} className={cn('flex items-center gap-1', signalText[s])}>
            ● {signalLabel[s]}
          </span>
        ))}
      </div>
    </div>
  )
}
