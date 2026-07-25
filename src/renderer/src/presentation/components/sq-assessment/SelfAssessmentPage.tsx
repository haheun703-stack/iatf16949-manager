import { useCallback, useEffect, useState } from 'react'
import { Loader2, Play, FileSpreadsheet, Stamp, CheckCheck, BadgeCheck, ShieldCheck } from 'lucide-react'
import type { SqAssessmentDto, SqAssessmentLineDto, SqSuggestedState, CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'

/**
 * SQ 자체평가 (코워크 07 Phase B) — 실행 → 42항목 사람 확정 → 점수·등급 → 리포트 출력.
 * 제안값(프로그램)은 참고, 확정은 사람만(A레일). 일부미흡 이하 확정 시
 * 관찰사항에 [대책수립 요청] 자동 삽입(수정 가능). 이 기록 자체가 SQ 6_4 증빙.
 * 템플릿 C: 좌 6영역 목록 380px / 우 영역별 확정 테이블·미선택 시 세션 요약+액션 스택.
 */

const STATES: SqSuggestedState[] = ['우수', '양호', '보완', '일부미흡', '다수미흡', '미관리', '미해당']
const NEEDS_ACTION = new Set<SqSuggestedState>(['일부미흡', '다수미흡', '미관리'])
const AREA_ORDER = ['생산조건관리', '검사시험', '설비관리', '금형관리', '자재관리', '품질경영체제']

const PILL: Record<string, { bg: string; fg: string }> = {
  우수: { bg: '#dcf5dc', fg: '#0a5c0a' },
  양호: { bg: '#e2f3e2', fg: '#1d6b1d' },
  보완: { bg: '#faeeda', fg: '#7a4d05' },
  일부미흡: { bg: '#fcebeb', fg: '#a32d2d' },
  다수미흡: { bg: '#fcebeb', fg: '#8a1f1f' },
  미관리: { bg: '#f3d1d1', fg: '#7a1515' },
  미해당: { bg: '#edf3fa', fg: '#5c7288' }
}

export function SelfAssessmentPage(): JSX.Element {
  const [data, setData] = useState<SqAssessmentDto | null | 'none'>(null)
  const [area, setArea] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [author, setAuthor] = useState('')

  const load = useCallback(async (id?: string): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.SQ_ASSESS_GET, id ? { id } : {})) as SqAssessmentDto | null
      setData(res ?? 'none')
    } catch {
      setData('none')
    }
  }, [])

  useEffect(() => {
    void load()
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        setAuthor(p?.defaultAuthor || '')
      } catch {
        /* noop */
      }
    })()
  }, [load])

  const run = async (): Promise<void> => {
    setRunning(true)
    setNotice(null)
    try {
      const res = (await window.api.invoke(window.api.channels.SQ_ASSESS_RUN)) as {
        success: boolean
        id?: string
        error?: string
      }
      if (res.success && res.id) {
        setNotice(`새 자체평가 세션 ${res.id} 생성 — 42항목 제안값이 채워졌습니다. 확정은 사람이 합니다.`)
        setArea(null)
        await load(res.id)
      } else setNotice(`실행 실패: ${res.error ?? '알 수 없음'}`)
    } finally {
      setRunning(false)
    }
  }

  const patchLine = async (line: SqAssessmentLineDto, patch: Partial<SqAssessmentLineDto>): Promise<void> => {
    if (data == null || data === 'none') return
    // 일부미흡 이하 확정 시 관찰사항 자동 문구 (07번 — 수정 가능)
    let observation = 'observation' in patch ? (patch.observation ?? null) : line.observation
    if (patch.finalState && NEEDS_ACTION.has(patch.finalState) && !(observation ?? '').trim()) {
      observation = '[대책수립 요청] '
      patch = { ...patch, observation }
    }
    const nextLines = data.lines.map((l) => (l.itemCode === line.itemCode ? { ...l, ...patch } : l))
    setData({
      ...data,
      lines: nextLines,
      confirmedCount: nextLines.filter((l) => l.finalState != null).length,
      totalScore: 'finalState' in patch ? null : data.totalScore,
      grade: 'finalState' in patch ? null : data.grade
    })
    try {
      await window.api.invoke(window.api.channels.SQ_ASSESS_CONFIRM, {
        assessmentId: data.id,
        itemCode: line.itemCode,
        ...('finalState' in patch ? { finalState: patch.finalState ?? null } : {}),
        ...('observation' in patch ? { observation: patch.observation ?? null } : {}),
        ...('extraFinding' in patch ? { extraFinding: patch.extraFinding ?? null } : {})
      })
    } catch {
      /* 다음 로드에서 서버 상태로 복원 */
    }
  }

  const saveMeta = async (patch: Record<string, unknown>): Promise<void> => {
    if (data == null || data === 'none') return
    setData({ ...data, ...patch } as SqAssessmentDto)
    try {
      await window.api.invoke(window.api.channels.SQ_ASSESS_META, { assessmentId: data.id, ...patch })
    } catch {
      /* noop */
    }
  }

  const bulkAdopt = async (): Promise<void> => {
    if (data == null || data === 'none') return
    const remaining = data.lines.filter((l) => l.finalState == null)
    if (remaining.length === 0) return
    if (!confirm(`남은 ${remaining.length}개 항목을 제안값 그대로 확정할까요?\n(확정 후에도 항목별로 수정할 수 있습니다)`)) return
    for (const l of remaining) {
      // eslint-disable-next-line no-await-in-loop
      await patchLine(l, { finalState: l.suggestedState ?? '미관리' })
    }
    await load(data.id)
  }

  const finalize = async (): Promise<void> => {
    if (data == null || data === 'none') return
    setFinalizing(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SQ_ASSESS_FINALIZE, { assessmentId: data.id })) as {
        success: boolean
        totalScore?: number
        grade?: string
        remaining?: number
      }
      if (res.success) {
        setNotice(`점수 확정: ${res.totalScore}점 · ${res.grade} — 이제 리포트를 출력할 수 있습니다.`)
        await load(data.id)
      } else setNotice(`미확정 ${res.remaining ?? '?'}건 — 전 항목 확정 후 점수를 계산합니다.`)
    } finally {
      setFinalizing(false)
    }
  }

  const exportReport = async (): Promise<void> => {
    if (data == null || data === 'none') return
    setExporting(true)
    try {
      const res = (await window.api.invoke(window.api.channels.SQ_ASSESS_EXPORT, { assessmentId: data.id })) as {
        success: boolean
        filePath?: string
        canceled?: boolean
        validationsPreserved?: boolean
        error?: string
      }
      if (res.success) {
        setNotice(
          `리포트 저장: ${res.filePath}${res.validationsPreserved ? ' · 드롭다운 보존 확인' : ' · ⚠️드롭다운 보존 미확인'}`
        )
        await load(data.id)
      } else if (!res.canceled) setNotice(`출력 실패: ${res.error ?? '알 수 없음'}`)
    } finally {
      setExporting(false)
    }
  }

  if (data == null) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 자체평가 불러오는 중...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-0 break-keep">
      <div className="shrink-0">
        <PageHeader
          icon={<ShieldCheck className="w-5 h-5" />}
          title="SQ 자체평가"
          sub="42항목 확정 → 점수·등급 → 내부 리포트 출력 — 이 기록이 SQ 6_4(자체 내부심사) 증빙이 됩니다"
          actions={
            <button
              type="button"
              onClick={() => void run()}
              disabled={running}
              className="h-9 px-4 rounded-lg text-[13px] font-bold bg-primary text-primary-foreground hover:brightness-95 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              새 자체평가 실행
            </button>
          }
        />
      </div>

      {notice && (
        <div className="shrink-0 mb-3 bg-secondary text-secondary-foreground rounded-xl px-4 py-2.5 text-[12.5px] font-semibold break-all">
          {notice}
        </div>
      )}

      {data === 'none' ? (
        <div className="bg-card border border-border rounded-xl px-6 py-12 text-center text-[13.5px] text-muted-foreground">
          아직 자체평가 이력이 없습니다 — 우측 상단 <b className="text-foreground">[새 자체평가 실행]</b>을 누르면
          현재 증빙 체크리스트 상태로 42항목 제안값이 채워진 세션이 만들어집니다.
        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 좌측 — 6영역 목록 (템플릿 C: 380px 고정) */}
          <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
            <button
              type="button"
              onClick={() => setArea(null)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
                area == null ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-extrabold">{data.id}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">확정 {data.confirmedCount}/42</span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(data.confirmedCount / 42) * 100}%` }} />
                </div>
                {data.totalScore != null ? (
                  <span className="text-[11px] font-extrabold tabular-nums shrink-0">
                    {data.totalScore}점 {data.grade}
                  </span>
                ) : (
                  <span className="text-[10.5px] text-muted-foreground shrink-0">점수 미확정</span>
                )}
              </div>
            </button>

            {AREA_ORDER.map((a) => {
              const rows = data.lines.filter((l) => l.area === a)
              if (rows.length === 0) return null
              const confirmed = rows.filter((l) => l.finalState != null).length
              const remain = rows.length - confirmed
              const sub = rows.reduce((s, l) => s + l.score, 0)
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  className={cn(
                    'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
                    area === a ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold flex-1 truncate">{a}</span>
                    {remain > 0 ? (
                      <span className="text-[10.5px] font-bold bg-warn-tint text-warn-ink rounded-full px-1.5 py-px shrink-0">
                        미확정 {remain}
                      </span>
                    ) : (
                      <span className="text-[10.5px] font-bold bg-ok-tint text-ok-ink rounded-full px-1.5 py-px shrink-0">
                        완료
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground tabular-nums mt-0.5">
                    {rows.length}항목 · 배점 {sub} · 확정 {confirmed}/{rows.length}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 우측 — 선택 영역 확정 테이블 / 미선택 시 세션 요약+액션 스택(공백 금지) */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            {area ? (
              <AreaTable
                area={area}
                lines={data.lines.filter((l) => l.area === area)}
                onPatch={patchLine}
              />
            ) : (
              <SessionSummary
                data={data}
                author={author}
                finalizing={finalizing}
                exporting={exporting}
                onMeta={saveMeta}
                onBulkAdopt={bulkAdopt}
                onFinalize={finalize}
                onExport={exportReport}
                onPickArea={setArea}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** 영역별 42항목 확정 테이블 — 제안은 참고, 확정(사람)·관찰·추가지적 입력. */
function AreaTable({
  area,
  lines,
  onPatch
}: {
  area: string
  lines: SqAssessmentLineDto[]
  onPatch: (line: SqAssessmentLineDto, patch: Partial<SqAssessmentLineDto>) => Promise<void>
}): JSX.Element {
  const sub = lines.reduce((s, l) => s + l.score, 0)
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-2.5 bg-muted/50 flex items-center text-[13px] font-bold">
        <span className="flex-1">{area}</span>
        <span className="text-[12px] text-muted-foreground tabular-nums">
          {lines.length}항목 · 배점 {sub}
        </span>
      </div>
      <div className="hidden lg:grid grid-cols-[64px_1fr_86px_120px_1.1fr_1fr] gap-2 px-5 py-1.5 text-[11px] font-bold text-muted-foreground border-t border-border">
        <span>No</span>
        <span>평가항목</span>
        <span>제안</span>
        <span>확정 (사람)</span>
        <span>지적 및 관찰사항</span>
        <span>추가 지적사항</span>
      </div>
      {lines.map((l) => (
        <div
          key={l.itemCode}
          className="grid grid-cols-1 lg:grid-cols-[64px_1fr_86px_120px_1.1fr_1fr] gap-2 px-5 py-2 border-t border-border items-center text-[12.5px]"
        >
          <span className="font-mono text-[12px] font-bold text-muted-foreground">{l.itemCode}</span>
          <span className="min-w-0 truncate" title={`${l.title} · ${l.score}점`}>
            {l.title} <span className="text-muted-foreground">{l.score}점</span>
          </span>
          <span>
            {l.suggestedState && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: PILL[l.suggestedState].bg, color: PILL[l.suggestedState].fg }}>
                {l.suggestedState}
              </span>
            )}
          </span>
          <select
            value={l.finalState ?? ''}
            onChange={(e) => void onPatch(l, { finalState: (e.target.value || null) as SqSuggestedState | null })}
            className={cn('input-field !text-[12px] !py-1 !px-1.5', l.finalState == null && 'border-amber-300')}
          >
            <option value="">— 미확정</option>
            {STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <input
            type="text"
            defaultValue={l.observation ?? ''}
            key={`obs-${l.itemCode}-${l.observation ?? ''}`}
            placeholder="관찰사항"
            onBlur={(e) => {
              const v = e.target.value.trim() || null
              if (v !== (l.observation ?? null)) void onPatch(l, { observation: v })
            }}
            className="input-field !text-[12px] !py-1 !px-1.5"
          />
          <input
            type="text"
            defaultValue={l.extraFinding ?? ''}
            placeholder="추가 지적(지적사항 종합에 전기)"
            onBlur={(e) => {
              const v = e.target.value.trim() || null
              if (v !== (l.extraFinding ?? null)) void onPatch(l, { extraFinding: v })
            }}
            className="input-field !text-[12px] !py-1 !px-1.5"
          />
        </div>
      ))}
    </div>
  )
}

/** 미선택 요약 — 세션 메타 + 미확정 영역 안내 + 액션 스택(화면문법노트 §1-3 우측 세로 액션 패널). */
function SessionSummary({
  data,
  author,
  finalizing,
  exporting,
  onMeta,
  onBulkAdopt,
  onFinalize,
  onExport,
  onPickArea
}: {
  data: SqAssessmentDto
  author: string
  finalizing: boolean
  exporting: boolean
  onMeta: (patch: Record<string, unknown>) => Promise<void>
  onBulkAdopt: () => Promise<void>
  onFinalize: () => Promise<void>
  onExport: () => Promise<void>
  onPickArea: (area: string) => void
}): JSX.Element {
  const remainAreas = AREA_ORDER.map((a) => {
    const rows = data.lines.filter((l) => l.area === a)
    return { area: a, remain: rows.filter((l) => l.finalState == null).length }
  }).filter((x) => x.remain > 0)

  return (
    <div className="grid gap-4">
      <CardShell title="세션 정보" cap="평가일·평가자·종합 의견 — 리포트 표지에 들어갑니다">
        <div className="px-[18px] pb-4 space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Meta label="평가일">
              <input type="date" defaultValue={data.assessedAt} onBlur={(e) => void onMeta({ assessedAt: e.target.value })} className="input-field !text-[12.5px] !py-1.5" />
            </Meta>
            <Meta label="평가자(심사원)">
              <input type="text" defaultValue={data.assessor ?? ''} placeholder={author || '이름'} onBlur={(e) => void onMeta({ assessor: e.target.value.trim() || null })} className="input-field !text-[12.5px] !py-1.5" />
            </Meta>
            <Meta label="입회/수행">
              <input type="text" defaultValue={data.witness ?? ''} placeholder="예: 각 팀장" onBlur={(e) => void onMeta({ witness: e.target.value.trim() || null })} className="input-field !text-[12.5px] !py-1.5" />
            </Meta>
            <Meta label="차기 평가 예정">
              <input type="date" defaultValue={data.nextDue ?? ''} onBlur={(e) => void onMeta({ nextDue: e.target.value || null })} className="input-field !text-[12.5px] !py-1.5" />
            </Meta>
          </div>
          <Meta label="종합 의견 (표지 B20)">
            <textarea rows={2} defaultValue={data.summaryOpinion ?? ''} placeholder="예: 검사시험 영역 보완 필요, 8월 말까지 미흡 항목 대책 수립" onBlur={(e) => void onMeta({ summaryOpinion: e.target.value.trim() || null })} className="input-field !text-[12.5px] resize-y" />
          </Meta>
        </div>
      </CardShell>

      <CardShell title="남은 확정" cap="확정은 사람만 — 좌측 영역을 눌러 항목별로 확정하세요">
        <div className="px-[18px] pb-4 grid gap-1.5">
          {remainAreas.length === 0 && (
            <div className="text-[13px] text-muted-foreground pb-2">42항목 전부 확정됐습니다 — 아래에서 점수를 확정하세요.</div>
          )}
          {remainAreas.map((x) => (
            <button
              key={x.area}
              type="button"
              onClick={() => onPickArea(x.area)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left border border-border hover:bg-muted/50"
            >
              <span className="flex-1 text-[13.5px] font-medium truncate">{x.area}</span>
              <span className="text-[11px] font-bold bg-warn-tint text-warn-ink rounded-full px-2 py-0.5 shrink-0">
                미확정 {x.remain}
              </span>
            </button>
          ))}
        </div>
      </CardShell>

      <CardShell title="확정 · 출력" cap="남은 항목 채택 → 점수 확정 → 엑셀 리포트 → 경영자 보고">
        <div className="px-[18px] pb-4 grid gap-2">
          <button
            type="button"
            onClick={() => void onBulkAdopt()}
            disabled={data.confirmedCount >= 42}
            className="h-10 rounded-lg text-[13px] font-bold border border-border bg-card hover:bg-muted disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            title="남은 항목을 제안값 그대로 확정(이후 항목별 수정 가능)"
          >
            <CheckCheck className="w-4 h-4" /> 남은 항목 제안값 채택
          </button>
          <button
            type="button"
            onClick={() => void onFinalize()}
            disabled={finalizing || data.confirmedCount < 42 || data.totalScore != null}
            className="h-10 rounded-lg text-[13px] font-bold bg-primary text-primary-foreground hover:brightness-95 disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            title="42항목 전부 확정되면 점수·등급을 계산·기록합니다"
          >
            {finalizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />} 점수 확정
            {data.totalScore != null && ` — ${data.totalScore}점 ${data.grade}`}
          </button>
          <button
            type="button"
            onClick={() => void onExport()}
            disabled={exporting || data.totalScore == null}
            className="h-10 rounded-lg text-[13px] font-bold border border-border bg-card hover:bg-muted disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
            title="코워크 자체평가 템플릿에 채워서 xlsx 출력"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} 엑셀 리포트
          </button>
          {data.approvedBy ? (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-foreground pt-1">
              <Stamp className="w-4 h-4 text-primary" /> 경영자 보고: {data.approvedBy} · {data.approvedAt?.slice(0, 16)}
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void onMeta({ approvedBy: author || '대표' })}
              disabled={data.totalScore == null}
              className="h-10 rounded-lg text-[13px] font-bold border border-border bg-card hover:bg-muted disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
              title="점수 확정 후 경영자 보고를 기록합니다 (서명은 출력물에 수기/전자결재)"
            >
              <Stamp className="w-4 h-4" /> 경영자 보고 기록
            </button>
          )}
          {data.reportPath && <span className="text-[11.5px] text-muted-foreground break-all">리포트: {data.reportPath}</span>}
          <p className="text-[11.5px] text-muted-foreground pt-1">
            제안(프로그램)은 참고값 — 확정은 사람이 합니다. 일부미흡 이하 확정 시 관찰사항에 [대책수립 요청]이 자동
            삽입됩니다(수정 가능). 확정 내용을 고치면 점수는 다시 확정해야 합니다.
          </p>
        </div>
      </CardShell>
    </div>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-muted-foreground mb-1 block">{label}</span>
      {children}
    </label>
  )
}
