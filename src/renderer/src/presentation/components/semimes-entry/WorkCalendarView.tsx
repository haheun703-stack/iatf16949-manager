import { useCallback, useEffect, useState } from 'react'
import { todayKST, ymdAddKST } from '@shared/date-kst'
import type { SemimesWorkCalendarDayDto, SemimesWorkCalendarDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useSeqGuard } from '../../lib/asyncGuard'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { MesToolbar, downloadCsv } from '../shared/MesToolbar'

/**
 * 34호 배치⑶ — #18 조업달력 (정본 그림31 · 골격 — 코워크 조건1 승격).
 * 가동일 = 도넛 %·심사 뷰 판정·성과 지표 3곳이 공유하는 **분모의 원천**(0139).
 * 계약: 1일 1행 · 행이 없으면 '미등록'(가짜 가동일 금지 — 미등록 구간은 종전 프록시 유지) ·
 * 기입 주체 세션 각인(STAMP). 휴무로 적힌 날에 실적이 있으면 모순 표식(⚠ — 숨기지 않는다).
 */

const DOW = ['일', '월', '화', '수', '목', '금', '토']

export function WorkCalendarView(): JSX.Element {
  const { users, activeUserId } = useActiveUserStore()
  const userName = users.find((u) => u.id === activeUserId)?.name
  const today = todayKST()

  const [month, setMonth] = useState(today.slice(0, 7))
  const [cal, setCal] = useState<SemimesWorkCalendarDto | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null)

  const seq = useSeqGuard()
  const load = useCallback(async (m: string = month): Promise<void> => {
    const token = seq.begin()
    setBusy(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_CALENDAR, { month: m })) as SemimesWorkCalendarDto
      if (!seq.isCurrent(token)) return
      setCal(res)
    } catch {
      if (seq.isCurrent(token)) setMsg({ tone: 'bad', text: '조회 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      if (seq.isCurrent(token)) setBusy(false)
    }
  }, [month, seq])

  useEffect(() => {
    void load(month)
    setSelected(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month])

  const dayMap = new Map<string, SemimesWorkCalendarDayDto>((cal?.days ?? []).map((d) => [d.ymd, d]))

  const save = async (ymd: string, workType: '조업' | '휴무'): Promise<void> => {
    if (saving) return
    setSaving(true)
    setMsg(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_CALENDAR_SAVE, {
        ymd, workType, note: note.trim() || null, updatedBy: userName
      })) as { success: boolean; error?: string }
      if (!res.success) {
        setMsg({ tone: 'bad', text: res.error ?? '저장 실패' })
        return
      }
      setMsg({ tone: 'ok', text: `${ymd} = ${workType} 등록 (기입 주체 각인)` })
      setNote('')
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '저장 실패 — 통신 오류. 다시 시도하세요.' })
    } finally {
      setSaving(false)
    }
  }

  /** 평일 일괄 조업 — 미등록 평일만(기존 행 불변). 도입 첫 달의 수십 클릭을 줄이는 보조 동선 */
  const bulkWeekdays = async (): Promise<void> => {
    if (saving) return
    const targets = allDays.filter((d) => !dayMap.has(d.ymd) && d.dow >= 1 && d.dow <= 5).map((d) => d.ymd)
    if (targets.length === 0) {
      setMsg({ tone: 'ok', text: '미등록 평일이 없습니다 — 일괄 등록할 대상 없음.' })
      return
    }
    const ok = await confirmDialog({
      title: `${month} 미등록 평일 ${targets.length}일을 '조업'으로 일괄 등록할까요?`,
      body: '이미 등록된 날은 건드리지 않습니다. 휴무였던 평일은 개별로 정정하세요.',
      okLabel: '일괄 등록'
    })
    if (!ok) return
    setSaving(true)
    setMsg(null)
    try {
      let done = 0
      for (const ymd of targets) {
        const res = (await window.api.invoke(window.api.channels.SEMIMES_WORK_CALENDAR_SAVE, {
          ymd, workType: '조업', updatedBy: userName
        })) as { success: boolean; error?: string }
        if (!res.success) {
          setMsg({ tone: 'bad', text: `${ymd} 저장 실패(${res.error ?? '오류'}) — ${done}일까지 등록됨.` })
          await load()
          return
        }
        done++
      }
      setMsg({ tone: 'ok', text: `평일 ${done}일 조업 일괄 등록 완료.` })
      await load()
    } catch {
      setMsg({ tone: 'bad', text: '일괄 등록 중 통신 오류 — 화면을 조회해 어디까지 등록됐는지 확인하세요.' })
      await load()
    } finally {
      setSaving(false)
    }
  }

  // 월의 전체 일자 좌표(요일 포함) — +09:00 정오 앵커라 getUTCDay = KST 요일(0=일…6=토)
  const allDays: Array<{ ymd: string; day: number; dow: number }> = []
  {
    let cur = `${month}-01`
    while (cur.slice(0, 7) === month) {
      allDays.push({ ymd: cur, day: Number(cur.slice(8, 10)), dow: new Date(`${cur}T12:00:00+09:00`).getUTCDay() })
      cur = ymdAddKST(cur, 1)
    }
  }
  const leading = allDays.length > 0 ? allDays[0].dow : 0
  const unregistered = allDays.length - (cal?.days.length ?? 0)
  const sel = selected ? dayMap.get(selected) : undefined

  const moveMonth = (delta: number): void => {
    const anchor = ymdAddKST(`${month}-15`, delta * 30)
    setMonth(anchor.slice(0, 7))
  }

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">조업달력</h1>
        <span className="text-[13px] text-muted-foreground">
          가동일 = 도넛 %·심사 뷰·성과 지표의 공유 분모 · 미등록 날은 종전 프록시(기록일)로 계산 — 정직 표기
        </span>
      </div>

      {/* 8/12 판정① 도장: 운용 순서를 화면에 명기 — 일괄은 공휴일도 조업으로 잡으므로 정정이 뒤 */}
      <div className="rounded-lg px-3 py-2 text-[12px] font-semibold bg-secondary/50 text-secondary-foreground">
        운용 순서(확정): <b>매월 초 [미등록 평일 일괄 조업] → 공휴일·휴무일만 골라 [휴무 등록]으로 정정</b> —
        일괄 등록은 공휴일도 조업으로 잡으므로 정정을 반드시 뒤에 합니다(이미 등록된 날은 일괄이 건드리지 않음).
      </div>

      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-3 flex-wrap">
        <MesToolbar
          onSearch={() => void load()}
          onExcel={cal && cal.days.length > 0 ? () => downloadCsv(`조업달력_${month}.csv`, ['일자', '구분', '메모', '기입자'], cal.days.map((d) => [d.ymd, d.workType, d.note, d.updatedBy])) : undefined}
          onPrint={() => window.print()}
          busy={busy}
        />
        <span className="flex items-center gap-1.5 ml-auto">
          <button type="button" onClick={() => moveMonth(-1)} className="h-8 px-2.5 rounded-lg border border-border text-[12px] font-bold hover:bg-muted">◀</button>
          <b className="text-[14px] tabular-nums px-1">{month}</b>
          <button type="button" onClick={() => moveMonth(1)} className="h-8 px-2.5 rounded-lg border border-border text-[12px] font-bold hover:bg-muted">▶</button>
          <button type="button" onClick={() => setMonth(today.slice(0, 7))} className="h-8 px-2.5 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground hover:bg-muted">이번 달</button>
        </span>
      </div>

      {msg && (
        <div className={cn('rounded-lg px-3 py-2 text-[12.5px] font-semibold', msg.tone === 'ok' ? 'bg-ok-tint text-ok-ink' : 'bg-bad-tint text-bad-ink')}>
          {msg.text}
        </div>
      )}

      {/* 월 요약 + 일괄 보조 */}
      <div className="flex items-center gap-2 flex-wrap text-[12.5px] font-bold">
        <span className="px-2.5 py-1 rounded-lg bg-ok-tint text-ok-ink">조업 {cal?.workDays ?? 0}일</span>
        <span className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground">휴무 {cal?.restDays ?? 0}일</span>
        <span className="px-2.5 py-1 rounded-lg bg-warn-tint text-warn-ink">미등록 {unregistered}일</span>
        <button type="button" onClick={() => void bulkWeekdays()} disabled={saving}
          className="ml-auto h-8 px-3 rounded-lg border border-primary/40 bg-secondary text-secondary-foreground text-[12px] font-bold disabled:opacity-50">
          {saving ? '등록 중…' : '미등록 평일 일괄 조업'}
        </button>
      </div>

      {/* 월 캘린더 (그림31 골격) */}
      <div className="rounded-[14px] border border-border bg-card shadow-card p-3 overflow-x-auto">
        <div className="grid grid-cols-7 gap-1 min-w-[560px]">
          {DOW.map((d, i) => (
            <div key={d} className={cn('text-center text-[11.5px] font-extrabold py-1', i === 0 ? 'text-bad-ink' : i === 6 ? 'text-mega-active' : 'text-muted-foreground')}>{d}</div>
          ))}
          {Array.from({ length: leading }, (_, i) => <div key={`pad${i}`} />)}
          {allDays.map((d) => {
            const row = dayMap.get(d.ymd)
            const isToday = d.ymd === today
            const conflict = row?.workType === '휴무' && row.hasRecords
            return (
              <button
                key={d.ymd}
                type="button"
                onClick={() => { setSelected(d.ymd); setNote(dayMap.get(d.ymd)?.note ?? '') }}
                className={cn(
                  'rounded-lg border p-1.5 min-h-[64px] flex flex-col items-start gap-0.5 text-left transition-colors',
                  selected === d.ymd ? 'border-mega-active ring-1 ring-mega-active' : 'border-border/70 hover:bg-muted/50',
                  row?.workType === '조업' ? 'bg-ok-tint/50' : row?.workType === '휴무' ? 'bg-muted/60' : 'bg-card'
                )}
              >
                <span className={cn('text-[12px] font-extrabold tabular-nums', isToday && 'text-white bg-mega-active rounded-full w-5 h-5 flex items-center justify-center', !isToday && (d.dow === 0 ? 'text-bad-ink' : d.dow === 6 ? 'text-mega-active' : ''))}>
                  {d.day}
                </span>
                {row ? (
                  <span className={cn('text-[10.5px] font-bold', row.workType === '조업' ? 'text-ok-ink' : 'text-muted-foreground')}>
                    {row.workType}{conflict && <span className="text-warn-ink" title="휴무로 적혔는데 실적 기록이 있음 — 정정 필요"> ⚠기록</span>}
                  </span>
                ) : (
                  <span className="text-[10.5px] font-semibold text-warn-ink/70">미등록</span>
                )}
                {row?.note && <span className="text-[10px] text-muted-foreground truncate w-full">{row.note}</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택일 등록 폼 */}
      {selected && (
        <div className="rounded-xl border border-border bg-card shadow-card p-3 flex items-end gap-2 flex-wrap">
          <span className="text-[13.5px] font-extrabold tabular-nums">{selected}</span>
          {sel && (
            <span className="text-[12px] text-muted-foreground">
              현행 = {sel.workType}{sel.updatedBy ? ` · ${sel.updatedBy}` : ''}{sel.hasRecords ? ' · 실적 기록 있음' : ''}
            </span>
          )}
          <label className="flex flex-col gap-1 text-[12px] font-semibold text-muted-foreground flex-1 min-w-[200px]">
            메모 (휴무 사유·특근 등 — 선택)
            <input value={note} onChange={(e) => setNote(e.target.value)} className="h-9 px-2.5 rounded-lg border border-border bg-card text-[12.5px]" />
          </label>
          <button type="button" onClick={() => void save(selected, '조업')} disabled={saving} className="h-9 px-4 rounded-lg bg-ok-tint text-ok-ink text-[12.5px] font-bold disabled:opacity-50">조업 등록</button>
          <button type="button" onClick={() => void save(selected, '휴무')} disabled={saving} className="h-9 px-4 rounded-lg bg-muted text-muted-foreground text-[12.5px] font-bold disabled:opacity-50">휴무 등록</button>
          <span className="w-full text-[11.5px] text-muted-foreground">정정 = 같은 날 다시 등록(덮어쓰기 — 마스터 성격). 기입 주체 = {userName ?? '(사용자 미선택)'}</span>
        </div>
      )}
    </div>
  )
}
