import { useRef, useState } from 'react'
import { Camera, X, RefreshCw, Loader2 } from 'lucide-react'

/**
 * 현품 사진 등 photo 필드 입력.
 * 클릭 → OS 파일 선택 → 자동 축소(최대 1280px, JPEG 압축) → data URL 로 변환해 값에 임베드.
 * data URL 이라 form_submissions(values_json)에 그대로 저장되고 인쇄/PDF에도 포함된다.
 * 삭제/변경 버튼은 no-print(인쇄 제외).
 */
function fileToDataUrl(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('이미지 디코딩 실패'))
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('canvas 컨텍스트 없음'))
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

interface Props {
  value: unknown
  onChange: (value: unknown) => void
}

export function PhotoField({ value, onChange }: Props): JSX.Element {
  const dataUrl = typeof value === 'string' && value.startsWith('data:') ? value : ''
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = (): void => inputRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const f = e.target.files?.[0]
    e.target.value = '' // 같은 파일 재선택 허용
    if (!f) return
    setBusy(true)
    setError('')
    try {
      const url = await fileToDataUrl(f)
      onChange(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '사진 첨부 실패')
    } finally {
      setBusy(false)
    }
  }

  const hiddenInput = (
    <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e)} />
  )

  if (dataUrl) {
    return (
      <div className="inline-block relative">
        <img src={dataUrl} alt="현품 사진" className="max-h-56 max-w-full rounded-md border border-border" />
        <div className="absolute top-1.5 right-1.5 flex gap-1 no-print">
          <button
            type="button"
            onClick={pick}
            title="사진 변경"
            className="w-7 h-7 rounded-md bg-card/90 border border-border shadow-sm flex items-center justify-center hover:bg-muted"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onChange('')}
            title="사진 삭제"
            className="w-7 h-7 rounded-md bg-card/90 border border-border shadow-sm flex items-center justify-center hover:bg-destructive/10 text-destructive"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        {hiddenInput}
      </div>
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={pick}
        disabled={busy}
        className="w-full border-2 border-dashed border-fillable-border bg-fillable rounded-md py-6 flex flex-col items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:border-primary/50 hover:bg-primary/5 transition-colors no-print"
      >
        {busy ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6 opacity-60" />}
        {busy ? '처리 중...' : '클릭하여 사진 첨부'}
      </button>
      {error && <div className="text-[11px] text-destructive mt-1">{error}</div>}
      {hiddenInput}
    </div>
  )
}
