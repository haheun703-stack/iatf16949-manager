import { useState } from 'react'
import { Minus, Plus, Save } from 'lucide-react'
import type { SemimesScanContextDto } from '@shared/ipc-types'
import { todayKST } from '@shared/date-kst'
import { cn } from '../../../lib/utils'
import { invokeErrText } from '../../lib/errText'
import { useSingleFlight } from '../../lib/asyncGuard'
import { ScanInput } from './ScanInput'

/**
 * M3 현장 폰 — 생산실적 등록 (2026-08-23). 문법 = [조회]·[저장] 2버튼 · 엄지 존 큰 타깃(29호 §2·§3).
 * 흐름: 품번/LOT 스캔 → 공정 칩 → LOT(최근 칩 또는 입력) → 양품/불량 스텝퍼(큰 숫자) → 불량유형 칩 → [저장].
 * 기록주체 = 세션(STAMP worker 서버 강제) — 화면에서 이름을 보내지 않는다. append-only(정정 = 취소+재입력, PC 화면).
 */
export function MobileProdEntry({ onSaved }: { onSaved?: () => void }): JSX.Element {
  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState<SemimesScanContextDto | null>(null)
  const [procCode, setProcCode] = useState('')
  const [lotNo, setLotNo] = useState('')
  const [ok, setOk] = useState(0)
  const [ng, setNg] = useState(0)
  const [defect, setDefect] = useState('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const flight = useSingleFlight()

  async function lookup(q: string): Promise<void> {
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_SCAN_RESOLVE, { query: q })) as SemimesScanContextDto
      setCtx(res)
      if (!res.found) {
        setMsg({ tone: 'bad', text: '품번/LOT을 찾지 못했습니다. 품목 마스터에 있는 코드만 기록됩니다.' })
        return
      }
      setProcCode(res.routing[0]?.procCode ?? '')
      setLotNo(res.matchedLot ?? '')
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '조회 실패 — 통신 오류. 다시 시도하세요.') })
    }
  }

  const save = (): Promise<void> =>
    flight(async () => {
      if (!ctx?.found || !ctx.itemCode) return
      if (ok + ng <= 0) {
        setMsg({ tone: 'bad', text: '양품 또는 불량 수량을 넣으세요.' })
        return
      }
      if (ng > 0 && !defect) {
        setMsg({ tone: 'bad', text: ctx.defects.length ? '불량이 있으면 불량유형을 고르세요.' : '불량유형 마스터가 비어 있어 불량을 기록할 수 없습니다 — 사무실 코드관리에서 불량유형을 먼저 등록하세요.' })
        return
      }
      setBusy(true)
      try {
        const res = (await window.api.invoke(window.api.channels.SEMIMES_PROD_CREATE, {
          recordDate: todayKST(),
          itemCode: ctx.itemCode,
          lotNo: lotNo || null,
          procCode: procCode || null,
          okQty: ok,
          ngQty: ng,
          defectCode: ng > 0 ? defect || null : null
        })) as { success: boolean; id?: number; error?: string }
        if (!res.success) {
          setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
          return
        }
        setMsg({ tone: 'ok', text: `저장됨 #${res.id} — ${ctx.itemCode} 양품 ${ok} · 불량 ${ng}` })
        setOk(0)
        setNg(0)
        setDefect('')
        onSaved?.()
      } catch (e) {
        setMsg({ tone: 'bad', text: invokeErrText(e, '저장 실패 — 통신 오류. 다시 시도하세요.') })
      } finally {
        setBusy(false)
      }
    })

  const Stepper = ({ label, v, set, tone }: { label: string; v: number; set: (n: number) => void; tone: 'ok' | 'ng' }): JSX.Element => (
    <div className={cn('rounded-2xl border p-3', tone === 'ok' ? 'border-emerald-300 bg-emerald-50/60' : 'border-red-300 bg-red-50/60')}>
      <div className="text-[13px] font-semibold text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <button type="button" onClick={() => set(Math.max(0, v - 1))} className="h-14 w-14 rounded-xl bg-background border border-border flex items-center justify-center active:scale-95" aria-label={`${label} 감소`}>
          <Minus className="h-6 w-6" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          value={v}
          onChange={(e) => set(Math.max(0, Number(e.target.value) || 0))}
          className="min-w-0 flex-1 h-14 rounded-xl border border-border bg-background text-center text-[28px] font-bold outline-none focus:border-primary"
          data-testid={`m-qty-${tone}`}
        />
        <button type="button" onClick={() => set(v + 1)} className="h-14 w-14 rounded-xl bg-background border border-border flex items-center justify-center active:scale-95" aria-label={`${label} 증가`}>
          <Plus className="h-6 w-6" />
        </button>
      </div>
      <div className="mt-2 flex gap-2">
        {[10, 50, 100].map((n) => (
          <button key={n} type="button" onClick={() => set(v + n)} className="flex-1 h-10 rounded-lg bg-background border border-border text-[14px] font-semibold active:scale-95">+{n}</button>
        ))}
      </div>
    </div>
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
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">공정</div>
            <div className="flex flex-wrap gap-2">
              {ctx.routing.map((r) => (
                <button key={r.procCode} type="button" onClick={() => setProcCode(r.procCode)} className={cn('h-12 px-4 rounded-xl border text-[15px] font-semibold active:scale-95', procCode === r.procCode ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border')}>
                  {r.seq}. {r.procName ?? r.procCode}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">LOT</div>
            <input value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="LOT 번호(선택)" className="w-full h-12 rounded-xl border border-border bg-background px-4 text-[16px] outline-none focus:border-primary" />
            {ctx.recentLots.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {ctx.recentLots.slice(0, 4).map((l) => (
                  <button key={l.lotNo} type="button" onClick={() => setLotNo(l.lotNo)} className={cn('h-10 px-3 rounded-lg border text-[13px] active:scale-95', lotNo === l.lotNo ? 'bg-primary/10 border-primary' : 'bg-background border-border')}>
                    {l.lotNo}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Stepper label="양품" v={ok} set={setOk} tone="ok" />
          <Stepper label="불량" v={ng} set={setNg} tone="ng" />
          {ng > 0 && ctx.defects.length > 0 && (
            <div>
              <div className="mb-1.5 text-[13px] font-semibold text-muted-foreground">불량유형</div>
              <div className="flex flex-wrap gap-2">
                {ctx.defects.map((d) => (
                  <button key={d.code} type="button" onClick={() => setDefect(d.code)} className={cn('h-11 px-3 rounded-xl border text-[14px] active:scale-95', defect === d.code ? 'bg-red-600 text-white border-red-600' : 'bg-background border-border')}>
                    {d.name}
                  </button>
                ))}
              </div>
            </div>
          )}
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
