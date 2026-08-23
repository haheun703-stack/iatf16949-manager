import { useState } from 'react'
import { Save } from 'lucide-react'
import type { SemimesScanContextDto } from '@shared/ipc-types'
import { todayKST } from '@shared/date-kst'
import { cn } from '../../../lib/utils'
import { invokeErrText } from '../../lib/errText'
import { useSingleFlight } from '../../lib/asyncGuard'
import { ScanInput } from './ScanInput'

/**
 * M3 현장 폰 — 검사 등록 (2026-08-23). [조회]·[저장] 2버튼 · 큰 타깃.
 * 시료 복수(PC-2): 스펙의 sampleCnt(n) 만큼 시료 칸 — 시료별 sampleNo 1..n 로 저장(한 항목 n값). 칸이 비면 그 시료는 생략.
 * 실측값 강제 = 수치만(○/× 단독 저장 거부, 29호 §4). 자동판정 = 서버 suggestion 제안, 확정(합격/불합격/보류)은 사람 탭.
 * 확인자 2단 서명(⑥-1)은 홈 탭의 [확인 서명](inspConfirm — 세션 각인·자기확인 금지)으로 분리.
 */
const KINDS = ['자주', '수입', '공정', '패트롤', '출하'] as const
const PHASES = ['초품', '중품', '종품'] as const
interface ItemRow {
  specId?: number
  inspItem: string
  unit: string | null
  su: number | null
  sl: number | null
  samples: string[]
}

export function MobileInspEntry({ onSaved }: { onSaved?: () => void }): JSX.Element {
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState<SemimesScanContextDto | null>(null)
  const [kind, setKind] = useState<(typeof KINDS)[number]>('자주')
  const [phase, setPhase] = useState<(typeof PHASES)[number]>('초품')
  const [procCode, setProcCode] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [rows, setRows] = useState<ItemRow[]>([])
  const [judgment, setJudgment] = useState<'합격' | '불합격' | '보류' | ''>('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const flight = useSingleFlight()

  const rowsFor = (c: SemimesScanContextDto, k: string): ItemRow[] =>
    (c.specs[k] ?? []).map((s) => ({ specId: s.id, inspItem: s.inspItem, unit: s.unit, su: s.su, sl: s.sl, samples: Array.from({ length: Math.max(1, Math.min(10, s.sampleCnt ?? 1)) }, () => '') }))

  async function lookup(q: string): Promise<void> {
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_SCAN_RESOLVE, { query: q })) as SemimesScanContextDto
      setCtx(res)
      if (!res.found) {
        setMsg({ tone: 'bad', text: '품번/LOT을 찾지 못했습니다.' })
        return
      }
      setProcCode(res.routing[0]?.procCode ?? '')
      setLotNo(res.matchedLot ?? '')
      setRows(rowsFor(res, kind))
      setJudgment('')
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '조회 실패 — 통신 오류.') })
    }
  }
  const pickKind = (k: (typeof KINDS)[number]): void => {
    setKind(k)
    if (ctx?.found) setRows(rowsFor(ctx, k))
  }
  const outOfSpec = (r: ItemRow, v: string): boolean => {
    const n = Number(v)
    if (v.trim() === '' || !Number.isFinite(n)) return false
    return (r.su != null && n > r.su) || (r.sl != null && n < r.sl)
  }
  const addItem = (): void => setRows((rs) => [...rs, { inspItem: '', unit: null, su: null, sl: null, samples: [''] }])

  const save = (): Promise<void> =>
    flight(async () => {
      if (!ctx?.found || !ctx.itemCode) return
      if (!judgment) {
        setMsg({ tone: 'bad', text: '판정(합격/불합격/보류)을 눌러야 저장됩니다.' })
        return
      }
      const values: Array<{ specId?: number; inspItem: string; sampleNo: number; value: number }> = []
      for (const r of rows) {
        if (!r.inspItem.trim()) continue
        r.samples.forEach((s, i) => {
          if (s.trim() === '') return
          values.push({ specId: r.specId, inspItem: r.inspItem, sampleNo: i + 1, value: Number(s) })
        })
      }
      if (values.length === 0) {
        setMsg({ tone: 'bad', text: '측정값을 숫자로 최소 1개 넣으세요(○/× 만으로는 저장 안 됨).' })
        return
      }
      if (values.some((v) => !Number.isFinite(v.value))) {
        setMsg({ tone: 'bad', text: '숫자가 아닌 측정값이 있습니다.' })
        return
      }
      setBusy(true)
      try {
        const res = (await window.api.invoke(window.api.channels.SEMIMES_INSP_CREATE, {
          inspDate: todayKST(),
          inspKind: kind,
          itemCode: ctx.itemCode,
          lotNo: lotNo || null,
          procCode: procCode || null,
          samplePhase: kind === '자주' ? phase : null,
          judgment,
          values
        })) as { success: boolean; id?: number; suggestion?: string; specRevision?: number | null; error?: string }
        if (!res.success) {
          setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
          return
        }
        setMsg({ tone: 'ok', text: `저장됨 #${res.id} — ${kind}${kind === '자주' ? ' ' + phase : ''} · 측정 ${values.length}값 · 판정 ${judgment}${res.suggestion && res.suggestion !== judgment ? ` (자동제안 ${res.suggestion})` : ''}` })
        setRows(rowsFor(ctx, kind))
        setJudgment('')
        onSaved?.()
      } catch (e) {
        setMsg({ tone: 'bad', text: invokeErrText(e, '저장 실패 — 통신 오류.') })
      } finally {
        setBusy(false)
      }
    })

  const Chip = ({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }): JSX.Element => (
    <button type="button" onClick={onClick} className={cn('h-12 px-4 rounded-xl border text-[15px] font-semibold active:scale-95', on ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border')}>
      {children}
    </button>
  )

  return (
    <div className="space-y-4 pb-28">
      <ScanInput value={query} onChange={setQuery} onResolve={(q) => void lookup(q)} />
      {ctx?.found && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="text-[12px] text-muted-foreground">품번</div>
            <div className="text-[20px] font-bold">{ctx.itemCode}</div>
            <div className="text-[14px] text-muted-foreground">{ctx.itemName ?? ''}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {KINDS.map((k) => (
              <Chip key={k} on={kind === k} onClick={() => pickKind(k)}>{k}</Chip>
            ))}
          </div>
          {kind === '자주' && (
            <div className="flex gap-2">
              {PHASES.map((p) => (
                <Chip key={p} on={phase === p} onClick={() => setPhase(p)}>{p}</Chip>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {ctx.routing.map((r) => (
              <Chip key={r.procCode} on={procCode === r.procCode} onClick={() => setProcCode(r.procCode)}>{`${r.seq}. ${r.procName ?? r.procCode}`}</Chip>
            ))}
          </div>
          <input value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="LOT 번호(선택)" className="w-full h-12 rounded-xl border border-border bg-background px-4 text-[16px] outline-none focus:border-primary" />

          <div className="space-y-3">
            {rows.length === 0 && <p className="text-[13px] text-muted-foreground">이 검사종류의 검사기준(SPEC)이 없습니다 — 항목을 직접 추가하세요.</p>}
            {rows.map((r, ri) => (
              <div key={ri} className="rounded-2xl border border-border bg-card p-3">
                {r.specId ? (
                  <div className="flex items-baseline justify-between">
                    <div className="text-[16px] font-bold">{r.inspItem}</div>
                    <div className="text-[12px] text-muted-foreground">
                      {r.sl ?? '—'} ~ {r.su ?? '—'} {r.unit ?? ''} · 시료 {r.samples.length}
                    </div>
                  </div>
                ) : (
                  <input value={r.inspItem} onChange={(e) => setRows((rs) => rs.map((x, i) => (i === ri ? { ...x, inspItem: e.target.value } : x)))} placeholder="검사 항목명" className="w-full h-11 rounded-lg border border-border bg-background px-3 text-[15px] outline-none" />
                )}
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {r.samples.map((s, si) => (
                    <input
                      key={si}
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={s}
                      placeholder={`시료${si + 1}`}
                      onChange={(e) => setRows((rs) => rs.map((x, i) => (i === ri ? { ...x, samples: x.samples.map((y, j) => (j === si ? e.target.value : y)) } : x)))}
                      className={cn('h-12 rounded-lg border bg-background px-2 text-center text-[17px] font-semibold outline-none focus:border-primary', outOfSpec(r, s) ? 'border-red-500 text-red-600' : 'border-border')}
                      data-testid={`m-val-${ri}-${si}`}
                    />
                  ))}
                  {!r.specId && (
                    <button type="button" onClick={() => setRows((rs) => rs.map((x, i) => (i === ri ? { ...x, samples: [...x.samples, ''] } : x)))} className="h-12 rounded-lg border border-dashed border-border text-[14px] text-muted-foreground">+ 시료</button>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addItem} className="w-full h-11 rounded-xl border border-dashed border-border text-[14px] text-muted-foreground">+ 항목 추가</button>
          </div>

          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">판정 (사람이 확정)</div>
            <div className="grid grid-cols-3 gap-2">
              {(['합격', '불합격', '보류'] as const).map((j) => (
                <button key={j} type="button" onClick={() => setJudgment(j)} className={cn('h-14 rounded-xl border text-[17px] font-bold active:scale-95', judgment === j ? (j === '합격' ? 'bg-emerald-600 text-white border-emerald-600' : j === '불합격' ? 'bg-red-600 text-white border-red-600' : 'bg-amber-500 text-white border-amber-500') : 'bg-background border-border')} data-testid={`m-judge-${j}`}>
                  {j}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
      {msg && <p className={cn('text-[14px] font-semibold', msg.tone === 'ok' ? 'text-emerald-700' : 'text-destructive')} data-testid="m-msg">{msg.text}</p>}
      {ctx?.found && (
        <div className="fixed inset-x-0 bottom-16 px-4 pb-2">
          <button type="button" disabled={busy} onClick={() => void save()} className="w-full h-16 rounded-2xl bg-primary text-primary-foreground text-[18px] font-bold shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60" data-testid="m-save">
            <Save className="h-6 w-6" /> 저장
          </button>
        </div>
      )}
    </div>
  )
}
