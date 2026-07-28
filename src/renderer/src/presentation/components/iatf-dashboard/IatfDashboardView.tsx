import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, ChevronRight, BookOpen, CircleCheck, CircleAlert, Clock } from 'lucide-react'
import type { IatfDashboardDto, IatfDutyDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'
import { useDday } from '../../hooks/useDday'
import { PageHeader } from '../shared/PageHeader'
import { CardShell, KpiTile } from '../shared/dash/DashKit'

/**
 * IATF 대시보드 — 인증기관 심사 관점 한 장 (SQ 대시보드와 이원화, 7/16 사장님 확정).
 * ①조항 커버리지(4~10장 규정 매핑) ②심사 핵심 정기 의무(내부심사·경영검토·교정·교육 —
 * 이행 기록 기준, 정직) ③문서화 준비도(규정 본문·작성 가능 양식·작성 실적).
 */

const DUTY_CATS = ['내부심사', '경영검토', '교정/MSA', '교육/인식', '문서관리', '안전/비상']

// 틴트 토큰(17번 §1) — 원색·hex 하드코딩 금지 (7/28 A군)
const STATUS_PILL: Record<IatfDutyDto['status'], { label: string; cls: string }> = {
  ok: { label: '정상', cls: 'bg-ok-tint text-ok-ink' },
  due: { label: '임박', cls: 'bg-warn-tint text-warn-ink' },
  overdue: { label: '연체', cls: 'bg-bad-tint text-bad-ink' }
}

export function IatfDashboardView(): JSX.Element {
  const [data, setData] = useState<IatfDashboardDto | null>(null)
  const setPage = useUIStore((s) => s.setPage)
  const { dday } = useDday()

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.IATF_DASHBOARD)) as IatfDashboardDto
        if (alive) setData(res)
      } catch {
        if (alive) setData(null)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> IATF 준비 현황 집계 중...
      </div>
    )
  }

  const overdue = data.duties.filter((d) => d.status === 'overdue')
  const due = data.duties.filter((d) => d.status === 'due')
  const emptyClauses = data.clauses.filter((c) => c.regCount === 0)
  const maxReg = Math.max(1, ...data.clauses.map((c) => c.regCount))

  return (
    <div className="space-y-5 break-keep">
      <PageHeader
        title="IATF 대시보드 — 인증 심사 준비 한 장"
        sub="조항 커버리지 · 내부심사/경영검토 등 핵심 의무 이행 · 문서화 — SQ(고객사 평가)와 별개의 인증기관 심사 관점"
        actions={
          <span className="inline-flex items-center gap-1.5 text-[12px] font-bold bg-secondary text-secondary-foreground px-3 py-1.5 rounded-full">
            <ShieldCheck className="w-4 h-4" /> 정기심사 D-{Math.abs(dday)}
          </span>
        }
      />

      {/* ── 1행: 핵심 지표 — 홈과 같은 KPI 타일 부품(DashKit) ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KpiTile
          icon="◷" iconTint="bg-secondary text-primary" label="심사까지"
          value={`D-${Math.abs(dday)}`}
          chip="3차 정기심사 · 설정에서 변경" chipTone="fx"
        />
        <KpiTile
          icon="!" iconTint="bg-bad-tint text-bad-ink" label="핵심 의무 연체"
          value={overdue.length} unit="건"
          chip="내부심사·경영검토·교정·교육 기준"
          chipTone={overdue.length > 0 ? 'dn' : 'up'}
        />
        <KpiTile
          icon="§" iconTint="bg-warn-tint text-warn-ink" label="빈 조항 (규정 미매핑)"
          value={emptyClauses.length} unit="개"
          chip={emptyClauses.length > 0 ? `${emptyClauses.map((c) => c.clause).join('·')}장 보강 필요` : '4~10장 전부 매핑됨'}
          chipTone={emptyClauses.length > 0 ? 'dn' : 'up'}
          onClick={() => setPage('clause-tree')}
        />
        <KpiTile
          icon="▤" iconTint="bg-data-tint text-data-ink" label="문서화 (작성 가능 양식)"
          value={data.docs.formsFillable} unit={`/${data.docs.formsTotal}`}
          chip={`규정 본문 ${data.docs.regBodies}/${data.docs.regsTotal}종 열람 가능`} chipTone="fx"
          onClick={() => setPage('document-bom')}
        />
      </div>

      {/* ── 2행: 조항 커버리지 + 문서화 (CardShell 규격) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <CardShell
          title="조항 커버리지 — IATF 4~10장"
          actions={
            <button type="button" onClick={() => setPage('clause-tree')} className="text-[13px] font-bold text-primary">
              상세 보기 ›
            </button>
          }
        >
          <div className="px-[18px] pb-[18px] pt-3 space-y-3">
            {data.clauses.map((c) => (
              <div key={c.clause} className="flex items-center gap-3">
                <span className="w-[120px] text-[14.5px] font-semibold break-keep leading-snug">
                  {c.clause}장 <span className="text-muted-foreground font-medium">{c.title}</span>
                </span>
                <span className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                  <span
                    className={cn('block h-full rounded-full', c.regCount === 0 ? 'bg-destructive' : 'bg-primary')}
                    style={{ width: `${Math.max(4, (c.regCount / maxReg) * 100)}%` }}
                  />
                </span>
                <span className={cn('w-16 text-right text-[13.5px] tabular-nums', c.regCount === 0 ? 'text-destructive font-bold' : 'text-muted-foreground')}>
                  {c.regCount === 0 ? '없음' : `규정 ${c.regCount}`}
                </span>
              </div>
            ))}
          </div>
        </CardShell>

        <CardShell
          title="문서화 준비도"
          cap="작성 가능 = 셀맵(필드 정의) 보유 · 나머지는 문서 등록만"
          actions={
            <button type="button" onClick={() => setPage('document-bom')} className="text-[13px] font-bold text-primary">
              문서 BOM ›
            </button>
          }
        >
          <div className="px-[18px] pb-[18px] pt-3 space-y-3">
            <DocBar label="규정 본문 열람" value={data.docs.regBodies} total={data.docs.regsTotal} />
            <DocBar label="작성 가능 양식" value={data.docs.formsFillable} total={data.docs.formsTotal} />
            <DocBar label="작성 실적 있는 양식" value={data.docs.formsWithSubmission} total={data.docs.formsTotal} />
          </div>
        </CardShell>
      </div>

      {/* ── 3행: 심사 핵심 정기 의무 (CardShell 규격) ── */}
      <CardShell
        title="심사 핵심 의무 — 내부심사 · 경영검토 · 교정 · 교육"
        cap="이행 기록 기준"
        actions={
          <button type="button" onClick={() => setPage('obligations')} className="text-[13px] font-bold text-primary">
            정기 의무 관리 ›
          </button>
        }
      >
        <div className="px-[18px] pb-4 pt-3">
        {DUTY_CATS.map((cat) => {
          const rows = data.duties.filter((d) => d.category === cat)
          if (rows.length === 0) return null
          return (
            <div key={cat} className="mb-3 last:mb-0">
              <div className="text-[12px] font-bold text-secondary-foreground bg-secondary inline-block rounded px-2 py-0.5 mb-1.5">
                {cat}
              </div>
              {rows.map((d) => {
                const pill = STATUS_PILL[d.status]
                return (
                  <div key={d.id} className="flex items-center gap-2.5 py-2.5 border-t border-border text-[14.5px]">
                    {d.status === 'ok' ? (
                      <CircleCheck className="w-4 h-4 text-ok-ink shrink-0" />
                    ) : d.status === 'due' ? (
                      <Clock className="w-4 h-4 text-warn-ink shrink-0" />
                    ) : (
                      <CircleAlert className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span className="flex-1 min-w-0 break-keep leading-snug">{d.title}</span>
                    {d.clauseRef && (
                      <span className="text-[10.5px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {d.clauseRef}
                      </span>
                    )}
                    <span className="text-[13px] text-muted-foreground tabular-nums shrink-0 hidden md:inline">
                      {d.lastDoneDate ? `최근 ${d.lastDoneDate}` : '이행 기록 없음'}
                    </span>
                    <span className="text-[13px] text-muted-foreground tabular-nums shrink-0">
                      {d.nextDueDate ? `도래 ${d.nextDueDate}` : '—'}
                    </span>
                    <span className={cn('text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0', pill.cls)}>
                      {pill.label}
                      {d.status === 'overdue' && d.daysLeft != null && ` ${Math.abs(d.daysLeft)}일`}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
        {due.length + overdue.length > 0 && (
          <div className="text-[13px] text-muted-foreground mt-3">
            연체 {overdue.length} · 임박 {due.length} — 홈 관제탑과 팀별 허브에서 [완료] 처리하면 즉시 반영됩니다.
          </div>
        )}
        </div>
      </CardShell>

      <p className="text-[13px] text-muted-foreground text-center inline-flex items-center gap-1.5 w-full justify-center">
        <BookOpen className="w-3.5 h-3.5" />
        내부심사·경영검토의 "했다"는 정기 의무 이행 기록이 근거 — 소급 표시 없음(정직).
        <button type="button" onClick={() => setPage('sq-dashboard')} className="text-primary font-bold inline-flex items-center">
          SQ(고객사 평가) 대시보드는 따로 <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </p>
    </div>
  )
}

function DocBar({ label, value, total }: { label: string; value: number; total: number }): JSX.Element {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-[140px] text-[14.5px] font-semibold break-keep leading-snug">{label}</span>
      <span className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-[110px] text-right text-[13.5px] tabular-nums text-muted-foreground">
        <b className="text-foreground">{value}</b> / {total} · {pct}%
      </span>
    </div>
  )
}
