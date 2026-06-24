import { useEffect, useMemo, useState } from 'react'
import { Layers, FileText, ChevronRight, Loader2, ImageOff, Files, X, PencilLine } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { FormCanvas } from '../form-builder/FormCanvas'
import { ProcessDocEditor } from './ProcessDocEditor'
import { ProcessCoverDocument } from './ProcessCoverDocument'
import type { ProcessDetailDto, FormDefinitionDto, ProcessDocDto, FormScope } from '@shared/ipc-types'
import { FORM_SCOPES } from '@shared/ipc-types'

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
  // 페이지별 이미지(전체 페이지를 세로로 쌓아 스크롤로 본다)
  const [pageImgs, setPageImgs] = useState<Record<number, string | null>>({})
  const [imgsLoading, setImgsLoading] = useState(false)

  const [activeFormCode, setActiveFormCode] = useState<string | null>(null)
  const [form, setForm] = useState<FormDefinitionDto | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // 구조화 개요(표지+개정이력) + 편집기
  const [docInfo, setDocInfo] = useState<ProcessDocDto | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const reloadDoc = (): void => {
    void (async () => {
      const d = (await window.api.invoke(ch('PROCESS_DOC_GET'), { processCode: code })) as
        | ProcessDocDto
        | null
      setDocInfo(d)
    })()
  }

  // 작성 드로어 (실제 편집기 FormCanvas를 넓게 띄움)
  const [writeOpen, setWriteOpen] = useState(false)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)

  const openWriter = async (formCode: string): Promise<void> => {
    await loadFormDefinition(formCode)
    setWriteOpen(true)
  }

  // 양식 사업부 분류 지정(공통/조관/인발/필라넥/AM/쇼바). 낙관적 로컬 갱신.
  const setDivision = (formCode: string, division: FormScope): void => {
    void (async () => {
      await window.api.invoke(ch('FORM_SET_SCOPE'), { formCode, scope: division })
      setDetail((d) =>
        d
          ? { ...d, forms: d.forms.map((x) => (x.formCode === formCode ? { ...x, scope: division } : x)) }
          : d
      )
    })()
  }

  // 흐름도 이미지 확대(라이트박스)
  const [zoomImg, setZoomImg] = useState<string | null>(null)

  // ESC로 드로어/확대 닫기
  useEffect(() => {
    if (!writeOpen && !zoomImg) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (zoomImg) setZoomImg(null)
      else if (writeOpen) setWriteOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [writeOpen, zoomImg])

  // 프로세스 상세 로드 (+ 모든 페이지 이미지를 한꺼번에 로드 → 세로 스크롤)
  useEffect(() => {
    let alive = true
    setLoading(true)
    setDetail(null)
    setPageImgs({})
    setActiveFormCode(null)
    setForm(null)
    void (async () => {
      const res = (await window.api.invoke(ch('PROCESS_GET_DETAIL'), { code })) as ProcessDetailDto | null
      if (!alive) return
      setDetail(res)
      setLoading(false)
      if (res && res.pages.length > 0) {
        setImgsLoading(true)
        const entries = await Promise.all(
          res.pages.map(async (p) => {
            if (!p.imagePath) return [p.id, null] as const
            const r = (await window.api.invoke(ch('PROCESS_PAGE_READ_IMAGE'), {
              pageId: p.id
            })) as { success: boolean; dataUrl?: string }
            return [p.id, r.success ? r.dataUrl ?? null : null] as const
          })
        )
        if (!alive) return
        setPageImgs(Object.fromEntries(entries))
        setImgsLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [code])

  // 구조화 개요 로드
  useEffect(() => {
    let alive = true
    setDocInfo(null)
    void (async () => {
      const d = (await window.api.invoke(ch('PROCESS_DOC_GET'), { processCode: code })) as
        | ProcessDocDto
        | null
      if (alive) setDocInfo(d)
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

  // AI 채움용: 흐름도 첫 이미지 페이지
  const firstImagePageId = useMemo(
    () => detail?.pages.find((p) => p.imagePath)?.id ?? null,
    [detail]
  )

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

  // 개요(표지 데이터)가 있으면 1페이지(표지)는 개요로 대체 → 흐름도는 2페이지부터
  const flowPages = docInfo ? detail.pages.slice(1) : detail.pages

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
          {/* 프로세스 개요 (구조화: 표지+개정이력) */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-primary" /> 프로세스 개요
              </h3>
              <button
                type="button"
                onClick={() => setEditorOpen(true)}
                className="text-[11.5px] font-semibold text-primary border border-primary/40 hover:bg-primary/10 px-2.5 py-1 rounded-md flex items-center gap-1.5"
              >
                <PencilLine className="w-3.5 h-3.5" />
                {docInfo ? '편집' : '개요 작성'}
              </button>
            </div>
            {docInfo ? (
              <div className="rounded-lg border border-border overflow-hidden shadow-sm">
                <ProcessCoverDocument doc={docInfo} page={`1/${detail.pages.length || 1}`} />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-center text-xs text-muted-foreground leading-relaxed">
                아직 구조화된 개요가 없습니다.
                <br />
                <span className="text-foreground font-medium">[개요 작성]</span> → AI 추출로 흐름도에서
                자동 채우거나 직접 입력하세요.
              </div>
            )}
          </section>

          {/* 교과서식 설명 */}
          <section>
            {detail.description && (
              <p className="text-sm leading-relaxed text-foreground/90 bg-muted/40 rounded-lg px-4 py-3 border border-border/60">
                {detail.description}
              </p>
            )}

            {/* 흐름도 이미지 — 표지(1p)는 개요로 대체, 2페이지부터 세로 스크롤 */}
            <div className="mt-3">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5 flex items-center justify-between">
                <span>프로세스 흐름도{docInfo ? ' (표지 제외)' : ''}</span>
                {flowPages.length > 0 && (
                  <span className="text-muted-foreground/70 normal-case">{flowPages.length}페이지</span>
                )}
              </div>
              {imgsLoading ? (
                <div className="rounded-lg border border-border bg-muted/30 flex items-center justify-center min-h-[140px]">
                  <span className="text-xs text-muted-foreground flex items-center gap-2 py-8">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    흐름도 불러오는 중...
                  </span>
                </div>
              ) : flowPages.length === 0 ? (
                <div className="rounded-lg border border-border bg-muted/30 flex items-center justify-center min-h-[140px]">
                  <span className="text-xs text-muted-foreground flex flex-col items-center gap-1.5 py-8 text-center px-2">
                    <ImageOff className="w-6 h-6 opacity-40" />
                    흐름도 페이지가 없습니다. &lsquo;프로세스 작업장&rsquo;에서 등록하세요.
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  {flowPages.map((p) => (
                    <div key={p.id}>
                      <div className="text-[10.5px] text-muted-foreground mb-1 font-medium">
                        {p.pageNo}. {p.pageLabel || '페이지'}
                      </div>
                      <div className="rounded-lg border border-border bg-white overflow-hidden flex items-center justify-center min-h-[120px]">
                        {pageImgs[p.id] ? (
                          <img
                            src={pageImgs[p.id] as string}
                            alt={`${detail.code} ${p.pageNo}페이지`}
                            onClick={() => setZoomImg(pageImgs[p.id] as string)}
                            title="클릭하여 확대"
                            className="w-full h-auto select-none cursor-zoom-in mx-auto"
                            draggable={false}
                          />
                        ) : (
                          <span className="text-[11px] text-muted-foreground flex flex-col items-center gap-1.5 py-8 text-center px-2">
                            <ImageOff className="w-5 h-5 opacity-40" />
                            이미지 미등록 — &lsquo;프로세스 작업장&rsquo;에서 등록
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                    <li key={f.formCode} className="flex items-stretch gap-1">
                      <select
                        value={f.scope}
                        onChange={(e) => setDivision(f.formCode, e.target.value as FormScope)}
                        title="사업부 분류 — 공통 또는 해당 사업부 선택"
                        className={cn(
                          'shrink-0 w-[64px] rounded border text-[10.5px] font-semibold text-center cursor-pointer appearance-none px-1 transition-colors',
                          f.scope === '공통'
                            ? 'bg-muted/40 text-muted-foreground/70 border-border hover:bg-muted'
                            : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                        )}
                      >
                        {FORM_SCOPES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleFormClick(f.formCode)}
                        className={cn(
                          'flex-1 min-w-0 text-left px-2.5 py-2 rounded border flex items-center gap-2.5 transition-colors',
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

      {/* 프로세스 개요 편집기 */}
      {editorOpen && (
        <ProcessDocEditor
          processCode={code}
          firstImagePageId={firstImagePageId}
          onClose={() => setEditorOpen(false)}
          onSaved={reloadDoc}
        />
      )}

      {/* 흐름도 확대(라이트박스) */}
      {zoomImg && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="흐름도 확대"
            className="max-w-full max-h-full object-contain shadow-2xl rounded"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomImg(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            aria-label="닫기"
          >
            <X className="w-7 h-7" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs">
            클릭 또는 Esc로 닫기
          </div>
        </div>
      )}
    </div>
  )
}
