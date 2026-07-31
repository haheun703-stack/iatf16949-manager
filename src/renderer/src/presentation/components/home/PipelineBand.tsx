import { Database, Download, GitBranch, Inbox, ListChecks } from 'lucide-react'
import type { MesRecordsStatusDto, SemimesSummaryDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'

/**
 * P1 ⓐ 데이터 파이프라인 밴드 (25번 지시서 §3 P1, 0125 트랙 260731).
 * 관제탑 최상단 스트립 — "데이터가 TODO를 만든다" 축의 수도꼭지 상태 한 줄:
 *   [MES 수신] 덤프 신선도 신호등(가짜 숫자 금지 — 미가용/지남 정직 표기)
 *   [기준정보] 품목·간선·라우팅·공정 4종(semimes:summary — M0 실적재 수치)
 *   [오늘 수신] 검사계열별 마지막 수신일(데이터 끝 기준 — '오늘' 아님이면 그대로 노출)
 *   [데이터 할 일] 트리거 이슈·장기 공백 집계(보드의 [데이터] 배지 총량)
 * 채널 신규 0 — 기존 mesRecords:status·semimes:summary·보드 파생 수치 재사용(견적 ⓐ).
 */

function shortYmd(ymd: string): string {
  return ymd.length >= 10 ? `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}` : ymd
}

function Cluster({
  icon,
  label,
  onClick,
  children,
  title
}: {
  icon: React.ReactNode
  label: string
  onClick?: () => void
  children: React.ReactNode
  title?: string
}): JSX.Element {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center gap-2.5 min-w-0 px-3.5 py-2 rounded-xl border border-border bg-card text-left',
        onClick && 'hover:bg-secondary/60 transition-colors cursor-pointer'
      )}
    >
      <span className="shrink-0 w-7 h-7 rounded-lg bg-secondary text-primary flex items-center justify-center">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-bold text-muted-foreground leading-tight">{label}</span>
        <span className="block text-[12.5px] font-semibold leading-tight truncate">{children}</span>
      </span>
    </Tag>
  )
}

export function PipelineBand({
  mes,
  semimes,
  dataTodo,
  boardDate,
  onOpenMes,
  onOpenTree,
  onOpenBoard
}: {
  mes: MesRecordsStatusDto | null
  semimes: SemimesSummaryDto | null
  /** 보드 파생 — 미완 트리거 이슈 + 장기 공백(gapCount) 합 */
  dataTodo: number
  boardDate: string
  onOpenMes: () => void
  onOpenTree: () => void
  onOpenBoard: () => void
}): JSX.Element {
  // 신선도 신호등: 미가용=회색 · 0~1일=초록 · 2~6일=앰버 · 7일+=빨강(다운로드 필요)
  const behind =
    mes?.available && mes.dataEndYmd
      ? Math.round(
          (new Date(`${boardDate}T00:00:00`).getTime() - new Date(`${mes.dataEndYmd}T00:00:00`).getTime()) / 86400000
        )
      : null
  const light =
    behind == null ? 'bg-muted-foreground/40' : behind <= 1 ? 'bg-ok-ink' : behind <= 6 ? 'bg-warn-ink' : 'bg-bad-ink'

  return (
    <div className="flex items-stretch gap-2.5 flex-wrap" data-testid="pipeline-band">
      <Cluster
        icon={<Download className="w-4 h-4" />}
        label="MES 수신"
        onClick={onOpenMes}
        title="MES 기록 현황 보기"
      >
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full shrink-0', light)} />
          {mes?.available && mes.dataEndYmd ? (
            behind != null && behind >= 7 ? (
              <span className="text-bad-ink">{behind}일 지남 — 다운로드 필요</span>
            ) : (
              <>기준 {shortYmd(mes.dataEndYmd)}{behind != null && behind > 0 ? ` (${behind}일 전)` : ' (최신)'}</>
            )
          ) : (
            '덤프 미반입'
          )}
        </span>
      </Cluster>
      <Cluster
        icon={<GitBranch className="w-4 h-4" />}
        label="기준정보"
        onClick={onOpenTree}
        title="품번 트리 보기"
      >
        {semimes
          ? `품목 ${semimes.items.toLocaleString()} · 간선 ${semimes.edgesActive.toLocaleString()} · 라우팅 ${semimes.routingSteps.toLocaleString()} · 공정 ${semimes.processes}`
          : '적재 없음'}
      </Cluster>
      <Cluster icon={<Inbox className="w-4 h-4" />} label="오늘 수신" onClick={onOpenMes} title="검사계열별 마지막 수신일">
        {mes?.available && mes.types.length > 0
          ? mes.types
              .slice(0, 4)
              .map((t) => `${t.label} ${t.lastYmd ? shortYmd(t.lastYmd) : '—'}`)
              .join(' · ')
          : '수신 이력 없음'}
      </Cluster>
      <Cluster
        icon={<ListChecks className="w-4 h-4" />}
        label="데이터 할 일"
        onClick={onOpenBoard}
        title="보드의 [데이터] 배지 업무로 이동"
      >
        {dataTodo > 0 ? (
          <span className="text-warn-ink">{dataTodo}건 — 보드에서 처리</span>
        ) : (
          '공백 신호 없음'
        )}
      </Cluster>
      {mes?.available && mes.futureRows > 0 ? (
        <Cluster icon={<Database className="w-4 h-4" />} label="정합 신호" title="미래 일자 오입력 행 — 빌드에서 제외됨(정직 표기)">
          미래 일자 {mes.futureRows}행 제외
        </Cluster>
      ) : null}
    </div>
  )
}
