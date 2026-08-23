import { useEffect, useState } from 'react'
import { ClipboardCheck, Factory, Home, LogOut, PenLine, RefreshCw } from 'lucide-react'
import type { SemimesTodayRecordsDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { invokeErrText } from '../../lib/errText'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { MobileProdEntry } from './MobileProdEntry'
import { MobileInspEntry } from './MobileInspEntry'

/**
 * M3 현장 폰 셸 `/m` (2026-08-23, 41호 M3 · 29호 §2 모바일 퍼스트).
 * 관리자 화면 미탑재 — 홈(오늘 내 기록 + ⑥-1 확인 서명) · 실적 · 검사 3탭. 하단 탭 = 엄지 존.
 * 기록주체 = 개인 폰 로그인 세션(STAMP 서버 강제). 사무실 8버튼 툴바 반입 금지(29호 §3-5).
 */
type Tab = 'home' | 'prod' | 'insp'

export function MobileShell(): JSX.Element {
  const [tab, setTab] = useState<Tab>('home')
  const session = useActiveUserStore((s) => s.session)
  const sessionChecked = useActiveUserStore((s) => s.sessionChecked)
  const [brand, setBrand] = useState('')
  const [today, setToday] = useState<SemimesTodayRecordsDto | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/brand').then((r) => r.json()).then((j: { companyName?: string }) => setBrand(j.companyName || '데일리Q')).catch(() => setBrand('데일리Q'))
  }, [])
  const refresh = async (): Promise<void> => {
    try {
      setToday((await window.api.invoke(window.api.channels.SEMIMES_TODAY_RECORDS, {})) as SemimesTodayRecordsDto)
    } catch (e) {
      setMsg(invokeErrText(e, '오늘 기록 조회 실패 — 통신 오류.'))
    }
  }
  useEffect(() => {
    if (tab === 'home') void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  const confirm = async (id: number): Promise<void> => {
    setBusyId(id)
    setMsg(null)
    try {
      const r = (await window.api.invoke(window.api.channels.SEMIMES_INSP_CONFIRM, { id })) as { success: boolean; error?: string }
      setMsg(r.success ? `#${id} 확인 서명 완료` : r.error ?? '확인 실패')
      await refresh()
    } catch (e) {
      setMsg(invokeErrText(e, '확인 실패 — 통신 오류.'))
    } finally {
      setBusyId(null)
    }
  }
  const logout = async (): Promise<void> => {
    try { await fetch('/api/auth:logout', { method: 'POST' }) } catch { /* noop */ }
    location.href = '/login?next=%2Fm'
  }

  if (sessionChecked && !session) {
    location.href = '/login?next=%2Fm'
    return <div />
  }
  const me = session?.name ?? ''

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="mobile-shell">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur">
        <div className="min-w-0">
          <div className="truncate text-[15px] font-bold">{brand}</div>
          <div className="text-[11px] text-muted-foreground">현장 입력 · {me}</div>
        </div>
        <button type="button" onClick={() => void logout()} className="h-10 px-3 rounded-lg text-[13px] text-muted-foreground flex items-center gap-1" aria-label="로그아웃">
          <LogOut className="h-4 w-4" /> 나가기
        </button>
      </header>

      <main className="px-4 py-4">
        {tab === 'home' && (
          <div className="space-y-4 pb-20">
            <div className="flex items-center justify-between">
              <h1 className="text-[18px] font-bold">오늘 내 기록 {today ? `(${today.ymd})` : ''}</h1>
              <button type="button" onClick={() => void refresh()} className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center" aria-label="새로고침">
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setTab('prod')} className="h-24 rounded-2xl bg-primary text-primary-foreground text-[17px] font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.98]" data-testid="m-go-prod">
                <Factory className="h-7 w-7" /> 실적 넣기
              </button>
              <button type="button" onClick={() => setTab('insp')} className="h-24 rounded-2xl bg-emerald-600 text-white text-[17px] font-bold flex flex-col items-center justify-center gap-1 active:scale-[0.98]" data-testid="m-go-insp">
                <ClipboardCheck className="h-7 w-7" /> 검사 넣기
              </button>
            </div>
            {msg && <p className="text-[14px] font-semibold text-muted-foreground">{msg}</p>}
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-muted-foreground">검사 ({today?.insp.length ?? 0})</h2>
              <div className="space-y-2">
                {(today?.insp ?? []).map((r) => (
                  <div key={r.id} className={cn('rounded-xl border border-border bg-card p-3', r.canceled && 'opacity-50 line-through')}>
                    <div className="flex items-center justify-between">
                      <div className="text-[15px] font-bold">{r.itemCode} <span className="text-[12px] font-normal text-muted-foreground">{r.inspKind}{r.samplePhase ? ` ${r.samplePhase}` : ''}</span></div>
                      <div className={cn('text-[13px] font-bold', r.judgment === '합격' ? 'text-emerald-600' : r.judgment === '불합격' ? 'text-red-600' : 'text-amber-600')}>{r.judgment ?? '—'}</div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[12px] text-muted-foreground">
                      <span>측정 {r.valueCnt}값 · 검사자 {r.inspector ?? '—'}{r.confirmer ? ` · 확인 ${r.confirmer}` : ''}</span>
                      {!r.canceled && !r.confirmer && r.inspector && r.inspector !== me && (
                        <button type="button" disabled={busyId === r.id} onClick={() => void confirm(r.id)} className="h-9 px-3 rounded-lg bg-emerald-600 text-white text-[13px] font-semibold flex items-center gap-1 active:scale-95 disabled:opacity-60" data-testid={`m-confirm-${r.id}`}>
                          <PenLine className="h-4 w-4" /> 확인 서명
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {today && today.insp.length === 0 && <p className="text-[13px] text-muted-foreground">오늘 검사 기록이 없습니다.</p>}
              </div>
            </section>
            <section>
              <h2 className="mb-2 text-[14px] font-semibold text-muted-foreground">실적 ({today?.prod.length ?? 0})</h2>
              <div className="space-y-2">
                {(today?.prod ?? []).map((r) => (
                  <div key={r.id} className={cn('rounded-xl border border-border bg-card p-3 flex items-center justify-between', r.canceled && 'opacity-50 line-through')}>
                    <div>
                      <div className="text-[15px] font-bold">{r.itemCode} <span className="text-[12px] font-normal text-muted-foreground">{r.procCode ?? ''}{r.lotNo ? ` · ${r.lotNo}` : ''}</span></div>
                      <div className="text-[12px] text-muted-foreground">작업자 {r.worker ?? '—'}</div>
                    </div>
                    <div className="text-right text-[14px]"><span className="font-bold text-emerald-600">{r.okQty}</span> / <span className="font-bold text-red-600">{r.ngQty}</span></div>
                  </div>
                ))}
                {today && today.prod.length === 0 && <p className="text-[13px] text-muted-foreground">오늘 실적 기록이 없습니다.</p>}
              </div>
            </section>
          </div>
        )}
        {tab === 'prod' && <MobileProdEntry onSaved={() => void refresh()} />}
        {tab === 'insp' && <MobileInspEntry onSaved={() => void refresh()} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 grid h-16 grid-cols-3 border-t border-border bg-card/95 backdrop-blur">
        {(
          [
            ['home', '홈', Home],
            ['prod', '실적', Factory],
            ['insp', '검사', ClipboardCheck]
          ] as const
        ).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn('flex flex-col items-center justify-center gap-0.5 text-[12px] font-semibold', tab === id ? 'text-primary' : 'text-muted-foreground')} data-testid={`m-tab-${id}`}>
            <Icon className="h-6 w-6" /> {label}
          </button>
        ))}
      </nav>
    </div>
  )
}
