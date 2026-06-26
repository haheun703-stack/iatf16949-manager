import { useEffect, useRef, useState } from 'react'
import { Sparkles, X, Send, Loader2, Trash2, Search } from 'lucide-react'
import { useCopilotStore } from '../../stores/copilotStore'
import type { CopilotSource } from '@shared/ipc-types'

const KIND_LABEL: Record<string, { ko: string; cls: string }> = {
  clause: { ko: '규정', cls: 'bg-blue-100 text-blue-700' },
  sq_item: { ko: 'SQ', cls: 'bg-purple-100 text-purple-700' },
  form_def: { ko: '양식', cls: 'bg-emerald-100 text-emerald-700' },
  case: { ko: '케이스', cls: 'bg-rose-100 text-rose-700' },
  process: { ko: '프로세스', cls: 'bg-amber-100 text-amber-700' }
}

const EXAMPLES = [
  '시정조치는 어느 규정에 정의돼 있어?',
  '지금 진행중인 케이스 보여줘',
  '브레이징 관련 SQ 점검항목 알려줘',
  'B2100-01 양식에 어떤 항목이 들어가?'
]

function SourceChip({ s }: { s: CopilotSource }): JSX.Element {
  const k = KIND_LABEL[s.kind] ?? { ko: s.kind, cls: 'bg-muted text-muted-foreground' }
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border border-border"
      title={s.title}
    >
      <span className={`px-1 rounded-sm font-semibold ${k.cls}`}>{k.ko}</span>
      <span className="font-mono font-semibold">{s.ref_key}</span>
    </span>
  )
}

export function GlobalCopilot(): JSX.Element | null {
  const open = useCopilotStore((s) => s.open)
  const setOpen = useCopilotStore((s) => s.setOpen)
  const loading = useCopilotStore((s) => s.loading)
  const turns = useCopilotStore((s) => s.turns)
  const ask = useCopilotStore((s) => s.ask)
  const clear = useCopilotStore((s) => s.clear)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, loading])

  if (!open) return null

  const submit = (): void => {
    const t = input.trim()
    if (!t || loading) return
    setInput('')
    void ask(t)
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[420px] max-w-[90vw] bg-card border-l border-border shadow-2xl flex flex-col">
      {/* 헤더 */}
      <div className="h-14 px-4 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold">AI 코파일럿</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">근거기반 · 읽기전용</span>
        </div>
        <div className="flex items-center gap-1">
          {turns.length > 0 && (
            <button
              type="button"
              onClick={clear}
              title="대화 비우기"
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 대화 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 && (
          <div className="text-center text-muted-foreground pt-8">
            <Sparkles className="w-8 h-8 mx-auto opacity-30 mb-2" />
            <p className="text-sm font-medium">우리 데이터에 물어보세요</p>
            <p className="text-[11px] mt-1">규정·SQ·양식·케이스에서 근거를 찾아 답합니다.</p>
            <div className="mt-4 space-y-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void ask(ex)}
                  className="block w-full text-left text-[12px] px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <div className="max-w-[85%] bg-primary text-primary-foreground rounded-lg rounded-br-sm px-3 py-2 text-[13px] whitespace-pre-wrap">
                {t.text}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-start">
              <div
                className={`max-w-[92%] rounded-lg rounded-bl-sm px-3 py-2 text-[13px] whitespace-pre-wrap ${
                  t.error ? 'bg-destructive/10 text-destructive border border-destructive/30' : 'bg-muted'
                }`}
              >
                {t.text}
                {t.sources && t.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-1">
                    <span className="text-[10px] text-muted-foreground mr-0.5 mt-0.5">근거</span>
                    {t.sources.map((s) => (
                      <SourceChip key={`${s.kind}:${s.ref_key}`} s={s} />
                    ))}
                  </div>
                )}
                {t.tools && t.tools.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                    <Search className="w-3 h-3" />
                    {t.tools.map((tool, j) => (
                      <span key={j} className="font-mono">
                        {tool.name}
                        {!tool.ok && '✗'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2 text-[12px] text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              근거 찾는 중…
            </div>
          </div>
        )}
      </div>

      {/* 입력 */}
      <div className="p-3 border-t border-border shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            rows={1}
            placeholder="우리 데이터에 질문… (Enter 전송)"
            className="flex-1 resize-none text-[13px] px-3 py-2 rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary max-h-28"
          />
          <button
            type="button"
            onClick={submit}
            disabled={loading || !input.trim()}
            className="p-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-40 shrink-0"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">
          답변은 우리 데이터 근거 기반입니다. AI는 쓰기 권한이 없습니다(읽기 전용).
        </p>
      </div>
    </div>
  )
}
