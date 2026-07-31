import { useEffect, useState } from 'react'
import type { MesProcessLiveDto } from '@shared/ipc-types'
import { CardShell } from '../shared/dash/DashKit'
import { cn } from '../../../lib/utils'

/**
 * P1 ⓑ 공정 실황 행렬 — 동아式 문법(행=지표·열=공정), 1단계 = 기록 커버리지(25번 §3).
 * 열 = 실측 7공정(WRKCTR 전수 판독 — 목업 각주 "공정은 실측" 이행): 수입검사·절단성형·
 * 밴딩·용접가접·브레이징·조립압입·리크. 포장·출하는 MES 원천 없음 — 원천 생기면 추가.
 * 행 정직 조정 2(검수요청 소견): 수량(EA)→검사 항목(측정치 수 — 생산수량 원천 없음),
 * 불량(건)→'—'(원천 없음 — 2단계 MES 연동 시). 사진 증빙 = P3 수집함 전 '—'(R3).
 * 달성률 표시 없음 — 커버리지 모드(가짜 숫자 금지).
 */

function shortYmd(ymd: string | null): string {
  return ymd && ymd.length >= 10 ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : '—'
}

export function ProcessLiveMatrix(): JSX.Element {
  const [data, setData] = useState<MesProcessLiveDto | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    void (async () => {
      try {
        const d = (await window.api.invoke(window.api.channels.MES_RECORDS_PROCESS_LIVE, {})) as MesProcessLiveDto
        setData(d)
        setStatus('ready')
      } catch {
        setStatus('error')
      }
    })()
  }, [])

  const cols = data?.columns ?? []
  const staleBand = data?.available && data.dataEndYmd && data.ymd > data.dataEndYmd

  return (
    <CardShell
      title="공정 실황 — 기록 커버리지"
      cap={
        data?.available
          ? `오늘 ${shortYmd(data.ymd)} · MES 기준 ${shortYmd(data.dataEndYmd)}${staleBand ? ' (미반입 구간 — 회색은 데이터 없음이지 미기록 아님)' : ''}`
          : 'MES 사이드카 미가용 — 앱 작성 기록만 표시'
      }
      status={status}
      data-testid="process-live-matrix"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px] border-separate border-spacing-0 min-w-[760px]">
          <thead>
            <tr>
              <th className="text-left font-bold text-muted-foreground py-1.5 pr-3 whitespace-nowrap w-[110px]">
                지표 ＼ 공정
              </th>
              {cols.map((c) => (
                <th key={c.key} className="text-center font-bold py-1.5 px-2 whitespace-nowrap">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="rowlb font-semibold text-muted-foreground py-1.5 pr-3">오늘 기록</td>
              {cols.map((c) => (
                <td key={c.key} className={cn('text-center py-1.5 px-2 font-bold', c.todayRecords === 0 && 'text-muted-foreground/60')}>
                  {c.todayRecords}
                  <small className="font-medium text-muted-foreground">건</small>
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">검사 항목</td>
              {cols.map((c) => (
                <td key={c.key} className={cn('text-center py-1.5 px-2', c.todayItems === 0 && 'text-muted-foreground/60')}>
                  {c.todayItems > 0 ? c.todayItems.toLocaleString() : '—'}
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">사진 증빙</td>
              {cols.map((c) => (
                <td key={c.key} className="text-center py-1.5 px-2 text-muted-foreground/60" title="④ 수집함(P3) 가동 시 자동 채움">
                  —
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">최근 기록</td>
              {cols.map((c) => (
                <td key={c.key} className="text-center py-1.5 px-2 text-muted-foreground">
                  {shortYmd(c.lastYmd)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">상태</td>
              {cols.map((c) => (
                <td key={c.key} className="text-center py-1.5 px-2">
                  {c.status === 'active' ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-ok-tint text-ok-ink font-bold whitespace-nowrap">● 기록중</span>
                  ) : c.status === 'gap' ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-bad-tint text-bad-ink font-bold whitespace-nowrap">
                      ✕ 공백 {c.gapDays}일
                    </span>
                  ) : c.status === 'stale' ? (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold whitespace-nowrap" title="덤프 미반입 구간 — 데이터 없음이지 미기록 아님">
                      미반입
                    </span>
                  ) : (
                    <span className="inline-block px-2 py-0.5 rounded-md bg-muted text-muted-foreground/70 font-semibold whitespace-nowrap">— 원천 없음</span>
                  )}
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">불량</td>
              {cols.map((c) => (
                <td key={c.key} className="text-center py-1.5 px-2 text-muted-foreground/60" title="MES 판정 연동(2단계) 시 표시 — 현 덤프 집계에 불량 항목 없음">
                  —
                </td>
              ))}
            </tr>
            <tr>
              <td className="font-semibold text-muted-foreground py-1.5 pr-3">원천</td>
              {cols.map((c) => (
                <td key={c.key} className="text-center py-1.5 px-2 text-[11.5px] text-muted-foreground whitespace-nowrap">
                  {c.source}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11.5px] text-muted-foreground">
        <span>● 기록중 = 기준일 입력 있음</span>
        <span>✕ 공백 = 데이터 있는 기간인데 기록 없음</span>
        <span>미반입 = 덤프가 기준일까지 안 옴(회색 — 미기록 아님)</span>
        <span className="ml-auto">※ 2단계(MES 작업지시 연동): 계획·목표·달성률 행 추가 — 동아式 완성</span>
      </div>
    </CardShell>
  )
}
