import { useCallback, useEffect, useState } from 'react'
import type { SemimesItemMasterRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { invokeErrText } from '../../lib/errText'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑵ — #1 품목코드관리 (정본 그림6~8 · 전면 재현).
 * 돈 경계: 단가 계열 열 없음(원 캡쳐의 단가 열은 헌법상 비표시). 검사구분 3종(insp_skip·qc_gbn_o·
 * out_yn)은 검사 연결 표식으로 **표시 전용** — 의미 확정 전 편집 금지(정직). 편집 = 행 단위 명시
 * 모드(품명·유형·규격·차종·LOT승계·활성), 정비 주체 세션 각인 요구.
 */

interface EditState {
  itemName: string
  itemType: string
  spec: string
  carType: string
  inlotuse: boolean
  active: boolean
}

export function ItemMasterView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [query, setQuery] = useState('')
  const [itemType, setItemType] = useState('')
  const [withInactive, setWithInactive] = useState(false)
  const [rows, setRows] = useState<SemimesItemMasterRowDto[]>([])
  const [total, setTotal] = useState(0)
  const [types, setTypes] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editCode, setEditCode] = useState<string | null>(null)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const load = useCallback(async (): Promise<void> => {
    setBusy(true)
    setMsg(null)
    setEditCode(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_ITEM_LIST, {
        query: query.trim() || undefined, itemType: itemType || undefined, includeInactive: withInactive
      })) as { rows: SemimesItemMasterRowDto[]; total: number; types: string[] }
      setRows(res.rows)
      setTotal(res.total)
      setTypes(res.types)
    } catch {
      setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setBusy(false)
    }
  }, [query, itemType, withInactive])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 8/11 검수 Minor: 편집 중 [취소]·다른 행 편집이 확인 없이 입력을 파기하던 자리 — 변경분이 있을 때만 묻는다
  const isDirty = (): boolean => {
    if (!editCode || !edit) return false
    const r = rows.find((x) => x.itemCode === editCode)
    if (!r) return false
    return (
      edit.itemName !== (r.itemName ?? '') || edit.itemType !== (r.itemType ?? '') || edit.spec !== (r.spec ?? '') ||
      edit.carType !== (r.carType ?? '') || edit.inlotuse !== (r.inlotuse === 1) || edit.active !== (r.active === 1)
    )
  }

  const confirmDiscard = async (): Promise<boolean> => {
    if (!isDirty()) return true
    return confirmDialog({
      title: '수정 중인 내용을 버릴까요?',
      body: `${editCode} — 저장하지 않은 변경이 있습니다.`,
      okLabel: '버리기',
      cancelLabel: '계속 수정',
      danger: true
    })
  }

  const closeEdit = async (): Promise<void> => {
    if (!(await confirmDiscard())) return
    setEditCode(null)
    setEdit(null)
  }

  const startEdit = async (r: SemimesItemMasterRowDto): Promise<void> => {
    if (editCode && editCode !== r.itemCode && !(await confirmDiscard())) return
    setEditCode(r.itemCode)
    setEdit({
      itemName: r.itemName ?? '', itemType: r.itemType ?? '', spec: r.spec ?? '',
      carType: r.carType ?? '', inlotuse: r.inlotuse === 1, active: r.active === 1
    })
  }

  async function saveEdit(): Promise<void> {
    if (saving || !editCode || !edit) return
    setSaving(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_ITEM_UPDATE, {
        itemCode: editCode,
        itemName: edit.itemName.trim() || null,
        itemType: edit.itemType.trim() || null,
        spec: edit.spec.trim() || null,
        carType: edit.carType.trim() || null,
        inlotuse: edit.inlotuse ? 1 : 0,
        active: edit.active ? 1 : 0,
        updatedBy: userName
      })) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `${editCode} 정비 저장 완료` })
      setEditCode(null)
      await load()
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.') })
    } finally {
      setSaving(false)
    }
  }

  const excel = (): void => {
    downloadCsv(
      '품목마스터.csv',
      ['품번', '품명', '유형', '규격', '차종', 'LOT승계', '수입검사면제', '검사구분', '출하구분', '활성', '출처'],
      rows.map((r) => [r.itemCode, r.itemName, r.itemType, r.spec, r.carType, r.inlotuse, r.inspSkip, r.qcGbnO, r.outYn, r.active, r.source])
    )
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-1.5 px-3 border-b border-border/60 whitespace-nowrap'
  const IN = 'h-8 px-2 rounded-lg border border-border bg-fillable/70 text-[12px] w-full min-w-0'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">품목코드관리</h1>
        <span className="text-[13px] text-muted-foreground">
          단가 열 없음(돈 경계) · 검사구분 3종은 검사 연결 표식(표시 전용 — 의미 확정 전 편집 금지) · 정비 주체 세션 각인
        </span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar onReset={() => { setQuery(''); setItemType(''); setWithInactive(false) }} onSearch={() => void load()} onExcel={rows.length > 0 ? excel : undefined} onPrint={() => window.print()} busy={busy} />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load() }} placeholder="품번/품명" className="h-8 w-[180px] px-2 rounded-lg border border-border bg-card text-[12px]" />
          <select value={itemType} onChange={(e) => setItemType(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            <option value="">전체 유형</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={withInactive} onChange={(e) => setWithInactive(e.target.checked)} /> 비활성 포함
          </label>
          <span>{rows.length}/{total.toLocaleString()}건</span>
        </span>
      </div>

      {msg && <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>{msg.text}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[1080px]">
          <thead>
            <tr>{['품번', '품명', '유형', '규격', '차종', 'LOT승계', '검사표식(면제·구분·출하)', '활성', '출처', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-[13px]">조건에 맞는 품목이 없습니다.</td></tr>
            )}
            {rows.map((r) => {
              const editing = editCode === r.itemCode
              return (
                <tr key={r.itemCode} className={cn(r.active !== 1 && !editing && 'opacity-45', editing && 'bg-secondary/20')}>
                  <td className={cn(TD, 'font-bold text-mega-active')}>{r.itemCode}</td>
                  {editing && edit ? (
                    <>
                      <td className={TD}><input value={edit.itemName} onChange={(e) => setEdit({ ...edit, itemName: e.target.value })} className={cn(IN, 'w-[180px]')} /></td>
                      <td className={TD}><input value={edit.itemType} onChange={(e) => setEdit({ ...edit, itemType: e.target.value })} list="item-types" className={cn(IN, 'w-[90px]')} /></td>
                      <td className={TD}><input value={edit.spec} onChange={(e) => setEdit({ ...edit, spec: e.target.value })} className={cn(IN, 'w-[120px]')} /></td>
                      <td className={TD}><input value={edit.carType} onChange={(e) => setEdit({ ...edit, carType: e.target.value })} className={cn(IN, 'w-[90px]')} /></td>
                      <td className={cn(TD, 'text-center')}><input type="checkbox" checked={edit.inlotuse} onChange={(e) => setEdit({ ...edit, inlotuse: e.target.checked })} /></td>
                      <td className={cn(TD, 'text-muted-foreground')}>{fmtInspMarks(r)}</td>
                      <td className={cn(TD, 'text-center')}><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /></td>
                      <td className={cn(TD, 'text-muted-foreground')}>{r.source ?? '—'}</td>
                      <td className={cn(TD, 'whitespace-nowrap')}>
                        <button type="button" onClick={() => void saveEdit()} disabled={saving} className="mr-1 px-2 py-1 rounded-md bg-mega-active text-white text-[11.5px] font-bold disabled:opacity-50">{saving ? '…' : '저장'}</button>
                        <button type="button" onClick={() => void closeEdit()} className="px-2 py-1 rounded-md border border-border text-[11.5px] font-semibold">취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TD, 'max-w-[220px] truncate')}>{r.itemName ?? '—'}</td>
                      <td className={TD}>{r.itemType ?? '—'}</td>
                      <td className={cn(TD, 'text-muted-foreground max-w-[140px] truncate')}>{r.spec ?? '—'}</td>
                      <td className={TD}>{r.carType ?? '—'}</td>
                      <td className={cn(TD, 'text-center')}>{r.inlotuse === 1 ? <b className="text-primary">승계</b> : '—'}</td>
                      <td className={cn(TD, 'text-muted-foreground')}>{fmtInspMarks(r)}</td>
                      <td className={cn(TD, 'text-center font-bold', r.active === 1 ? 'text-ok-ink' : 'text-muted-foreground')}>{r.active === 1 ? '활성' : '비활성'}</td>
                      <td className={cn(TD, 'text-muted-foreground')}>{r.source ?? '—'}</td>
                      <td className={TD}>
                        <button type="button" onClick={() => void startEdit(r)} className="text-[12px] font-bold text-primary underline underline-offset-2">수정</button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        <datalist id="item-types">
          {types.map((t) => <option key={t} value={t} />)}
        </datalist>
      </div>
    </div>
  )
}

/** 검사구분 표식 — 원값 그대로 정직 표기(해석 기입 금지) */
function fmtInspMarks(r: SemimesItemMasterRowDto): string {
  const parts = [
    r.inspSkip != null ? `면제 ${r.inspSkip}` : null,
    r.qcGbnO ? `구분 ${r.qcGbnO}` : null,
    r.outYn ? `출하 ${r.outYn}` : null
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : '—'
}
