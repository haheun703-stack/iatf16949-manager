import { useCallback, useEffect, useState } from 'react'
import { Activity, Loader2 } from 'lucide-react'
import type { MesRecordsCoverageDto, MesRecordsDetailDto, MesRecordsStatusDto } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell, KpiTile } from '../shared/dash/DashKit'

/**
 * MES 기록 현황 (7/20) — "하위코드 기록이 들어왔는지/비었는지"를 그대로 보여준다.
 * 템플릿 A(7/28): KPI 타일(기준일·평일 공백·누적) + 메인 카드 = 커버리지 스트립.
 * 데이터 = 사이드카 mes_records.db(QMS_SQC 헤더 240만 + MAC_DESC 22만 집계).
 * 커버리지 스트립: 기록 있는 날=채움 / 평일 공백=빨강(결측 후보) / 주말 공백=회색.
 * 데이터 기준일 이후는 판정하지 않음(새 덤프 반입 전 — 결측 아님, 정직 표기).
 */

const nf = (n: number): string => n.toLocaleString('ko-KR')

function isWeekend(ymd: string): boolean {
  const d = new Date(`${ymd}T00:00:00`).getDay()
  return d === 0 || d === 6
}

/** 'YYYY-MM-DD' 두 날짜 사이 일수(b-a). */
function daysBetweenYmd(a: string, b: string): number {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000)
}

export function MesRecordsView(): JSX.Element {
  const [status, setStatus] = useState<MesRecordsStatusDto | null>(null)
  const [coverage, setCoverage] = useState<MesRecordsCoverageDto | null>(null)
  const [detail, setDetail] = useState<MesRecordsDetailDto | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const openDetail = useCallback(async (key: string) => {
    setLoadingDetail(true)
    try {
      setDetail((await window.api.invoke(window.api.channels.MES_RECORDS_DETAIL, { key })) as MesRecordsDetailDto | null)
    } catch {
      setDetail(null)
    } finally {
      setLoadingDetail(false)
    }
  }, [])

  useEffect(() => {
    void (async () => {
      try {
        const st = (await window.api.invoke(window.api.channels.MES_RECORDS_STATUS)) as MesRecordsStatusDto
        setStatus(st)
        if (st.available) {
          const cov = (await window.api.invoke(window.api.channels.MES_RECORDS_COVERAGE, {
            days: 30
          })) as MesRecordsCoverageDto
          setCoverage(cov)
          // 규칙④ "말 없는 공백 금지" — 첫 스트립 상세를 자동으로 채운다(클릭 대기 공백 방지)
          if (cov.strips.length > 0) void openDetail(cov.strips[0].key)
        }
      } catch {
        setStatus(null)
      }
    })()
  }, [openDetail])

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-4 break-keep">
      <PageHeader
        icon={<Activity size={18} />}
        title="MES 기록 현황"
        sub="자주·수입·패트롤·설비점검 기록이 들어왔는지/비었는지 — 일자 × 품번(설비) 커버리지 실측"
        actions={
          status?.available ? (
            <span className="text-[12.5px] text-muted-foreground text-right leading-snug">
              원천 <b className="text-foreground">{status.sourceDmp ?? '—'}</b>
              <span className="block">
                데이터 기준일 <b className="text-foreground tabular-nums">{status.dataEndYmd ?? '—'}</b> · 빌드{' '}
                {status.builtAt?.replace('T', ' ') ?? '—'}
              </span>
            </span>
          ) : undefined
        }
      />

      {status && !status.available && (
        <div className="bg-card border border-border rounded-xl px-6 py-5 space-y-2">
          <div className="text-[15.5px] font-bold text-foreground">기록 데이터가 아직 없습니다</div>
          <p className="text-[13.5px] text-muted-foreground leading-relaxed">
            MES 덤프에서 커버리지 사이드카를 먼저 생성하세요(관리자 1회 작업, 주기적 dmp 반입 시 재실행):
            <code className="block mt-1.5 text-[12.5px] bg-muted rounded px-2 py-1.5 select-all">
              python scripts/mes_records_build.py &lt;dmp&gt; &lt;tables.json&gt; &quot;{status.path}&quot;
            </code>
          </p>
        </div>
      )}

      {status?.available && (
        <>
          {/* ── KPI 스탯 타일 (템플릿 A §3-1 — 상태·기준일·결측을 숫자로) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {(() => {
              const behind = status.dataEndYmd ? daysBetweenYmd(status.dataEndYmd, today) : null
              const totalItems = status.types.reduce((a, t) => a + t.totalItems, 0)
              const emptySum = coverage
                ? coverage.strips.reduce(
                    (a, s) => a + s.cells.filter((c) => c.items === 0 && !isWeekend(c.ymd)).length,
                    0
                  )
                : null
              return (
                <>
                  <KpiTile
                    icon="◷" iconTint={behind != null && behind >= 7 ? 'bg-warn-tint text-warn-ink' : 'bg-secondary text-primary'}
                    label="데이터 기준일" value={status.dataEndYmd ?? '—'}
                    chip={behind == null ? '—' : behind >= 7 ? `오늘 대비 ${behind}일 지남 — 다운로드 필요` : `오늘 대비 ${behind}일 전`}
                    chipTone={behind != null && behind >= 7 ? 'dn' : 'fx'}
                  />
                  <KpiTile
                    icon="!" iconTint="bg-bad-tint text-bad-ink" label="평일 공백 (최근 30일)"
                    value={emptySum == null ? '—' : emptySum} unit={emptySum == null ? undefined : '일'}
                    chip="결측 후보 — 스트립 행에서 확인"
                    chipTone={emptySum != null && emptySum > 0 ? 'dn' : 'up'}
                  />
                  <KpiTile
                    icon="▤" iconTint="bg-ok-tint text-ok-ink" label="누적 기록"
                    value={nf(totalItems)} unit="건" chip="전 종류 합계 (읽기전용 실측)" chipTone="fx"
                  />
                  <KpiTile
                    icon="⚙" iconTint="bg-data-tint text-data-ink" label="기록 종류"
                    value={status.types.length} unit="종" chip="자주·수입·패트롤·설비점검" chipTone="fx"
                  />
                </>
              )
            })()}
          </div>

          {status.dataEndYmd && status.dataEndYmd < today && (
            <div className="bg-warn-tint border border-[#F5D9A8] rounded-[14px] px-5 py-3 text-[13.5px] text-warn-ink leading-relaxed">
              데이터 기준일이 <b className="tabular-nums">{status.dataEndYmd}</b> 입니다 — 그 이후 날짜는 결측이
              아니라 <b>새 덤프 반입 전</b>이라 판정하지 않습니다. 새 덤프를 받으면 빌드 스크립트 재실행만으로
              갱신됩니다(앱 재시작 불필요).
            </div>
          )}

          {/* 메인 카드 — 종류별 커버리지 스트립(최근 30일, 데이터 기준일 종료) */}
          <CardShell
            title={`기록 커버리지 — 최근 ${coverage?.days ?? 30}일`}
            cap="■ 기록 있음 · □ 평일 공백(결측 후보) · 회색 = 주말 공백 · 행 클릭 = 상세"
            status={coverage ? 'ready' : 'loading'}
          >
            {!coverage ? (
              <div className="flex items-center justify-center gap-2 py-12 text-[14px] text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> 집계 중...
              </div>
            ) : (
              <div className="mt-2">
              {coverage.strips.map((s) => {
                const typeStat = status.types.find((t) => t.key === s.key)
                const emptyWeekdays = s.cells.filter((c) => c.items === 0 && !isWeekend(c.ymd)).length
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => void openDetail(s.key)}
                    className={cn(
                      'w-full flex items-center gap-4 px-6 py-3.5 border-t border-border first:border-t-0 text-left hover:bg-muted/40 transition-colors',
                      detail?.key === s.key && 'bg-primary/5'
                    )}
                  >
                    <span className="w-44 shrink-0">
                      <span className="block text-[14.5px] font-bold text-foreground">{s.label}</span>
                      <span className="block text-[12px] text-muted-foreground tabular-nums">
                        누적 {nf(typeStat?.totalItems ?? 0)}건
                        {emptyWeekdays > 0 && (
                          <b className="text-bad-ink"> · 평일 공백 {emptyWeekdays}일</b>
                        )}
                      </span>
                    </span>
                    <span className="flex items-end gap-[3px] flex-1 min-w-0 overflow-x-auto py-0.5">
                      {s.cells.map((c) => {
                        const wknd = isWeekend(c.ymd)
                        return (
                          <span
                            key={c.ymd}
                            title={`${c.ymd} — ${c.items > 0 ? `${nf(c.items)}건 · ${c.parts}개 ${s.key === 'MAC' ? '설비' : '품번'}` : wknd ? '주말 · 기록 없음' : '기록 없음(결측 후보)'}`}
                            className={cn(
                              'w-[13px] h-7 rounded-[3px] shrink-0',
                              c.items > 0 ? 'bg-primary/75' : wknd ? 'bg-muted' : 'bg-bad-tint border border-bad-ink/30'
                            )}
                          />
                        )
                      })}
                    </span>
                  </button>
                )
              })}
              </div>
            )}
          </CardShell>

          {/* 상세 — 품번/설비별 최근 기록 (미기록 경과 순) + 일자별 */}
          {loadingDetail && (
            <div className="flex items-center justify-center gap-2 py-10 text-[14px] text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> 상세 집계 중...
            </div>
          )}
          {!loadingDetail && detail && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <CardShell
                title={`${detail.label} — ${detail.key === 'MAC' ? '설비별' : '품번별'} 최근 기록`}
                cap={`미기록 경과일 큰 순 — 기록이 끊긴 ${detail.key === 'MAC' ? '설비' : '품번'}이 위로`}
              >
                <div className="max-h-[420px] overflow-y-auto mt-2">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="px-5 py-2 font-semibold">{detail.key === 'MAC' ? '설비' : '품번'}</th>
                        <th className="px-2 py-2 font-semibold text-right">최근 기록</th>
                        <th className="px-2 py-2 font-semibold text-right">경과</th>
                        <th className="px-2 py-2 font-semibold text-right">기록일수</th>
                        <th className="px-5 py-2 font-semibold text-right">누적건</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.rows.map((r) => (
                        <tr key={r.pno} className="border-b border-border/60 last:border-b-0">
                          <td className="px-5 py-2">
                            <span className="font-bold text-foreground tabular-nums">{r.pno}</span>
                            {r.name && <span className="block text-[11.5px] text-muted-foreground truncate max-w-[220px]">{r.name}</span>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{r.lastYmd ?? '—'}</td>
                          <td className={cn('px-2 py-2 text-right tabular-nums font-bold', r.staleDays > 30 ? 'text-bad-ink' : r.staleDays > 7 ? 'text-warn-ink' : 'text-foreground')}>
                            {r.staleDays}일
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{nf(r.activeDays)}</td>
                          <td className="px-5 py-2 text-right tabular-nums text-muted-foreground">{nf(r.totalItems)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardShell>

              <CardShell
                title={`${detail.label} — 일자별 (최근 30일)`}
                cap={`기록 있는 날만 표시${detail.key === 'MAC' ? ' · 확인율 = 확인자(CONFIRMOR) 기입 비율' : ''}`}
              >
                <div className="max-h-[420px] overflow-y-auto mt-2">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-card">
                      <tr className="text-left text-muted-foreground border-b border-border">
                        <th className="px-5 py-2 font-semibold">일자</th>
                        <th className="px-2 py-2 font-semibold text-right">기록건</th>
                        <th className="px-2 py-2 font-semibold text-right">{detail.key === 'MAC' ? '설비' : '품번'}수</th>
                        <th className="px-2 py-2 font-semibold text-right">{detail.key === 'MAC' ? '점검자' : '검사자'}</th>
                        {detail.key === 'MAC' && <th className="px-5 py-2 font-semibold text-right">확인율</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {detail.recent.map((r) => (
                        <tr key={r.ymd} className="border-b border-border/60 last:border-b-0">
                          <td className="px-5 py-2 tabular-nums font-semibold text-foreground">
                            {r.ymd}
                            {isWeekend(r.ymd) && <span className="text-[11px] text-muted-foreground"> (주말)</span>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{nf(r.items)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{nf(r.parts)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">{nf(r.inspectors)}</td>
                          {detail.key === 'MAC' && (
                            <td className={cn('px-5 py-2 text-right tabular-nums font-bold', (r.confirmedPct ?? 100) < 80 ? 'text-bad-ink' : 'text-foreground')}>
                              {r.confirmedPct != null ? `${r.confirmedPct}%` : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardShell>
            </div>
          )}

          <p className="text-[13px] text-muted-foreground leading-relaxed">
            원천: MES(TSPMES) 검사 헤더(QMS_SQC)·설비점검(MAC_DESC) 실측 집계 — 읽기전용. 검사구분·설비 이름은
            MES 하위코드(0076 mes_codes)로 해석합니다. ⚠️출하검사(O)는 MES에 기록이 없습니다(별도 수기 관리) —
            정직 표기 원칙에 따라 목록에 표시하지 않습니다.
            {status.futureRows > 0 && (
              <> ⚠️미래 일자로 잘못 입력된 기록 {nf(status.futureRows)}건은 커버리지에서 제외했습니다(MES 입력 오류
              추정 — 품질팀 확인 대상).</>
            )}
          </p>
        </>
      )}
    </div>
  )
}
