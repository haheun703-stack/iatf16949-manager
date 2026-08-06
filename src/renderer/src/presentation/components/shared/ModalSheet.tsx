import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../../lib/utils'

/**
 * 31호 §6 — 모달 시트 문법(병행 채택 · 적용 1호 = 수집함 태깅 폼).
 * PC = 중앙 모달 · 폰 = 풀스크린 시트, 1컴포넌트(반응형 분기).
 * 닫기(ESC·바깥 클릭·X) 시 미저장 입력(dirty)이 있으면 확인 대화 — 유실 방지.
 * 저장은 명시 버튼만(자동 저장 금지 — ✓는 사람). 후속 적용 후보 = 보드 [처리]·확인자 서명·취소+재등록.
 */
export function ModalSheet({
  open,
  title,
  dirty = false,
  onClose,
  children,
  wide = false
}: {
  open: boolean
  title: string
  /** 미저장 입력 존재 — 닫기 시 확인 대화 */
  dirty?: boolean
  onClose: () => void
  children: ReactNode
  /** 넓은 콘텐츠(2단 등) — PC 폭 확장 */
  wide?: boolean
}): JSX.Element | null {
  // 미저장 확인 = 앱 내 커스텀 확인창(8/6 검수 잔여 1 — 네이티브 confirm 은 원격 조작·웹뷰에서
  // 세션 블로킹 위험이라 교체). 저장은 명시 버튼만 — 여기서는 닫기 여부만 묻는다.
  const [confirming, setConfirming] = useState(false)
  const attemptClose = (): void => {
    if (dirty) {
      setConfirming(true)
      return
    }
    onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') attemptClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center sm:p-6 bg-foreground/40"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) attemptClose() // 바깥 클릭 — dirty 시 확인
      }}
    >
      <div
        className={cn(
          'relative bg-background flex flex-col overflow-hidden',
          // 폰 = 풀스크린 시트 / PC = 중앙 모달
          'w-full h-full sm:h-auto sm:max-h-[90vh] sm:rounded-2xl sm:shadow-[0_18px_50px_rgba(30,50,80,.25)] sm:border sm:border-border',
          wide ? 'sm:max-w-[1100px]' : 'sm:max-w-[640px]'
        )}
      >
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <h2 className="text-[15px] font-extrabold tracking-[-0.01em] truncate">{title}</h2>
          <button
            type="button"
            onClick={attemptClose}
            title="닫기 (ESC)"
            className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>

        {/* 미저장 닫기 확인 — 커스텀(모달 위 오버레이) */}
        {confirming && (
          <div className="absolute inset-0 z-10 bg-foreground/30 flex items-center justify-center p-6">
            <div className="bg-card border border-border rounded-xl shadow-card p-5 max-w-[360px] w-full">
              <p className="text-[14px] font-bold mb-1">저장하지 않은 입력이 있습니다</p>
              <p className="text-[12.5px] text-muted-foreground mb-4">닫으면 입력한 내용이 사라집니다.</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="h-9 px-4 rounded-lg border border-border text-[13px] font-bold hover:bg-muted"
                >
                  계속 입력
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirming(false)
                    onClose()
                  }}
                  className="h-9 px-4 rounded-lg bg-bad-tint text-bad-ink text-[13px] font-bold hover:brightness-95"
                >
                  닫기 (입력 버림)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
