import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import type { MesPartProcessDto } from '@shared/ipc-types'
import { CardShell } from '../shared/dash/DashKit'
import { cn } from '../../../lib/utils'
import { useHeatColors } from '../../hooks/useHeatColors'

/**
 * P1 ⓒ 품번×공정 매트릭스 — 행 = 품번(월 수불량 SO 상위, R1 실측 정렬 260730),
 * 열 = 실측 7공정(ⓑ와 동일 매핑). 셀 = 기준일 검사 항목 수(● N) / 과거만 있으면 최근
 * 기록일(흐림) / 기록 없음 '·'. 끝열 = 기준월 SO 수량(정렬 근거 그대로 노출 — 가짜 숫자
 * 금지: 진행 LOT 표기는 lot_registry 가동(P3/M1) 후 추가).
 * PB2 ⓔ(4차 노트): ★중점관리 별(관심종목 이식 — localStorage, 별 행 상단 고정) +
 * 수불 열 파스텔 히트맵(농도 = 크기 — 부호 없음·단색, 색상 ON/OFF 토글 공용).
 */

function shortYmd(ymd: string | null): string {
  return ymd && ymd.length >= 10 ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : '—'
}

/** ★중점관리 품번 — 회사 DB 미혼입(개인화, activeUser 선례) */
const STAR_KEY = 'ui.starPnos'
function readStars(): Set<string> {
  try {
    const raw = localStorage.getItem(STAR_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : null
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

export function PartProcessMatrix(): JSX.Element {
  const [data, setData] = useState<MesPartProcessDto | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [stars, setStars] = useState<Set<string>>(readStars)
  const [colors] = useHeatColors()

  const toggleStar = (pno: string): void => {
    setStars((prev) => {
      const next = new Set(prev)
      if (next.has(pno)) next.delete(pno)
      else next.add(pno)
      try {
        localStorage.setItem(STAR_KEY, JSON.stringify([...next]))
      } catch {
        /* 저장 실패 — 메모리 상태로 계속 */
      }
      return next
    })
  }

  useEffect(() => {
    void (async () => {
      try {
        const d = (await window.api.invoke(window.api.channels.MES_RECORDS_PART_PROCESS, {
          limit: 8
        })) as MesPartProcessDto
        setData(d)
        setStatus('ready')
      } catch {
        setStatus('error')
      }
    })()
  }, [])

  const cols = data?.columns ?? []
  return (
    <CardShell
      title="품번 × 공정 실황"
      cap={
        data?.available
          ? data.subulMonth
            ? `월 수불량(SO) 상위 — 기준월 ${data.subulMonth} · MES 기준 ${shortYmd(data.dataEndYmd)}`
            : '수불 집계 없음(구 사이드카) — 새 덤프 반입 후 재빌드 시 정렬 활성'
          : 'MES 사이드카 미가용'
      }
      status={status}
      data-testid="part-process-matrix"
    >
      {data && data.rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px] border-separate border-spacing-0 min-w-[820px]">
            <thead>
              <tr>
                <th className="text-left font-bold text-muted-foreground py-1.5 pr-3 whitespace-nowrap">
                  품번 (월 수불량 순)
                </th>
                {cols.map((c) => (
                  <th key={c.key} className="text-center font-bold py-1.5 px-1.5 whitespace-nowrap">
                    {c.label}
                  </th>
                ))}
                <th className="text-right font-bold text-muted-foreground py-1.5 pl-2 whitespace-nowrap">
                  월 수불량(SO)
                </th>
              </tr>
            </thead>
            <tbody>
              {[...data.rows]
                .sort((a, b) => Number(stars.has(b.pno)) - Number(stars.has(a.pno)))
                .map((row) => (
                <tr key={row.pno} className={cn(stars.has(row.pno) && colors && 'bg-warn-tint/20')}>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => toggleStar(row.pno)}
                      title={stars.has(row.pno) ? '중점관리 해제' : '중점관리 지정(★ — 상단 고정)'}
                      className="mr-1 align-middle"
                    >
                      <Star
                        className={cn(
                          'w-3.5 h-3.5 inline',
                          stars.has(row.pno) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'
                        )}
                      />
                    </button>
                    <span className="font-bold">{row.pno}</span>
                    {row.pname ? (
                      <span className="block text-[11px] text-muted-foreground truncate max-w-[180px] pl-5">{row.pname}</span>
                    ) : null}
                  </td>
                  {cols.map((c) => {
                    const cell = row.cells[c.key]
                    return (
                      <td key={c.key} className="text-center py-1.5 px-1.5 whitespace-nowrap">
                        {cell && cell.today > 0 ? (
                          <span className="inline-block px-1.5 py-0.5 rounded-md bg-ok-tint text-ok-ink font-bold">
                            ● {cell.today}
                          </span>
                        ) : cell?.lastYmd ? (
                          <span className="text-muted-foreground/70" title="마지막 기록일">
                            {shortYmd(cell.lastYmd)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground/40">·</span>
                        )}
                      </td>
                    )
                  })}
                  {/* 수불 열 파스텔 히트맵(4차 §1 — 농도 = 크기. 부호 축 아님 → 하늘 단색) */}
                  <td
                    className="text-right py-1.5 pl-2 pr-2 font-bold whitespace-nowrap tabular-nums"
                    style={
                      colors && data.rows.length > 0
                        ? {
                            backgroundColor: `rgba(36, 103, 179, ${(
                              0.05 +
                              0.25 * (row.monthQty / Math.max(...data.rows.map((r) => r.monthQty), 1))
                            ).toFixed(3)})`
                          }
                        : undefined
                    }
                  >
                    {row.monthQty.toLocaleString()}
                    <small className="font-medium text-muted-foreground"> EA</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-[13px] text-muted-foreground">
          수불 정렬 데이터 없음 — 새 덤프 반입·재빌드 후 표시됩니다(가짜 순위 없음)
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11.5px] text-muted-foreground">
        <span>● N = 기준일 검사 항목 수</span>
        <span>날짜 = 마지막 기록일(기준일 기록 없음)</span>
        <span>· = 기록 이력 없음</span>
        <span className="ml-auto">※ 진행 LOT 표기는 LOT 대장(M1/P3) 가동 후 추가</span>
      </div>
    </CardShell>
  )
}
