import { useCallback, useEffect, useState } from 'react'
import type { SemimesItemSearchRowDto, SemimesMoldRowDto, SemimesMoldSaveInput } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useDebouncedCallback, useSeqGuard, useSingleFlight } from '../../lib/asyncGuard'
import { invokeErrText } from '../../lib/errText'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #11 금형 2종 (그림51 마스터등록 · 그림53 타발수조회 — 골격 · 26번 A4 계약 착지).
 * 타발수 = 연결 품번 생산수량(양품+불량 · 취소 제외) ÷ 캐비티 — **캐비티 미기입 = '—'**(추정 금지).
 * 잔여 수명 = 보증 타발수 − 타발수(둘 다 있을 때만) · 초과 = 빨강+▲(IATF 8.5.1.6 금형 수명 축).
 * 타발수 한계 도달 알림(T계열)은 후속 — 화면 표기가 먼저(정직).
 */

type Tab = 'master' | 'shots'

interface FormState {
  moldCode: string
  name: string
  itemCode: string
  cavity: string
  guaranteeShots: string
  location: string
  installDate: string
  note: string
}
const EMPTY: FormState = { moldCode: '', name: '', itemCode: '', cavity: '', guaranteeShots: '', location: '', installDate: '', note: '' }

export function MoldView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [tab, setTab] = useState<Tab>('master')
  const [rows, setRows] = useState<SemimesMoldRowDto[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editing, setEditing] = useState(false)
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_MOLD_LIST, {})) as SemimesMoldRowDto[]
      if (!seq.isCurrent(token)) return
      setRows(res)
    } catch {
      if (seq.isCurrent(token)) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [seq])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const searchItems = useDebouncedCallback((q: string): void => {
    if (q.trim().length < 2) return
    void (async () => {
      try {
        setSuggest((await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, { query: q.trim(), limit: 20 })) as SemimesItemSearchRowDto[])
      } catch {
        /* 제안 실패 — 직접 입력 유지 */
      }
    })()
  })

  const saveFlight = useSingleFlight()
  async function save(): Promise<void> {
    if (!form.moldCode.trim() || !form.name.trim()) {
      setMsg({ tone: 'bad', text: '금형코드·금형명은 필수입니다.' })
      return
    }
    for (const [label, v] of [['캐비티', form.cavity], ['보증 타발수', form.guaranteeShots]] as const) {
      if (v.trim() !== '' && (!Number.isInteger(Number(v)) || Number(v) <= 0)) {
        setMsg({ tone: 'bad', text: `${label}는 1 이상의 정수여야 합니다 — 미기입은 비워 두세요(0 대입 금지).` })
        return
      }
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload: SemimesMoldSaveInput = {
        moldCode: form.moldCode.trim(), name: form.name.trim(),
        itemCode: form.itemCode.trim() || null,
        cavity: form.cavity.trim() === '' ? null : Number(form.cavity),
        guaranteeShots: form.guaranteeShots.trim() === '' ? null : Number(form.guaranteeShots),
        location: form.location.trim() || null, installDate: form.installDate.trim() || null,
        note: form.note.trim() || null, updatedBy: userName
      }
      const res = (await window.api.invoke(window.api.channels.SEMIMES_MOLD_SAVE, payload)) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `${form.moldCode.trim()} ${editing ? '정비' : '등록'} 저장 (정비 주체 각인)` })
      setForm(EMPTY)
      setEditing(false)
      await load()
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.') })
    } finally {
      setSaving(false)
    }
  }

  const IN = 'h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]'
  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">금형관리 (마스터·타발수)</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-warn-tint text-warn-ink">IATF 8.5.1.6</span>
        <span className="text-[13px] text-muted-foreground">타발수 = 연결 품번 실적(취소 제외) ÷ 캐비티 · 캐비티 미기입 = '—' 정직 · 한계 알림(T계열)은 후속</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onAdd={tab === 'master' ? () => { setForm(EMPTY); setEditing(false) } : undefined}
          onExcel={rows.length > 0 ? () => downloadCsv('금형마스터_타발수.csv', ['금형코드', '금형명', '연결품번', '캐비티', '생산수량', '타발수', '보증타수', '잔여', '위치', '활성'], rows.map((r) => [r.moldCode, r.name, r.itemCode, r.cavity, r.prodQty, r.shots, r.guaranteeShots, r.remainShots, r.location, r.active === 1 ? '활성' : '비활성'])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
      </div>

      <div className="flex items-center gap-1">
        {([['master', '금형마스터 등록'], ['shots', '금형 타발수 조회']] as Array<[Tab, string]>).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={cn('px-3 py-1.5 rounded-t-lg text-[12.5px] font-bold border-b-2',
              tab === k ? 'border-mega-active text-mega-active bg-secondary/50' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {tab === 'master' && (
        <>
          <div className="rounded-xl border border-border bg-card shadow-card p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              금형코드 (필수){editing && <span className="text-warn-ink"> — 기존 행 정비 중</span>}
              <input value={form.moldCode} onChange={(e) => { setForm({ ...form, moldCode: e.target.value }); setEditing(rows.some((r) => r.moldCode === e.target.value.trim())) }} className={IN} placeholder="예: MLD-2MAA0-01" />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              금형명 (필수)
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={IN} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              연결 품번 (타발수 축 — 마스터 실존 강제)
              <input list="mold-items" value={form.itemCode} onChange={(e) => { setForm({ ...form, itemCode: e.target.value }); searchItems(e.target.value) }} className={IN} />
              <datalist id="mold-items">{suggest.map((s) => <option key={s.itemCode} value={s.itemCode}>{s.itemName ?? ''}</option>)}</datalist>
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              캐비티 (미기입 = 타발수 '—')
              <input value={form.cavity} onChange={(e) => setForm({ ...form, cavity: e.target.value })} inputMode="numeric" className={cn(IN, 'text-center tabular-nums bg-fillable/70')} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              보증 타발수
              <input value={form.guaranteeShots} onChange={(e) => setForm({ ...form, guaranteeShots: e.target.value })} inputMode="numeric" className={cn(IN, 'text-center tabular-nums bg-fillable/70')} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              보관 위치
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={IN} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              설치일
              <input type="date" value={form.installDate} onChange={(e) => setForm({ ...form, installDate: e.target.value })} className={IN} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
              메모
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={IN} />
            </label>
            <div className="col-span-2 md:col-span-4 flex items-center gap-2">
              <button type="button" onClick={() => void saveFlight(save)} disabled={saving} className="h-9 px-5 rounded-lg bg-primary text-white text-[13px] font-bold disabled:opacity-50">
                {saving ? '저장 중…' : editing ? '정비 저장 (덮어쓰기)' : '등록'}
              </button>
              <button type="button" onClick={() => { setForm(EMPTY); setEditing(false) }} className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold">비우기</button>
              <span className="text-[11.5px] text-muted-foreground">정비 주체 = {userName ?? '(사용자 미선택)'}</span>
            </div>
          </div>

          <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
              <thead><tr>{['금형코드', '금형명', '연결품번', '캐비티', '보증타수', '위치', '정비자', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {rows.length === 0 && !busy && (
                  <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-[13px]">등록된 금형이 없습니다 — 위 폼으로 등록하세요.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.moldCode}>
                    <td className={cn(TD, 'font-bold text-mega-active')}>{r.moldCode}</td>
                    <td className={cn(TD, 'font-semibold')}>{r.name}</td>
                    <td className={TD}>{r.itemCode ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.cavity ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.guaranteeShots?.toLocaleString() ?? '—'}</td>
                    <td className={TD}>{r.location ?? '—'}</td>
                    <td className={cn(TD, 'text-muted-foreground')}>{r.updatedBy ?? '—'}</td>
                    <td className={TD}>
                      <button type="button" onClick={() => { setForm({ moldCode: r.moldCode, name: r.name, itemCode: r.itemCode ?? '', cavity: r.cavity != null ? String(r.cavity) : '', guaranteeShots: r.guaranteeShots != null ? String(r.guaranteeShots) : '', location: r.location ?? '', installDate: r.installDate ?? '', note: r.note ?? '' }); setEditing(true) }} className="text-[12px] font-bold text-primary underline underline-offset-2">수정</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'shots' && (
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
          <table className="w-full text-[12.5px] border-collapse min-w-[760px]">
            <thead><tr>{['금형코드', '금형명', '연결품번', '생산수량(취소 제외)', '캐비티', '타발수', '보증타수', '잔여 수명'].map((h) => <th key={h} className={TH}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 && !busy && (
                <tr><td colSpan={8} className="py-8 text-center text-muted-foreground text-[13px]">등록된 금형이 없습니다 — 마스터 탭에서 등록하세요.</td></tr>
              )}
              {rows.map((r) => {
                const over = r.remainShots != null && r.remainShots <= 0
                return (
                  <tr key={r.moldCode} className={cn(over && 'bg-bad-tint/30')}>
                    <td className={cn(TD, 'font-bold text-mega-active')}>{r.moldCode}</td>
                    <td className={cn(TD, 'font-semibold')}>{r.name}</td>
                    <td className={TD}>{r.itemCode ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.itemCode ? r.prodQty.toLocaleString() : '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.cavity ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-bold')} title={r.shots == null ? '캐비티 또는 연결 품번 미기입 — 산출 불가(추정 금지)' : undefined}>
                      {r.shots?.toLocaleString() ?? '—'}
                    </td>
                    <td className={cn(TD, 'text-right tabular-nums')}>{r.guaranteeShots?.toLocaleString() ?? '—'}</td>
                    <td className={cn(TD, 'text-right tabular-nums font-extrabold', over ? 'text-bad-ink' : r.remainShots != null ? 'text-ok-ink' : 'text-muted-foreground')}>
                      {r.remainShots != null ? `${over ? '▲ ' : ''}${r.remainShots.toLocaleString()}` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="text-[11.5px] text-muted-foreground px-3 py-2">
            타발수 = 연결 품번 생산수량 ÷ 캐비티(올림) — 금형별 실타수 원천(샷 카운터) 확보 전의 실적 연동 근사임을 명기.
            잔여 ≤ 0 = 빨강+▲(보증 수명 도달 — 점검·갱신 대상).
          </p>
        </div>
      )}
    </div>
  )
}
