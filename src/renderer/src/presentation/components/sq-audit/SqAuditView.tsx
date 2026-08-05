import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import type { SqAuditCellDto, SqAuditMatrixDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'

/**
 * PB2 ⓒ — SQ 심사 뷰 (29번 §11 신설 · 시각 정본 = 30번 목업 v2 하단부).
 * "심사자는 SQ 항목을 나열해 공정별 LOT 추적·기록 여부를 본다"(사장님 지시 8/4).
 * 셀 = 색+기호(●◐×)+라벨+셀배경 3중 표기 — 색만으로 말하지 않는다(CVD 문법).
 * 전부 실측: ● 창 내 가동일 전부 기록 · ◐ 일부 · × 공백(할 일 발행 대상) · — 비대상/원천 없음.
 * 갭 ＋행 = IATF 추가 요구(0135 'iatf-gap' 시드 — 조항 확장은 데이터 행 추가로만),
 * 클릭 = 보완 양식으로 직행. 8버튼 툴바는 관리자 문법(문법노트2차 §2) — 미가동 버튼은 흐림 정직.
 */

function shortYmd(ymd: string | null): string {
  return ymd && ymd.length >= 10 ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : ''
}

const MARK_CLS: Record<string, { td: string; ink: string }> = {
  '●': { td: 'bg-ok-tint/60', ink: 'text-ok-ink' },
  '◐': { td: 'bg-warn-tint/60', ink: 'text-warn-ink' },
  '×': { td: 'bg-bad-tint/60', ink: 'text-bad-ink' },
  '—': { td: '', ink: 'text-muted-foreground/50' }
}

function Cell({ cell, opDays }: { cell: SqAuditCellDto; opDays: number }): JSX.Element {
  const m = MARK_CLS[cell.mark] ?? MARK_CLS['—']
  const sub =
    cell.mark === '×'
      ? `최근 ${shortYmd(cell.lastYmd) || '—'}`
      : cell.mark === '◐'
        ? `${cell.days}/${opDays}일`
        : cell.mark === '●'
          ? shortYmd(cell.lastYmd)
          : ''
  return (
    <td className={cn('text-center py-2 px-2 border-b border-border/60 border-r border-r-border/30', m.td)}>
      <span className={cn('font-extrabold text-[14px]', m.ink)}>{cell.mark}</span>
      {sub && <span className="block text-[10.5px] text-muted-foreground">{sub}</span>}
    </td>
  )
}

export function SqAuditView(): JSX.Element {
  const { setPage, setSelectedFormCode } = useUIStore()
  const [data, setData] = useState<SqAuditMatrixDto | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async (): Promise<void> => {
    setLoading(true)
    try {
      const d = (await window.api.invoke(window.api.channels.SQ_AUDIT_MATRIX, {})) as SqAuditMatrixDto
      setData(d)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const openForm = (code: string): void => {
    setSelectedFormCode(code)
    setPage('form-builder')
  }

  const cols = data?.columns ?? []
  const dimBtn = 'px-3 py-1.5 rounded-lg border border-border bg-muted/40 text-[12px] text-muted-foreground/50 cursor-not-allowed'

  return (
    <div className="flex flex-col gap-3 break-keep">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[20px] font-extrabold tracking-[-0.02em]">SQ 심사 뷰</h1>
        <span className="text-[13px] text-muted-foreground">
          SQ 항목 × 공정 — 공정별 기록 여부(전부 실측 · 색+기호+라벨 3중 표기)
        </span>
      </div>

      {/* 8버튼 툴바 — 관리자 문법(문법노트2차 §2). 조회만 가동, 나머지는 후속(흐림 정직) */}
      <div className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-1.5 flex-wrap">
        <button type="button" className={dimBtn} disabled title="조회 전용 뷰 — 초기화 대상 없음">초기화</button>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg border border-primary/40 bg-secondary text-secondary-foreground text-[12px] font-bold flex items-center gap-1"
        >
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> 조회
        </button>
        {['추가', '저장', '삭제'].map((b) => (
          <button key={b} type="button" className={dimBtn} disabled title="조회 전용 뷰 — 기록은 각 양식·현장 화면에서">
            {b}
          </button>
        ))}
        {['엑셀', '인쇄'].map((b) => (
          <button key={b} type="button" className={dimBtn} disabled title="ⓔ 배치(엑셀형 그리드·출력)에서 가동">
            {b}
          </button>
        ))}
        <span className="ml-auto text-[12px] font-semibold bg-secondary text-secondary-foreground border border-primary/30 rounded-lg px-3 py-1.5">
          기간: {shortYmd(data?.windowStart ?? null) || '—'} ~ {shortYmd(data?.windowEnd ?? null) || '—'} · 가동일 {data?.opDays ?? 0}일
        </span>
      </div>

      {!data?.available && !loading && (
        <div className="rounded-lg px-3 py-2 text-[12.5px] bg-warn-tint text-warn-ink font-semibold">
          MES 사이드카 미가용 — 앱 작성 기록만으로 판정 중(정직 축소). 덤프 반입 시 자동 확장.
        </div>
      )}

      <div className="rounded-[14px] border border-border bg-card shadow-card overflow-x-auto">
        <table className="w-full text-[12.5px] border-collapse min-w-[860px]">
          <thead>
            <tr>
              <th className="text-left font-bold text-secondary-foreground bg-secondary/60 py-2.5 px-3.5 whitespace-nowrap">
                SQ 항목 (근거 양식)
              </th>
              {cols.map((c) => (
                <th key={c.key} className="text-center font-bold text-secondary-foreground bg-secondary/60 py-2.5 px-2 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.rows ?? []).map((r) =>
              r.gap ? (
                <tr key={r.formCode + r.iatfClause} className="bg-warn-tint/30">
                  <th className="text-left font-normal py-2 px-3.5 whitespace-nowrap border-b border-border/60">
                    <b className="text-warn-ink">＋{r.title}</b>{' '}
                    <button
                      type="button"
                      onClick={() => openForm(r.formCode)}
                      className="inline-block text-[11px] font-bold rounded-full px-2 py-[1px] bg-warn-tint text-warn-ink hover:underline"
                      title="보완 양식으로 이동"
                    >
                      MES 밖 — {r.formCode}로 보완
                    </button>
                  </th>
                  <td colSpan={cols.length} className="py-2 px-3 border-b border-border/60 text-[12px]">
                    <span className={cn('font-extrabold text-[14px] mr-2', r.overall?.mark === '●' ? 'text-ok-ink' : 'text-bad-ink')}>
                      {r.overall?.mark ?? '×'}
                    </span>
                    {r.overall && r.overall.count > 0
                      ? `창 내 작성 ${r.overall.count}건 · 최근 ${shortYmd(r.overall.lastYmd)}`
                      : '창 내 작성 기록 없음 — 공정축 분해는 현장 기록(PC 단계)부터'}
                  </td>
                </tr>
              ) : (
                <tr key={r.sqItem + r.formCode}>
                  <th className="text-left font-normal py-2 px-3.5 whitespace-nowrap border-b border-border/60 bg-muted/20">
                    <b className="text-primary">{r.sqItem}</b> {r.title}{' '}
                    <button
                      type="button"
                      onClick={() => openForm(r.formCode)}
                      className="text-[11.5px] text-muted-foreground hover:text-primary hover:underline"
                      title="근거 양식 열기"
                    >
                      ({r.formCode})
                    </button>
                    {r.iatfClause && (
                      <span className="ml-1 inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] bg-iatf-tint text-iatf-ink">
                        IATF {r.iatfClause}
                      </span>
                    )}
                  </th>
                  {cols.map((c) => (
                    <Cell key={c.key} cell={r.cells[c.key] ?? { mark: '—', lastYmd: null, days: 0 }} opDays={data?.opDays ?? 0} />
                  ))}
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[12px] text-muted-foreground">
        ● 창 내 가동일 전부 기록 · ◐ 일부(n/가동일) · × 공백(데이터 할 일 발행 대상) · — 비대상/원천 없음 ·
        ＋행 = IATF 추가 요구를 그 자리에 표기 — 기호·글자·셀배경 3중이라 누구에게나 보입니다.
        LOT 추적성(5_1) 공정축은 현장 기록 쓰기(PC 단계, lot_no 동반)부터 실측 표시.
      </p>
    </div>
  )
}
