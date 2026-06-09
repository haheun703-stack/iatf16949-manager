import { useCallback, useRef, useState } from 'react'
import { cn } from '../../../lib/utils'

interface Props {
  /** Unique key for persisting the split ratio in localStorage. */
  storageKey: string
  /** Initial left-pane width as a percentage (0–100). */
  initial?: number
  /** Min / max left-pane width in percent. */
  min?: number
  max?: number
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}

function loadRatio(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(`split:${key}`)
    if (raw !== null) {
      const n = parseFloat(raw)
      if (!Number.isNaN(n)) return n
    }
  } catch {
    /* localStorage unavailable — fall back */
  }
  return fallback
}

function saveRatio(key: string, value: number): void {
  try {
    localStorage.setItem(`split:${key}`, String(value))
  } catch {
    /* ignore */
  }
}

/**
 * Two-pane horizontal layout with a draggable divider.
 * The ratio is persisted per `storageKey`. Double-click the divider to reset,
 * arrow keys nudge it for keyboard users.
 */
export function ResizableSplit({
  storageKey,
  initial = 40,
  min = 25,
  max = 70,
  left,
  right,
  className
}: Props): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pct, setPct] = useState(() => loadRatio(storageKey, initial))
  const [dragging, setDragging] = useState(false)

  const clamp = useCallback((v: number) => Math.max(min, Math.min(max, v)), [min, max])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect || rect.width === 0) return
      setPct(clamp(((e.clientX - rect.left) / rect.width) * 100))
    },
    [dragging, clamp]
  )

  const endDrag = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return
      setDragging(false)
      try {
        ;(e.target as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      saveRatio(storageKey, pct)
    },
    [dragging, pct, storageKey]
  )

  const nudge = useCallback(
    (delta: number) => {
      setPct((p) => {
        const next = clamp(p + delta)
        saveRatio(storageKey, next)
        return next
      })
    },
    [clamp, storageKey]
  )

  const reset = useCallback(() => {
    setPct(initial)
    saveRatio(storageKey, initial)
  }, [initial, storageKey])

  return (
    <div ref={containerRef} className={cn('flex min-h-0 min-w-0', className)}>
      <div style={{ width: `${pct}%` }} className="min-w-0 h-full">
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="패널 너비 조절"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={reset}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            nudge(-2)
          } else if (e.key === 'ArrowRight') {
            e.preventDefault()
            nudge(2)
          }
        }}
        title="드래그하여 너비 조절 · 더블클릭 시 기본값"
        className="group relative mx-1.5 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center self-stretch focus:outline-none"
      >
        <div
          className={cn(
            'h-14 w-1 rounded-full transition-colors',
            dragging ? 'bg-primary' : 'bg-border group-hover:bg-primary/50 group-focus:bg-primary/60'
          )}
        />
      </div>

      <div className="h-full min-w-0 flex-1">{right}</div>
    </div>
  )
}
