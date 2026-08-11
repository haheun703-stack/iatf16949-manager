import { useEffect, useState } from 'react'
import { ClipboardList, Factory, FlaskConical, Camera, Boxes, ShieldCheck } from 'lucide-react'
import type { MesRecordsStatusDto, SemimesHomeKpisDto, TeamTodayBoardDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'

/**
 * 32호 §2 — MES 홈 (로그인 직후 첫 화면 · 주객 복구).
 * 구성 = 캡쳐 그림1(관리자 메인) 문법: 메뉴는 위 메가바가 담당, 본문은 ①문제 배너 1줄
 * (31호 §2-1 유지 — 눈에 보이는 관리) ②자주 쓰는 화면 큰 타깃 ③최근 연 양식 칩 ④오늘 요약 1줄.
 * 기존 관제탑(배너·TOP5·심사 뷰·KPI)은 심사대응 메뉴 첫 화면(audit-hub)으로 이동 — 삭제 아님.
 */

const QUICK: Array<{ page: PageId; label: string; desc: string; icon: typeof Factory }> = [
  { page: 'work-order', label: '작업지시', desc: '발번·상태·진척', icon: ClipboardList },
  { page: 'prod-entry', label: '생산실적 등록', desc: '양품/불량 · LOT 발번', icon: Factory },
  { page: 'insp-entry', label: '검사 등록', desc: '자주 초·중·종 · 수입·패트롤', icon: FlaskConical },
  { page: 'receipt-inbox', label: '수집함', desc: '입고·출하 전표 사진', icon: Camera },
  { page: 'part-process', label: '품번×공정 실황', desc: '수불 상위 · 기록 현황', icon: Boxes },
  { page: 'audit-hub', label: '심사대응 (관제탑)', desc: '문제·TOP5·심사 뷰', icon: ShieldCheck }
]

export function MesHome(): JSX.Element {
  const setPage = useUIStore((s) => s.setPage)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const recentForms = useUIStore((s) => s.recentForms)
  const [board, setBoard] = useState<TeamTodayBoardDto | null>(null)
  const [mes, setMes] = useState<MesRecordsStatusDto | null>(null)
  const [kpis, setKpis] = useState<SemimesHomeKpisDto | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        setBoard((await window.api.invoke(window.api.channels.TEAM_TODAY_BOARD)) as TeamTodayBoardDto)
      } catch {
        setBoard(null)
      }
    })()
    void (async () => {
      try {
        setMes((await window.api.invoke(window.api.channels.MES_RECORDS_STATUS)) as MesRecordsStatusDto)
      } catch {
        setMes(null)
      }
    })()
    void (async () => {
      try {
        setKpis((await window.api.invoke(window.api.channels.SEMIMES_HOME_KPIS, undefined)) as SemimesHomeKpisDto)
      } catch {
        setKpis(null)
      }
    })()
  }, [])

  const totals = board?.totals
  const mesLag =
    mes?.available && mes.dataEndYmd && board?.date && board.date > mes.dataEndYmd
      ? Math.round(
          (new Date(`${board.date}T00:00:00`).getTime() - new Date(`${mes.dataEndYmd}T00:00:00`).getTime()) / 86400000
        )
      : 0
  const hasProblem = (totals?.overdue ?? 0) > 0 || mesLag >= 2

  return (
    <div className="flex flex-col gap-4 break-keep">
      {/* ① 문제 배너 1줄 (31호 §2-1 유지 — 상세는 심사대응 관제탑으로) */}
      <button
        type="button"
        onClick={() => setPage('audit-hub')}
        className={cn(
          'w-full text-left rounded-xl px-4 py-2.5 text-[13.5px] font-extrabold border transition-colors',
          hasProblem
            ? 'bg-bad-tint text-bad-ink border-bad-ink/25 hover:brightness-95'
            : 'bg-ok-tint text-ok-ink border-ok-ink/20'
        )}
      >
        {hasProblem
          ? `⚠ ${mesLag >= 2 ? `MES 미반입 ${mesLag}일째 · ` : ''}할 일 ${totals?.open ?? 0}건 · 연체 ${totals?.overdue ?? 0}건 — 심사대응(관제탑)에서 처리 →`
          : `● 오늘 기록 정상 진행 중 — 할 일 ${totals?.open ?? 0}건 열려 있음`}
      </button>

      {/* ①-b 오늘 KPI 4타일 (33호 §2-2 모듈 홈 대시보드 문법 — 원천 있는 것만, 추정 0) */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '오늘 생산', value: `${kpis.prodCnt}건`, sub: `양품 ${kpis.okSum.toLocaleString()}`, page: 'prod-history' as PageId },
            { label: '오늘 검사', value: `${kpis.inspCnt}건`, sub: '자주·수입·패트롤', page: 'insp-history' as PageId },
            { label: '2단 확인 대기', value: `${kpis.confirmWait}건`, sub: '확인자 서명 필요', page: 'insp-history' as PageId, warn: kpis.confirmWait > 0 },
            { label: '오늘 입고 수불', value: `${kpis.receiptCnt}건`, sub: '수집함 태깅 원천', page: 'mat-stock' as PageId }
          ].map((t) => (
            <button key={t.label} type="button" onClick={() => setPage(t.page)}
              className={cn('rounded-2xl border shadow-card px-4 py-3 text-left transition-colors',
                t.warn ? 'bg-warn-tint border-warn-ink/25 hover:brightness-95' : 'bg-card border-border hover:bg-secondary/40')}>
              <span className="block text-[11.5px] font-bold text-muted-foreground">{t.label}</span>
              <b className={cn('block text-[22px] tracking-[-0.02em] tabular-nums', t.warn ? 'text-warn-ink' : 'text-mega-active')}>{t.value}</b>
              <span className="block text-[11.5px] text-muted-foreground truncate">{t.sub}</span>
            </button>
          ))}
        </div>
      )}

      {/* ② 자주 쓰는 화면 — 현장 큰 타깃(매일 입력 동선 1~4화면 문법) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {QUICK.map((q) => {
          const Icon = q.icon
          return (
            <button
              key={q.page}
              type="button"
              onClick={() => setPage(q.page)}
              className="rounded-2xl border border-border bg-card shadow-card px-4 py-4 text-left hover:bg-secondary/40 transition-colors flex items-center gap-3"
            >
              <span className="w-11 h-11 rounded-xl bg-secondary text-mega-active flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <b className="block text-[14.5px] truncate">{q.label}</b>
                <span className="block text-[12px] text-muted-foreground truncate">{q.desc}</span>
              </span>
            </button>
          )
        })}
      </div>

      {/* ③ 최근 연 양식 칩(즐겨찾기 문법 — 기존 recentForms 재사용) */}
      {recentForms.length > 0 && (
        <div className="rounded-[14px] border border-border bg-card shadow-card p-4">
          <div className="text-[11.5px] font-bold text-muted-foreground uppercase tracking-wide mb-2">최근 연 양식</div>
          <div className="flex flex-wrap gap-1.5">
            {recentForms.slice(0, 10).map((f) => (
              <button
                key={f.code}
                type="button"
                onClick={() => {
                  setSelectedFormCode(f.code)
                  setPage('form-builder')
                }}
                className="px-2.5 py-1.5 rounded-lg border border-border text-[12.5px] font-semibold hover:bg-muted"
                title={f.code}
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ④ 오늘 요약 1줄 */}
      <p className="text-[12.5px] text-muted-foreground">
        {board
          ? `오늘 ${board.date} — 완료 ${totals?.done ?? 0} · 열림 ${totals?.open ?? 0} · 연체 ${totals?.overdue ?? 0}${mes?.dataEndYmd ? ` · MES 기준 ${mes.dataEndYmd.slice(5)}` : ''}`
          : '오늘 집계 로드 중…'}{' '}
        — 상세는 심사대응(관제탑)·오늘 할 일 보드에서.
      </p>
    </div>
  )
}
