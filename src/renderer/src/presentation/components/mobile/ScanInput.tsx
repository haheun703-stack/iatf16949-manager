import { useEffect, useRef, useState } from 'react'
import { Camera, Search, X } from 'lucide-react'

/**
 * M3 현장 폰 — 품번/LOT 스캔 입력 (2026-08-23, 29호 §2 "카메라 = 스캐너").
 * 브라우저 내장 BarcodeDetector(크롬/안드로이드) 로 QR·바코드 인식 — 외부 라이브러리 0.
 * 미지원(iOS 사파리 등) = 카메라 버튼 숨김, 직접 입력만. 인식 즉시 onResolve(텍스트) → 부모가 [조회].
 */
type Detector = { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> }
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => Detector
  }
}
const hasDetector = (): boolean => typeof window !== 'undefined' && typeof window.BarcodeDetector === 'function'

export function ScanInput({
  value,
  onChange,
  onResolve,
  placeholder = '품번 또는 LOT 번호'
}: {
  value: string
  onChange: (v: string) => void
  onResolve: (v: string) => void
  placeholder?: string
}): JSX.Element {
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<number | null>(null)
  const aliveRef = useRef(true) // 언마운트/정지 뒤 늦게 도착한 getUserMedia·detect 결과 무시(리뷰 8/23: 카메라가 안 꺼지던 경로)
  const scanningRef = useRef(false)

  const stop = (): void => {
    scanningRef.current = false
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }
  useEffect(() => {
    aliveRef.current = true
    return () => {
      aliveRef.current = false
      stop()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = async (): Promise<void> => {
    setErr(null)
    if (!hasDetector()) {
      setErr('이 브라우저는 카메라 스캔을 지원하지 않습니다 — 번호를 직접 입력하세요.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      if (!aliveRef.current) {
        stream.getTracks().forEach((t) => t.stop()) // 기다리는 사이 화면이 닫힘 — 카메라 즉시 해제
        return
      }
      streamRef.current = stream
      scanningRef.current = true
      setScanning(true)
      await new Promise((r) => setTimeout(r, 50))
      const v = videoRef.current
      if (!v || !aliveRef.current) {
        stop()
        return
      }
      v.srcObject = stream
      await v.play()
      const det = new window.BarcodeDetector!({ formats: ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'] })
      // 자기 예약 루프 = detect 1건만 비행(setInterval 은 detect 가 겹쳐 같은 QR 로 onResolve 가 2~3번 발사됐다 — 리뷰 8/23)
      const tick = async (): Promise<void> => {
        if (!scanningRef.current || !aliveRef.current) return
        try {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            const found = await det.detect(videoRef.current)
            const raw = found[0]?.rawValue?.trim()
            if (raw && scanningRef.current) {
              onChange(raw)
              stop()
              onResolve(raw)
              return
            }
          }
        } catch {
          /* 프레임 실패 — 다음 틱 */
        }
        if (scanningRef.current && aliveRef.current) timerRef.current = window.setTimeout(() => void tick(), 150)
      }
      timerRef.current = window.setTimeout(() => void tick(), 150)
    } catch {
      setErr('카메라를 열 수 없습니다(권한 거부 또는 HTTPS 필요). 번호를 직접 입력하세요.')
      stop()
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onResolve(value.trim())}
          placeholder={placeholder}
          inputMode="text"
          autoCapitalize="characters"
          className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-[17px] h-14 outline-none focus:border-primary"
          data-testid="m-scan-input"
        />
        {hasDetector() && (
          <button type="button" onClick={() => (scanning ? stop() : void start())} className="h-14 w-14 shrink-0 rounded-xl bg-muted text-foreground flex items-center justify-center active:scale-95" aria-label="카메라 스캔">
            {scanning ? <X className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => value.trim() && onResolve(value.trim())}
          className="h-14 px-5 shrink-0 rounded-xl bg-primary text-primary-foreground font-bold text-[16px] flex items-center gap-1.5 active:scale-95"
          data-testid="m-lookup"
        >
          <Search className="h-5 w-5" /> 조회
        </button>
      </div>
      {scanning && (
        <div className="mt-2 overflow-hidden rounded-xl border border-border bg-black">
          <video ref={videoRef} muted playsInline className="w-full max-h-64 object-cover" />
          <div className="px-3 py-1.5 text-[12px] text-white/80">QR·바코드를 화면 가운데에 맞추세요</div>
        </div>
      )}
      {err && <p className="mt-2 text-[13px] text-destructive font-semibold">{err}</p>}
    </div>
  )
}
