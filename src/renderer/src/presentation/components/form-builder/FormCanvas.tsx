import { useMemo, useState } from 'react'
import { Save, ArrowRight, AlertCircle, Sparkles, Gauge, Loader2, Printer, FileDown, FileText, PencilLine, ClipboardPaste, FolderOpen, FileSpreadsheet, History } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { useUIStore } from '../../stores/uiStore'
import { ApprovalBar } from './ApprovalBar'
import { FormFieldInput } from './FormFieldInput'
import { FormDocument } from './FormDocument'
import { ExcelPasteModal } from './ExcelPasteModal'
import { SubmissionsModal } from './SubmissionsModal'
import { RevisionsModal } from './RevisionsModal'
import { AiCopilot } from './AiCopilot'
import type { FormFieldDto } from '@shared/ipc-types'

type ViewMode = 'input' | 'document'

export function FormCanvas(): JSX.Element {
  const { currentForm, currentFormLoading, saveDraft, aiError, copilotOpen, toggleCopilot, scoreForm, scoreLoading, loadFormDefinition, mergeValues, exportOfficialXlsx, exportingXlsx } =
    useFormStore()
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [viewMode, setViewMode] = useState<ViewMode>('input')
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [submissionsOpen, setSubmissionsOpen] = useState(false)
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [xlsxMsg, setXlsxMsg] = useState<string | null>(null)
  const revisionCount = useFormStore((s) => s.revisions.length)

  const handleExportXlsx = async (): Promise<void> => {
    setXlsxMsg(null)
    const res = await exportOfficialXlsx(false)
    if (res.canceled) return
    if (!res.success) {
      setXlsxMsg(`출력 실패: ${res.error ?? '알 수 없는 오류'}`)
      return
    }
    // 주입 요약: 일반 필드 + 격자 행반복 + 옵션별 분리셀 마킹 + 미매칭 경고 + 무손실 여부
    const parts: string[] = [`${res.applied ?? 0}개 항목 주입`]
    const gridRows = (res.grids ?? []).reduce((s, g) => s + g.written, 0)
    const gridDrop = (res.grids ?? []).reduce((s, g) => s + g.dropped, 0)
    if (gridRows) parts.push(`격자 ${gridRows}행${gridDrop ? ` (초과 ${gridDrop}행 잘림)` : ''}`)
    const optMarks = (res.optCells ?? []).reduce((s, o) => s + o.marked, 0)
    if (optMarks) parts.push(`선택셀 ${optMarks}개`)
    if (res.unmapped && res.unmapped.length) parts.push(`미매칭 ${res.unmapped.length}`)
    // 무손실 보존 깨짐(이미지/병합)은 양식 신뢰성 직결 → 경고로 표면화
    const lossless = res.verify ? res.verify.mediaOk && res.verify.mergesOk : true
    setXlsxMsg(`출력 완료 — ${parts.join(' · ')}${lossless ? '' : ' · ⚠ 무손실 깨짐'}`)
    setTimeout(() => setXlsxMsg(null), 6000)
  }

  const handlePrint = (): void => {
    window.print()
  }

  const handleExportPdf = async (): Promise<void> => {
    setPdfBusy(true)
    try {
      const code = currentForm?.code ?? '양식'
      const stamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
      await window.api.invoke(window.api.channels.PRINT_TO_PDF, {
        defaultName: `${code}_${stamp}.pdf`
      })
    } catch (err) {
      console.error('[print:pdf]', err)
    } finally {
      setPdfBusy(false)
    }
  }

  // Group fields by section
  const sections = useMemo(() => {
    if (!currentForm) return []
    const map = new Map<string, FormFieldDto[]>()
    for (const f of currentForm.fields) {
      const k = f.section || '기타'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(f)
    }
    return Array.from(map.entries())
  }, [currentForm])

  const handleSave = async (): Promise<void> => {
    setSaveStatus('saving')
    try {
      await saveDraft()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      console.error(err)
      setSaveStatus('error')
    }
  }

  const handleGoToNext = async (): Promise<void> => {
    if (!currentForm?.nextFormCode) return
    const next = currentForm.nextFormCode
    // 다음 양식으로 넘어가기 전에 현재 작성 내용을 자동 저장(데이터 손실 방지)
    try {
      await saveDraft()
    } catch (err) {
      console.error('[form] 이어서 작성 전 자동 저장 실패', err)
    }
    setSelectedFormCode(next)
    void loadFormDefinition(next)
  }

  if (currentFormLoading) {
    return (
      <section className="bg-card border border-border rounded-lg p-8 h-full flex items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </section>
    )
  }

  if (!currentForm) {
    return (
      <section className="bg-card border border-border rounded-lg p-8 h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">왼쪽 목록에서 양식을 선택하세요.</p>
        </div>
      </section>
    )
  }

  return (
    <div className="flex h-full min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <section className="flex min-w-0 flex-1 flex-col">
      <header className="px-6 py-5 border-b border-border">
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded tracking-tight">
              {currentForm.code}
            </span>
            <span className="text-[11px] text-muted-foreground">규정 {currentForm.regCode}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* 입력 / 문서 보기 토글 */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 mr-1">
              <button
                type="button"
                onClick={() => setViewMode('input')}
                className={cn(
                  'text-[12px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors',
                  viewMode === 'input' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <PencilLine className="w-3.5 h-3.5" />
                입력
              </button>
              <button
                type="button"
                onClick={() => setViewMode('document')}
                className={cn(
                  'text-[12px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors',
                  viewMode === 'document' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <FileText className="w-3.5 h-3.5" />
                문서
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSubmissionsOpen(true)}
              title="저장된 작성본을 불러옵니다"
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              작성본
            </button>
            <button
              type="button"
              onClick={() => setRevisionsOpen(true)}
              title="개정 이력을 보거나 현재 입력을 개정으로 저장합니다"
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              개정 이력
              {revisionCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                  {revisionCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setPasteOpen(true)}
              title="엑셀에서 복사한 자료를 붙여넣어 항목을 자동으로 채웁니다"
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 transition-colors"
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              Excel 붙여넣기
            </button>
            <button
              type="button"
              onClick={() => void handleExportXlsx()}
              disabled={exportingXlsx}
              title="입력값을 원본 공식 양식(.xlsx)에 주입해 출력합니다"
              className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              {exportingXlsx ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              공식 엑셀 출력
            </button>

            {viewMode === 'document' && (
              <>
                <button
                  type="button"
                  onClick={handlePrint}
                  title="문서를 인쇄합니다"
                  className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  인쇄
                </button>
                <button
                  type="button"
                  onClick={() => void handleExportPdf()}
                  disabled={pdfBusy}
                  title="문서를 PDF로 저장합니다"
                  className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {pdfBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                  PDF
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => void scoreForm()}
              disabled={scoreLoading}
              title="작성 내용을 IATF 16949 기준으로 AI가 채점합니다"
              className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
            >
              {scoreLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gauge className="w-3.5 h-3.5" />}
              AI 채점
            </button>
            <button
              type="button"
              onClick={toggleCopilot}
              title="AI 작성 도우미 열기/닫기"
              className={cn(
                'text-[13px] font-semibold px-3.5 py-2 rounded-lg flex items-center gap-1.5 border transition-colors',
                copilotOpen
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'border-border hover:bg-muted text-foreground'
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI 도우미
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveStatus === 'saving'}
              className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-border hover:bg-muted disabled:opacity-50 flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saveStatus === 'saving' && '저장 중...'}
              {saveStatus === 'saved' && '저장됨 ✓'}
              {saveStatus === 'error' && '저장 실패'}
              {saveStatus === 'idle' && '초안 저장'}
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{currentForm.name}</h2>
        {currentForm.description && (
          <p className="text-[13px] text-muted-foreground mt-1.5">{currentForm.description}</p>
        )}
        {xlsxMsg && (
          <p
            className={cn(
              'text-[12px] mt-2 font-medium',
              xlsxMsg.startsWith('출력 실패') ? 'text-destructive' : 'text-emerald-700'
            )}
          >
            {xlsxMsg}
          </p>
        )}
      </header>

      {viewMode === 'document' ? (
      <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-6">
        <FormDocument />
      </div>
      ) : (
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
        {/* 결재란 */}
        <ApprovalBar approvals={currentForm.approvals} />

        {/* AI 에러 */}
        {aiError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md text-[12px] text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold mb-0.5">AI 생성 오류</div>
              <div>{aiError}</div>
            </div>
          </div>
        )}

        {/* 필드 섹션별 */}
        {sections.map(([sectionName, fields]) => (
          <div key={sectionName}>
            <h3 className="text-xs font-bold text-muted-foreground tracking-wide mb-3.5 pb-1.5 border-b border-border">
              {sectionName}
            </h3>
            <div className="space-y-4">
              {fields.map((f) => (
                <FormFieldInput key={`${currentForm.code}-${f.fieldKey}`} field={f} />
              ))}
            </div>
          </div>
        ))}

        {/* 다음 양식 연결 */}
        {currentForm.nextFormCode && (
          <div className="mt-6 p-4 bg-primary/5 border border-primary/30 rounded-md">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-muted-foreground mb-0.5">다음 단계</div>
                <div className="text-sm">
                  <span className="font-mono font-bold text-primary">{currentForm.nextFormCode}</span>
                  {currentForm.nextFormLabel && (
                    <span className="text-muted-foreground"> — {currentForm.nextFormLabel}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void handleGoToNext()}
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
              >
                이어서 작성
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

      </div>
      )}
      </section>
      {copilotOpen && <AiCopilot />}
      {pasteOpen && (
        <ExcelPasteModal
          fields={currentForm.fields}
          onApply={(vals) => mergeValues(vals)}
          onClose={() => setPasteOpen(false)}
        />
      )}
      {submissionsOpen && <SubmissionsModal onClose={() => setSubmissionsOpen(false)} />}
      {revisionsOpen && <RevisionsModal onClose={() => setRevisionsOpen(false)} />}
    </div>
  )
}
