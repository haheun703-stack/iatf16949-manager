import { useMemo, useState, useEffect } from 'react'
import { Save, ArrowLeft, ArrowRight, AlertCircle, Sparkles, Gauge, Loader2, Printer, FileDown, FileText, PencilLine, ClipboardPaste, FolderOpen, FileSpreadsheet, History, Table2, CheckCircle2, PanelLeftOpen, ShieldAlert } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { isExampleCopyBlocked } from '@shared/form-validation'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { goBackWithGuard } from '../../lib/navBack'
import { ApprovalBar } from './ApprovalBar'
import { FormFieldInput } from './FormFieldInput'
import { FormDocument } from './FormDocument'
import { ExcelPasteModal } from './ExcelPasteModal'
import { SubmissionsModal } from './SubmissionsModal'
import { ExcelSheetView } from './ExcelSheetView'
import { RevisionsModal } from './RevisionsModal'
import { AiCopilot } from './AiCopilot'
import type { FormFieldDto } from '@shared/ipc-types'

export type ViewMode = 'input' | 'excel' | 'document'

// 작성자 auto 자동채움 필드 판별(0097): type='auto' + placeholder '로그인 사용자'.
// 발행번호(자동부여)·날짜 등 다른 auto 는 걸리지 않음. meta default 판별과 동일 기준.
const isAuthorAuto = (f: FormFieldDto): boolean =>
  f.type === 'auto' && /사용자/.test(f.placeholder ?? '')

export function FormCanvas({
  onUnfoldAnswer,
  viewMode: viewModeProp,
  onViewModeChange
}: {
  onUnfoldAnswer?: () => void
  /** 부모가 뷰 모드를 관장할 때 전달(FormBuilderPage). 미전달 시 내부 상태로 단독 동작. */
  viewMode?: ViewMode
  onViewModeChange?: (m: ViewMode) => void
} = {}): JSX.Element {
  const { currentForm, currentFormLoading, saveDraft, values, examples, aiError, copilotOpen, toggleCopilot, scoreForm, scoreLoading, loadFormDefinition, mergeValues, exportOfficialXlsx, exportingXlsx, currentSubmissionId } =
    useFormStore()
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setPage = useUIStore((s) => s.setPage)
  const hasHistory = useUIStore((s) => s.history.length > 0)
  // P12 — 양식 단위 뒤로. 직전 양식 코드가 있으면 [뒤로]가 페이지가 아니라 그 양식으로 간다.
  const prevFormCode = useUIStore((s) => s.formHistory[s.formHistory.length - 1] ?? null)
  const popFormHistory = useUIStore((s) => s.popFormHistory)
  const recentForms = useUIStore((s) => s.recentForms)
  const prevFormName = prevFormCode
    ? (recentForms.find((f) => f.code === prevFormCode)?.name ?? prevFormCode)
    : null
  // 기록 주체 = 활성 사용자(§4). [저장하고 완료] 시 createdBy 로 전달
  const currentName = useActiveUserStore((s) => {
    const u = s.users.find((x) => x.id === s.activeUserId)
    return u ? u.name : null
  })
  const [saveWarn, setSaveWarn] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  // 뷰 모드 — 부모 제어(props) 우선, 없으면 내부 상태(단독 사용처: BOM·공정 워크벤치)
  const [viewModeLocal, setViewModeLocal] = useState<ViewMode>('input')
  const viewMode = viewModeProp ?? viewModeLocal
  const changeView = onViewModeChange ?? setViewModeLocal
  const [pdfBusy, setPdfBusy] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [submissionsOpen, setSubmissionsOpen] = useState(false)
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [xlsxMsg, setXlsxMsg] = useState<string | null>(null)
  const revisionCount = useFormStore((s) => s.revisions.length)

  // 작성자 auto 자동채움(0097·§4): 새 작성 폼의 작성자 칸을 활성 사용자로 채운다.
  // 활성 사용자 미선택이면 빈값 유지 — 회사 defaultAuthor 폴백 금지(가짜 이름 방지, 저장 시 안내).
  // 사용자 전환 시(currentName 변경) 자동 갱신. 저장본 이어쓰기(submissionId≠null)는 원작성자 보존.
  useEffect(() => {
    if (!currentForm || currentSubmissionId != null) return
    const authorFields = currentForm.fields.filter(isAuthorAuto)
    if (authorFields.length === 0) return
    const patch: Record<string, string> = {}
    for (const f of authorFields) patch[f.fieldKey] = currentName ?? ''
    mergeValues(patch)
  }, [currentForm, currentName, currentSubmissionId, mergeValues])

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

  // P5 저장 검증 — ①필수 fact 공란 ②text fact 예시값 완전일치(date 제외: 오늘 날짜 우연일치 오탐 방지, 코워크 ①)
  const validateFactValues = (): string | null => {
    if (!currentForm) return null
    // 작성자 auto 필드가 있는데 활성 사용자 미선택 → 빈 작성자로 저장 차단(§4·2026-07-23 방침).
    // "빈칸이 가짜 이름보다 낫다" — 사람에게 사용자 선택을 요구한다.
    if (!currentName && currentForm.fields.some(isAuthorAuto)) {
      return '작성자를 기록하려면 먼저 우측 상단에서 사용자를 선택하세요. (작성자 칸을 빈 채로 저장할 수 없습니다)'
    }
    // auto 타입(작성자 등 시스템 자동채움)은 입력 불가라 fact 여도 검증 제외(M1 — 저장불가 폼 방지)
    const facts = currentForm.fields.filter((f) => f.fieldClass === 'fact' && f.type !== 'auto')
    for (const f of facts) {
      const v = values[f.fieldKey]
      if (v == null || String(v).trim() === '') {
        return `'${f.label}' 칸(오늘의 사실)이 비어 있습니다 — 실제 값을 입력하세요. (예시값 복사로는 통과되지 않습니다)`
      }
    }
    for (const f of facts) {
      const ex = examples.find((e) => e.fieldKey === f.fieldKey)
      if (ex && isExampleCopyBlocked('fact', f.type, ex.exampleValue, String(values[f.fieldKey] ?? ''), f.label)) {
        return `'${f.label}' — 예시값을 그대로 저장할 수 없습니다. 본인이 확인한 실제 값을 입력하세요(기록 조작 방지).`
      }
    }
    return null
  }

  // [저장하고 완료 처리 ✓] — 검증 통과 시 저장(createdBy=활성 사용자). 홈에서 작성기록으로 확정(§0.6 결정2)
  const handleSaveAndComplete = async (): Promise<void> => {
    const warn = validateFactValues()
    if (warn) {
      setSaveWarn(warn)
      return
    }
    setSaveWarn(null)
    setSaveStatus('saving')
    try {
      await saveDraft(currentName ?? undefined)
      setSaveStatus('saved')
      window.alert('작성기록을 저장했습니다.\n홈 "오늘 할 일"에서 [작성기록으로 확정]을 누르면 ✓ 처리됩니다.')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      console.error(err)
      // 데이터 계층(main) 조작 차단 메시지를 사용자에게 표시(H1)
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('예시값')) setSaveWarn(msg.slice(msg.indexOf('예시값')))
      setSaveStatus('error')
    }
  }

  const handleSave = async (): Promise<void> => {
    setSaveStatus('saving')
    try {
      await saveDraft()
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2500)
    } catch (err) {
      console.error(err)
      // [초안 저장]으로도 예시값 복제는 차단됨(H1 데이터 계층) — 사유 표시
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('예시값')) setSaveWarn(msg.slice(msg.indexOf('예시값')))
      setSaveStatus('error')
    }
  }

  /**
   * [뒤로] — 양식 단위를 페이지 단위보다 먼저 본다(P12).
   * 양식 A→B 로 옮기면 페이지는 계속 'form-builder' 라 페이지 히스토리에 안 쌓인다.
   * 그래서 예전엔 A 로 돌아갈 방법이 아예 없었다. 직전 양식이 있으면 그리로,
   * 없을 때만 화면(페이지) 뒤로로 넘어간다.
   */
  const handleBack = async (): Promise<void> => {
    const prev = popFormHistory()
    if (!prev) {
      goBackWithGuard()
      return
    }
    try {
      await saveDraft() // [이어서 작성]과 같은 규율 — 작성 중 값 보존
    } catch (err) {
      console.error('[form] 이전 양식으로 이동 전 자동 저장 실패', err)
    }
    setSelectedFormCode(prev)
    void loadFormDefinition(prev)
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
            {(prevFormCode || hasHistory) && (
              <button
                type="button"
                onClick={() => void handleBack()}
                title={prevFormName ? `이전 양식으로 — ${prevFormName}` : '뒤로 (Alt+←)'}
                className="flex items-center gap-1 -ml-1 pr-2 py-1 rounded-md text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors max-w-[220px]"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span className="truncate">{prevFormName ?? '뒤로'}</span>
              </button>
            )}
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded tracking-tight">
              {currentForm.code}
            </span>
            <span className="text-[11px] text-muted-foreground">규정 {currentForm.regCode}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {onUnfoldAnswer && (
              <button
                type="button"
                onClick={onUnfoldAnswer}
                title="왼쪽 정답 패널 펼치기"
                className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 flex items-center gap-1.5 transition-colors mr-1"
              >
                <PanelLeftOpen className="w-3.5 h-3.5" />
                정답 보기
              </button>
            )}
            {/* 입력 / 문서 보기 토글 */}
            <div className="flex items-center rounded-lg border border-border p-0.5 bg-muted/40 mr-1">
              <button
                type="button"
                onClick={() => changeView('input')}
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
                onClick={() => changeView('excel')}
                title="원본 양식 모양 그대로 보면서 입력 셀만 채웁니다"
                className={cn(
                  'text-[12px] font-semibold px-2.5 py-1.5 rounded-md flex items-center gap-1.5 transition-colors',
                  viewMode === 'excel' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Table2 className="w-3.5 h-3.5" />
                엑셀 뷰
              </button>
              <button
                type="button"
                onClick={() => changeView('document')}
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
            {currentForm.deprecated ? (
              <button
                type="button"
                onClick={() => setPage((currentForm.replacementPage ?? 'fmea') as PageId)}
                title={currentForm.deprecatedNote ?? '신판 모듈로 이동합니다'}
                className="text-[13px] font-semibold px-3 py-2 rounded-lg border border-primary/40 text-primary hover:bg-primary/10 flex items-center gap-1.5 transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                공정 FMEA(신판) 열기
              </button>
            ) : (
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
            )}

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
            <button
              type="button"
              onClick={() => void handleSaveAndComplete()}
              disabled={saveStatus === 'saving'}
              title="오늘의 사실 검증 후 저장 — 홈에서 작성기록으로 ✓ 확정"
              className="text-[13px] font-bold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 transition-opacity"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              저장하고 완료 처리 ✓
            </button>
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight">{currentForm.name}</h2>
        {currentForm.description && (
          <p className="text-[13px] text-muted-foreground mt-1.5">{currentForm.description}</p>
        )}
        {currentForm.deprecated && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-900">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <div className="font-semibold">구판 양식 — 신판으로 대체됨</div>
              <p className="mt-0.5 leading-relaxed">
                {currentForm.deprecatedNote ??
                  '신판(AIAG-VDA 7-step) 공정 FMEA로 대체되었습니다.'}
              </p>
              <button
                type="button"
                onClick={() => setPage((currentForm.replacementPage ?? 'fmea') as PageId)}
                className="mt-1.5 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                공정 FMEA(신판) 열기
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
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
      ) : viewMode === 'excel' ? (
      <div className="flex-1 overflow-y-auto bg-muted/30 px-6 py-6">
        <ExcelSheetView />
      </div>
      ) : (
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">
        {/* P5 저장 차단 경고(fact 공란·예시값 복제) */}
        {saveWarn && (
          <div className="flex items-start gap-2 rounded-lg border-2 border-destructive bg-destructive/10 px-4 py-3 text-[13px] text-destructive font-semibold">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="font-bold mb-0.5">⛔ 저장할 수 없습니다</div>
              <div className="font-medium leading-relaxed">{saveWarn}</div>
            </div>
            <button
              type="button"
              onClick={() => setSaveWarn(null)}
              className="ml-auto text-[11px] font-bold px-2 py-1 rounded hover:bg-destructive/20 shrink-0"
            >
              닫기
            </button>
          </div>
        )}

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
