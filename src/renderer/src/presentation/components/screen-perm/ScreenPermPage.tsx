import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScreenPermBits, ScreenPermRuleDto, ScreenPermSaveInput } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard, useSingleFlight } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { usePermStore } from '../../stores/permStore'
import { PAGE_LABELS, type PageId } from '../../stores/uiStore'
import { MODULES } from '../layout/MesMenuBar'
import { confirmDialog } from '../shared/ConfirmDialog'

/**
 * W4-B(37호 배치B — 34호 #19) — 화면별 권한관리 (정본 그림33 골격).
 * 권한그룹(부서 = team_dept) + 개인(오버라이드) × 메뉴 트리(모듈>화면) × 7종 체크
 * (읽기·쓰기·수정·삭제·엑셀·프린트·단가) · "선택메뉴 권한설정 저장".
 * - 규칙 없는 화면 = 현행 허용(이 화면은 "제한을 만드는" 도구 — 시드 0행).
 * - 단가 = 전원 잠금(37호 ③ — 스키마 CHECK 하드락). 칸은 보이되 켤 수 없음(자리 확보).
 * - executive = 그림33 최종관리자 — 매트릭스 무시 전권(서버 분기).
 * - 서버 정본 = 쓰기·수정·삭제·엑셀(SCREEN_GUARD 403) · 읽기 = 메뉴 숨김(보조).
 */

const BIT_KEYS = ['read', 'write', 'edit', 'delete', 'excel', 'print', 'price'] as const
const BIT_LABELS: Record<(typeof BIT_KEYS)[number], string> = {
  read: '읽기', write: '쓰기', edit: '수정', delete: '삭제', excel: '엑셀', print: '프린트', price: '단가'
}
const DEFAULT_BITS: ScreenPermBits = {
  read: true, write: true, edit: true, delete: true, excel: true, print: true, price: false
}

/** 매트릭스 대상 화면 = 메뉴 트리의 page 항목(별칭·관리 항목 제외 — 그림33 메뉴 기준) */
const TREE = MODULES.map((m) => ({
  key: m.key,
  label: m.label,
  pages: m.items
    .filter((it) => it.page && !it.alias && !it.adminOnly)
    .map((it) => ({ page: it.page as PageId, label: it.label }))
})).filter((m) => m.pages.length > 0)

export function ScreenPermPage(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const reloadEffective = usePermStore((s) => s.load)

  const [subjectKind, setSubjectKind] = useState<'team' | 'user'>('team')
  const [subjectKey, setSubjectKey] = useState<string>('')
  const [selected, setSelected] = useState<Set<PageId>>(new Set())
  const [bits, setBits] = useState<ScreenPermBits>({ ...DEFAULT_BITS })
  const [rules, setRules] = useState<ScreenPermRuleDto[]>([])
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const teams = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) if (u.active && u.teamDept) set.add(u.teamDept)
    return [...set].sort()
  }, [users])
  const activeUsers = useMemo(() => users.filter((u) => u.active), [users])

  const seq = useSeqGuard()
  const load = useCallback(async (): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.PERM_LIST)) as ScreenPermRuleDto[]
      if (!seq.isCurrent(token)) return
      setRules(res)
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

  // 현 주체의 규칙만(표 + 트리 표식)
  const subjectRules = useMemo(
    () => rules.filter((r) => r.subjectKind === subjectKind && r.subjectKey === subjectKey),
    [rules, subjectKind, subjectKey]
  )
  const ruleOf = useMemo(() => {
    const m = new Map<string, ScreenPermRuleDto>()
    for (const r of subjectRules) m.set(r.pageId, r)
    return m
  }, [subjectRules])

  function toggle(page: PageId): void {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(page)) next.delete(page)
      else next.add(page)
      return next
    })
  }
  function toggleModule(pages: { page: PageId }[]): void {
    setSelected((prev) => {
      const next = new Set(prev)
      const allIn = pages.every((p) => next.has(p.page))
      for (const p of pages) allIn ? next.delete(p.page) : next.add(p.page)
      return next
    })
  }

  const saveFlight = useSingleFlight()
  async function save(remove: boolean): Promise<void> {
    if (!subjectKey) {
      setMsg({ tone: 'bad', text: '주체(부서 또는 개인)를 먼저 선택하세요.' })
      return
    }
    if (selected.size === 0) {
      setMsg({ tone: 'bad', text: '좌측 메뉴 트리에서 화면을 선택하세요.' })
      return
    }
    if (remove) {
      const ok = await confirmDialog({
        title: `선택 화면 ${selected.size}건의 규칙을 해제할까요?`,
        body: '해제 = 규칙 삭제 — 그 화면은 현행 허용(role 가드만)으로 돌아갑니다.',
        okLabel: '규칙 해제', danger: true
      })
      if (!ok) return
    }
    setSaving(true)
    setMsg(null)
    try {
      const payload: ScreenPermSaveInput = {
        subjectKind, subjectKey,
        pageIds: [...selected],
        bits, remove: remove || undefined,
        updatedBy: userName
      }
      const res = (await window.api.invoke(window.api.channels.PERM_SAVE, payload)) as {
        success: boolean; saved?: number; error?: string
      }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({
        tone: 'ok',
        text: remove
          ? `규칙 ${res.saved ?? 0}건 해제 — 해당 화면은 현행 허용으로 복귀.`
          : `화면 ${res.saved ?? 0}건 권한설정 저장 — 서버 즉시 효력(쓰기·수정·삭제·엑셀), 메뉴 숨김은 대상자 재로그인/새로고침부터.`
      })
      await load()
      await reloadEffective() // 내 규칙이 바뀐 경우 메뉴 보조막 동기화
    } catch (e) {
      setMsg({ tone: 'bad', text: e instanceof Error ? e.message : '저장 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  function loadRule(r: ScreenPermRuleDto): void {
    setSelected(new Set([r.pageId as PageId]))
    setBits({ read: r.read, write: r.write, edit: r.edit, delete: r.delete, excel: r.excel, print: r.print, price: false })
    setMsg(null)
  }

  const subjectLabel =
    subjectKind === 'team'
      ? subjectKey || '(부서 미선택)'
      : activeUsers.find((u) => String(u.id) === subjectKey)?.name ?? '(개인 미선택)'

  const TH = 'text-left font-bold text-secondary-foreground bg-secondary/60 py-2 px-3 whitespace-nowrap'
  const TD = 'py-2 px-3 border-b border-border/60 whitespace-nowrap'
  const IN = 'h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">화면별 권한관리</h1>
        <span className="text-[13px] text-muted-foreground">
          권한그룹(부서)·개인 × 메뉴 × 7종 체크(그림33) — 규칙 없는 화면 = 현행 허용 · 최종관리자(executive) = 전권
        </span>
      </div>

      {/* 주체 선택 (그림33 상단: [그룹] / 개인) */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2 flex-wrap">
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(['team', 'user'] as const).map((k) => (
            <button
              key={k} type="button"
              onClick={() => { setSubjectKind(k); setSubjectKey(''); setMsg(null) }}
              className={cn('h-9 px-4 text-[12.5px] font-bold', subjectKind === k ? 'bg-mega-active text-white' : 'bg-card text-muted-foreground')}
            >
              {k === 'team' ? '권한그룹 (부서)' : '개인 (오버라이드)'}
            </button>
          ))}
        </div>
        <select value={subjectKey} onChange={(e) => { setSubjectKey(e.target.value); setMsg(null) }} className={cn(IN, 'min-w-[180px]')}>
          <option value="">— {subjectKind === 'team' ? '부서' : '개인'} 선택 —</option>
          {subjectKind === 'team'
            ? teams.map((t) => <option key={t} value={t}>{t}</option>)
            : activeUsers.map((u) => <option key={u.id} value={String(u.id)}>{u.name} ({u.teamDept ?? '무소속'} · {u.role})</option>)}
        </select>
        <span className="text-[12px] text-muted-foreground ml-auto">
          개인 규칙은 그 화면의 부서 규칙을 통째로 대체(오버라이드) · 규칙 {subjectRules.length}건
        </span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,2fr)_3fr] gap-3 items-start">
        {/* 좌: 메뉴 트리(모듈>화면 — 체크 선택) */}
        <div className="rounded-[14px] border border-border bg-card shadow-card overflow-hidden">
          <div className="px-3 py-2 bg-secondary/60 text-[12.5px] font-bold flex items-center justify-between">
            <span>메뉴 트리 — 화면 선택</span>
            <span className="text-muted-foreground font-semibold">{selected.size}화면 선택</span>
          </div>
          <div className="max-h-[520px] overflow-y-auto">
            {TREE.map((m) => {
              const allIn = m.pages.every((p) => selected.has(p.page))
              return (
                <div key={m.key} className="border-b border-border/50 last:border-b-0">
                  <label className="flex items-center gap-2 px-3 py-1.5 bg-muted/40 text-[12.5px] font-bold cursor-pointer">
                    <input type="checkbox" checked={allIn} onChange={() => toggleModule(m.pages)} />
                    {m.label}
                  </label>
                  {m.pages.map((p) => {
                    const r = ruleOf.get(p.page)
                    return (
                      <label key={p.page} className="flex items-center gap-2 pl-7 pr-3 py-1 text-[12.5px] cursor-pointer hover:bg-muted/40">
                        <input type="checkbox" checked={selected.has(p.page)} onChange={() => toggle(p.page)} />
                        <span className="min-w-0 truncate">{p.label}</span>
                        {r && (
                          <span className={cn('ml-auto shrink-0 text-[10.5px] font-semibold rounded-full px-2 py-[1px]', r.read ? 'bg-secondary text-primary' : 'bg-bad-tint text-bad-ink')}>
                            규칙 {r.read ? '' : '· 읽기 차단'}
                          </span>
                        )}
                      </label>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* 우: 7종 체크 + 저장 (그림33 "선택메뉴 권한설정 저장") */}
        <div className="flex flex-col gap-3">
          <div className="rounded-[14px] border border-border bg-card shadow-card p-3">
            <div className="text-[12.5px] font-bold mb-2">
              7종 권한 — <span className="text-primary">{subjectLabel}</span> · 선택 화면 {selected.size}건에 적용
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {BIT_KEYS.map((k) => (
                <label key={k} className={cn('flex items-center gap-1.5 text-[13px] font-semibold', k === 'price' && 'opacity-50 cursor-not-allowed')}>
                  <input
                    type="checkbox"
                    checked={bits[k]}
                    disabled={k === 'price'}
                    onChange={(e) => setBits({ ...bits, [k]: e.target.checked })}
                  />
                  {BIT_LABELS[k]}
                  {k === 'price' && <span className="text-[10.5px] rounded-full px-1.5 bg-bad-tint text-bad-ink font-bold">전원 잠금</span>}
                </label>
              ))}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-2">
              단가 = 돈 경계 헌법(15번) — 자리만 확보, 개방은 별도 판정(스키마 잠금). ·
              읽기를 끄면 그 화면은 메뉴에서 숨음(나머지 권한 동시 지정 불가).
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={() => void saveFlight(() => save(false))}
                disabled={saving || busy}
                className="h-9 px-5 rounded-lg bg-primary text-white text-[13px] font-bold disabled:opacity-50"
              >
                {saving ? '저장 중…' : '선택메뉴 권한설정 저장'}
              </button>
              <button
                type="button"
                onClick={() => void saveFlight(() => save(true))}
                disabled={saving || busy}
                className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold disabled:opacity-50"
              >
                선택메뉴 규칙 해제 (현행 복귀)
              </button>
              <button type="button" onClick={() => { setSelected(new Set()); setBits({ ...DEFAULT_BITS }) }} className="h-9 px-3 rounded-lg border border-border text-[12.5px] font-semibold">
                비우기
              </button>
            </div>
          </div>

          {/* 현 주체의 저장된 규칙 */}
          <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
              <thead>
                <tr>{['화면', ...BIT_KEYS.map((k) => BIT_LABELS[k]), '정비', ''].map((h, i) => <th key={i} className={cn(TH, i > 0 && i <= BIT_KEYS.length && 'text-center')}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {subjectRules.length === 0 && !busy && (
                  <tr><td colSpan={10} className="py-6 text-center text-muted-foreground text-[13px]">
                    {subjectKey ? '저장된 규칙 없음 — 전 화면 현행 허용.' : '주체를 선택하면 규칙이 표시됩니다.'}
                  </td></tr>
                )}
                {subjectRules.map((r) => (
                  <tr key={r.id}>
                    <td className={cn(TD, 'font-semibold')}>{(PAGE_LABELS as Record<string, string>)[r.pageId] ?? r.pageId}</td>
                    {BIT_KEYS.map((k) => (
                      <td key={k} className={cn(TD, 'text-center', r[k] ? 'text-primary font-bold' : 'text-muted-foreground')}>{r[k] ? '○' : '—'}</td>
                    ))}
                    <td className={cn(TD, 'text-muted-foreground text-[11.5px]')}>{r.updatedBy ?? '—'} · {r.updatedAt.slice(5, 16)}</td>
                    <td className={TD}>
                      <button type="button" onClick={() => loadRule(r)} className="underline underline-offset-2 text-primary font-semibold">불러오기</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
