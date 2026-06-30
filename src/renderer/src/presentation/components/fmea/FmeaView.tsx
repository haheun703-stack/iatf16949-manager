import { useEffect } from 'react'
import { GitBranch, Loader2, Plus, Trash2 } from 'lucide-react'
import { type FmeaRowDto, type FmeaActionPriority } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useFmeaStore } from '../../stores/fmeaStore'

const AP_COLOR: Record<FmeaActionPriority, string> = {
  H: 'bg-rose-100 text-rose-700',
  M: 'bg-amber-100 text-amber-700',
  L: 'bg-green-100 text-green-700'
}

function rpnTone(rpn: number | null): string {
  if (rpn == null) return 'text-muted-foreground'
  if (rpn >= 100) return 'text-rose-600 font-bold'
  if (rpn >= 40) return 'text-amber-600 font-semibold'
  return 'text-foreground'
}

export function FmeaView(): JSX.Element {
  const { docs, selectedId, board, loading, load, select, updateRow, addRow, deleteRow } = useFmeaStore()

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="-m-6 h-[calc(100vh-3.5rem)] flex flex-col bg-background">
      <header className="px-6 pt-5 pb-4 border-b border-border bg-card shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GitBranch className="w-6 h-6 text-primary" />
              공정 FMEA <span className="text-sm font-semibold text-primary">신판 (AIAG-VDA)</span>
              {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              구조→기능→고장→리스크(S·O·D·AP)→최적화 7-step · 고객 제출용 공정 FMEA
            </p>
          </div>
          {docs.length > 0 && (
            <select
              value={selectedId ?? ''}
              onChange={(e) => void select(Number(e.target.value))}
              className="input-field max-w-xs text-sm"
            >
              {docs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.fmeaNo} · {d.partName ?? ''} {d.partNo ? `(${d.partNo})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {board && (
          <div className="mt-3 flex items-center gap-4 flex-wrap text-xs">
            {board.doc.procOwner && <span className="text-muted-foreground">책임 {board.doc.procOwner}</span>}
            {board.doc.teamMembers && <span className="text-muted-foreground">팀 {board.doc.teamMembers}</span>}
            <span className="font-semibold">행 {board.summary.total}</span>
            <span className="text-rose-600 font-semibold">High AP {board.summary.highAp}</span>
            <span className="text-muted-foreground">평균 RPN {board.summary.avgRpn}</span>
            <button
              type="button"
              onClick={() => void addRow()}
              className="ml-auto text-[12px] font-semibold px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              행 추가
            </button>
          </div>
        )}
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {!board && !loading && (
          <div className="text-center py-20 text-muted-foreground text-sm">FMEA 문서가 없습니다.</div>
        )}

        {board && <LegendTable />}

        {board && (
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
        )}
      </div>
    </div>
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
    <div className="mb-5 max-w-3xl">
      <div className="text-xs font-bold text-muted-foreground mb-1.5">범례 (지표 설명)</div>
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
  // AP는 S·O·D에서 자동 산출(부표4) → 읽기전용 배지
  const apCell = (field: 'actionPriority' | 'reActionPriority'): JSX.Element => (
    <td className="border border-border text-center p-0.5">
      {r[field] ? (
        <span className={cn('inline-block w-6 text-center text-[10px] font-bold rounded py-0.5', AP_COLOR[r[field] as FmeaActionPriority])}>
          {r[field]}
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
      {apCell('actionPriority')}
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
