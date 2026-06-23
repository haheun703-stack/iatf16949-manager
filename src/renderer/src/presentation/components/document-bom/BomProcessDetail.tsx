import { useEffect, useMemo, useState } from 'react'
import { Layers, FileText, ChevronRight, Loader2, ImageOff, Files, X, PencilLine } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { FormCanvas } from '../form-builder/FormCanvas'
import type { ProcessDetailDto, FormDefinitionDto } from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

const CATEGORY_LABEL: Record<string, string> = {
  CP: '핵심 프로세스 (Core)',
  MP: '경영 프로세스 (Management)',
  SP: '지원 프로세스 (Support)'
}

/**
 * 문서 BOM에서 프로세스(CP/MP/SP)를 선택했을 때의 우측 상세.
 * 규정 문서와 달리 process_forms 기반 매핑 + 흐름도 이미지를 "교과서식"으로 보여준다.
 * 관련 양식을 클릭하면 우측에 양식 기본정보+필드 목록을 추가 표시.
 */
export function BomProcessDetail({ code }: { code: string }): JSX.Element {
  const [detail, setDetail] = useState<ProcessDetailDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [imgLoading, setImgLoading] = useState(false)

  const [activeFormCode, setActiveFormCode] = useState<string | null>(null)
  const [form, setForm] = useState<FormDefinitionDto | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // 작성 드로어 (실제 편집기 FormCanvas를 넓게 띄움)
  const [writeOpen, setWriteOpen] = useState(false)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)

  const openWriter = async (formCode: string): Promise<void> => {
    await loadFormDefinition(formCode)
    setWriteOpen(true)
  }

  // ESC로 드로어 닫기
  useEffect(() => {
    if (!writeOpen) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setWriteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [writeOpen])

  // 프로세스 상세 로드 (+ 첫 이미지 페이지를 흐름도로)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setDetail(null)
    setImgUrl(null)
    setActiveFormCode(null)
    setForm(null)
    void (async () => {
      const res = (await window.api.invoke(ch('PROCESS_GET_DETAIL'), { code })) as ProcessDetailDto | null
      if (!alive) return
      setDetail(res)
      setLoading(false)
      const pageWithImg = res?.pages.find((p) => p.imagePath)
      if (pageWithImg) {
        setImgLoading(true)
        const r = (await window.api.invoke(ch('PROCESS_PAGE_READ_IMAGE'), {
          pageId: pageWithImg.id
        })) as { success: boolean; dataUrl?: string }
        if (!alive) return
        setImgUrl(r.success ? r.dataUrl ?? null : null)
        setImgLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [code])

  const handleFormClick = async (formCode: string): Promise<void> => {
    setActiveFormCode(formCode)
    setFormLoading(true)
    const res = (await window.api.invoke(ch('FORM_GET_DEFINITION'), { code: formCode })) as
      | FormDefinitionDto
      | null
    setForm(res)
    setFormLoading(false)
  }

  // 양식 필드를 섹션별로 묶기
  const fieldSections = useMemo(() => {
    if (!form) return []
    const map = new Map<string, FormDefinitionDto['fields']>()
    for (const f of form.fields) {
      const s = f.section || '기타'
      if (!map.has(s)) map.set(s, [])
      map.get(s)!.push(f)
    }
    return [...map.entries()]
  }, [form])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-card border border-border rounded-xl shadow-sm text-sm text-muted-foreground">
        불러오는 중...
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-card border border-border rounded-xl shadow-sm text-sm text-muted-foreground gap-2">
        <Layers className="w-8 h-8 opacity-40" />
        <p>프로세스 정보를 찾을 수 없습니다. ({code})</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border shrink-0 flex items-start gap-3">
        <span className="inline-flex items-center justify-center min-w-[64px] px-2 py-1 rounded text-xs font-mono font-bold bg-primary text-primary-foreground shrink-0">
          {detail.code}
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold leading-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary shrink-0" />
            {detail.name}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {CATEGORY_LABEL[detail.category] || detail.category}
            {detail.docNo && <> · {detail.docNo}</>}
          </p>
        </div>
      </div>

      {/* Body: 교과서식(설명+흐름도) + 관련양식  |  양식상세 */}
      <div className="flex-1 min-h-0 flex">
        <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4 space-y-5">
          {/* 교과서식 설명 */}
          <section>
            {detail.description && (
              <p className="text-sm leading-relaxed text-foreground/90 bg-muted/40 rounded-lg px-4 py-3 border border-border/60">
                {detail.description}
              </p>
            )}

            {/* 흐름도 이미지 */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">
                프로세스 흐름도
              </div>
              <div className="rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center min-h-[140px]">
                {imgLoading ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-2 py-8">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    흐름도 불러오는 중...
                  </span>
                ) : imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={`${detail.code} 흐름도`}
                    className="w-full h-auto select-none"
                    draggable={false}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground flex flex-col items-center gap-1.5 py-8">
                    <ImageOff className="w-6 h-6 opacity-40" />
                    등록된 흐름도 이미지가 없습니다.
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* 관련 양식 */}
          <section>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Files className="w-4 h-4 text-primary" />
              관련 양식 <span className="text-muted-foreground">({detail.forms.length})</span>
            </h3>
            {detail.forms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3">연결된 양식이 없습니다.</p>
            ) : (
              <ul className="space-y-1">
                {detail.forms.map((f) => {
                  const active = activeFormCode === f.formCode
                  return (
                    <li key={f.formCode}>
                      <button
                        type="button"
                        onClick={() => handleFormClick(f.formCode)}
                        className={cn(
                          'w-full text-left px-2.5 py-2 rounded border flex items-center gap-2.5 transition-colors',
                          active ? 'bg-primary/10 border-primary' : 'border-border hover:bg-muted'
                        )}
                      >
                        <span
                          className={cn(
                            'inline-flex items-center justify-center min-w-[72px] px-1.5 py-0.5 text-[10.5px] font-mono font-bold rounded shrink-0',
                            active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80'
                          )}
                        >
                          {f.formCode}
                        </span>
                        <span className="text-xs flex-1 min-w-0 truncate" title={f.formName}>
                          {f.formName}
                        </span>
                        {f.fieldsCount > 0 && (
                          <span className="text-[10.5px] text-muted-foreground tabular-nums shrink-0">
                            필드 {f.fieldsCount}
                          </span>
                        )}
                        <ChevronRight
                          className={cn(
                            'w-4 h-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground/40'
                          )}
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        {/* 양식 상세 (클릭 시) */}
        {activeFormCode && (
          <div className="w-80 border-l border-border bg-muted/20 flex flex-col shrink-0">
            <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2 shrink-0">
              <div className="min-w-0">
                <div className="text-[10.5px] font-mono font-bold text-primary">{activeFormCode}</div>
                <div className="text-sm font-semibold leading-tight truncate" title={form?.name}>
                  {formLoading ? '불러오는 중...' : form?.name || '양식 정보 없음'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveFormCode(null)
                  setForm(null)
                }}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
              {formLoading ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> 양식 불러오는 중...
                </p>
              ) : !form ? (
                <p className="text-xs text-muted-foreground">양식 정의를 찾을 수 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {/* 작성하기 — 넓은 드로어로 실제 편집기 열기 */}
                  {form.fields.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => void openWriter(form.code)}
                      className="w-full text-sm font-semibold px-3 py-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center gap-2 shadow-sm"
                    >
                      <PencilLine className="w-4 h-4" />
                      작성하기
                    </button>
                  ) : (
                    <div className="text-[11px] text-muted-foreground text-center bg-muted/50 rounded-lg px-3 py-2 border border-border/60">
                      필드 미정의 양식 — 작성 준비 중
                    </div>
                  )}

                  {/* 기본정보 */}
                  <div className="text-[11px] space-y-1">
                    <div className="flex gap-2">
                      <span className="text-muted-foreground w-12 shrink-0">규정</span>
                      <span className="font-mono">{form.regCode}</span>
                    </div>
                    {form.approvals.length > 0 && (
                      <div className="flex gap-2">
                        <span className="text-muted-foreground w-12 shrink-0">결재</span>
                        <span>{form.approvals.join(' → ')}</span>
                      </div>
                    )}
                  </div>

                  {form.description && (
                    <p className="text-[11.5px] leading-relaxed text-foreground/80 bg-card border border-border rounded p-2">
                      {form.description}
                    </p>
                  )}

                  {/* 필드 목록 */}
                  <div>
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      입력 필드 ({form.fields.length})
                    </div>
                    {form.fields.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        필드가 정의되지 않은 양식입니다.
                        <br />
                        (엑셀에서 자동 추출된 양식 — 추후 필드 정의 예정)
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {fieldSections.map(([section, fields]) => (
                          <div key={section}>
                            <div className="text-[10.5px] font-semibold text-foreground/60 mb-1">
                              {section}
                            </div>
                            <ul className="space-y-0.5">
                              {fields.map((fld) => (
                                <li
                                  key={fld.id}
                                  className="text-[11.5px] flex items-center gap-2 bg-card border border-border/60 rounded px-2 py-1"
                                >
                                  <span className="flex-1 min-w-0 truncate">{fld.label}</span>
                                  <span className="text-[9.5px] uppercase font-mono text-muted-foreground shrink-0">
                                    {fld.type}
                                  </span>
                                  {fld.unit && (
                                    <span className="text-[9.5px] text-muted-foreground shrink-0">
                                      {fld.unit}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 작성 드로어 — 넓게 덮으며 실제 편집기(FormCanvas) 표시 */}
      {writeOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40"
            onClick={() => setWriteOpen(false)}
            aria-hidden
          />
          <div className="w-[68%] max-w-[1180px] h-full bg-background shadow-2xl border-l border-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card shrink-0">
              <div className="text-sm font-semibold flex items-center gap-2">
                <PencilLine className="w-4 h-4 text-primary" />
                양식 작성
                {activeFormCode && (
                  <span className="text-[11px] font-mono text-muted-foreground">{activeFormCode}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setWriteOpen(false)}
                className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md border border-border hover:bg-muted flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                닫기 (Esc)
              </button>
            </div>
            <div className="flex-1 min-h-0 p-3 bg-muted/20">
              <FormCanvas />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
