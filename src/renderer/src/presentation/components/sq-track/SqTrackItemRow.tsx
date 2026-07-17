import { useState } from 'react'
import { FileEdit, StickyNote } from 'lucide-react'
import type { SqTrackItemDto, SqTrackStatus } from '@shared/ipc-types'
import { teamTheme } from '@shared/team-theme'
import { useSqTrackStore } from '../../stores/sqTrackStore'
import { useUIStore } from '../../stores/uiStore'

const SEV_DOT: Record<SqTrackItemDto['severity'], string> = {
  red: '#E24B4A',
  orange: '#EF9F27',
  yellow: '#D8C126'
}

const STATUS_STYLE: Record<SqTrackStatus, { bg: string; fg: string; label: string }> = {
  open: { bg: '#FCEBEB', fg: '#A32D2D', label: '미해소' },
  in_progress: { bg: '#FAEEDA', fg: '#7A4D05', label: '조치중' },
  done: { bg: '#E2F3E2', fg: '#1D6B1D', label: '해소' },
  na: { bg: '#EDF3FA', fg: '#5C7288', label: '해당없음' }
}

const NEXT_STATUS: Record<SqTrackStatus, SqTrackStatus> = {
  open: 'in_progress',
  in_progress: 'done',
  done: 'na',
  na: 'open'
}

/** 체크리스트 행 — 상태 pill 클릭 순환 + ✎ 조치메모(blur 저장) + 관련 양식 열기. */
export function SqTrackItemRow({ item }: { item: SqTrackItemDto }): JSX.Element {
  const updateItem = useSqTrackStore((s) => s.updateItem)
  const setSelectedFormCode = useUIStore((s) => s.setSelectedFormCode)
  const setPage = useUIStore((s) => s.setPage)
  const [editingNote, setEditingNote] = useState(false)
  const [noteDraft, setNoteDraft] = useState(item.note ?? '')

  const st = STATUS_STYLE[item.status]
  const resolved = item.status === 'done' || item.status === 'na'

  return (
    <div className="px-5 py-3 flex flex-col gap-1.5">
      <div className="flex items-start gap-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 mt-[5px]"
          style={{ background: SEV_DOT[item.severity], opacity: resolved ? 0.35 : 1 }}
          title={{ red: '심사 감점/부적합 직결', orange: '질문 유발(소명 필요)', yellow: '관행 교정' }[item.severity]}
        />
        <div className="min-w-0 flex-1">
          <div className={`text-[13.5px] font-semibold leading-snug ${resolved ? 'text-muted-foreground line-through decoration-1' : ''}`}>
            {item.title}
          </div>
          {item.detail && <div className="text-[12px] text-muted-foreground leading-snug mt-0.5">{item.detail}</div>}
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {item.evidencePages && (
              <span className="text-[10.5px] rounded px-1.5 py-0.5 bg-secondary text-muted-foreground tabular-nums">
                {item.evidencePages}
              </span>
            )}
            {item.team && (
              <span
                className="text-[10.5px] font-bold rounded-full px-2 py-0.5"
                style={{ background: teamTheme(item.team).tintBg, color: teamTheme(item.team).darkText }}
              >
                {teamTheme(item.team).label}
              </span>
            )}
            {item.tag && (
              <span className="text-[10.5px] rounded-full px-2 py-0.5 border border-border text-muted-foreground">
                {item.tag}
              </span>
            )}
            {item.formCode && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFormCode(item.formCode)
                  setPage('form-builder')
                }}
                className="flex items-center gap-1 text-[10.5px] font-semibold text-primary hover:underline"
                title={item.formName ?? item.formCode}
              >
                <FileEdit size={11} /> {item.formName ?? item.formCode}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setEditingNote((v) => !v)}
            className="text-muted-foreground/70 hover:text-foreground"
            title="조치 메모"
          >
            <StickyNote size={14} />
          </button>
          <button
            type="button"
            onClick={() => void updateItem({ itemCode: item.code, status: NEXT_STATUS[item.status] })}
            className="text-[11px] font-bold rounded-full px-2.5 py-1 min-w-[56px]"
            style={{ background: st.bg, color: st.fg }}
            title="클릭: 미해소 → 조치중 → 해소 → 해당없음 순환"
          >
            {st.label}
          </button>
        </div>
      </div>

      {(editingNote || item.note) && (
        <div className="pl-[22px]">
          {editingNote ? (
            <input
              autoFocus
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => {
                setEditingNote(false)
                if ((item.note ?? '') !== noteDraft) {
                  void updateItem({ itemCode: item.code, note: noteDraft || null })
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
              }}
              placeholder="조치 내용·경과 메모 (Enter 또는 포커스 아웃으로 저장)"
              className="w-full text-[12px] border border-border rounded-md px-2.5 py-1.5 bg-card text-foreground"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingNote(true)}
              className="text-[12px] text-muted-foreground text-left hover:text-foreground"
            >
              💬 {item.note}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
