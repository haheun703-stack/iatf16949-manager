import { useCallback, useEffect, useState } from 'react'
import type { SemimesPartnerRowDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑵ — #2 거래처코드관리 (정본 그림9·10 · 전면 재현).
 * partner_type 오분류 정비 동선 = G1 검수 소견 1의 해소처(유형 콤보 편집이 그 동선).
 * 유형이 수집함 입고 구분 초안(자재공급처→원자재·외주처→외주재입고)의 원천이라 정비 효과가 즉시 파급.
 */

const BASE_TYPES = ['고객', '협력사', '자재공급처', '외주처', '본사']

interface EditState {
  name: string
  partnerType: string
  bizNo: string
  ceo: string
  active: boolean
}

export function PartnerMasterView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const [query, setQuery] = useState('')
  const [pType, setPType] = useState('')
  const [withInactive, setWithInactive] = useState(false)
  const [rows, setRows] = useState<SemimesPartnerRowDto[]>([])
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
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PARTNER_LIST, {
        query: query.trim() || undefined, partnerType: pType || undefined, includeInactive: withInactive
      })) as { rows: SemimesPartnerRowDto[]; types: string[] }
      setRows(res.rows)
      setTypes(Array.from(new Set([...BASE_TYPES, ...res.types])))
    } catch {
      setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setBusy(false)
    }
  }, [query, pType, withInactive])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function saveEdit(): Promise<void> {
    if (saving || !editCode || !edit) return
    setSaving(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_PARTNER_UPDATE, {
        partnerCode: editCode,
        name: edit.name.trim() || null,
        partnerType: edit.partnerType.trim() || null,
        bizNo: edit.bizNo.trim() || null,
        ceo: edit.ceo.trim() || null,
        active: edit.active ? 1 : 0,
        updatedBy: userName
      })) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `${editCode} 정비 저장 — 유형 변경은 수집함 입고 구분 초안에 즉시 반영됩니다.` })
      setEditCode(null)
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류(입력은 보존됨). 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-1.5 px-3 border-b border-border/60 whitespace-nowrap'
  const IN = 'h-8 px-2 rounded-lg border border-border bg-fillable/70 text-[12px] min-w-0'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">거래처코드관리</h1>
        <span className="text-[13px] text-muted-foreground">유형(고객/협력사/자재공급처/외주처)이 수집함 입고 구분 초안의 원천 — 오분류 정비 동선(G1 소견 1)</span>
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onReset={() => { setQuery(''); setPType(''); setWithInactive(false) }}
          onSearch={() => void load()}
          onExcel={rows.length > 0 ? () => downloadCsv('거래처마스터.csv', ['코드', '거래처명', '유형', '사업자번호', '대표자', '활성'], rows.map((r) => [r.partnerCode, r.name, r.partnerType, r.bizNo, r.ceo, r.active])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground ml-auto">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void load() }} placeholder="코드/거래처명" className="h-8 w-[160px] px-2 rounded-lg border border-border bg-card text-[12px]" />
          <select value={pType} onChange={(e) => setPType(e.target.value)} className="h-8 px-2 rounded-lg border border-border bg-card text-[12px] font-semibold">
            <option value="">전체 유형</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={withInactive} onChange={(e) => setWithInactive(e.target.checked)} /> 비활성 포함
          </label>
          <span>{rows.length}건</span>
        </span>
      </div>

      {msg && <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>{msg.text}</div>}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[860px]">
          <thead>
            <tr>{['코드', '거래처명', '유형', '사업자번호', '대표자', '활성', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 && !busy && (
              <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-[13px]">조건에 맞는 거래처가 없습니다.</td></tr>
            )}
            {rows.map((r) => {
              const editing = editCode === r.partnerCode
              return (
                <tr key={r.partnerCode} className={cn(r.active !== 1 && !editing && 'opacity-45', editing && 'bg-secondary/20')}>
                  <td className={cn(TD, 'font-bold text-mega-active')}>{r.partnerCode}</td>
                  {editing && edit ? (
                    <>
                      <td className={TD}><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={cn(IN, 'w-[180px]')} /></td>
                      <td className={TD}>
                        <select value={edit.partnerType} onChange={(e) => setEdit({ ...edit, partnerType: e.target.value })} className={cn(IN, 'w-[110px]')}>
                          <option value="">(미지정)</option>
                          {types.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className={TD}><input value={edit.bizNo} onChange={(e) => setEdit({ ...edit, bizNo: e.target.value })} className={cn(IN, 'w-[120px]')} /></td>
                      <td className={TD}><input value={edit.ceo} onChange={(e) => setEdit({ ...edit, ceo: e.target.value })} className={cn(IN, 'w-[90px]')} /></td>
                      <td className={cn(TD, 'text-center')}><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /></td>
                      <td className={cn(TD, 'whitespace-nowrap')}>
                        <button type="button" onClick={() => void saveEdit()} disabled={saving} className="mr-1 px-2 py-1 rounded-md bg-mega-active text-white text-[11.5px] font-bold disabled:opacity-50">{saving ? '…' : '저장'}</button>
                        <button type="button" onClick={() => setEditCode(null)} className="px-2 py-1 rounded-md border border-border text-[11.5px] font-semibold">취소</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className={cn(TD, 'max-w-[220px] truncate')}>{r.name ?? '—'}</td>
                      <td className={TD}>
                        {r.partnerType
                          ? <span className={cn('inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold', r.partnerType === '고객' ? 'bg-iatf-tint text-iatf-ink' : 'bg-secondary text-secondary-foreground')}>{r.partnerType}</span>
                          : <span className="inline-block px-2 py-0.5 rounded-md text-[11.5px] font-bold bg-warn-tint text-warn-ink">미지정</span>}
                      </td>
                      <td className={cn(TD, 'text-muted-foreground')}>{r.bizNo ?? '—'}</td>
                      <td className={TD}>{r.ceo ?? '—'}</td>
                      <td className={cn(TD, 'text-center font-bold', r.active === 1 ? 'text-ok-ink' : 'text-muted-foreground')}>{r.active === 1 ? '활성' : '비활성'}</td>
                      <td className={TD}>
                        <button type="button" onClick={() => { setEditCode(r.partnerCode); setEdit({ name: r.name ?? '', partnerType: r.partnerType ?? '', bizNo: r.bizNo ?? '', ceo: r.ceo ?? '', active: r.active === 1 }) }} className="text-[12px] font-bold text-primary underline underline-offset-2">수정</button>
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
