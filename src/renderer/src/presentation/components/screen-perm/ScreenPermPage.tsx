import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ScreenPermBits, ScreenPermRuleDto, ScreenPermSaveInput } from '@shared/ipc-types'
import { ACT_LABELS, SCREEN_PERM_PAGE_IDS, enforcedActsOf } from '@shared/screen-perm-pages'
import { cn } from '../../../lib/utils'
import { useSeqGuard, useSingleFlight } from '../../lib/asyncGuard'
import { invokeErrText } from '../../lib/errText'
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
const TREE: { key: string; label: string; pages: { page: PageId; label: string }[] }[] = [
  ...MODULES.map((m) => ({
    key: m.key,
    label: m.label,
    pages: m.items
      .filter((it) => it.page && !it.alias && !it.adminOnly && !it.execOnly)
      .map((it) => ({ page: it.page as PageId, label: it.label }))
  })).filter((m) => m.pages.length > 0),
  // Minor 7(8/14 검수 2차): form-builder 는 메뉴 트리 밖(양식에서 직접 진입)이라 트리에
  // 안 뜨는데 서버는 엑셀 축(form:exportXlsx)을 실제로 강제한다 — 규칙을 걸 UI 동선이
  // 아예 없었다. 별도 묶음으로 노출한다(화이트리스트에는 이미 있음).
  { key: '_offmenu', label: '메뉴 밖 (직접 진입 화면)', pages: [{ page: 'form-builder' as PageId, label: '양식 작성(엑셀 내보내기)' }] }
]

// M-2(8/13 검수) — 서버가 실제 403 으로 강제하는 화면.
// N-10(8/14 검수 2차) — 강제는 (화면×행위) 단위다. 화면 단위 배지는 fmea(엑셀만)·
// item-master/partner-master(수정만)·mat-receipts(삭제만)에서 "쓰기·수정·삭제 403" 으로
// 과장돼 읽혔다 → 축을 그대로 적는다(원천 = shared/screen-perm-pages ↔ SCREEN_GUARD 1:1).
function actBadgeOf(pageId: string): { text: string; full: boolean } {
  const acts = enforcedActsOf(pageId)
  if (acts.length === 0) return { text: '표시 전용', full: false }
  return { text: `강제 ${acts.map((a) => ACT_LABELS[a]).join('·')}`, full: true }
}
// 동기 계약 tripwire: 메뉴에 화면을 추가했는데 화이트리스트(shared/screen-perm-pages) 미갱신 시
// 저장이 서버에서 거부된다 — dev 콘솔로 어긋남을 조기 감지.
{
  const wl = new Set<string>(SCREEN_PERM_PAGE_IDS)
  const missing = TREE.flatMap((m) => m.pages).filter((p) => !wl.has(p.page))
  if (missing.length > 0) {
    console.warn('[screen-perm] 메뉴↔화이트리스트 어긋남 — shared/screen-perm-pages 갱신 필요:', missing.map((p) => p.page).join(', '))
  }
}

export function ScreenPermPage(): JSX.Element {
  const { users, activeUserId, loaded: usersLoaded } = useActiveUserStore()
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
  // 반환 = 조회 성공 여부(Minor 8/13: 저장 성공 메시지를 load 실패 문구가 덮지 않게 —
  // 호출자가 결과를 알고 메시지를 마지막에 확정한다)
  const load = useCallback(async (): Promise<boolean> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.PERM_LIST)) as ScreenPermRuleDto[]
      if (!seq.isCurrent(token)) return true
      setRules(res)
      return true
    } catch {
      if (seq.isCurrent(token)) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
      return false
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
  // Minor 5(8/14 검수 2차): 규칙 해제도 쓰기 관문이다 — 연타를 confirm 중첩이 "실질적으로"
  // 막고 있었을 뿐 규약(쓰기 버튼 = useSingleFlight)에서 벗어나 있었다.
  const removeFlight = useSingleFlight()
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
      const loadedOk = await load()
      await reloadEffective() // 내 규칙이 바뀐 경우 메뉴 보조막 동기화
      // Minor(8/13 검수): 저장 결과가 정본 — load 실패 문구가 성공 메시지를 덮지 않게 마지막에 확정
      const base = remove
        ? `규칙 ${res.saved ?? 0}건 해제 — 해당 화면은 현행 허용으로 복귀.`
        : `화면 ${res.saved ?? 0}건 권한설정 저장 — 서버 즉시 효력(쓰기·수정·삭제·엑셀), 메뉴 숨김은 대상자 재로그인/새로고침부터.`
      setMsg({ tone: 'ok', text: loadedOk ? base : `${base} · 목록 새로고침 실패 — 화면 새로고침으로 확인하세요.` })
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '저장 실패 — 통신 오류. 다시 시도하세요.') })
    } finally {
      setSaving(false)
    }
  }

  function loadRule(r: ScreenPermRuleDto): void {
    setSelected(new Set([r.pageId as PageId]))
    setBits({ read: r.read, write: r.write, edit: r.edit, delete: r.delete, excel: r.excel, print: r.print, price: false })
    setMsg(null)
  }

  // ── 전체 규칙 뷰(Minor 8/13 — M-5 동반): 부서 개명·퇴사 뒤 남는 고아 규칙의 조회·해제 동선 ──
  const [showAll, setShowAll] = useState(false)
  function subjectNameOf(r: ScreenPermRuleDto): string {
    if (r.subjectKind === 'team') return `부서 · ${r.subjectKey}`
    const u = users.find((x) => String(x.id) === r.subjectKey)
    return u ? `개인 · ${u.name}` : `개인 · #${r.subjectKey}`
  }
  /**
   * 고아 = 효력 주체가 더는 없다(부서 개명·명단 삭제). 비활성 = 퇴사·휴직(효력 없음·이름 보존).
   * Minor 6(8/14 검수 2차) — 종전 판정은 두 갈래로 비대칭이었다:
   *   ① 팀 축이 **활성자만 모은 `teams`** 로 판정 → 전원 휴직·전원 퇴사한 부서가 '고아'로 오표기
   *      (부서는 멀쩡히 존재하고 복직하면 규칙이 되살아난다 — 유령이 아니다).
   *   ② `users` 로드 전(빈 배열) 한 틱 동안 **전 규칙이 '고아'** 로 붉게 표시.
   * → 비활성 인원까지 포함한 명단으로 존재 여부를 보고, 로드 전에는 판정을 유보한다.
   */
  const allTeams = useMemo(() => {
    const set = new Set<string>()
    for (const u of users) if (u.teamDept) set.add(u.teamDept)
    return set
  }, [users])
  function orphanOf(r: ScreenPermRuleDto): 'orphan' | 'inactive' | 'unknown' | null {
    if (!usersLoaded) return 'unknown' // 명단 미로드 = 판정 불가(가짜 고아 금지)
    if (r.subjectKind === 'team') {
      if (teams.includes(r.subjectKey)) return null // 활성 인원이 있는 부서
      return allTeams.has(r.subjectKey) ? 'inactive' : 'orphan' // 전원 비활성 vs 부서 자체 소멸
    }
    const u = users.find((x) => String(x.id) === r.subjectKey)
    if (!u) return 'orphan'
    return u.active ? null : 'inactive'
  }
  async function removeOne(r: ScreenPermRuleDto): Promise<void> {
    const ok = await confirmDialog({
      title: `규칙 해제 — ${subjectNameOf(r)} · ${(PAGE_LABELS as Record<string, string>)[r.pageId] ?? r.pageId}`,
      body: '해제 = 규칙 삭제 — 그 화면은 현행 허용(role 가드만)으로 돌아갑니다.',
      okLabel: '규칙 해제', danger: true
    })
    if (!ok) return
    try {
      const res = (await window.api.invoke(window.api.channels.PERM_SAVE, {
        subjectKind: r.subjectKind, subjectKey: r.subjectKey, pageIds: [r.pageId],
        bits: DEFAULT_BITS, remove: true, updatedBy: userName
      } satisfies ScreenPermSaveInput)) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '해제 실패' })
        return
      }
      const loadedOk = await load()
      await reloadEffective()
      setMsg({ tone: 'ok', text: `규칙 해제 — ${subjectNameOf(r)} · 현행 허용 복귀.${loadedOk ? '' : ' · 목록 새로고침 실패 — 화면 새로고침으로 확인하세요.'}` })
    } catch (e) {
      setMsg({ tone: 'bad', text: invokeErrText(e, '해제 실패 — 통신 오류. 다시 시도하세요.') })
    }
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
          권한그룹(부서)·개인 × 메뉴 × 7종 체크(그림33) — 규칙 없는 화면 = 현행 허용 ·
          저장 = 최종관리자(사장님) 전용(판정 ① 8/13) · executive = 매트릭스 전권
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
                        <span className="ml-auto shrink-0 flex items-center gap-1">
                          {/* M-2 정직 표기 + N-10 축 정밀화: 어떤 행위가 실제 403 인지 그대로 적는다 */}
                          {(() => {
                            const b = actBadgeOf(p.page)
                            return (
                              <span
                                className={cn(
                                  'text-[10px] font-semibold rounded-full px-1.5 py-[1px]',
                                  b.full ? 'bg-secondary text-primary/90' : 'bg-muted text-muted-foreground/80'
                                )}
                                title={
                                  b.full
                                    ? `서버가 403 으로 막는 행위 = ${b.text.replace('강제 ', '')}. 나머지 축(읽기·프린트 및 미표기 행위)은 메뉴 숨김·표기 보조로만 동작합니다.`
                                    : '서버 강제 없음 — 규칙은 메뉴 숨김·표기 보조로만 동작합니다'
                                }
                              >
                                {b.text}
                              </span>
                            )
                          })()}
                          {r && (
                            <span className={cn('text-[10.5px] font-semibold rounded-full px-2 py-[1px]', r.read ? 'bg-secondary text-primary' : 'bg-bad-tint text-bad-ink')}>
                              규칙 {r.read ? '' : '· 읽기 차단'}
                            </span>
                          )}
                        </span>
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
              {BIT_KEYS.map((k) => {
                // M-4(8/13 검수): 프린트 = 소비처 0(서버 ACT_COL 밖·렌더러 미참조) — 단가 선례로 잠금 표기
                const locked = k === 'price' || k === 'print'
                const disabled = locked || (k !== 'read' && !bits.read)
                return (
                  <label key={k} className={cn('flex items-center gap-1.5 text-[13px] font-semibold', disabled && 'opacity-50 cursor-not-allowed')}>
                    <input
                      type="checkbox"
                      checked={bits[k]}
                      disabled={disabled}
                      onChange={(e) => {
                        const on = e.target.checked
                        // Minor(8/13 검수): 최빈 동선 = "읽기 차단" — 읽기를 끄면 나머지 자동 해제
                        // (종전엔 서버 모순 거부로 1차 저장이 반드시 실패했다)
                        if (k === 'read' && !on) {
                          setBits({ read: false, write: false, edit: false, delete: false, excel: false, print: false, price: false })
                        } else {
                          setBits({ ...bits, [k]: on })
                        }
                      }}
                    />
                    {BIT_LABELS[k]}
                    {k === 'price' && <span className="text-[10.5px] rounded-full px-1.5 bg-bad-tint text-bad-ink font-bold">전원 잠금</span>}
                    {k === 'print' && <span className="text-[10.5px] rounded-full px-1.5 bg-muted text-muted-foreground font-bold" title="인쇄를 막는 장치가 아직 없습니다(전 화면 브라우저 인쇄) — 자리만 확보">미배선</span>}
                  </label>
                )
              })}
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-2">
              단가 = 돈 경계 헌법(15번) — 자리만 확보, 개방은 별도 판정(스키마 잠금). ·
              프린트 = 미배선(막는 장치 없음 — 자리만). · 읽기를 끄면 나머지는 자동 해제(메뉴 숨김).
              <br />
              {/* N-10(8/14 검수 2차): 종전 문구 "배지 없는 화면 15개 = 쓰기·수정·삭제 403" 은
                  축 과장이었다(fmea = 엑셀만, item/partner = 수정만, mat-receipts = 삭제만). */}
              서버 403 강제는 <b>(화면 × 행위)</b> 단위입니다 — 화면마다
              <span className="mx-1 text-[10px] font-semibold rounded-full px-1.5 py-[1px] bg-secondary text-primary/90">강제 쓰기·삭제</span>
              처럼 <b>실제로 막히는 행위만</b> 배지에 적었습니다(원천 = 서버 SCREEN_GUARD 1:1).
              <span className="mx-1 text-[10px] font-semibold rounded-full px-1.5 py-[1px] bg-muted text-muted-foreground/80">표시 전용</span>
              배지 화면과, 강제 목록에 없는 행위·읽기·프린트 축은 규칙이 메뉴 숨김·표기로만 동작합니다
              (정직 표기 — 8/13 M-2 · 8/14 N-10).
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

          {/* 전체 규칙(고아 점검) — Minor 8/13: 부서 개명·퇴사 뒤 남는 규칙은 주체 선택으로는
              보이지 않아 "통제 중" 착각을 만든다(M-5). 여기서 전량 조회·행 단위 해제. */}
          <div className="rounded-[14px] border border-border bg-card shadow-card overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="w-full px-3 py-2 bg-secondary/60 text-[12.5px] font-bold text-left flex items-center justify-between"
            >
              <span>전체 규칙 {rules.length}건 — 고아 규칙 점검(부서 개명·퇴사 잔존)</span>
              <span className="text-muted-foreground font-semibold">{showAll ? '접기 ▲' : '펼치기 ▼'}</span>
            </button>
            {showAll && (
              <div className="overflow-x-auto">
                <table className="w-full text-[12.5px] border-collapse min-w-[560px]">
                  <thead>
                    <tr>{['주체', '화면', '상태', '정비', ''].map((h, i) => <th key={i} className={TH}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rules.length === 0 && (
                      <tr><td colSpan={5} className="py-5 text-center text-muted-foreground text-[13px]">저장된 규칙 없음 — 전 화면 현행 허용.</td></tr>
                    )}
                    {rules.map((r) => {
                      const o = orphanOf(r)
                      return (
                        <tr key={r.id} className={cn(o === 'orphan' && 'bg-bad-tint/40')}>
                          <td className={cn(TD, 'font-semibold')}>
                            {subjectNameOf(r)}
                            {o === 'orphan' && <span className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-[1px] bg-bad-tint text-bad-ink" title="주체가 현 명단·부서에 없음 — 효력 없는 유령 규칙">고아</span>}
                            {o === 'inactive' && <span className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-[1px] bg-warn-tint text-warn-ink" title="퇴사·휴직(비활성) 대상 — 현재 효력 없음(복직·신규 배치 시 되살아납니다)">비활성</span>}
                            {o === 'unknown' && <span className="ml-1.5 text-[10px] font-bold rounded-full px-1.5 py-[1px] bg-muted text-muted-foreground" title="사용자 명단 로드 전 — 고아 여부를 판정할 수 없습니다">확인 중</span>}
                          </td>
                          <td className={TD}>{(PAGE_LABELS as Record<string, string>)[r.pageId] ?? r.pageId}</td>
                          <td className={cn(TD, 'text-muted-foreground text-[11.5px]')}>
                            {BIT_KEYS.filter((k) => r[k]).map((k) => BIT_LABELS[k]).join('·') || '전부 차단'}
                          </td>
                          <td className={cn(TD, 'text-muted-foreground text-[11.5px]')}>{r.updatedBy ?? '—'} · {r.updatedAt.slice(5, 16)}</td>
                          <td className={TD}>
                            <button type="button" onClick={() => void removeFlight(() => removeOne(r))} className="underline underline-offset-2 text-bad-ink font-semibold">해제</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
