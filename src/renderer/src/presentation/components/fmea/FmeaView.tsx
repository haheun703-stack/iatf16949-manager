import { useEffect, useState } from 'react'
import { GitBranch, Loader2, Plus, Trash2, FileSpreadsheet } from 'lucide-react'
import { type FmeaDocDto, type FmeaRowDto, type FmeaActionPriority } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'
import { useFmeaStore } from '../../stores/fmeaStore'

const AP_COLOR: Record<FmeaActionPriority, string> = {
  H: 'bg-bad-tint text-bad-ink',
  M: 'bg-warn-tint text-warn-ink',
  L: 'bg-ok-tint text-ok-ink'
}

function rpnTone(rpn: number | null): string {
  if (rpn == null) return 'text-muted-foreground'
  if (rpn >= 100) return 'text-bad-ink font-bold'
  if (rpn >= 40) return 'text-warn-ink font-semibold'
  return 'text-foreground'
}

/**
 * 공정 FMEA 신판(AIAG-VDA) — 문서(품번) × 7-step 리스크 분석 시트.
 * 템플릿 C: 좌 문서 목록 380px / 우 시트 보드(가로 스크롤). 스토어가 첫 문서를 자동 선택한다(공백 금지).
 */
export function FmeaView(): JSX.Element {
  const { docs, selectedId, board, loading, load, select, updateDoc, updateRow, addRow, deleteRow, exportXlsx } =
    useFmeaStore()
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    void load()
  }, [load])

  const handleExport = async (): Promise<void> => {
    setExporting(true)
    try {
      const res = await exportXlsx()
      if (res.canceled) return
      if (res.success) alert(`신판 시트 출력 완료 (${res.rows}행)\n${res.filePath}`)
      else alert(`출력 실패: ${res.error}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<GitBranch className="w-5 h-5" />}
          title="공정 FMEA"
          sub={
            <>
              <span className="font-semibold text-primary">신판 (AIAG-VDA)</span> ·
              구조→기능→고장→리스크(S·O·D·AP)→최적화 7-step · 문서 {docs.length}건
            </>
          }
          actions={loading ? <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /> : undefined}
        />
      </div>

      {/* 템플릿 C (19번): 좌 문서 목록 380px 고정 / 우 시트 보드 */}
      <div className="flex gap-4 flex-1 min-h-0">
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {docs.length === 0 && !loading && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              FMEA 문서가 없습니다.
            </div>
          )}
          {docs.map((d) => (
            <DocCard key={d.id} d={d} active={d.id === selectedId} onPick={() => void select(d.id)} />
          ))}
        </div>

        <div className="flex-1 min-w-0 flex flex-col min-h-0 gap-3">
          {board ? (
            <>
              {/* 문서 정보 + 요약 스트립 */}
              <div className="shrink-0 bg-card border border-border rounded-[14px] shadow-card px-[18px] py-3 flex items-center gap-x-4 gap-y-2 flex-wrap text-xs">
                <span className="font-mono text-[13px] font-bold">{board.doc.fmeaNo}</span>
                <label className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="font-medium">고객</span>
                  <input
                    key={board.doc.id}
                    defaultValue={board.doc.customer ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim() || null
                      if (v !== (board.doc.customer ?? null)) void updateDoc({ id: board.doc.id, customer: v })
                    }}
                    placeholder="고객사명 (출력 C5)"
                    className="bg-fillable border border-border rounded px-2 py-0.5 text-xs w-40 focus:outline-none focus:border-primary/50"
                  />
                </label>
                {board.doc.procOwner && <span className="text-muted-foreground">책임 {board.doc.procOwner}</span>}
                {board.doc.teamMembers && <span className="text-muted-foreground">팀 {board.doc.teamMembers}</span>}
                <span className="font-semibold tabular-nums">행 {board.summary.total}</span>
                <span
                  className={cn(
                    'font-bold px-1.5 py-0.5 rounded-full tabular-nums',
                    board.summary.highAp > 0 ? 'bg-bad-tint text-bad-ink' : 'bg-ok-tint text-ok-ink'
                  )}
                >
                  High AP {board.summary.highAp}
                </span>
                <span className="text-muted-foreground tabular-nums">평균 RPN {board.summary.avgRpn}</span>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleExport()}
                    disabled={exporting}
                    title="신판 시트(J1101-01) 공식 xlsx 출력"
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    {exporting ? '출력 중...' : '신판 시트 출력'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void addRow()}
                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    행 추가
                  </button>
                </div>
              </div>

              {/* 범례 — 접이식(시트 폭 우선) */}
              <details className="shrink-0">
                <summary className="text-xs font-bold text-muted-foreground cursor-pointer select-none hover:text-foreground w-fit">
                  범례 (S·O·D·RPN·AP 지표 설명)
                </summary>
                <LegendTable />
              </details>

              {/* 신판 시트 — 23열 가로 스크롤 */}
              <div className="flex-1 min-h-0 overflow-auto rounded-[14px] border border-border bg-card shadow-card p-2">
                <table className="text-[11px] border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-muted text-muted-foreground">
                      <Th rowSpan={2} className="w-8">#</Th>
                      <GroupTh span={3} className="bg-blue-50 text-blue-700">구조분석</GroupTh>
                      <GroupTh span={3} className="bg-teal-50 text-teal-700">기능분석</GroupTh>
                      <GroupTh span={4} className="bg-violet-50 text-violet-700">고장분석 (FE/FM/FC)</GroupTh>
                      <GroupTh span={7} className="bg-amber-50 text-amber-700">리스크분석 (현 관리·S/O/D·AP)</GroupTh>
                      <GroupTh span={5} className="bg-green-50 text-green-700">최적화 (조치·재평가)</GroupTh>
                      <Th rowSpan={2} className="w-8" />
                    </tr>
                    <tr className="bg-muted/70 text-[10px] text-muted-foreground">
                      {['공정항목','공정단계','작업요소','항목기능','단계기능','요소기능',
                        '고장영향(FE)','S','고장형태(FM)','고장원인(FC)',
                        '현예방관리','O','현검출관리','D','RPN','AP','특별특성',
                        '예방조치','검출조치','책임자','재S','재O','재D'].map((h) => (
                        <Th key={h}>{h}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {board.rows.map((r) => (
                      <FmeaRow key={r.id} r={r} onUpdate={updateRow} onDelete={() => void deleteRow(r.id)} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            /* 로딩 중에도 빈 화면을 두지 않는다(19번 규칙④) */
            <CardShell title="공정 FMEA 현황" cap="신판(AIAG-VDA) 7-step 시트" status={loading ? 'loading' : 'ready'}>
              <div className="px-[18px] pb-4 text-[13px] text-muted-foreground">
                등록된 FMEA 문서가 없습니다. 문서가 적재되면 좌측 목록에서 선택해 작성하세요.
              </div>
            </CardShell>
          )}
        </div>
      </div>
    </div>
  )
}

/** 좌측 문서 카드 — FMEA No·품명·품번·고객 (템플릿 C 행 확대 문법) */
function DocCard({
  d,
  active,
  onPick
}: {
  d: FmeaDocDto
  active: boolean
  onPick: () => void
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'w-full text-left rounded-lg px-3 py-2.5 border transition-colors',
        active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-mono text-[11px] text-muted-foreground shrink-0">{d.fmeaNo}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary ml-auto shrink-0">
          신판
        </span>
      </div>
      <div className="text-[14px] font-semibold leading-snug truncate mt-0.5">{d.partName ?? d.partNo ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
        {d.partNo && <span className="font-mono">{d.partNo}</span>}
        {d.model ? ` · ${d.model}` : ''}
        {d.customer ? ` · ${d.customer}` : ''}
      </div>
    </button>
  )
}

function LegendTable(): JSX.Element {
  const rows: { abbr: string; name: string; meaning: string; scale: string }[] = [
    { abbr: 'S', name: '심각도 (Severity)', meaning: '고장이 나면 얼마나 심각한가 (고객·안전 영향)', scale: '1~10 · 클수록 위험' },
    { abbr: 'O', name: '발생도 (Occurrence)', meaning: '그 원인이 얼마나 자주 발생하나', scale: '1~10 · 클수록 자주' },
    { abbr: 'D', name: '검출도 (Detection)', meaning: '고객 도달 전 현재 관리로 잡아낼 수 있나', scale: '1~10 · 클수록 못 잡음' },
    { abbr: 'RPN', name: '위험우선순위', meaning: 'S × O × D (구판 4판 지표, 참고용)', scale: '1~1000' },
    { abbr: 'AP', name: '조치우선순위', meaning: '부표4 기준표로 S·O·D에서 자동 산출 (신판, S 우선)', scale: 'H / M / L' }
  ]
  return (
    <div className="mt-2 max-w-3xl">
      <table className="text-[11px] border-collapse w-full">
        <thead>
          <tr className="bg-muted text-muted-foreground">
            <th className="border border-border px-2 py-1 font-semibold w-12">약어</th>
            <th className="border border-border px-2 py-1 font-semibold text-left w-44">이름</th>
            <th className="border border-border px-2 py-1 font-semibold text-left">의미</th>
            <th className="border border-border px-2 py-1 font-semibold text-left w-32">척도</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.abbr} className="hover:bg-muted/30">
              <td className="border border-border px-2 py-1 text-center font-bold text-foreground bg-muted/40">{r.abbr}</td>
              <td className="border border-border px-2 py-1 font-medium">{r.name}</td>
              <td className="border border-border px-2 py-1 text-muted-foreground">{r.meaning}</td>
              <td className="border border-border px-2 py-1 text-muted-foreground">{r.scale}</td>
            </tr>
          ))}
          <tr>
            <td className="border border-border px-2 py-1 text-center font-bold text-foreground bg-muted/40">재S/O/D</td>
            <td className="border border-border px-2 py-1 font-medium" colSpan={3}>조치 후 재평가한 심각도·발생도·검출도</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function FmeaRow({
  r,
  onUpdate,
  onDelete
}: {
  r: FmeaRowDto
  onUpdate: (input: { id: number } & Record<string, unknown>) => void
  onDelete: () => void
}): JSX.Element {
  const txt = (field: keyof FmeaRowDto): JSX.Element => (
    <td className="border border-border p-0 align-middle">
      {/* 줄바꿈으로 짤림 방지 + 드래그(우하단)로 폭/높이 수동 조절 가능 */}
      <textarea
        rows={2}
        defaultValue={(r[field] as string) ?? ''}
        onBlur={(e) => {
          const v = e.target.value.trim() || null
          if (v !== ((r[field] as string) ?? null)) onUpdate({ id: r.id, [field]: v })
        }}
        className="w-32 min-w-[5rem] bg-transparent px-1.5 py-1 block resize align-middle text-center leading-snug whitespace-pre-wrap break-words focus:bg-fillable focus:outline-none"
      />
    </td>
  )
  const score = (field: keyof FmeaRowDto): JSX.Element => (
    <td className="border border-border p-0 text-center">
      <input
        type="number"
        min={1}
        max={10}
        value={(r[field] as number) ?? ''}
        onChange={(e) => {
          const v = e.target.value === '' ? null : Math.max(1, Math.min(10, Number(e.target.value)))
          onUpdate({ id: r.id, [field]: v })
        }}
        className="w-10 bg-transparent text-center px-0.5 py-1 focus:bg-fillable focus:outline-none"
      />
    </td>
  )
  // AP는 S·O·D에서 자동 산출(부표4) → 읽기전용 배지. 재평가 AP(reActionPriority)는 시트에 칸이 없다.
  const apCell = (): JSX.Element => (
    <td className="border border-border text-center p-0.5">
      {r.actionPriority ? (
        <span className={cn('inline-block w-6 text-center text-[10px] font-bold rounded py-0.5', AP_COLOR[r.actionPriority as FmeaActionPriority])}>
          {r.actionPriority}
        </span>
      ) : (
        <span className="text-muted-foreground/40">-</span>
      )}
    </td>
  )

  return (
    <tr className="hover:bg-muted/30">
      <td className="border border-border text-center text-muted-foreground tabular-nums">{r.seq}</td>
      {txt('procItem')}
      {txt('procStep')}
      {txt('procElement')}
      {txt('funcItem')}
      {txt('funcStep')}
      {txt('funcElement')}
      {txt('failureEffect')}
      {score('severity')}
      {txt('failureMode')}
      {txt('failureCause')}
      {txt('preventionCtrl')}
      {score('occurrence')}
      {txt('detectionCtrl')}
      {score('detection')}
      <td className={cn('border border-border text-center tabular-nums px-1', rpnTone(r.rpn))}>{r.rpn ?? '-'}</td>
      {apCell()}
      {txt('specialChar')}
      {txt('preventionAction')}
      {txt('detectionAction')}
      {txt('responsible')}
      {score('reSeverity')}
      {score('reOccurrence')}
      {score('reDetection')}
      <td className="border border-border text-center p-0">
        <button
          type="button"
          onClick={onDelete}
          className="w-6 h-6 text-muted-foreground hover:text-destructive flex items-center justify-center"
          title="행 삭제"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </td>
    </tr>
  )
}

function Th({
  children,
  className,
  rowSpan
}: {
  children?: React.ReactNode
  className?: string
  rowSpan?: number
}): JSX.Element {
  return (
    <th rowSpan={rowSpan} className={cn('border border-border px-1.5 py-1 font-semibold whitespace-nowrap', className)}>
      {children}
    </th>
  )
}

function GroupTh({
  children,
  span,
  className
}: {
  children: React.ReactNode
  span: number
  className?: string
}): JSX.Element {
  return (
    <th colSpan={span} className={cn('border border-border px-2 py-1 font-bold', className)}>
      {children}
    </th>
  )
}
