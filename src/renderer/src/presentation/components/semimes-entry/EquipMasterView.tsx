import { useCallback, useEffect, useState } from 'react'
import type { SemimesEquipRowDto, SemimesEquipSaveInput } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard, useSingleFlight } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑷ — #9 설비등록 (정본 그림46·47 · 골격 — 스키마 검토 동반 = 0140).
 * 설비 마스터 원천 부재(덤프 line_no 는 관측치) — 행은 사람이 등록한다(추정 시드 0).
 * line_no 연결 = MES 기록(mac/sqc)과의 고리(선택 — 관측 라인 datalist 참고).
 * 마스터 계약 = UPSERT 정정·정비 주체 각인(STAMP)·돈 경계(단가 열 없음).
 */

interface FormState {
  equipCode: string
  name: string
  equipType: string
  lineNo: string
  location: string
  installDate: string
  note: string
}
const EMPTY: FormState = { equipCode: '', name: '', equipType: '', lineNo: '', location: '', installDate: '', note: '' }

export function EquipMasterView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [rows, setRows] = useState<SemimesEquipRowDto[]>([])
  const [lines, setLines] = useState<string[]>([])
  const [withInactive, setWithInactive] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [editing, setEditing] = useState(false) // form 이 기존 행에서 왔는지(라벨용)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_EQUIP_LIST, { includeInactive: withInactive })) as { rows: SemimesEquipRowDto[]; observedLines: string[] }
      if (!seq.isCurrent(token)) return
      setRows(res.rows)
      setLines(res.observedLines)
    } catch {
      if (seq.isCurrent(token)) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [withInactive, seq])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withInactive])

  const saveFlight = useSingleFlight()
  async function save(): Promise<void> {
    if (!form.equipCode.trim() || !form.name.trim()) {
      setMsg({ tone: 'bad', text: '설비코드·설비명은 필수입니다.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload: SemimesEquipSaveInput = {
        equipCode: form.equipCode.trim(), name: form.name.trim(),
        equipType: form.equipType.trim() || null, lineNo: form.lineNo.trim() || null,
        location: form.location.trim() || null, installDate: form.installDate.trim() || null,
        note: form.note.trim() || null, updatedBy: userName
      }
      const res = (await window.api.invoke(window.api.channels.SEMIMES_EQUIP_SAVE, payload)) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `${form.equipCode.trim()} ${editing ? '정비' : '등록'} 저장 (정비 주체 각인)` })
      setForm(EMPTY)
      setEditing(false)
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  const toggleFlight = useSingleFlight()
  async function toggleActive(r: SemimesEquipRowDto): Promise<void> {
    const toInactive = r.active === 1
    if (toInactive) {
      const ok = await confirmDialog({
        title: `${r.equipCode} 를 비활성으로 내릴까요?`,
        body: '행은 삭제되지 않습니다 — 목록 필터에서만 빠집니다(마스터 이력 보존).',
        okLabel: '비활성', danger: true
      })
      if (!ok) return
    }
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_EQUIP_SAVE, {
        equipCode: r.equipCode, name: r.name, equipType: r.equipType, lineNo: r.lineNo,
        location: r.location, installDate: r.installDate, note: r.note,
        active: toInactive ? 0 : 1, updatedBy: userName
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
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">설비등록</h1>
        <span className="inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-secondary text-primary">SQ 4_x 접점</span>
        <span className="text-[13px] text-muted-foreground">
          설비 마스터 원천 신설(0140) — 행은 사람이 등록 · MES 라인 연결은 선택 · 계측기(MSA) 접점은 후속
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onExcel={rows.length > 0 ? () => downloadCsv('설비마스터.csv', ['설비코드', '설비명', '유형', 'MES라인', '위치', '설치일', '메모', '활성', '정비자'], rows.map((r) => [r.equipCode, r.name, r.equipType, r.lineNo, r.location, r.installDate, r.note, r.active === 1 ? '활성' : '비활성', r.updatedBy])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <label className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input type="checkbox" checked={withInactive} onChange={(e) => setWithInactive(e.target.checked)} /> 비활성 포함
        </label>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* 등록/정비 폼 — 개정 아님(마스터 = 같은 코드 덮어쓰기 정정) */}
      <div className="rounded-xl border border-border bg-card shadow-card p-3 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          설비코드 (필수){editing && <span className="text-warn-ink"> — 기존 행 정비 중</span>}
          <input value={form.equipCode} onChange={(e) => { setForm({ ...form, equipCode: e.target.value }); setEditing(rows.some((r) => r.equipCode === e.target.value.trim())) }} className={IN} placeholder="예: PRS-01" />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          설비명 (필수)
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          유형
          <input value={form.equipType} onChange={(e) => setForm({ ...form, equipType: e.target.value })} className={IN} placeholder="프레스·사출 등" />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          MES 라인 연결 (선택)
          <input list="equip-lines" value={form.lineNo} onChange={(e) => setForm({ ...form, lineNo: e.target.value })} className={IN} placeholder="관측 라인 참고" />
          <datalist id="equip-lines">{lines.map((l) => <option key={l} value={l} />)}</datalist>
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          위치
          <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground">
          설치일
          <input type="date" value={form.installDate} onChange={(e) => setForm({ ...form, installDate: e.target.value })} className={IN} />
        </label>
        <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground col-span-2">
          메모
          <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={IN} />
        </label>
        <div className="col-span-2 md:col-span-4 flex items-center gap-2">
          <button type="button" onClick={() => void saveFlight(save)} disabled={saving} className="h-9 px-5 rounded-lg bg-primary text-white text-[13px] font-bold disabled:opacity-50">
            {saving ? '저장 중…' : editing ? '정비 저장 (덮어쓰기)' : '등록'}
          </button>
          <button type="button" onClick={() => { setForm(EMPTY); setEditing(false) }} className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold">비우기</button>
          <span className="text-[11.5px] text-muted-foreground">정비 주체 = {userName ?? '(사용자 미선택)'} · 삭제 없음(비활성 강하만)</span>
        </div>
      </div>

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[860px]">
          <thead><tr>{['설비코드', '설비명', '유형', 'MES라인', '위치', '설치일', '메모', '활성', '정비자', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-[13px]">등록된 설비가 없습니다 — 위 폼으로 등록하세요(추정 시드 없음 · 사람이 적는다).</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.equipCode} className={cn(r.active !== 1 && 'opacity-45')}>
                <td className={cn(TD, 'font-bold text-mega-active')}>{r.equipCode}</td>
                <td className={cn(TD, 'font-semibold')}>{r.name}</td>
                <td className={TD}>{r.equipType ?? '—'}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{r.lineNo ?? '—'}</td>
                <td className={TD}>{r.location ?? '—'}</td>
                <td className={cn(TD, 'tabular-nums text-muted-foreground')}>{r.installDate ?? '—'}</td>
                <td className={cn(TD, 'max-w-[180px] truncate text-muted-foreground')}>{r.note ?? ''}</td>
                <td className={cn(TD, 'font-bold', r.active === 1 ? 'text-ok-ink' : 'text-muted-foreground')}>{r.active === 1 ? '활성' : '비활성'}</td>
                <td className={cn(TD, 'text-muted-foreground')}>{r.updatedBy ?? '—'}</td>
                <td className={cn(TD, 'whitespace-nowrap')}>
                  <button type="button" onClick={() => { setForm({ equipCode: r.equipCode, name: r.name, equipType: r.equipType ?? '', lineNo: r.lineNo ?? '', location: r.location ?? '', installDate: r.installDate ?? '', note: r.note ?? '' }); setEditing(true) }} className="mr-2 text-[12px] font-bold text-primary underline underline-offset-2">수정</button>
                  <button type="button" onClick={() => void toggleFlight(() => toggleActive(r))} className="text-[12px] font-semibold text-muted-foreground underline underline-offset-2">{r.active === 1 ? '비활성' : '활성'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
