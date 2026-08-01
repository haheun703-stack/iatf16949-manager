import { X, History } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useFormStore } from '../../stores/formStore'
import { cn } from '../../../lib/utils'

/**
 * 최근 연 양식 줄 (P12) — 작성 화면 최상단.
 *
 * 양식 간 이동은 페이지가 'form-builder' 그대로라 뒤로가기 히스토리에 안 쌓인다. 302종
 * 목록에서 오가다 보면 방금 보던 양식을 다시 찾아 들어가야 했다 — 방문 순서를 칩으로
 * 남겨 한 번에 돌아가게 한다. 재방문은 맨 앞으로 올라온다(LRU).
 *
 * 전환 전 자동 저장: 캔버스의 [이어서 작성]과 같은 규율. 작성 중이던 값이 날아가면
 * 안 되므로 저장이 끝난 뒤에 양식을 바꾼다(실패해도 전환은 진행 — 로그만 남김).
 */
export function RecentFormsBar(): JSX.Element | null {
  const recentForms = useUIStore((s) => s.recentForms)
  const removeRecentForm = useUIStore((s) => s.removeRecentForm)
  const clearRecentForms = useUIStore((s) => s.clearRecentForms)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const currentCode = useFormStore((s) => s.currentForm?.code ?? null)
  const loadFormDefinition = useFormStore((s) => s.loadFormDefinition)
  const saveDraft = useFormStore((s) => s.saveDraft)
  const dirty = useFormStore((s) => s.dirty)

  if (recentForms.length === 0) return null

  const open = async (code: string): Promise<void> => {
    if (code === currentCode) return
    if (dirty) {
      try {
        await saveDraft()
      } catch (err) {
        console.error('[form] 최근 양식 전환 전 자동 저장 실패', err)
      }
    }
    setSelectedFormCode(code)
    void loadFormDefinition(code)
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border bg-muted/30 shrink-0">
      <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" aria-hidden />
      <span className="text-[11px] font-bold text-muted-foreground shrink-0">최근 연 양식</span>
      <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 flex-1 py-0.5">
        {recentForms.map((f) => {
          const active = f.code === currentCode
          return (
            <span
              key={f.code}
              className={cn(
                'group inline-flex items-center gap-1 rounded-md border pl-2 pr-1 py-0.5 shrink-0 transition-colors',
                active
                  ? 'border-primary/40 bg-primary/10'
                  : 'border-border bg-card hover:border-primary/30 hover:bg-muted'
              )}
            >
              <button
                type="button"
                onClick={() => void open(f.code)}
                title={`${f.code} · ${f.name}`}
                aria-current={active ? 'page' : undefined}
                className="inline-flex items-center gap-1.5 max-w-[220px] text-left"
              >
                <span
                  className={cn(
                    'text-[10.5px] font-mono font-bold tracking-tight',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  {f.code}
                </span>
                <span
                  className={cn(
                    'text-[11.5px] truncate',
                    active ? 'font-bold text-foreground' : 'text-foreground/80'
                  )}
                >
                  {f.name}
                </span>
              </button>
              <button
                type="button"
                onClick={() => removeRecentForm(f.code)}
                title="목록에서 제거"
                aria-label={`${f.name} 최근 목록에서 제거`}
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded p-0.5 text-muted-foreground hover:text-bad-ink hover:bg-bad-tint transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )
        })}
      </div>
      <button
        type="button"
        onClick={clearRecentForms}
        title="최근 목록 비우기"
        className="shrink-0 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted transition-colors"
      >
        지우기
      </button>
    </div>
  )
}
