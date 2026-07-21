import { useEffect, useRef, useState } from 'react'
import { ChevronDown, UserCircle2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { normalizeTeam, teamTheme } from '@shared/team-theme'
import type { AppUserDto } from '@shared/ipc-types'

/**
 * P2 — 공용 PC 사용자 전환 (12번 지시서 §4, 목업 v2 .me .pop).
 * 아바타(이름 첫 글자·팀색) + "이름 · 팀" + 팝오버 목록. 선택 시 activeUserStore 갱신 →
 * 완료·작성 기록의 주체(doneBy/createdBy/updatedBy)가 이 사람으로 통일된다.
 */
function avatarOf(u: AppUserDto): { bg: string; fg: string; ch: string } {
  const tid = normalizeTeam(u.teamDept)
  const th = tid ? teamTheme(tid) : null
  return {
    bg: th?.tintBg ?? '#EEF0F3',
    fg: th?.darkText ?? '#3F4650',
    ch: (u.name.trim().charAt(0) || '?')
  }
}

const ROLE_LABEL: Record<AppUserDto['role'], string> = {
  executive: '경영진',
  manager: '팀장',
  member: ''
}

function subCaption(u: AppUserDto): string {
  return [u.teamDept || '', ROLE_LABEL[u.role]].filter(Boolean).join(' · ')
}

export function UserSwitcher(): JSX.Element {
  const users = useActiveUserStore((s) => s.users)
  const activeUserId = useActiveUserStore((s) => s.activeUserId)
  const setActiveUser = useActiveUserStore((s) => s.setActiveUser)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = users.find((u) => u.id === activeUserId) || null

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const av = current ? avatarOf(current) : null

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="사용자 전환 — 완료·작성 기록에 이 이름이 남습니다"
        className={cn(
          'h-8 pl-1 pr-2 rounded-md flex items-center gap-1.5 border transition-colors',
          current ? 'border-border hover:bg-muted' : 'border-amber-300 text-amber-700 hover:bg-amber-50'
        )}
      >
        {av ? (
          <span
            className="w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold"
            style={{ background: av.bg, color: av.fg }}
          >
            {av.ch}
          </span>
        ) : (
          <UserCircle2 className="w-5 h-5" />
        )}
        <span className="text-[12px] font-semibold whitespace-nowrap max-w-[150px] truncate">
          {current ? `${current.name}${current.teamDept ? ` · ${current.teamDept}` : ''}` : '사용자 선택'}
        </span>
        <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-popover border border-border rounded-xl shadow-lg p-1.5 z-50">
          <div className="px-2 py-1.5 text-[11px] text-muted-foreground leading-snug">
            누구세요? — 완료·작성 기록에 이 이름이 남습니다
          </div>
          <div className="max-h-[62vh] overflow-y-auto">
            {users
              .filter((u) => u.active)
              .map((u) => {
                const a = avatarOf(u)
                const isCur = u.id === activeUserId
                const sub = subCaption(u)
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setActiveUser(u.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 text-left rounded-lg px-2 py-1.5 transition-colors',
                      isCur ? 'bg-primary/10' : 'hover:bg-muted'
                    )}
                  >
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
                      style={{ background: a.bg, color: a.fg }}
                    >
                      {a.ch}
                    </span>
                    <span className="leading-tight min-w-0">
                      <span className="block text-[13px] font-semibold truncate">{u.name}</span>
                      {sub && <span className="block text-[11px] text-muted-foreground truncate">{sub}</span>}
                    </span>
                    {isCur && <span className="ml-auto text-primary text-[11px] font-semibold shrink-0">현재</span>}
                  </button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
