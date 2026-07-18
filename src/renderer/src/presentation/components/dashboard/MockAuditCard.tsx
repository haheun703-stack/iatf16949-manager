import { useEffect, useRef, useState } from 'react'
import { GraduationCap, Loader2, FileWarning } from 'lucide-react'
import type { SqReadinessDto, MockAuditResponse, MockAuditResult } from '@shared/ipc-types'

interface PickItem {
  code: string
  title: string
  category: string
  signal: string
}

const SIG_DOT: Record<string, string> = {
  green: '🟢',
  yellow: '🟡',
  red: '🔴',
  gray: '⬜'
}

/**
 * @param initialItemKey 히트맵 핫스팟 등에서 지정한 SQ 항목 코드 — 도착 시 자동 선택+자동 실행.
 * @param runNonce 클릭마다 증가 — 같은 항목 재클릭에도 재실행 트리거.
 */
export function MockAuditCard({
  initialItemKey = null,
  runNonce = 0
}: {
  initialItemKey?: string | null
  runNonce?: number
} = {}): JSX.Element {
  const [items, setItems] = useState<PickItem[]>([])
  const [sel, setSel] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MockAuditResult | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void (async () => {
      try {
        const r = (await window.api.invoke(window.api.channels.SQ_READINESS)) as SqReadinessDto
        const flat: PickItem[] = []
        for (const c of r.categories) for (const it of c.items) flat.push({ code: it.code, title: it.title, category: c.name, signal: it.signal })
        setItems(flat)
        // 기본값 = 첫 RED 항목(가장 점검 가치 큼) 없으면 첫 항목.
        // 단, 히트맵에서 이미 항목이 지정됐으면(sel 채워짐) 덮어쓰지 않음.
        const firstRed = flat.find((x) => x.signal === 'red') ?? flat[0]
        setSel((cur) => cur || firstRed?.code || '')
      } catch {
        /* noop */
      }
    })()
  }, [])

  const run = async (keyOverride?: string): Promise<void> => {
    const target = keyOverride ?? sel
    if (!target || loading) return
    setLoading(true); setErr(null); setResult(null)
    try {
      const res = (await window.api.invoke(window.api.channels.AI_MOCK_AUDIT, { sqItemKey: target })) as MockAuditResponse
      if (res.success && res.result) setResult(res.result)
      else setErr(res.error || '모의심사 실패')
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // 히트맵 핫스팟 클릭 → 해당 항목 선택 + 예상질문 바로 생성 (runNonce로 매 클릭 재실행).
  // 결과 도착(형제 AI 카드까지 안정화) 시점에 이 카드로 정확히 스크롤.
  useEffect(() => {
    if (!initialItemKey) return
    setSel(initialItemKey)
    void run(initialItemKey).finally(() => {
      rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runNonce])

  // 카테고리별 그룹
  const byCat = items.reduce<Record<string, PickItem[]>>((acc, it) => {
    ;(acc[it.category] ??= []).push(it)
    return acc
  }, {})

  return (
    <div ref={rootRef} id="mock-audit-card" className="bg-card border border-border rounded-xl shadow-sm p-5 scroll-mt-4">
      <h2 className="text-sm font-bold flex items-center gap-1.5 mb-3">
        <GraduationCap className="w-4 h-4 text-primary" />
        AI 모의 심사 <span className="text-[12.5px] font-normal text-muted-foreground">AI 심사원의 예상질문 + 증빙 갭</span>
      </h2>

      <div className="flex items-center gap-2 mb-3">
        <select
          value={sel}
          onChange={(e) => setSel(e.target.value)}
          className="flex-1 text-[13.5px] px-3 py-2 rounded-lg border border-border bg-background"
        >
          {Object.entries(byCat).map(([cat, its]) => (
            <optgroup key={cat} label={cat}>
              {its.map((it) => (
                <option key={it.code} value={it.code}>
                  {SIG_DOT[it.signal] ?? ''} {it.code} · {it.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void run()}
          disabled={loading || !sel}
          className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 flex items-center gap-1.5 shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
          모의심사
        </button>
      </div>

      {err && (
        <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-[13.5px] text-destructive">
          <FileWarning className="w-4 h-4 shrink-0 mt-0.5" /><span>{err}</span>
        </div>
      )}

      {!result && !loading && !err && (
        <p className="text-[13.5px] text-muted-foreground">항목을 고르고 <b>모의심사</b>를 누르면, AI 심사원이 던질 예상 질문과 우리 증빙의 충분/부족을 짚어줍니다.</p>
      )}

      {result && (
        <div>
          <div className="flex items-center gap-2 text-[13.5px] text-muted-foreground mb-2">
            <span className="font-mono font-semibold text-foreground">{result.itemCode}</span>
            <span className="font-semibold text-foreground truncate">{result.itemTitle}</span>
            <span className="shrink-0">· {result.points}점</span>
            <span className="shrink-0">· 증빙 양식 {result.formCount}(작성 {result.submittedCount})</span>
          </div>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-[13px] whitespace-pre-wrap leading-relaxed">
            {result.text}
          </div>
        </div>
      )}
    </div>
  )
}
