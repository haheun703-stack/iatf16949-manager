import { useEffect, useState } from 'react'
import { Loader2, CircleCheck, CircleDot, Circle, CircleSlash, Pencil, Star } from 'lucide-react'
import type {
  SqGuideDto,
  SqGuideCheckpointDto,
  SqCheckpointStatus,
  SqSuggestedState,
  CompanyProfile
} from '@shared/ipc-types'
import { cn } from '../../../lib/utils'

/**
 * SQ 작성 가이드 패널 (코워크 07번 Phase A) — "이렇게 작성하세요"를 데이터 옆에.
 * 탭 4종: 증빙 체크리스트(체크포인트 연동, 클릭=상태 순환) / 작성방법 / 예시 / 감점·주의.
 * 상단 뱃지 = 체크 상태에서 결정론 산출한 "제안" 이행상태 — 확정은 자체평가(사람).
 * 가이드 텍스트는 읽기 전용 마스터(인라인 편집 금지 — 개정은 JSON 재시드).
 */

type TabKey = 'evidence' | 'how' | 'examples' | 'penalty'

const STATE_STYLE: Record<SqSuggestedState, { bg: string; fg: string }> = {
  우수: { bg: '#dcf5dc', fg: '#0a5c0a' },
  양호: { bg: '#e2f3e2', fg: '#1d6b1d' },
  보완: { bg: '#faeeda', fg: '#7a4d05' },
  일부미흡: { bg: '#fcebeb', fg: '#a32d2d' },
  다수미흡: { bg: '#fcebeb', fg: '#8a1f1f' },
  미관리: { bg: '#f3d1d1', fg: '#7a1515' },
  미해당: { bg: '#edf3fa', fg: '#5c7288' }
}

// 상태 순환: missing → partial → met → na → missing
const NEXT_STATUS: Record<SqCheckpointStatus, SqCheckpointStatus> = {
  missing: 'partial',
  partial: 'met',
  met: 'na',
  na: 'missing'
}

const CP_STYLE: Record<SqCheckpointStatus, { icon: typeof Circle; color: string; label: string }> = {
  met: { icon: CircleCheck, color: '#2f8a2f', label: '충족' },
  partial: { icon: CircleDot, color: '#c07f10', label: '부분' },
  missing: { icon: Circle, color: '#98a8b8', label: '미비' },
  na: { icon: CircleSlash, color: '#b9c8d8', label: '해당없음' }
}

export function WriteGuidePanel({ itemCode }: { itemCode: string }): JSX.Element {
  const [guide, setGuide] = useState<SqGuideDto | null>(null)
  const [failed, setFailed] = useState(false)
  const [tab, setTab] = useState<TabKey>('evidence')
  const [author, setAuthor] = useState('')
  const [noteEdit, setNoteEdit] = useState<number | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.SQ_GUIDE_GET, { itemCode })) as SqGuideDto | null
        if (!alive) return
        if (res) setGuide(res)
        else setFailed(true)
      } catch {
        if (alive) setFailed(true)
      }
    })()
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        if (alive) setAuthor(p?.defaultAuthor || '')
      } catch {
        /* noop */
      }
    })()
    return () => {
      alive = false
    }
  }, [itemCode])

  const patchCheckpoint = async (cp: SqGuideCheckpointDto, patch: Partial<SqGuideCheckpointDto>): Promise<void> => {
    if (!guide) return
    // 낙관적 갱신 → 서버 제안값으로 뱃지 확정
    const nextCps = guide.checkpoints.map((c) => (c.id === cp.id ? { ...c, ...patch } : c))
    setGuide({ ...guide, checkpoints: nextCps })
    try {
      const res = (await window.api.invoke(window.api.channels.SQ_CHECKPOINT_UPDATE, {
        checkpointId: cp.id,
        status: (patch.status ?? cp.status) as SqCheckpointStatus,
        ...('evidenceNote' in patch ? { evidenceNote: patch.evidenceNote ?? null } : {}),
        updatedBy: author || undefined
      })) as { success: boolean; suggestedState: SqSuggestedState }
      if (res.success) setGuide((g) => (g ? { ...g, suggestedState: res.suggestedState } : g))
    } catch {
      /* 실패 시 다음 로드에서 서버 상태로 복원 */
    }
  }

  if (failed) {
    return (
      <div className="text-[12px] text-muted-foreground bg-card border border-border/60 rounded-lg px-3 py-2.5">
        이 항목의 작성 가이드가 아직 없습니다 (가이드 Ver4 시드 확인 필요).
      </div>
    )
  }
  if (!guide) {
    return (
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground py-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> 작성 가이드 불러오는 중...
      </div>
    )
  }

  const st = STATE_STYLE[guide.suggestedState]
  const met = guide.checkpoints.filter((c) => c.status === 'met').length
  const activeCnt = guide.checkpoints.filter((c) => c.status !== 'na').length

  const TABS: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'evidence', label: '증빙 체크리스트', count: guide.checkpoints.length },
    { key: 'how', label: '작성 방법', count: guide.howToWrite.length },
    { key: 'examples', label: '작성 예시', count: guide.examples.length },
    { key: 'penalty', label: '감점 · 주의', count: guide.penaltyPatterns.length }
  ]

  return (
    <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
      {/* 헤더: 제안 상태 + 진행 + 주기/보존 */}
      <div className="px-3.5 py-2.5 flex items-center gap-2.5 flex-wrap border-b border-border/60">
        <span className="text-[12px] font-bold">
          작성 가이드 <span className="text-muted-foreground font-semibold">{guide.guideVersion}</span>
        </span>
        {guide.highValue && (
          <span className="inline-flex items-center gap-0.5 text-[10.5px] font-bold text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">
            <Star className="w-3 h-3" /> 고배점
          </span>
        )}
        <span
          className="text-[11.5px] font-bold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: st.bg, color: st.fg }}
          title="체크 상태에서 자동 제안한 이행상태 — 확정은 자체평가에서 사람이 합니다"
        >
          제안: {guide.suggestedState}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          충족 {met}/{activeCnt}
        </span>
        <span className="flex-1" />
        {guide.cycleRetention && (
          <span className="text-[10.5px] text-muted-foreground truncate max-w-[45%]" title={guide.cycleRetention}>
            주기/보존: {guide.cycleRetention}
          </span>
        )}
      </div>

      {/* 탭 */}
      <div className="flex border-b border-border/60 bg-muted/30">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'px-3 py-2 text-[11.5px] font-bold transition-colors relative',
              tab === t.key ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              t.key === 'penalty' && tab === t.key && 'text-[#a32d2d]'
            )}
          >
            {t.label}
            {t.count != null && <span className="ml-1 tabular-nums font-semibold opacity-70">{t.count}</span>}
            {tab === t.key && (
              <span
                aria-hidden
                className={cn('absolute left-2 right-2 bottom-0 h-0.5 rounded-t', t.key === 'penalty' ? 'bg-[#a32d2d]' : 'bg-primary')}
              />
            )}
          </button>
        ))}
      </div>

      <div className="px-3.5 py-3">
        {tab === 'evidence' && (
          <div className="space-y-1">
            <div className="text-[10.5px] text-muted-foreground mb-1.5">
              클릭 = 상태 순환 (미비 → 부분 → 충족 → 해당없음) · ✎ = 증빙 위치 메모
            </div>
            {guide.checkpoints.map((cp) => {
              const cs = CP_STYLE[cp.status]
              const Icon = cs.icon
              return (
                <div key={cp.id} className="rounded-md hover:bg-muted/40 px-1.5 py-1">
                  <div className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => void patchCheckpoint(cp, { status: NEXT_STATUS[cp.status] })}
                      className="shrink-0 mt-0.5 inline-flex items-center gap-1"
                      title={`현재: ${cs.label} — 클릭하여 변경`}
                    >
                      <Icon className="w-4 h-4" style={{ color: cs.color }} />
                      <span className="text-[10px] font-bold w-9 text-left" style={{ color: cs.color }}>
                        {cs.label}
                      </span>
                    </button>
                    <span
                      className={cn(
                        'flex-1 text-[12px] leading-relaxed',
                        cp.status === 'na' && 'text-muted-foreground/60 line-through decoration-muted-foreground/40'
                      )}
                    >
                      {cp.content}
                    </span>
                    <button
                      type="button"
                      onClick={() => setNoteEdit(noteEdit === cp.id ? null : cp.id)}
                      className={cn(
                        'shrink-0 rounded p-1 hover:bg-muted',
                        cp.evidenceNote ? 'text-primary' : 'text-muted-foreground/50'
                      )}
                      title={cp.evidenceNote || '증빙 위치 메모'}
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                  {noteEdit === cp.id && (
                    <input
                      autoFocus
                      defaultValue={cp.evidenceNote ?? ''}
                      placeholder="증빙 위치 (예: 품질기록 캐비닛 3 / QMS>검사성적서 폴더)"
                      className="input-field !text-[11.5px] !py-1 !px-2 mt-1"
                      onBlur={(e) => {
                        setNoteEdit(null)
                        const v = e.target.value.trim()
                        if (v !== (cp.evidenceNote ?? '')) void patchCheckpoint(cp, { evidenceNote: v || null })
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        else if (e.key === 'Escape') setNoteEdit(null)
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {tab === 'how' && <Bullets items={guide.howToWrite} />}
        {tab === 'examples' && <Bullets items={guide.examples} mono />}
        {tab === 'penalty' && (
          <div className="space-y-1.5">
            {guide.penaltyPatterns.map((p, i) => (
              <div
                key={i}
                className="text-[12px] leading-relaxed rounded-md px-2.5 py-1.5"
                style={{ backgroundColor: '#fcebeb', color: '#7a2020' }}
              >
                {p}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Bullets({ items, mono }: { items: string[]; mono?: boolean }): JSX.Element {
  if (items.length === 0) return <div className="text-[12px] text-muted-foreground">내용 없음</div>
  return (
    <ul className="space-y-1.5">
      {items.map((b, i) => (
        <li key={i} className={cn('text-[12px] leading-relaxed flex gap-2', mono && 'bg-muted/40 rounded-md px-2.5 py-1.5')}>
          <span className="text-muted-foreground/60 shrink-0">·</span>
          <span className="whitespace-pre-wrap">{b}</span>
        </li>
      ))}
    </ul>
  )
}
