import { Fragment, useCallback, useState } from 'react'
import type { SemimesItemSearchRowDto, SemimesSpecRegistryRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'
import { confirmDialog } from '../shared/ConfirmDialog'

/**
 * 34호 배치⑴ — #7 검사기준(SPEC)등록 (정본 그림31 · §10-1 ⓐ의 화면 실현).
 * 계약: **개정 = 신규 행**(REVISION+1 · 구판 값 불변, active 강하만 — 이력이 행으로 남는다).
 * 검사기록은 기록 시점 활성 스펙의 revision 을 스냅샷으로 각인(PC-1 기구현) — 이 화면이 그 원천.
 * 도면 첨부는 2단계(대조표 #7 명기). 편집 = 새 리비전 폼 1개(인라인 셀 편집 아님 — 개정 의식 명시).
 */

const KINDS = ['수입', '공정', '자주', '패트롤', '출하']

interface FormState {
  inspItem: string
  instrument: string
  unit: string
  sl: string
  su: string
  nominal: string
  sampleCnt: string
}
const EMPTY: FormState = { inspItem: '', instrument: '', unit: '', sl: '', su: '', nominal: '', sampleCnt: '' }

export function SpecRegistryView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [itemCode, setItemCode] = useState('')
  const [suggest, setSuggest] = useState<SemimesItemSearchRowDto[]>([])
  const [kind, setKind] = useState('자주')
  const [rows, setRows] = useState<SemimesSpecRegistryRowDto[]>([])
  const [showOld, setShowOld] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    if (!itemCode.trim()) {
      setMsg({ tone: 'bad', text: '품번을 입력하세요 — 스펙은 품번×검사종류×항목 단위입니다.' })
      return
    }
    setBusy(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_SPEC_LIST, {
        itemCode: itemCode.trim(), inspKind: kind || undefined
      })) as SemimesSpecRegistryRowDto[]
      setRows(res)
      if (res.length === 0) setMsg({ tone: 'ok', text: '등록된 스펙이 없습니다 — 아래 폼으로 REVISION 1을 등록하세요.' })
    } catch {
      setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setBusy(false)
    }
  }, [itemCode, kind])

  const searchItems = async (q: string): Promise<void> => {
    if (q.trim().length < 2) return
    try {
      setSuggest((await window.api.invoke(window.api.channels.SEMIMES_ITEM_SEARCH, { query: q.trim(), limit: 20 })) as SemimesItemSearchRowDto[])
    } catch {
      /* 제안 실패 — 직접 입력 유지 */
    }
  }

  async function save(): Promise<void> {
    if (saving) return
    if (!form.inspItem.trim()) {
      setMsg({ tone: 'bad', text: '검사항목명은 필수입니다.' })
      return
    }
    const prev = rows.find((r) => r.inspItem === form.inspItem.trim() && r.inspKind === kind && r.active)
    const ok = await confirmDialog({
      title: prev ? `'${form.inspItem.trim()}' 개정 — REVISION ${prev.revision + 1} 신규 행 생성` : `'${form.inspItem.trim()}' 신규 등록 (REVISION 1)`,
      body: prev
        ? `구판(REV ${prev.revision})은 값 그대로 불변 보존되고 활성만 내려갑니다.\n이후 검사기록은 새 REVISION 을 스냅샷으로 각인합니다.`
        : '등록 후 검사기록이 이 스펙의 REVISION 을 스냅샷으로 각인합니다.',
      okLabel: prev ? '개정 저장' : '등록'
    })
    if (!ok) return
    setSaving(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_SPEC_SAVE, {
        itemCode: itemCode.trim(),
        inspKind: kind,
        inspItem: form.inspItem.trim(),
        instrument: form.instrument.trim() || null,
        unit: form.unit.trim() || null,
        sl: form.sl.trim() === '' ? null : Number(form.sl),
        su: form.su.trim() === '' ? null : Number(form.su),
        nominal: form.nominal.trim() === '' ? null : Number(form.nominal),
        sampleCnt: form.sampleCnt.trim() === '' ? null : Number(form.sampleCnt),
        createdBy: userName
      })) as { success: boolean; revision?: number; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `저장 완료 — REVISION ${res.revision} (개정 주체 각인 · 구판 불변 보존)` })
      setForm(EMPTY)
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  /** 개정 시작 — 현행 값을 폼에 복사(수정 후 저장 = 새 리비전) */
  const startRevise = (r: SemimesSpecRegistryRowDto): void => {
    setForm({
      inspItem: r.inspItem,
      instrument: r.instrument ?? '',
      unit: r.unit ?? '',
      sl: r.sl != null ? String(r.sl) : '',
      su: r.su != null ? String(r.su) : '',
      nominal: r.nominal != null ? String(r.nominal) : '',
      sampleCnt: r.sampleCnt != null ? String(r.sampleCnt) : ''
    })
    setMsg({ tone: 'ok', text: `REV ${r.revision} '${r.inspItem}' 값을 폼에 불러왔습니다 — 수정 후 저장하면 REV ${r.revision + 1} 신규 행이 생깁니다.` })
  }

  const excel = (): void => {
    downloadCsv(
      `검사기준_${itemCode.trim()}_${kind}.csv`,
      ['REV', '활성', '검사종류', '검사항목', '계측기', '단위', '하한', '상한', '기준치', '시료수', '개정일', '개정 주체'],
      rows.map((r) => [r.revision, r.active ? '현행' : '구판', r.inspKind, r.inspItem, r.instrument, r.unit, r.sl, r.su, r.nominal, r.sampleCnt, r.revDate, r.createdBy])
    )
  }

  const visible = showOld ? rows : rows.filter((r) => r.active)
  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'
  const F = 'h-9 px-2 rounded-lg border border-border bg-fillable/70 text-[12.5px]'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">검사기준(SPEC) 등록</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 2_7</span>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-iatf-tint text-iatf-ink">IATF 8.6.1</span>
        <span className="text-[13px] text-muted-foreground">개정 = 신규 행(REVISION+1 · 구판 불변) — 검사기록이 이 REVISION 을 스냅샷 각인 · 도면 첨부는 2단계</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar onReset={() => { setItemCode(''); setRows([]); setForm(EMPTY) }} onSearch={() => void load()} onSave={() => void save()} onExcel={rows.length > 0 ? excel : undefined} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input
            list="spec-items"
            value={itemCode}
            onChange={(e) => {
              setItemCode(e.target.value)
              void searchItems(e.target.value)
            }}
            placeholder="품번 (마스터 검색)"
            className="h-8 w-[200px] px-2 rounded-lg border border-border bg-card text-[12px]"
          />
          <datalist id="spec-items">
            {suggest.map((s) => (
              <option key={s.itemCode} value={s.itemCode}>{s.itemName ?? ''}</option>
            ))}
          </datalist>
          <select value={kind} onChange={(e) => setKind(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={showOld} onChange={(e) => setShowOld(e.target.checked)} /> 구판 표시
          </label>
        </span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* 등록/개정 폼 — 인라인 셀 편집이 아니라 명시 폼(개정 의식·확인창 동반) */}
      <div className="rounded-xl border border-border bg-card shadow-card p-3 flex items-end gap-2 flex-wrap">
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-muted-foreground flex-1 min-w-[180px]">
          검사항목명 *
          <input value={form.inspItem} onChange={(e) => setForm((f) => ({ ...f, inspItem: e.target.value }))} className={F} placeholder="예: 외경" />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-muted-foreground w-[130px]">
          계측기
          <input value={form.instrument} onChange={(e) => setForm((f) => ({ ...f, instrument: e.target.value }))} className={F} placeholder="V/C, 게이지…" />
        </label>
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-muted-foreground w-[80px]">
          단위
          <input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className={F} />
        </label>
        {(['sl', 'nominal', 'su'] as const).map((k) => (
          <label key={k} className="flex flex-col gap-1 text-[11.5px] font-semibold text-muted-foreground w-[90px]">
            {k === 'sl' ? '하한' : k === 'su' ? '상한' : '기준치'}
            <input value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} inputMode="decimal" className={cn(F, 'text-right tabular-nums')} />
          </label>
        ))}
        <label className="flex flex-col gap-1 text-[11.5px] font-semibold text-muted-foreground w-[80px]">
          시료수
          <input value={form.sampleCnt} onChange={(e) => setForm((f) => ({ ...f, sampleCnt: e.target.value }))} inputMode="numeric" className={cn(F, 'text-center tabular-nums')} />
        </label>
        <button type="button" onClick={() => void save()} disabled={saving} className="h-9 px-4 rounded-lg bg-mega-active text-white text-[12.5px] font-bold disabled:opacity-50">
          {saving ? '저장 중…' : '등록 / 개정 저장'}
        </button>
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[880px]">
          <thead>
            <tr>{['REV', '검사종류', '검사항목', '계측기', '단위', '규격(하한~상한)', '기준치', '시료수', '개정일', '개정 주체', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {visible.length === 0 && !busy && (
              <tr><td colSpan={11} className="py-8 text-center text-muted-foreground text-[13px]">품번을 조회하세요 — 스펙이 없으면 위 폼으로 REVISION 1을 등록합니다.</td></tr>
            )}
            {visible.map((r) => (
              <Fragment key={r.id}>
                <tr className={cn(!r.active && 'opacity-45')}>
                  <td className={cn(TD, 'font-bold', r.active ? 'text-mega-active' : 'text-muted-foreground')}>
                    {r.revision}
                    <span className={cn('ml-1.5 inline-block text-[10.5px] font-bold rounded px-1.5 py-[1px]', r.active ? 'bg-secondary text-primary' : 'bg-muted text-muted-foreground')}>
                      {r.active ? '현행' : '구판'}
                    </span>
                  </td>
                  <td className={TD}>{r.inspKind}</td>
                  <td className={cn(TD, 'font-semibold')}>{r.inspItem}</td>
                  <td className={TD}>{r.instrument ?? '—'}</td>
                  <td className={TD}>{r.unit ?? '—'}</td>
                  <td className={cn(TD, 'tabular-nums')}>{r.sl != null || r.su != null ? `${r.sl ?? ''} ~ ${r.su ?? ''}` : '—'}</td>
                  <td className={cn(TD, 'text-right tabular-nums')}>{r.nominal ?? '—'}</td>
                  <td className={cn(TD, 'text-center tabular-nums')}>{r.sampleCnt ?? '—'}</td>
                  <td className={cn(TD, 'text-muted-foreground')}>{r.revDate ?? '—'}</td>
                  <td className={TD}>{r.createdBy ?? '—'}</td>
                  <td className={TD}>
                    {r.active && (
                      <button type="button" onClick={() => startRevise(r)} className="text-[12px] font-bold text-primary underline underline-offset-2">
                        개정 →
                      </button>
                    )}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
