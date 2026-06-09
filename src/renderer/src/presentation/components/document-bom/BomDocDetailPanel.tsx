import { useEffect, useState } from 'react'
import {
  FileText,
  Files,
  BookOpen,
  Link as LinkIcon,
  ExternalLink,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useBomStore } from '../../stores/bomStore'
import type { BomFormRef, BomFormType, BomFormUsage } from '@shared/ipc-types'

const STATUS_TONE: Record<string, string> = {
  '현행일치': 'bg-success/15 text-success border-success/30',
  '개정완료(목록표갱신필요)': 'bg-warning/15 text-warning border-warning/30',
  '목록표미등록(신규)': 'bg-primary/15 text-primary border-primary/30',
  '파일없음(작성/수집필요)': 'bg-destructive/15 text-destructive border-destructive/30'
}

const TYPE_META: Record<BomFormType, { label: string; icon: typeof FileText; tone: string }> = {
  form: { label: '정규 양식', icon: Files, tone: 'bg-primary/10 text-primary border-primary/30' },
  variant: { label: '변종 양식', icon: Files, tone: 'bg-warning/10 text-warning border-warning/30' },
  appendix: { label: '부표', icon: BookOpen, tone: 'bg-muted text-foreground/70 border-border' },
  external_ref: { label: '외부참조', icon: ExternalLink, tone: 'bg-muted text-muted-foreground border-border' }
}

export function BomDocDetailPanel(): JSX.Element {
  const detail = useBomStore((s) => s.detail)
  const detailLoading = useBomStore((s) => s.detailLoading)
  const loadFormUsage = useBomStore((s) => s.loadFormUsage)
  const [usage, setUsage] = useState<BomFormUsage | null>(null)
  const [usageLoading, setUsageLoading] = useState(false)
  const [activeFormNoNorm, setActiveFormNoNorm] = useState<string | null>(null)
  const [subOpen, setSubOpen] = useState(false)

  useEffect(() => {
    setUsage(null)
    setActiveFormNoNorm(null)
    setSubOpen(false)
  }, [detail?.docNoNorm])

  if (!detail && !detailLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card border border-border rounded-lg text-sm text-muted-foreground gap-2">
        <FileText className="w-8 h-8 opacity-40" />
        <p>좌측에서 문서를 선택하세요.</p>
        <p className="text-[11px]">대항목 → 문서번호 → 관련 양식 순으로 트리가 표시됩니다.</p>
      </div>
    )
  }

  if (detailLoading || !detail) {
    return (
      <div className="h-full flex items-center justify-center bg-card border border-border rounded-lg text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  const tone = STATUS_TONE[detail.status] || 'bg-muted text-muted-foreground border-border'
  const isStale = detail.fileRev !== null && detail.listRev !== null && detail.fileRev > detail.listRev
  const isMissing = detail.status === '파일없음(작성/수집필요)'
  const isNew = detail.status === '목록표미등록(신규)'

  const handleFormClick = async (formNoNorm: string | null): Promise<void> => {
    if (!formNoNorm) return
    setActiveFormNoNorm(formNoNorm)
    setUsageLoading(true)
    const res = await loadFormUsage(formNoNorm)
    setUsage(res)
    setUsageLoading(false)
  }

  // Primary forms shown prominently; appendix/external_ref tucked into a collapsible section.
  const mainForms = detail.forms.filter((f) => f.formType === 'form' || f.formType === 'variant')
  const subForms = detail.forms.filter(
    (f) => f.formType === 'appendix' || f.formType === 'external_ref'
  )
  const typeCounts = (Object.keys(TYPE_META) as BomFormType[])
    .map((t) => [t, detail.forms.filter((f) => f.formType === t).length] as const)
    .filter(([, c]) => c > 0)

  const renderFormRow = (f: BomFormRef): JSX.Element => {
    const meta = TYPE_META[f.formType]
    const Icon = meta.icon
    const clickable = f.formType === 'form' || f.formType === 'variant'
    const active = activeFormNoNorm === f.formNoNorm
    return (
      <li key={f.id}>
        <button
          type="button"
          disabled={!clickable}
          onClick={() => handleFormClick(f.formNoNorm)}
          className={cn(
            'w-full text-left px-2.5 py-1.5 rounded border flex items-center gap-2 transition-colors',
            active ? 'bg-primary/10 border-primary' : 'border-border',
            clickable ? 'hover:bg-muted cursor-pointer' : 'cursor-default opacity-80'
          )}
        >
          <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded shrink-0', meta.tone)}>
            <Icon className="w-3 h-3" />
          </span>
          <span className="text-[10.5px] font-mono font-bold text-foreground/80 min-w-[88px] shrink-0">
            {f.formNoRaw || '—'}
          </span>
          <span className="text-xs flex-1 min-w-0 truncate" title={f.label}>
            {f.label}
          </span>
          {clickable && (
            <span title="이 양식을 인용하는 문서 보기 (클릭)" className="shrink-0 leading-none">
              <LinkIcon className={cn('w-3 h-3', active ? 'text-primary' : 'text-muted-foreground')} />
            </span>
          )}
        </button>
      </li>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border shrink-0">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center min-w-[88px] px-2 py-1 rounded text-xs font-mono font-bold bg-primary text-primary-foreground shrink-0">
            {detail.docNoRaw === '-' ? '매뉴얼' : detail.docNoRaw}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">{detail.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {detail.categoryLabel}
              {detail.ownerDept && <> · 책임 <span className="text-foreground">{detail.ownerDept}</span></>}
            </p>
          </div>
          <span className={cn('text-[11px] font-semibold px-2 py-1 rounded border', tone)}>
            {detail.status}
          </span>
        </div>

        {/* Rev table */}
        <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
          <div className="bg-muted/40 rounded p-2.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">목록표</div>
            <div className="mt-1 font-mono">
              {detail.listRev === null ? (
                <span className="text-muted-foreground">미등록</span>
              ) : (
                <>Rev.{detail.listRev}</>
              )}
              {detail.listDate && <span className="text-muted-foreground ml-1.5">{detail.listDate}</span>}
            </div>
          </div>
          <div className={cn('rounded p-2.5', isStale ? 'bg-warning/10' : isMissing ? 'bg-destructive/10' : 'bg-muted/40')}>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">실제 파일</div>
            <div className="mt-1 font-mono">
              {detail.fileRev === null ? (
                <span className="text-destructive">파일 없음</span>
              ) : (
                <span className={cn(isStale && 'text-warning font-bold')}>Rev.{detail.fileRev}</span>
              )}
              {detail.fileDate && <span className="text-muted-foreground ml-1.5">{detail.fileDate}</span>}
            </div>
          </div>
        </div>

        {(isStale || isMissing || isNew) && (
          <div className={cn(
            'mt-3 text-[11px] px-3 py-2 rounded border leading-relaxed',
            isStale && 'bg-warning/10 text-warning border-warning/30',
            isMissing && 'bg-destructive/10 text-destructive border-destructive/30',
            isNew && 'bg-primary/10 text-primary border-primary/30'
          )}>
            {isStale && '⚠ 실제 파일이 목록표보다 최신입니다. 마스터 목록표를 갱신하세요.'}
            {isMissing && '⚠ 파일이 폴더에 없습니다. 작성 또는 수집이 필요합니다.'}
            {isNew && '✨ 목록표 미등록 신규 문서입니다. 목록표에 등록 필요.'}
          </div>
        )}
      </div>

      {/* Forms list */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-sm font-semibold shrink-0">
              관련 양식 <span className="text-muted-foreground">({detail.forms.length})</span>
            </h3>
            {detail.forms.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1 text-[10px]">
                {typeCounts.map(([t, c]) => (
                  <span
                    key={t}
                    className={cn('px-1.5 py-0.5 rounded border whitespace-nowrap', TYPE_META[t]?.tone)}
                  >
                    {TYPE_META[t]?.label} {c}
                  </span>
                ))}
              </div>
            )}
          </div>

          {detail.forms.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">관련 양식이 등록되어 있지 않습니다.</p>
          ) : (
            <>
              {mainForms.length > 0 ? (
                <ul className="space-y-1">{mainForms.map(renderFormRow)}</ul>
              ) : (
                <p className="text-xs text-muted-foreground py-2">정규/변종 양식이 없습니다.</p>
              )}

              {subForms.length > 0 && (
                <div className="mt-4 border-t border-border/60 pt-3">
                  <button
                    type="button"
                    onClick={() => setSubOpen((v) => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {subOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                    부표 · 외부참조
                    <span className="text-foreground/50">({subForms.length})</span>
                  </button>
                  {subOpen && (
                    <ul className="space-y-1 mt-2">{subForms.map(renderFormRow)}</ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Right side: form usage (cross-doc reference) */}
        {activeFormNoNorm && (
          <div className="w-72 border-l border-border bg-muted/30 px-4 py-3 overflow-y-auto shrink-0">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
              이 양식을 인용하는 문서
            </div>
            {usageLoading ? (
              <p className="text-xs text-muted-foreground">조회 중...</p>
            ) : usage && usage.usedBy.length > 0 ? (
              <ul className="space-y-1">
                {usage.usedBy.map((u) => (
                  <li key={u.docNoNorm} className="bg-card border border-border rounded px-2 py-1.5">
                    <div className="text-[10.5px] font-mono font-bold text-primary">{u.docNoRaw}</div>
                    <div className="text-[11px] leading-snug text-foreground/80">{u.name}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">조회 결과 없음</p>
            )}
            {usage && usage.usedBy.length > 1 && (
              <p className="mt-2 text-[10px] text-warning leading-relaxed">
                공용 양식 — N:M 링크로 모델링됨
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
