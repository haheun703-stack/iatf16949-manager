import { useEffect, useRef } from 'react'
import { create } from 'zustand'

/**
 * 전역 커스텀 확인창 — window.confirm 일괄 교체(8/6 검수 일관성 + 접근성).
 * 네이티브 confirm 은 원격 조작·웹뷰에서 세션 블로킹 위험(ModalSheet 방침과 동일 근거).
 * 사용: const ok = await confirmDialog({ title, body, okLabel, danger }) — 호스트는 AppShell 1곳.
 * 접근성: role=alertdialog · ESC/바깥 클릭 = 취소 · 초기 포커스 = 취소 버튼(안전 기본값) · Tab 2버튼 순환.
 */

interface ConfirmReq {
  title: string
  body?: string
  okLabel?: string
  cancelLabel?: string
  /** 파괴적 동작(버림·삭제) — 확인 버튼 적색 */
  danger?: boolean
  resolve: (ok: boolean) => void
}

const useConfirmStore = create<{ req: ConfirmReq | null; ask: (r: Omit<ConfirmReq, 'resolve'>) => Promise<boolean>; settle: (ok: boolean) => void }>(
  (set, get) => ({
    req: null,
    ask: (r) =>
      new Promise<boolean>((resolve) => {
        // 중첩 호출 방어: 이전 요청은 취소로 정리(확인창은 1장만)
        get().req?.resolve(false)
        set({ req: { ...r, resolve } })
      }),
    settle: (ok) => {
      get().req?.resolve(ok)
      set({ req: null })
    }
  })
)

/** 어디서든: const ok = await confirmDialog({...}) */
export function confirmDialog(r: { title: string; body?: string; okLabel?: string; cancelLabel?: string; danger?: boolean }): Promise<boolean> {
  return useConfirmStore.getState().ask(r)
}

export function ConfirmDialogHost(): JSX.Element | null {
  const { req, settle } = useConfirmStore()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const okRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!req) return
    const prevFocus = document.activeElement as HTMLElement | null
    cancelRef.current?.focus() // 안전 기본값 = 취소
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        settle(false)
        return
      }
      // Tab 2버튼 순환(8/11 검수 Major — 선언만 있고 미구현이던 트랩 실장)
      if (e.key === 'Tab') {
        e.preventDefault()
        if (document.activeElement === cancelRef.current) okRef.current?.focus()
        else cancelRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      prevFocus?.focus?.()
    }
  }, [req, settle])

  if (!req) return null
  return (
    <div
      className="fixed inset-0 z-[200] bg-foreground/30 flex items-center justify-center p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) settle(false)
      }}
    >
      <div role="alertdialog" aria-modal="true" aria-label={req.title} className="bg-card border border-border rounded-xl shadow-card p-5 max-w-[400px] w-full">
        <p className="text-[14px] font-bold mb-1 break-keep">{req.title}</p>
        {req.body && <p className="text-[12.5px] text-muted-foreground mb-4 break-keep whitespace-pre-line">{req.body}</p>}
        <div className={req.body ? 'flex justify-end gap-2' : 'flex justify-end gap-2 mt-4'}>
          <button
            ref={cancelRef}
            type="button"
            onClick={() => settle(false)}
            className="h-9 px-4 rounded-lg border border-border text-[13px] font-bold hover:bg-muted"
          >
            {req.cancelLabel ?? '취소'}
          </button>
          <button
            type="button"
            onClick={() => settle(true)}
            className={
              req.danger
                ? 'h-9 px-4 rounded-lg bg-bad-tint text-bad-ink text-[13px] font-bold hover:brightness-95'
                : 'h-9 px-4 rounded-lg bg-primary text-white text-[13px] font-bold hover:opacity-90'
            }
          >
            {req.okLabel ?? '확인'}
          </button>
        </div>
      </div>
    </div>
  )
}
