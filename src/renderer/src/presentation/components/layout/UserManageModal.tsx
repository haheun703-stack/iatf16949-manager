import { useState } from 'react'
import { X, UserPlus, Trash2, Power, PowerOff, KeyRound } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { TEAMS, normalizeTeam, teamTheme } from '@shared/team-theme'
import type { AppUserDto, AppUserRole } from '@shared/ipc-types'

/**
 * P2 — 사용자 관리(SettingsMenu 진입). 이름/부서/역할 CRUD.
 * ⚠️코워크 검수 조건①: 퇴사 = active=0 비활성이 기본(과거 완료 기록의 주체 이름 보존).
 *   완전 삭제(DELETE)는 오타 입력 정리용으로만 — 작게·확인 후.
 */
const TEAM_OPTIONS = ['경영지원', ...TEAMS.map((t) => t.label)]
const ROLE_OPTIONS: { value: AppUserRole; label: string }[] = [
  { value: 'member', label: '팀원' },
  { value: 'manager', label: '팀장' },
  { value: 'executive', label: '경영진' }
]

function avatarStyle(u: AppUserDto): { background: string; color: string } {
  const tid = normalizeTeam(u.teamDept)
  const th = tid ? teamTheme(tid) : null
  return { background: th?.tintBg ?? '#EEF0F3', color: th?.darkText ?? '#3F4650' }
}

export function UserManageModal({ onClose }: { onClose: () => void }): JSX.Element {
  const users = useActiveUserStore((s) => s.users)
  const upsertUser = useActiveUserStore((s) => s.upsertUser)
  const deleteUser = useActiveUserStore((s) => s.deleteUser)

  const [newName, setNewName] = useState('')
  const [newTeam, setNewTeam] = useState<string>(TEAMS[3].label) // 품질팀 기본
  const [newRole, setNewRole] = useState<AppUserRole>('member')

  const addUser = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    const maxSort = users.reduce((m, u) => Math.max(m, u.sortOrder), 0)
    await upsertUser({ name, teamDept: newTeam, role: newRole, active: true, sortOrder: maxSort + 1 })
    setNewName('')
  }

  const patch = (u: AppUserDto, fields: Partial<AppUserUpsertField>): Promise<boolean> => {
    return upsertUser({
      id: u.id,
      name: fields.name ?? u.name,
      // 'teamDept' 키가 있으면 명시값(비우기=null 포함) 반영, 없으면 기존 유지(?? 는 null 을 삼킴)
      teamDept: 'teamDept' in fields ? (fields.teamDept ?? null) : u.teamDept,
      role: fields.role ?? u.role,
      active: fields.active ?? u.active,
      sortOrder: u.sortOrder
    })
  }

  const active = users.filter((u) => u.active)
  const inactive = users.filter((u) => !u.active)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-6 overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg bg-popover border border-border rounded-2xl shadow-2xl my-8"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <div className="text-sm font-bold">사용자 관리</div>
            <div className="text-[11px] text-muted-foreground">완료·작성 기록에 남는 이름 · 퇴사자는 비활성(이름 보존)</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 hover:bg-muted" aria-label="닫기">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 신규 추가 */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-border bg-muted/30">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void addUser()
            }}
            placeholder="새 사용자 이름"
            className="flex-1 min-w-0 bg-fillable text-[12px] px-2 py-1.5 rounded border border-border focus:border-primary/50 focus:outline-none"
          />
          <select
            value={newTeam}
            onChange={(e) => setNewTeam(e.target.value)}
            className="text-[12px] px-1.5 py-1.5 rounded border border-border bg-background"
          >
            {TEAM_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as AppUserRole)}
            className="text-[12px] px-1.5 py-1.5 rounded border border-border bg-background"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void addUser()}
            disabled={!newName.trim()}
            className="shrink-0 h-8 px-2.5 rounded-md flex items-center gap-1 text-[12px] font-semibold bg-primary text-primary-foreground disabled:opacity-40"
          >
            <UserPlus className="w-3.5 h-3.5" />
            추가
          </button>
        </div>

        {/* 목록 */}
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {active.map((u) => (
            <UserRow key={u.id} u={u} onPatch={patch} onDelete={deleteUser} />
          ))}

          {inactive.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                비활성(퇴사·휴직) — 기록 이름 보존
              </div>
              {inactive.map((u) => (
                <UserRow key={u.id} u={u} onPatch={patch} onDelete={deleteUser} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

type AppUserUpsertField = { name: string; teamDept: string | null; role: AppUserRole; active: boolean }

function UserRow({
  u,
  onPatch,
  onDelete
}: {
  u: AppUserDto
  onPatch: (u: AppUserDto, fields: Partial<AppUserUpsertField>) => Promise<boolean>
  onDelete: (id: number) => Promise<void>
}): JSX.Element {
  const [name, setName] = useState(u.name)
  const av = avatarStyle(u)

  return (
    <div className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1.5', !u.active && 'opacity-55')}>
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0"
        style={av}
      >
        {u.name.trim().charAt(0) || '?'}
      </span>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const v = name.trim()
          if (v && v !== u.name) {
            void onPatch(u, { name: v }).then((ok) => {
              if (!ok) {
                window.alert(`'${v}'(으)로 변경할 수 없습니다 — 이미 있는 이름이거나 오류입니다.`)
                setName(u.name)
              }
            })
          } else {
            setName(u.name)
          }
        }}
        className="w-24 min-w-0 bg-transparent text-[13px] font-semibold px-1 py-0.5 rounded hover:bg-muted focus:bg-fillable focus:outline-none"
      />
      <select
        value={TEAM_OPTIONS.includes(u.teamDept ?? '') ? (u.teamDept as string) : ''}
        onChange={(e) => onPatch(u, { teamDept: e.target.value || null })}
        className="text-[11px] px-1 py-0.5 rounded border border-border bg-background"
      >
        {!TEAM_OPTIONS.includes(u.teamDept ?? '') && <option value="">{u.teamDept || '(부서)'}</option>}
        {TEAM_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <select
        value={u.role}
        onChange={(e) => onPatch(u, { role: e.target.value as AppUserRole })}
        className="text-[11px] px-1 py-0.5 rounded border border-border bg-background"
      >
        {ROLE_OPTIONS.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        {/* 비밀번호 재설정(관리형 비번 체계, W4) — 관리팀이 4자리 지정·대장 관리. 웹은 manager+ 서버 가드 */}
        <button
          type="button"
          onClick={() => {
            const pw = window.prompt(`'${u.name}' 새 비밀번호 (4자리 숫자)\n\n관리팀 비번 대장에 함께 기록하세요.`, '')
            if (pw == null) return
            if (!/^\d{4}$/.test(pw.trim())) {
              window.alert('비밀번호는 4자리 숫자입니다(관리팀 대장 정책).')
              return
            }
            void window.api
              .invoke(window.api.channels.APP_USER_RESET_PASSWORD, { id: u.id, newPassword: pw.trim() })
              .then((r) => {
                window.alert(
                  r.success
                    ? `'${u.name}' 비밀번호가 재설정됐습니다 — 대장 갱신을 잊지 마세요.`
                    : `실패: ${r.error ?? '알 수 없는 오류'}`
                )
              })
          }}
          title="비밀번호 재설정 — 4자리 숫자 지정(관리팀 비번 대장 정책)"
          className="rounded p-1 text-muted-foreground hover:bg-amber-50 hover:text-amber-700 transition-colors"
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
        {/* 비활성/활성 토글 — 퇴사 처리의 기본 동작 */}
        <button
          type="button"
          onClick={() => onPatch(u, { active: !u.active })}
          title={u.active ? '비활성(퇴사·휴직) — 이름은 기록에 보존' : '다시 활성화'}
          className={cn(
            'rounded p-1 transition-colors',
            u.active ? 'text-muted-foreground hover:bg-muted' : 'text-green-600 hover:bg-green-50'
          )}
        >
          {u.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
        </button>
        {/* 완전 삭제 — 오타 정리용(확인 후). 기록 주체는 비활성 권장 */}
        <button
          type="button"
          onClick={() => {
            void (async () => {
              const ok = await confirmDialog({
                title: `'${u.name}'을(를) 완전 삭제할까요?`,
                body: '퇴사자는 삭제하지 말고 비활성(전원 아이콘)하세요 — 과거 기록의 이름이 보존됩니다.\n삭제는 오타 입력 정리용입니다.',
                okLabel: '완전 삭제',
                danger: true
              })
              if (ok) void onDelete(u.id)
            })()
          }}
          title="완전 삭제 — 오타 정리용(퇴사자는 비활성 권장)"
          className="rounded p-1 text-muted-foreground/60 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
