import { useCallback, useEffect, useState } from 'react'
import type { KpiIndicatorDto, KpiIndicatorSaveInput } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard, useSingleFlight } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { useUIStore } from '../../stores/uiStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #13 KPI 기준정보관리 (정본 그림63 · 전면 — kpi_indicators 편집 + 배선).
 * 지표 = 준비도 산식 A5 흡수 축. 목표·방향(direction)이 KPI 그리드 부호 착색과 성과 지표
 * 목표선의 원천 — 여기서 고치면 그 화면들이 따라온다(배선 링크 동봉).
 * 삭제 없음 — active 강하만(측정값 이력 보존). 정비 주체 요구(익명 거부 · 컬럼 없어 미저장).
 */

interface FormState {
  id: number | null
  name: string
  unit: string
  target: string
  direction: 'higher' | 'lower'
  ownerTeam: string
  note: string
}
const EMPTY: FormState = { id: null, name: '', unit: '%', target: '', direction: 'higher', ownerTeam: '', note: '' }

export function KpiIndicatorView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const setPage = useUIStore((s) => s.setPage)
  const [rows, setRows] = useState<KpiIndicatorDto[]>([])
  const [form, setForm] = useState<FormState>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.KPI_HOME)) as KpiIndicatorDto[]
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

  const saveFlight = useSingleFlight()
  async function save(): Promise<void> {
    if (!form.name.trim()) {
      setMsg({ tone: 'bad', text: '지표명은 필수입니다.' })
      return
    }
    if (form.target.trim() !== '' && !Number.isFinite(Number(form.target))) {
      setMsg({ tone: 'bad', text: '목표는 수치여야 합니다 — 미설정은 비워 두세요(0 대입 금지).' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload: KpiIndicatorSaveInput = {
        id: form.id ?? undefined,
        name: form.name.trim(),
        unit: form.unit.trim() || null,
        target: form.target.trim() === '' ? null : Number(form.target),
        direction: form.direction,
        ownerTeam: form.ownerTeam.trim() || null,
        note: form.note.trim() || null,
        updatedBy: userName
      }
      const res = (await window.api.invoke(window.api.channels.KPI_INDICATOR_SAVE, payload)) as { success: boolean; id?: number; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `지표 #${res.id} ${form.id != null ? '정비' : '신설'} — KPI 그리드 부호 착색·성과 지표 목표선이 이 값을 따릅니다.` })
      setForm(EMPTY)
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  const deactFlight = useSingleFlight()
  async function deactivate(r: KpiIndicatorDto): Promise<void> {
    const ok = await confirmDialog({
      title: `'${r.name}' 지표를 비활성으로 내릴까요?`,
      body: '측정값 이력은 보존됩니다 — KPI 그리드·홈 타일에서만 빠집니다.',
      okLabel: '비활성', danger: true
    })
    if (!ok) return
    try {
      const res = (await window.api.invoke(window.api.channels.KPI_INDICATOR_SAVE, {
        id: r.id, name: r.name, unit: r.unit, target: r.target, direction: r.direction,
        ownerTeam: r.ownerTeam, note: r.note, active: 0, updatedBy: userName
      })) as { success: boolean; error?: string }
      if (!res.success) setMsg({ tone: 'bad', text: res.error ?? '변경 실패' })
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '변경 실패 — 통신 오류. 다시 시도하세요.' })
    }
  }

  const IN = 'h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]'
  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">KPI 기준정보관리</h1>
        <span className="text-[13px] text-muted-foreground">
          목표·방향의 원천 — <button type="button" onClick={() => setPage('kpi-grid')} className="underline underline-offset-2 font-bold text-primary">KPI 실적 그리드</button> 부호 착색 ·
          <button type="button" onClick={() => setPage('perf-indicators')} className="underline underline-offset-2 font-bold text-primary ml-1">성과 지표</button> 목표선이 이 표를 따름
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onAdd={() => setForm(EMPTY)}
          onExcel={rows.length > 0 ? () => downloadCsv('KPI기준정보.csv', ['#', '지표명', '단위', '목표', '방향', '담당팀', '메모'], rows.map((r) => [r.id, r.name, r.unit, r.target, r.direction === 'lower' ? '낮을수록 양호' : '높을수록 양호', r.ownerTeam, r.note])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="text-[12px] text-muted-foreground ml-auto">{rows.length}지표 (활성)</span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* 편집 폼 */}
      <div className="rounded-xl border border-border bg-card shadow-card p-3 grid grid-cols-2 md:grid-cols-6 gap-2.5">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground col-span-2">
          지표명 (필수){form.id != null && <span className="text-warn-ink"> — #{form.id} 정비 중</span>}
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          단위
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          목표 (미설정 = 공란)
          <input value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} inputMode="decimal" className={cn(IN, 'text-center tabular-nums bg-fillable/70')} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          방향 (부호 착색 축)
          <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as 'higher' | 'lower' })} className={IN}>
            <option value="higher">높을수록 양호</option>
            <option value="lower">낮을수록 양호</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          담당팀
          <input value={form.ownerTeam} onChange={(e) => setForm({ ...form, ownerTeam: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground col-span-2 md:col-span-4">
          메모 (산식 근거 등)
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={IN} />
        </label>
        <div className="col-span-2 flex items-end gap-2">
          <button type="button" onClick={() => void saveFlight(save)} disabled={saving} className="h-9 px-5 rounded-lg bg-primary text-white text-[13px] font-bold disabled:opacity-50">
            {saving ? '저장 중…' : form.id != null ? '정비 저장' : '지표 신설'}
          </button>
          <button type="button" onClick={() => setForm(EMPTY)} className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold">비우기</button>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[820px]">
          <thead><tr>{['#', '지표명', '단위', '목표', '방향', '담당팀', '최근 실적', '메모', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && !busy && <tr><td colSpan={9} className="py-8 text-center text-muted-foreground text-[13px]">활성 지표가 없습니다.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={cn(TD, 'tabular-nums text-muted-foreground')}>{r.id}</td>
                <td className={cn(TD, 'font-semibold max-w-[240px] truncate')}>{r.name}</td>
                <td className={TD}>{r.unit}</td>
                <td className={cn(TD, 'text-right tabular-nums font-bold', r.target == null && 'text-muted-foreground')}>{r.target ?? '미설정'}</td>
                <td className={TD}>{r.direction === 'lower' ? '낮을수록 ↓' : '높을수록 ↑'}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{r.ownerTeam ?? '—'}</td>
                <td className={cn(TD, 'tabular-nums text-muted-foreground')}>{r.latest ? `${r.latest.period} · ${r.latest.value}` : '미입력'}</td>
                <td className={cn(TD, 'max-w-[180px] truncate text-muted-foreground')}>{r.note ?? ''}</td>
                <td className={cn(TD, 'whitespace-nowrap')}>
                  <button type="button" onClick={() => setForm({ id: r.id, name: r.name, unit: r.unit ?? '%', target: r.target != null ? String(r.target) : '', direction: r.direction, ownerTeam: r.ownerTeam ?? '', note: r.note ?? '' })} className="mr-2 text-[12px] font-bold text-primary underline underline-offset-2">수정</button>
                  <button type="button" onClick={() => void deactFlight(() => deactivate(r))} className="text-[12px] font-semibold text-muted-foreground underline underline-offset-2">비활성</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
