import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Sparkles, Loader2, Save } from 'lucide-react'
import type {
  ProcessDocDto,
  ProcessDocRevision,
  ProcessDocApproval,
  ProcessPageAiExtractResponse
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface EditState {
  docNo: string
  title: string
  revNo: string
  revDate: string
  scope: string
  purpose: string
  approvals: ProcessDocApproval[]
  revisions: ProcessDocRevision[]
}

const EMPTY: EditState = {
  docNo: '',
  title: '',
  revNo: '',
  revDate: '',
  scope: '',
  purpose: '',
  approvals: [],
  revisions: []
}

/**
 * 프로세스 문서(표지 + 개정이력 + 결재)를 구조화 데이터로 편집.
 * - [AI 추출로 채우기]: 흐름도 첫 이미지에서 AI 비전으로 자동 채움
 * - 개정 추가 = 행 추가(재캡쳐 불필요)
 */
export function ProcessDocEditor({
  processCode,
  firstImagePageId,
  onClose,
  onSaved
}: {
  processCode: string
  firstImagePageId: number | null
  onClose: () => void
  onSaved: () => void
}): JSX.Element {
  const [st, setSt] = useState<EditState>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiNote, setAiNote] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    void (async () => {
      try {
        const dto = (await window.api.invoke(ch('PROCESS_DOC_GET'), { processCode })) as
          | ProcessDocDto
          | null
        if (!alive) return
        if (dto) {
          setSt({
            docNo: dto.docNo ?? '',
            title: dto.title ?? '',
            revNo: dto.revNo ?? '',
            revDate: dto.revDate ?? '',
            scope: dto.scope ?? '',
            purpose: dto.purpose ?? '',
            approvals: dto.approvals ?? [],
            revisions: dto.revisions ?? []
          })
        }
      } catch (e) {
        if (alive) setAiNote(`개요 로드 실패: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [processCode])

  const set = <K extends keyof EditState>(k: K, v: EditState[K]): void =>
    setSt((s) => ({ ...s, [k]: v }))

  const updateRev = (i: number, key: keyof ProcessDocRevision, val: string): void =>
    setSt((s) => ({
      ...s,
      revisions: s.revisions.map((r, idx) => (idx === i ? { ...r, [key]: val } : r))
    }))
  const addRev = (): void =>
    setSt((s) => ({
      ...s,
      revisions: [
        ...s.revisions,
        { no: '', date: '', reason: '', author: '', kpi: '', formula: '', cycle: '', owner: '' }
      ]
    }))
  const delRev = (i: number): void =>
    setSt((s) => ({ ...s, revisions: s.revisions.filter((_, idx) => idx !== i) }))

  const updateApp = (i: number, key: keyof ProcessDocApproval, val: string): void =>
    setSt((s) => ({
      ...s,
      approvals: s.approvals.map((a, idx) => (idx === i ? { ...a, [key]: val } : a))
    }))
  const addApp = (): void =>
    setSt((s) => ({ ...s, approvals: [...s.approvals, { role: '', title: '', name: '' }] }))
  const delApp = (i: number): void =>
    setSt((s) => ({ ...s, approvals: s.approvals.filter((_, idx) => idx !== i) }))

  const handleAiFill = async (): Promise<void> => {
    if (!firstImagePageId) return
    setAiBusy(true)
    setAiNote(null)
    const res = (await window.api.invoke(ch('PROCESS_PAGE_AI_EXTRACT'), {
      pageId: firstImagePageId
    })) as ProcessPageAiExtractResponse
    setAiBusy(false)
    if (res.success && res.data) {
      const d = res.data
      setSt((prev) => ({
        docNo: d.docNo ?? prev.docNo,
        title: d.title ?? prev.title,
        revNo: d.revNo ?? prev.revNo,
        revDate: d.revDate ?? prev.revDate,
        scope: d.scope ?? prev.scope,
        purpose: d.purpose ?? prev.purpose,
        approvals: d.approvals.length ? d.approvals : prev.approvals,
        revisions: d.revisions.length ? d.revisions : prev.revisions
      }))
      setAiNote(`AI 채움 완료 (${res.provider}) — 내용 검수 후 저장하세요`)
    } else {
      setAiNote(`AI 추출 실패: ${res.error ?? '알 수 없음'}`)
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaving(true)
    const norm = (v: string): string | null => (v.trim() === '' ? null : v)
    await window.api.invoke(ch('PROCESS_DOC_SAVE'), {
      processCode,
      docNo: norm(st.docNo),
      title: norm(st.title),
      revNo: norm(st.revNo),
      revDate: norm(st.revDate),
      scope: norm(st.scope),
      purpose: norm(st.purpose),
      approvals: st.approvals,
      revisions: st.revisions
    })
    setSaving(false)
    onSaved()
    onClose()
  }

  const inputCls =
    'w-full px-2 py-1.5 text-sm rounded-md bg-input border border-border focus:border-primary focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-border flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold">
            프로세스 개요 편집 <span className="font-mono text-primary">{processCode}</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAiFill}
              disabled={aiBusy || !firstImagePageId}
              title={firstImagePageId ? '흐름도 첫 이미지에서 AI로 자동 채움' : '이미지 페이지가 없어 비활성'}
              className="text-[12px] font-semibold px-2.5 py-1.5 rounded-md text-primary border border-primary/40 hover:bg-primary/10 disabled:opacity-40 flex items-center gap-1.5"
            >
              {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI 추출로 채우기
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground"
              aria-label="닫기"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</p>
          ) : (
            <>
              {aiNote && (
                <div className="text-[11.5px] px-3 py-2 rounded border border-primary/30 bg-primary/5 text-primary">
                  {aiNote}
                </div>
              )}

              {/* 표지 */}
              <section className="grid grid-cols-2 gap-2.5">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  문서번호
                  <input className={inputCls} value={st.docNo} onChange={(e) => set('docNo', e.target.value)} />
                </label>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  제목
                  <input className={inputCls} value={st.title} onChange={(e) => set('title', e.target.value)} />
                </label>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  개정번호
                  <input className={inputCls} value={st.revNo} onChange={(e) => set('revNo', e.target.value)} />
                </label>
                <label className="text-[11px] font-semibold text-muted-foreground">
                  개정일자
                  <input
                    className={inputCls}
                    placeholder="YYYY-MM-DD"
                    value={st.revDate}
                    onChange={(e) => set('revDate', e.target.value)}
                  />
                </label>
              </section>
              <label className="block text-[11px] font-semibold text-muted-foreground">
                적용범위
                <textarea
                  className={`${inputCls} min-h-[48px] resize-y`}
                  value={st.scope}
                  onChange={(e) => set('scope', e.target.value)}
                />
              </label>
              <label className="block text-[11px] font-semibold text-muted-foreground">
                목적
                <textarea
                  className={`${inputCls} min-h-[48px] resize-y`}
                  value={st.purpose}
                  onChange={(e) => set('purpose', e.target.value)}
                />
              </label>

              {/* 개정이력 */}
              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold">개정이력 ({st.revisions.length})</h3>
                  <button
                    type="button"
                    onClick={addRev}
                    className="text-[11px] font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />행 추가
                  </button>
                </div>
                <div className="space-y-1.5">
                  {st.revisions.map((r, i) => (
                    <div key={i} className="border border-border rounded-md p-2 space-y-1 bg-muted/10">
                      <div className="flex gap-1 items-center">
                        <input
                          className={`${inputCls} w-11 text-center`}
                          value={r.no}
                          placeholder="No"
                          onChange={(e) => updateRev(i, 'no', e.target.value)}
                        />
                        <input
                          className={`${inputCls} w-28`}
                          value={r.date}
                          placeholder="YYYY-MM-DD"
                          onChange={(e) => updateRev(i, 'date', e.target.value)}
                        />
                        <input
                          className={`${inputCls} flex-1`}
                          value={r.reason}
                          placeholder="재.개정 사유 및 내용"
                          onChange={(e) => updateRev(i, 'reason', e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => delRev(i)}
                          className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"
                          aria-label="행 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <input
                          className={`${inputCls} flex-1`}
                          value={r.author}
                          placeholder="작성부서 / 작성자"
                          onChange={(e) => updateRev(i, 'author', e.target.value)}
                        />
                        <input
                          className={`${inputCls} w-28`}
                          value={r.kpi}
                          placeholder="성과지표"
                          onChange={(e) => updateRev(i, 'kpi', e.target.value)}
                        />
                        <input
                          className={`${inputCls} w-32`}
                          value={r.formula}
                          placeholder="산출식"
                          onChange={(e) => updateRev(i, 'formula', e.target.value)}
                        />
                        <input
                          className={`${inputCls} w-14`}
                          value={r.cycle}
                          placeholder="주기"
                          onChange={(e) => updateRev(i, 'cycle', e.target.value)}
                        />
                        <input
                          className={`${inputCls} w-20`}
                          value={r.owner}
                          placeholder="측정책임자"
                          onChange={(e) => updateRev(i, 'owner', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  {st.revisions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground py-1">개정이력이 없습니다. [행 추가] 또는 [AI 추출로 채우기].</p>
                  )}
                </div>
              </section>

              {/* 결재 */}
              <section>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="text-xs font-bold">결재 ({st.approvals.length})</h3>
                  <button
                    type="button"
                    onClick={addApp}
                    className="text-[11px] font-semibold text-primary hover:bg-primary/10 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />행 추가
                  </button>
                </div>
                <div className="space-y-1">
                  {st.approvals.map((a, i) => (
                    <div key={i} className="flex gap-1 items-start">
                      <input
                        className={`${inputCls} w-24`}
                        value={a.role}
                        placeholder="구분(작성/검토/승인)"
                        onChange={(e) => updateApp(i, 'role', e.target.value)}
                      />
                      <input
                        className={`${inputCls} w-28`}
                        value={a.title}
                        placeholder="직책"
                        onChange={(e) => updateApp(i, 'title', e.target.value)}
                      />
                      <input
                        className={`${inputCls} flex-1`}
                        value={a.name}
                        placeholder="성명"
                        onChange={(e) => updateApp(i, 'name', e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => delApp(i)}
                        className="p-1.5 text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="행 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="text-[12px] font-semibold px-3 py-2 rounded-md border border-border hover:bg-muted"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="text-[12px] font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            저장
          </button>
        </div>
      </div>
    </div>
  )
}
