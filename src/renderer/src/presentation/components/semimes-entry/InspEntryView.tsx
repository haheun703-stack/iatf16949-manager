import { useState } from 'react'
import { Search, Save, CheckCircle2 } from 'lucide-react'
import type { SemimesScanContextDto, SemimesTodayRecordsDto } from '@shared/ipc-types'
import { todayKST } from '@shared/date-kst'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'

/**
 * PC — 검사 등록 (현장 문법: [조회]·[저장] 2버튼·큰 타깃 — 문법노트2차 §3).
 * 자주검사 = 초품/중품/종품 3회(3차 §4-2). 실측값 강제 — 수치 필수(서버 계약과 동일 안내).
 * 자동판정은 제안만(서버 suggestion) — 확정(합격/불합격/보류)은 사람 탭.
 * §10-1: 저장 시 spec_revision 스냅샷 각인(서버) — 결과 메시지에 표시. 확인자 ✓ = 별도 사람 액션.
 * append-only: 수정 없음 — 잘못 저장 = 사유 입력 취소 + 재입력.
 */

const KINDS = ['자주', '수입', '공정', '패트롤', '출하'] as const
const PHASES = ['초품', '중품', '종품'] as const

interface ValRow {
  specId?: number
  inspItem: string
  value: string
  su: number | null
  sl: number | null
  unit: string | null
}

export function InspEntryView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name

  const [query, setQuery] = useState('')
  const [ctx, setCtx] = useState<SemimesScanContextDto | null>(null)
  const [kind, setKind] = useState<(typeof KINDS)[number]>('자주')
  const [phase, setPhase] = useState<(typeof PHASES)[number]>('초품')
  const [lotNo, setLotNo] = useState('')
  const [procCode, setProcCode] = useState('')
  const [rows, setRows] = useState<ValRow[]>([])
  const [judgment, setJudgment] = useState<'합격' | '불합격' | '보류' | ''>('')
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [today, setToday] = useState<SemimesTodayRecordsDto | null>(null)
  const [cancelFor, setCancelFor] = useState<{ id: number; reason: string } | null>(null)

  const specRowsFor = (c: SemimesScanContextDto, k: string): ValRow[] =>
    (c.specs[k] ?? []).map((s) => ({ specId: s.id, inspItem: s.inspItem, value: '', su: s.su, sl: s.sl, unit: s.unit }))

  async function lookup(): Promise<void> {
    setMsg(null)
    const res = (await window.api.invoke(window.api.channels.SEMIMES_SCAN_RESOLVE, { query })) as SemimesScanContextDto
    setCtx(res)
    if (!res.found) {
      setMsg({ tone: 'bad', text: '품번/LOT을 찾지 못했습니다 — 품목 마스터 실존 코드만 기록됩니다.' })
      return
    }
    if (res.matchedLot) setLotNo(res.matchedLot)
    setProcCode(res.routing[0]?.procCode ?? '')
    setRows(specRowsFor(res, kind))
    await refreshToday()
  }

  async function refreshToday(): Promise<void> {
    try {
      setToday((await window.api.invoke(window.api.channels.SEMIMES_TODAY_RECORDS, {})) as SemimesTodayRecordsDto)
    } catch {
      /* 목록 실패 — 입력은 계속 */
    }
  }

  function pickKind(k: (typeof KINDS)[number]): void {
    setKind(k)
    if (ctx?.found) setRows(specRowsFor(ctx, k))
  }

  async function save(): Promise<void> {
    if (!ctx?.found || !ctx.itemCode) return
    if (!judgment) {
      setMsg({ tone: 'bad', text: '판정(합격/불합격/보류)을 사람이 확정해야 저장됩니다 — 자동판정은 제안일 뿐.' })
      return
    }
    const values = rows
      .filter((r) => r.inspItem.trim() !== '' && r.value.trim() !== '')
      .map((r, i) => ({ specId: r.specId, inspItem: r.inspItem, sampleNo: 1, value: Number(r.value), _i: i }))
    if (values.length === 0) {
      setMsg({ tone: 'bad', text: '측정값이 최소 1건 필요합니다 — 실측값을 수치로 기록(○/× 단독 저장 거부).' })
      return
    }
    if (values.some((v) => !Number.isFinite(v.value))) {
      setMsg({ tone: 'bad', text: '숫자가 아닌 측정값이 있습니다 — 실측값 강제.' })
      return
    }
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_INSP_CREATE, {
        // 8/6 검수 Critical: toISOString 절단 = UTC 날짜(KST 00~09시 전날화) — todayKST 강제(7/30 M-날짜 재발 방지)
        inspDate: todayKST(),
        inspKind: kind,
        itemCode: ctx.itemCode,
        lotNo: lotNo || null,
        procCode: procCode || null,
        samplePhase: kind === '자주' ? phase : null,
        judgment,
        values: values.map(({ _i, ...v }) => v),
        inspector: userName
      })) as { success: boolean; id?: number; suggestion?: string; specRevision?: number | null; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({
        tone: 'ok',
        text: `저장 완료 #${res.id} — ${res.suggestion ?? ''} · 기준 REVISION ${res.specRevision ?? '없음(스펙 미등록)'} 각인 · 확인자 ✓ 대기`
      })
      setRows(specRowsFor(ctx, kind))
      setJudgment('')
      await refreshToday()
    } finally {
      setBusy(false)
    }
  }

  async function confirmRec(id: number): Promise<void> {
    const res = (await window.api.invoke(window.api.channels.SEMIMES_INSP_CONFIRM, { id, confirmer: userName })) as {
      success: boolean
      error?: string
    }
    setMsg(res.success ? { tone: 'ok', text: `확인 완료 — #${id} (확인자 각인)` } : { tone: 'bad', text: res.error ?? '확인 실패' })
    await refreshToday()
  }

  async function cancelRec(): Promise<void> {
    if (!cancelFor) return
    const res = (await window.api.invoke(window.api.channels.SEMIMES_RECORD_CANCEL, {
      kind: 'insp', id: cancelFor.id, reason: cancelFor.reason, canceledBy: userName
    })) as { success: boolean; error?: string }
    setMsg(res.success ? { tone: 'ok', text: `취소 마크 완료 — #${cancelFor.id} (재입력으로 정정)` } : { tone: 'bad', text: res.error ?? '취소 실패' })
    setCancelFor(null)
    await refreshToday()
  }

  const inputCls = 'h-11 px-3 rounded-lg border border-border bg-card text-[14px]' // 현장 큰 타깃

  return (
    <div className="flex flex-col gap-4 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">검사 등록</h1>
        <span className="text-[13px] text-muted-foreground">
          초·중·종 3회 문법 · 실측값 수치 필수 · 자동판정은 제안만 — 확정과 확인 ✓는 사람
        </span>
      </div>

      {/* [조회] — 현장 버튼 1/2 */}
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void lookup()}
          placeholder="품번 또는 LOT 번호 (스캔/입력)"
          className={cn(inputCls, 'flex-1 min-w-0')}
        />
        <button
          type="button"
          onClick={() => void lookup()}
          className="h-11 px-6 rounded-lg bg-primary text-white text-[15px] font-extrabold flex items-center gap-2 shrink-0"
        >
          <Search className="w-4 h-4" /> 조회
        </button>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[13px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {ctx?.found && (
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4 flex flex-col gap-3.5">
          <div className="flex items-center gap-3 flex-wrap text-[13.5px]">
            <b className="text-[15px]">{ctx.itemCode}</b>
            <span className="text-muted-foreground">{ctx.itemName ?? ''} · {ctx.itemType}</span>
            <span className="ml-auto text-[12px] text-muted-foreground">공정 {ctx.routing.length}단계</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              검사종류
              <select value={kind} onChange={(e) => pickKind(e.target.value as (typeof KINDS)[number])} className={inputCls}>
                {KINDS.map((k) => (
                  <option key={k} value={k}>{k}검사</option>
                ))}
              </select>
            </label>
            {kind === '자주' && (
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
                초·중·종 (LOT당 3회)
                <div className="flex gap-1">
                  {PHASES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPhase(p)}
                      className={cn(
                        'h-11 flex-1 rounded-lg border text-[14px] font-bold',
                        phase === p ? 'bg-secondary text-secondary-foreground border-primary/40' : 'border-border hover:bg-muted'
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </label>
            )}
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              LOT (최근 발번 선택 가능)
              <input list="insp-lots" value={lotNo} onChange={(e) => setLotNo(e.target.value)} placeholder="LOT 번호" className={inputCls} />
              <datalist id="insp-lots">
                {ctx.recentLots.map((l) => (
                  <option key={l.lotNo} value={l.lotNo}>{l.lotDate}</option>
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              공정
              <select value={procCode} onChange={(e) => setProcCode(e.target.value)} className={inputCls}>
                <option value="">선택 안 함</option>
                {ctx.routing.map((r) => (
                  <option key={r.seq} value={r.procCode}>{r.procName ?? r.procCode}</option>
                ))}
              </select>
            </label>
          </div>

          {/* 측정값 — 스펙 행(기준 REVISION 각인 원천) + 자유 항목 추가 */}
          <div>
            <div className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">
              측정값 (수치 필수 — 규격은 참고 표시, 판정 확정은 아래에서 사람)
            </div>
            <div className="flex flex-col gap-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1.3fr)_110px_minmax(0,1fr)] gap-2 items-center">
                  <input
                    value={r.inspItem}
                    onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, inspItem: e.target.value } : x)))}
                    placeholder="검사항목"
                    readOnly={r.specId != null}
                    className={cn(inputCls, r.specId != null && 'bg-muted/40 text-muted-foreground')}
                  />
                  <input
                    value={r.value}
                    onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    placeholder="실측값"
                    inputMode="decimal"
                    className={cn(inputCls, 'text-center font-bold tabular-nums bg-fillable/70')}
                  />
                  <span className="text-[12px] text-muted-foreground">
                    {r.sl != null || r.su != null ? `규격 ${r.sl ?? '—'} ~ ${r.su ?? '—'} ${r.unit ?? ''}` : '규격 미등록(스펙 없음 — 수치만 기록)'}
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setRows((p) => [...p, { inspItem: '', value: '', su: null, sl: null, unit: null }])}
                className="h-9 px-3 rounded-lg border border-dashed border-border text-[12.5px] font-semibold text-muted-foreground self-start hover:bg-muted"
              >
                + 항목 추가
              </button>
            </div>
          </div>

          {/* 판정 확정 = 사람 탭 + [저장] — 현장 버튼 2/2 */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {(['합격', '불합격', '보류'] as const).map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setJudgment(j)}
                className={cn(
                  'h-11 px-5 rounded-lg border text-[14.5px] font-extrabold',
                  judgment === j
                    ? j === '합격'
                      ? 'bg-ok-tint text-ok-ink border-ok-ink/40'
                      : j === '불합격'
                        ? 'bg-bad-tint text-bad-ink border-bad-ink/40'
                        : 'bg-warn-tint text-warn-ink border-warn-ink/40'
                    : 'border-border hover:bg-muted'
                )}
              >
                {j}
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="ml-auto h-11 px-7 rounded-lg bg-primary text-white text-[15px] font-extrabold flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 저장
            </button>
            <span className="w-full text-[12px] text-muted-foreground">
              기록 주체 = {userName ?? '(사용자 미선택)'} · 수정 불가(append-only) — 잘못 저장 시 아래 목록에서 사유 입력 취소 후 재입력
            </span>
          </div>
        </div>
      )}

      {/* 오늘 검사 기록 — 확인 ✓(2단 서명)·취소(사유 필수) */}
      {today && today.insp.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
          <h2 className="text-[14px] font-extrabold mb-2">오늘 검사 기록 ({today.ymd})</h2>
          <div className="flex flex-col divide-y divide-border/60">
            {today.insp.map((r) => (
              <div key={r.id} className={cn('py-2 flex items-center gap-2.5 flex-wrap text-[13px]', r.canceled && 'opacity-50 line-through')}>
                <b>#{r.id}</b>
                <span>{r.inspKind}{r.samplePhase ? `·${r.samplePhase}` : ''}</span>
                <span className="font-semibold">{r.itemCode}</span>
                {r.lotNo && <span className="text-muted-foreground">{r.lotNo}</span>}
                <span className={cn('font-bold', r.judgment === '합격' ? 'text-ok-ink' : r.judgment === '불합격' ? 'text-bad-ink' : 'text-warn-ink')}>
                  {r.judgment}
                </span>
                <span className="text-muted-foreground">측정 {r.valueCnt}건 · {r.inspector ?? '무기명'}</span>
                <span className="ml-auto flex items-center gap-1.5">
                  {r.confirmer ? (
                    <span className="text-[12px] font-bold text-ok-ink flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 확인 {r.confirmer}
                    </span>
                  ) : (
                    !r.canceled && (
                      <button type="button" onClick={() => void confirmRec(r.id)} className="h-8 px-2.5 rounded-lg bg-ok-tint text-ok-ink text-[12px] font-bold">
                        확인 ✓
                      </button>
                    )
                  )}
                  {!r.canceled && (
                    <button
                      type="button"
                      onClick={() => setCancelFor({ id: r.id, reason: '' })}
                      className="h-8 px-2.5 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground hover:bg-bad-tint hover:text-bad-ink"
                    >
                      취소
                    </button>
                  )}
                </span>
                {cancelFor?.id === r.id && (
                  <span className="w-full flex gap-2 pt-1">
                    <input
                      value={cancelFor.reason}
                      onChange={(e) => setCancelFor({ id: r.id, reason: e.target.value })}
                      placeholder="취소 사유(필수) — 두 줄 긋고 정정 서명의 전산 등가"
                      className="flex-1 h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]"
                    />
                    <button type="button" onClick={() => void cancelRec()} className="h-9 px-3 rounded-lg bg-bad-tint text-bad-ink text-[12.5px] font-bold">
                      취소 확정
                    </button>
                    <button type="button" onClick={() => setCancelFor(null)} className="h-9 px-3 rounded-lg border border-border text-[12.5px]">
                      닫기
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
