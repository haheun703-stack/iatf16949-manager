import { useEffect } from 'react'
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
  const attemptClose = (): void => {
    if (dirty && !window.confirm('저장하지 않은 입력이 있습니다. 닫을까요?')) return
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
          'bg-background flex flex-col overflow-hidden',
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
      </div>
    </div>
  )
}
