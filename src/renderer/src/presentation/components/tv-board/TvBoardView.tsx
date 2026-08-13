import { useCallback, useEffect, useState } from 'react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import type { SemimesTvBoardDto } from '@shared/ipc-types'
import { useSeqGuard } from '../../lib/asyncGuard'
import { useUIStore } from '../../stores/uiStore'

/**
 * 35호 — 생산현황 전광판(TV현황판, 그림65 · 32호 §7-3 재상신 도장 8/13).
 * 5층 골격 예외 화면(표시 전용·쓰기 0) — AppShell 이 껍데기 없이 전체화면으로 띄운다.
 *
 * 그림65 문법: 검은 배경 · 도넛 = 달성률(생산÷지시, 100% 초과 그대로) · 내부 지시/수집/생산/불량 ·
 * 하단 품번·품명. 정직 계약: 수집(설비 자동수집) 원천 없음 = '—' · 지시 0/null = '—' ·
 * 가짜 라이브 점 대신 마지막 갱신 시각 실측 · limit 절단은 "+n건" 표기 · 실적 합 = 취소 제외(서버).
 * 다크 전용 = 판정 ④(TV 시인성 — 파스텔 예외 승인). 색+숫자 병기(CVD 문법 유지).
 */

const POLL_MS = 60_000 // 판정 ② — 60초

function pctOf(o: SemimesTvBoardDto['orders'][number]): number | null {
  return o.orderQty != null && o.orderQty > 0 ? Math.round((o.okSum / o.orderQty) * 100) : null
}

function Donut({ pct }: { pct: number | null }): JSX.Element {
  // 착색 = 달성률 구간(35호 §4-2): 100% 도달 = 녹색 · 진행 중 = 주황 — 링은 100% 에서 포화, 숫자는 그대로
  const fill = pct != null && pct >= 100 ? '#34d399' : '#f5a623'
  const ring = pct != null ? Math.min(pct, 100) : 0
  return (
    <div
      className="w-[150px] h-[150px] rounded-full mx-auto my-3 flex items-center justify-center"
      style={{
        background:
          pct != null ? `conic-gradient(${fill} 0 ${ring}%, #262626 ${ring}% 100%)` : '#262626'
      }}
      title={pct != null ? `달성률 = 생산 ÷ 지시 (100% 초과 그대로)` : '지시수량 미기입 — 달성률 계산 불가'}
    >
      <b
        className="w-[118px] h-[118px] rounded-full flex items-center justify-center text-[30px] font-extrabold tabular-nums bg-black"
        style={{ color: pct != null ? fill : '#525252' }}
      >
        {pct != null ? `${pct}%` : '—'}
      </b>
    </div>
  )
}

export function TvBoardView(): JSX.Element {
  const { goBack, setPage } = useUIStore()
  const [data, setData] = useState<SemimesTvBoardDto | null>(null)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const [failed, setFailed] = useState(false)
  const [fs, setFs] = useState(false)
  const seq = useSeqGuard()

  const load = useCallback(async (): Promise<void> => {
    const t = seq.begin()
    try {
      const d = (await window.api.invoke(window.api.channels.SEMIMES_TV_BOARD, {})) as SemimesTvBoardDto
      if (!seq.isCurrent(t)) return
      setData(d)
      setUpdatedAt(new Date())
      setFailed(false)
    } catch {
      // 통신 실패 — 직전 데이터·시각 유지(무언 갱신 금지), 배너로 정직 고지 + 다음 주기 재시도
      if (seq.isCurrent(t)) setFailed(true)
    }
  }, [seq])

  // 8/13 폭주 재봉합: useSeqGuard 가 동일 참조를 보장하게 되어 load 가 마운트 간 안정 —
  // 이 effect 는 마운트 1회 + 60초 간격만 발사한다(코워크 실측 초당 100건+ 재발사의 뿌리는
  // 훅의 매 렌더 새 객체 반환 — asyncGuard.ts 주석 참조). 검증 = F12 __invokeRate().
  useEffect(() => {
    void load()
    const timer = window.setInterval(() => void load(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [load])

  const exit = useCallback((): void => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined)
    if (!goBack()) setPage('home')
  }, [goBack, setPage])

  // ESC = 복귀(브라우저 전체화면 중이면 첫 ESC 는 전체화면 해제가 먹는다 — 자연 동선)
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && !document.fullscreenElement) exit()
    }
    const onFs = (): void => setFs(!!document.fullscreenElement)
    window.addEventListener('keydown', onKey)
    document.addEventListener('fullscreenchange', onFs)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('fullscreenchange', onFs)
    }
  }, [exit])

  const toggleFullscreen = (): void => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen()
      else void document.documentElement.requestFullscreen()
    } catch {
      /* 전체화면 미지원 환경 — 버튼만 무동작 */
    }
  }

  const cal = data?.calToday
  const orders = data?.orders ?? []
  const rest = data ? data.total - orders.length : 0

  return (
    <div data-testid="tv-board" className="h-screen w-screen bg-black text-white flex flex-col overflow-hidden break-keep">
      {/* 상단 줄 — 좌: 일자·조업 판정(실측) / 중: 타이틀 / 우: 갱신 시각·조작 */}
      <div className="shrink-0 grid grid-cols-3 items-center px-8 pt-5 pb-3">
        <div className="text-[17px] font-semibold text-neutral-300 tabular-nums">
          {data?.ymd ?? ''}
          <span className="ml-3" title="조업달력(0139) 실측 — 행 없는 날 = 미등록">
            {cal ? (
              <span className={cal.workType === '조업' ? 'text-emerald-400' : 'text-amber-400'}>
                {cal.workType}
                {cal.note ? ` · ${cal.note}` : ''}
              </span>
            ) : (
              <span className="text-neutral-500">조업달력 미등록 — '—'</span>
            )}
          </span>
        </div>
        <h1 className="text-center text-[44px] leading-none font-extrabold tracking-[0.06em]">생산현황</h1>
        <div className="flex items-center justify-end gap-3">
          <span className="text-[15px] text-neutral-400 tabular-nums" title="가짜 라이브 점 대신 실측 시각(35호 §3)">
            갱신 {updatedAt ? updatedAt.toLocaleTimeString('ko-KR', { hour12: false }) : '—'}
          </span>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={fs ? '전체화면 해제' : '전체화면(TV 설치 모드)'}
            className="h-9 w-9 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 flex items-center justify-center"
          >
            {fs ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={exit}
            title="닫기(ESC) — 이전 화면으로"
            className="h-9 w-9 rounded-lg border border-neutral-700 text-neutral-300 hover:bg-neutral-800 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {failed && (
        <div className="shrink-0 mx-8 mb-2 rounded-lg bg-red-950 border border-red-800 text-red-300 text-[14px] font-semibold px-4 py-2">
          통신 오류 — 마지막 성공 갱신분을 표시 중입니다. 60초 주기로 자동 재시도합니다.
        </div>
      )}

      {/* 본체 — 미완료(진행 우선) 작업지시별 도넛 그리드 */}
      <div className="flex-1 overflow-y-auto px-8 pb-6">
        {data && orders.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[22px] text-neutral-500">
            진행·대기 중인 작업지시가 없습니다 — 지시 등록은 작업지시관리 화면에서.
          </div>
        ) : (
          <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
            {orders.map((o) => {
              const pct = pctOf(o)
              const accent = pct != null && pct >= 100 ? '#34d399' : '#f5a623'
              return (
                <div key={o.orderNo} className="rounded-2xl bg-neutral-950 border border-neutral-800 px-4 pb-4 pt-3" style={{ borderTopColor: accent, borderTopWidth: 3 }}>
                  {/* 머리 = 품번(8/13 판정 — 그림65 "사람이 아는 이름이 머리" 취지 · 설비명 축은 v2).
                      지시번호는 그 밑에 작게 — 같은 품번 지시 여러 건의 구분자(추적 앵커)로 유지. */}
                  <div className="flex items-center justify-between gap-2">
                    <b className="text-[19px] font-extrabold truncate tabular-nums">{o.itemCode}</b>
                    <span
                      className={
                        'text-[12px] font-bold rounded-full px-2.5 py-[2px] shrink-0 ' +
                        (o.status === '진행' ? 'bg-emerald-950 text-emerald-400' : 'bg-neutral-800 text-neutral-400')
                      }
                    >
                      {o.status}
                    </span>
                  </div>
                  <div className="text-[12px] text-neutral-500 tabular-nums truncate" title="작업지시번호 — 실적·LOT 추적의 앵커">
                    {o.orderNo}
                  </div>
                  <Donut pct={pct} />
                  <div className="text-[15px] leading-[2] text-neutral-300">
                    <div>
                      지시 <i className="not-italic float-right font-bold text-white tabular-nums">{o.orderQty != null ? o.orderQty.toLocaleString() : '—'}</i>
                    </div>
                    <div title="설비 자동수집(POP) 원천 없음 — 정직 '—' (35호 §3)">
                      수집 <i className="not-italic float-right font-semibold text-neutral-600">—</i>
                    </div>
                    <div>
                      생산 <i className="not-italic float-right font-bold text-white tabular-nums">{o.okSum.toLocaleString()}</i>
                    </div>
                    <div>
                      불량{' '}
                      <i className={'not-italic float-right font-bold tabular-nums ' + (o.ngSum > 0 ? 'text-red-400' : 'text-white')}>
                        {o.ngSum.toLocaleString()}
                      </i>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-neutral-800 text-center">
                    <div className="text-[13.5px] text-neutral-400 truncate">{o.itemName ?? '—'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {rest > 0 && (
          <p className="mt-4 text-center text-[15px] text-neutral-500">
            외 {rest.toLocaleString()}건 — 화면 상한(24건) 밖 미완료 지시가 더 있습니다(절단 정직 표기).
          </p>
        )}
      </div>

      {/* 하단 한 줄 — 산식·정직 계약 명기(코워크 검수 동선) */}
      <div className="shrink-0 px-8 pb-3 text-[12.5px] text-neutral-600">
        달성률 = 생산 ÷ 지시(100% 초과 그대로 · 지시 미기입 = '—') · 실적 합 = 취소 제외 · 수집 = 설비 연동 원천 없음('—') · 60초 자동 갱신
      </div>
    </div>
  )
}
