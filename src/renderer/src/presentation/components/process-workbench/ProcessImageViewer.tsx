import { useEffect, useState, useCallback } from 'react'
import { ImagePlus, Images, Trash2, Plus, ChevronLeft, ChevronRight, Loader2, ImageIcon, ZoomIn, ZoomOut, Maximize2, Sparkles, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useProcessStore } from '../../stores/processStore'
import type { ProcessPageAiExtractResponse } from '@shared/ipc-types'

const ZOOM_MIN = 0.5
const ZOOM_MAX = 4
const ZOOM_STEP = 0.2
const ZOOM_PRESETS = [1, 1.5, 2, 3]

export function ProcessImageViewer(): JSX.Element {
  const {
    detail,
    currentPageIdx,
    setCurrentPageIdx,
    uploadPageImage,
    deletePageImage,
    addPage,
    bulkUploadPages,
    extractPage,
    readPageImage
  } = useProcessStore()

  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [imageLoading, setImageLoading] = useState(false)
  const [uploadingPageId, setUploadingPageId] = useState<number | null>(null)
  const [showAddPage, setShowAddPage] = useState(false)
  const [newPageLabel, setNewPageLabel] = useState('')
  const [zoom, setZoom] = useState(1)

  const currentPage = detail?.pages[currentPageIdx]

  // Reset zoom when page changes
  useEffect(() => {
    setZoom(1)
  }, [currentPage?.id])

  useEffect(() => {
    if (!currentPage?.imagePath) {
      setDataUrl(null)
      return
    }
    setImageLoading(true)
    void readPageImage(currentPage.id).then((d) => {
      setDataUrl(d)
      setImageLoading(false)
    })
  }, [currentPage?.id, currentPage?.imagePath, readPageImage])

  const clampZoom = (z: number): number => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z))
  const zoomIn = useCallback(() => setZoom((z) => clampZoom(z + ZOOM_STEP)), [])
  const zoomOut = useCallback(() => setZoom((z) => clampZoom(z - ZOOM_STEP)), [])
  const zoomReset = useCallback(() => setZoom(1), [])

  const handleWheel = useCallback((e: React.WheelEvent): void => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)))
    }
  }, [])

  const handleUpload = async (): Promise<void> => {
    if (!currentPage) return
    setUploadingPageId(currentPage.id)
    await uploadPageImage(currentPage.id)
    setUploadingPageId(null)
  }

  const handleDelete = async (): Promise<void> => {
    if (!currentPage) return
    if (!confirm(`페이지 ${currentPage.pageNo}의 이미지를 삭제할까요?`)) return
    await deletePageImage(currentPage.id)
  }

  const handleAddPage = async (): Promise<void> => {
    if (!newPageLabel.trim()) return
    await addPage(newPageLabel.trim())
    setNewPageLabel('')
    setShowAddPage(false)
  }

  const [bulkBusy, setBulkBusy] = useState(false)
  const handleBulkUpload = async (): Promise<void> => {
    if (!detail) return
    setBulkBusy(true)
    const res = await bulkUploadPages(detail.code)
    setBulkBusy(false)
    if (!res.success) alert(res.error || '업로드에 실패했습니다.')
  }

  // AI 추출 (캡쳐 → 구조화 JSON) PoC
  const [extractBusy, setExtractBusy] = useState(false)
  const [extractResult, setExtractResult] = useState<ProcessPageAiExtractResponse | null>(null)
  const handleExtract = async (): Promise<void> => {
    if (!currentPage) return
    setExtractBusy(true)
    setExtractResult(null)
    const res = await extractPage(currentPage.id)
    setExtractResult(res)
    setExtractBusy(false)
  }

  if (!detail) return <></>

  if (detail.pages.length === 0) {
    return (
      <section className="bg-card border border-border rounded-xl shadow-sm p-6 h-full flex items-center justify-center">
        <div className="text-center max-w-xs">
          <ImageIcon className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground mb-3">
            이 프로세스에 등록된 페이지가 없습니다.
          </p>
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleBulkUpload}
              disabled={bulkBusy}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Images className="w-3 h-3" />}
              여러 장 한 번에 업로드
            </button>
            <button
              type="button"
              onClick={() => setShowAddPage(true)}
              className="text-[11px] font-semibold px-3 py-1 rounded-md border border-border hover:bg-muted flex items-center gap-1.5 mx-auto"
            >
              <Plus className="w-3 h-3" />빈 페이지 추가
            </button>
          </div>
          {showAddPage && (
            <div className="mt-3 flex gap-1">
              <input
                type="text"
                autoFocus
                placeholder="페이지 이름 (예: 표지)"
                value={newPageLabel}
                onChange={(e) => setNewPageLabel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddPage}
                className="text-xs font-semibold px-2 py-1 rounded-md bg-primary text-primary-foreground"
              >
                추가
              </button>
            </div>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="bg-card border border-border rounded-xl shadow-sm h-full flex flex-col">
      {/* Header with page tabs */}
      <header className="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setCurrentPageIdx(Math.max(0, currentPageIdx - 1))}
          disabled={currentPageIdx === 0}
          className="p-1 rounded-md hover:bg-muted disabled:opacity-30"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center gap-1 overflow-x-auto">
          {detail.pages.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setCurrentPageIdx(idx)}
              className={cn(
                'text-[11px] font-semibold px-2.5 py-1 rounded whitespace-nowrap transition-colors',
                idx === currentPageIdx
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              )}
            >
              {p.pageNo}. {p.pageLabel || '페이지'}
              {!p.imagePath && <span className="ml-1 opacity-60">·미등록</span>}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowAddPage(true)}
            className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted flex items-center gap-1"
            title="빈 페이지 추가"
          >
            <Plus className="w-3 h-3" />
            추가
          </button>
          <button
            type="button"
            onClick={handleBulkUpload}
            disabled={bulkBusy}
            className="text-[11px] font-semibold text-primary px-2 py-1 rounded hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1 whitespace-nowrap"
            title="이미지 여러 장을 한 번에 선택해 페이지로 등록 (빈 페이지부터 채움)"
          >
            {bulkBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Images className="w-3 h-3" />}
            여러 장
          </button>
        </div>

        <button
          type="button"
          onClick={() => setCurrentPageIdx(Math.min(detail.pages.length - 1, currentPageIdx + 1))}
          disabled={currentPageIdx >= detail.pages.length - 1}
          className="p-1 rounded-md hover:bg-muted disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </header>

      {/* Add page inline */}
      {showAddPage && (
        <div className="p-3 border-b border-border flex gap-1.5">
          <input
            type="text"
            autoFocus
            placeholder="페이지 이름"
            value={newPageLabel}
            onChange={(e) => setNewPageLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
            className="flex-1 px-2 py-1 text-xs bg-input border border-border rounded-md focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddPage}
            className="text-xs font-semibold px-2 py-1 rounded-md bg-primary text-primary-foreground"
          >
            추가
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddPage(false)
              setNewPageLabel('')
            }}
            className="text-xs font-semibold px-2 py-1 rounded-md hover:bg-muted"
          >
            취소
          </button>
        </div>
      )}

      {/* Image area */}
      <div
        className="flex-1 overflow-auto bg-muted/30"
        onWheel={handleWheel}
      >
        <div className="p-4 text-center min-w-min">
        {!currentPage ? (
          <div className="text-sm text-muted-foreground">페이지 없음</div>
        ) : !currentPage.imagePath ? (
          <div className="text-center my-12">
            <ImagePlus className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground mb-1">이미지가 등록되지 않았습니다.</p>
            <p className="text-[11px] text-muted-foreground mb-4">
              프로세스 흐름도 이미지(PNG/JPG)를 등록하세요.
            </p>
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploadingPageId === currentPage.id}
              className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5 mx-auto"
            >
              {uploadingPageId === currentPage.id ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  업로드 중...
                </>
              ) : (
                <>
                  <ImagePlus className="w-3 h-3" />
                  이미지 등록
                </>
              )}
            </button>
          </div>
        ) : imageLoading ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2 my-12">
            <Loader2 className="w-4 h-4 animate-spin" />
            이미지 불러오는 중...
          </div>
        ) : dataUrl ? (
          <img
            src={dataUrl}
            alt={`${detail.code} 페이지 ${currentPage.pageNo}`}
            className="inline-block h-auto rounded shadow-sm border border-border select-none align-top"
            style={{
              width: `${zoom * 100}%`,
              maxWidth: zoom <= 1 ? '100%' : 'none'
            }}
            draggable={false}
          />
        ) : (
          <div className="text-sm text-destructive my-12">이미지를 불러올 수 없습니다.</div>
        )}
        </div>
      </div>

      {/* Footer actions */}
      {currentPage?.imagePath && (
        <footer className="px-4 py-2 border-t border-border flex items-center justify-between shrink-0 bg-card gap-3 flex-wrap">
          <span className="text-[11px] text-muted-foreground shrink-0">
            페이지 {currentPage.pageNo} / {detail.pages.length}
          </span>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 border border-border rounded-md overflow-hidden">
            <button
              type="button"
              onClick={zoomOut}
              disabled={zoom <= ZOOM_MIN}
              className="p-1.5 hover:bg-muted disabled:opacity-30"
              title="축소 (Ctrl + 휠)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <select
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="text-[11px] font-semibold px-1.5 py-1 bg-transparent border-0 focus:outline-none cursor-pointer tabular-nums w-14 text-center"
            >
              {!ZOOM_PRESETS.includes(zoom) && (
                <option value={zoom}>{Math.round(zoom * 100)}%</option>
              )}
              {ZOOM_PRESETS.map((p) => (
                <option key={p} value={p}>
                  {Math.round(p * 100)}%
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={zoomIn}
              disabled={zoom >= ZOOM_MAX}
              className="p-1.5 hover:bg-muted disabled:opacity-30"
              title="확대 (Ctrl + 휠)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={zoomReset}
              className="p-1.5 hover:bg-muted border-l border-border"
              title="100%로"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleExtract}
              disabled={extractBusy}
              className="text-[11px] font-semibold px-2 py-1 rounded-md text-primary hover:bg-primary/10 disabled:opacity-50 flex items-center gap-1"
              title="이 캡쳐 이미지에서 표·정보를 AI로 구조화 추출 (개정이력 등)"
            >
              {extractBusy ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              AI 추출
            </button>
            <button
              type="button"
              onClick={handleUpload}
              className="text-[11px] font-semibold px-2 py-1 rounded-md hover:bg-muted flex items-center gap-1"
            >
              <ImagePlus className="w-3 h-3" />
              교체
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="text-[11px] font-semibold px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              삭제
            </button>
          </div>
        </footer>
      )}

      {/* AI 추출 결과 모달 (PoC) */}
      {extractResult && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
          onClick={() => setExtractResult(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <div className="text-sm font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI 추출 결과
                {extractResult.provider && (
                  <span className="text-[10.5px] font-normal text-muted-foreground">
                    {extractResult.provider} · {extractResult.model}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExtractResult(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
              {!extractResult.success || !extractResult.data ? (
                <div className="text-xs text-destructive">
                  추출 실패: {extractResult.error}
                  {extractResult.raw && (
                    <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {extractResult.raw}
                    </pre>
                  )}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2 text-[12px]">
                    <div>
                      <span className="text-muted-foreground">문서번호 </span>
                      {extractResult.data.docNo || '—'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">제목 </span>
                      {extractResult.data.title || '—'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">개정번호 </span>
                      {extractResult.data.revNo || '—'}
                    </div>
                    <div>
                      <span className="text-muted-foreground">개정일자 </span>
                      {extractResult.data.revDate || '—'}
                    </div>
                  </div>
                  {extractResult.data.scope && (
                    <div className="text-[12px]">
                      <span className="text-muted-foreground">적용범위 </span>
                      {extractResult.data.scope}
                    </div>
                  )}
                  {extractResult.data.purpose && (
                    <div className="text-[12px]">
                      <span className="text-muted-foreground">목적 </span>
                      {extractResult.data.purpose}
                    </div>
                  )}

                  <div>
                    <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                      개정이력 ({extractResult.data.revisions.length})
                    </div>
                    <table className="w-full text-[11px] border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="border border-border px-1.5 py-1">No</th>
                          <th className="border border-border px-1.5 py-1">일자</th>
                          <th className="border border-border px-1.5 py-1 text-left">사유/내용</th>
                          <th className="border border-border px-1.5 py-1">작성자</th>
                        </tr>
                      </thead>
                      <tbody>
                        {extractResult.data.revisions.map((r, i) => (
                          <tr key={i}>
                            <td className="border border-border px-1.5 py-1 text-center">{r.no}</td>
                            <td className="border border-border px-1.5 py-1 text-center whitespace-nowrap">
                              {r.date}
                            </td>
                            <td className="border border-border px-1.5 py-1">{r.reason}</td>
                            <td className="border border-border px-1.5 py-1 text-center whitespace-nowrap">
                              {r.author}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {extractResult.data.approvals.length > 0 && (
                    <div>
                      <div className="text-[11px] font-semibold text-muted-foreground mb-1">
                        결재 ({extractResult.data.approvals.length})
                      </div>
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {extractResult.data.approvals.map((a, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded border border-border bg-muted/40"
                          >
                            {a.role}: {a.name} {a.title && `(${a.title})`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <details className="text-[10.5px]">
                    <summary className="cursor-pointer text-muted-foreground">원본 JSON</summary>
                    <pre className="mt-1 whitespace-pre-wrap bg-muted/40 p-2 rounded">
                      {extractResult.raw}
                    </pre>
                  </details>
                </>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-border text-[11px] text-muted-foreground shrink-0">
              ※ PoC — 추출 결과 확인용. 다음 단계: 이 데이터를 구조화 양식으로 저장·편집.
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
