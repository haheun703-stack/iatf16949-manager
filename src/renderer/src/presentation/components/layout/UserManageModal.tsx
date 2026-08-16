import { useState } from 'react'
import { X, UserPlus, Trash2, Power, PowerOff, KeyRound } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { invokeErrText } from '../../lib/errText'
import { useActiveUserStore, type WriteResult } from '../../stores/activeUserStore'
import { confirmDialog } from '../shared/ConfirmDialog'
import { TEAMS, normalizeTeam, teamTheme } from '@shared/team-theme'
import type { AppUserDto, AppUserRole } from '@shared/ipc-types'

/**
 * P2 — 사용자 관리(SettingsMenu 진입). 이름/부서/역할 CRUD.
 * ⚠️코워크 검수 조건①: 퇴사 = active=0 비활성이 기본(과거 완료 기록의 주체 이름 보존).
 *   완전 삭제(DELETE)는 오타 입력 정리용으로만 — 작게·확인 후.
 */
const TEAM_OPTIONS = ['경영지원', ...TEAMS.map((t) => t.label)]
// C-1(8/13 검수): '경영진' 선택지는 최종관리자(executive) 화면에서만 노출 — 서버도
// appUser 쓰기 3종을 executive 전용으로 차단하지만(정본), 화면에서 선택지 자체를 치운다.
const ROLE_OPTIONS: { value: AppUserRole; label: string }[] = [
  { value: 'member', label: '팀원' },
  { value: 'manager', label: '팀장' },
  { value: 'executive', label: '경영진' }
]
function roleOptionsFor(meRole: AppUserRole | undefined): { value: AppUserRole; label: string }[] {
  return meRole === 'executive' ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r.value !== 'executive')
}

function avatarStyle(u: AppUserDto): { background: string; color: string } {
  const tid = normalizeTeam(u.teamDept)
  const th = tid ? teamTheme(tid) : null
  return { background: th?.tintBg ?? '#EEF0F3', color: th?.darkText ?? '#3F4650' }
}

export function UserManageModal({ onClose }: { onClose: () => void }): JSX.Element {
  const users = useActiveUserStore((s) => s.users)
  const upsertUser = useActiveUserStore((s) => s.upsertUser)
  const deleteUser = useActiveUserStore((s) => s.deleteUser)
  const activeUserId = useActiveUserStore((s) => s.activeUserId)
  const session = useActiveUserStore((s) => s.session)
  // N-2/N-7(8/14 검수 2차): 편집 권한 판정은 **세션 role 정본**(웹). 종전엔 activeUserId 로
  // 로컬 role 을 봤는데, 스위처는 비번 없이 아무나 바꿀 수 있어 판정 근거가 못 된다.
  // 데스크톱(세션 없음)은 로컬 판정 유지 — 서버 강제도 자기신고 축이라 여기서 못 닫는다
  // (N-9·Minor 4 = 잔존 한계, 화면에도 그대로 고지한다).
  const isWeb = session != null
  const meRole = session ? session.role : users.find((u) => u.id === activeUserId)?.role
  // A군 C-1 이후 서버 PROTECTED = appUser 쓰기 3종 executive 전용. 화면도 그 계약과 1:1.
  const canEdit = meRole === 'executive'
  const roleOptions = roleOptionsFor(meRole)

  const [newName, setNewName] = useState('')
  const [newTeam, setNewTeam] = useState<string>(TEAMS[3].label) // 품질팀 기본
  const [newRole, setNewRole] = useState<AppUserRole>('member')

  const addUser = async (): Promise<void> => {
    const name = newName.trim()
    if (!name) return
    const maxSort = users.reduce((m, u) => Math.max(m, u.sortOrder), 0)
    const r = await upsertUser({ name, teamDept: newTeam, role: newRole, active: true, sortOrder: maxSort + 1 })
    // N-2 ③: 403 이 조용히 삼켜지던 자리. 실패 시 입력값도 지우지 않는다(재시도 가능).
    if (!r.ok) {
      window.alert(r.error ?? `'${name}' 추가에 실패했습니다 — 이미 있는 이름이거나 저장 오류입니다.`)
      return
    }
    setNewName('')
  }

  const patch = (u: AppUserDto, fields: Partial<AppUserUpsertField>): Promise<WriteResult> => {
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

        {/* N-2 ①②: 진입 게이트 = 표시 전용 전환(화면을 막지 않고 정직하게 고지 — 이름 목록은
            스위처에도 이미 보이므로 열람 자체는 무해하고, 쓰기 UI 만 잠근다) */}
        {!canEdit && (
          <div className="mx-4 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11.5px] leading-snug text-amber-900">
            <b>표시 전용</b> — 사용자 등록·수정·삭제·비밀번호 재설정은 <b>최종관리자(사장님) 전용</b>입니다
            (8/13 판정①·서버 정본). 필요하시면 최종관리자에게 요청하세요.
            {!isWeb && <div className="mt-0.5 text-amber-800/80">데스크톱 실행 — 세션이 없어 로컬 선택으로 판정합니다.</div>}
          </div>
        )}

        {/* 신규 추가 — 최종관리자에게만 노출(비exec 에게 항상 403 날 UI 를 띄우지 않는다) */}
        {canEdit && (
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
              {roleOptions.map((r) => (
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
        )}

        {/* 목록 */}
        <div className="max-h-[52vh] overflow-y-auto p-2">
          {active.map((u) => (
            <UserRow key={u.id} u={u} canEdit={canEdit} roleOptions={roleOptions} onPatch={patch} onDelete={deleteUser} />
          ))}

          {inactive.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border">
              <div className="px-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                비활성(퇴사·휴직) — 기록 이름 보존
              </div>
              {inactive.map((u) => (
                <UserRow key={u.id} u={u} canEdit={canEdit} roleOptions={roleOptions} onPatch={patch} onDelete={deleteUser} />
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
  canEdit,
  roleOptions,
  onPatch,
  onDelete
}: {
  u: AppUserDto
  canEdit: boolean
  roleOptions: { value: AppUserRole; label: string }[]
  onPatch: (u: AppUserDto, fields: Partial<AppUserUpsertField>) => Promise<WriteResult>
  onDelete: (id: number) => Promise<WriteResult>
}): JSX.Element {
  const [name, setName] = useState(u.name)
  const av = avatarStyle(u)

  // N-2 ③: 부서·역할·활성 3동선의 공용 통지 관문. 종전엔 결과를 아무도 안 봐서
  // 403 이 나도 화면이 되돌아가는 것 말고는 아무 말이 없었다.
  const patchOrTell = (fields: Partial<AppUserUpsertField>, what: string): void => {
    void onPatch(u, fields).then((r) => {
      if (!r.ok) window.alert(r.error ?? `'${u.name}' ${what} 변경에 실패했습니다.`)
    })
  }

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
        readOnly={!canEdit}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const v = name.trim()
          if (v && v !== u.name) {
            void onPatch(u, { name: v }).then((r) => {
              if (!r.ok) {
                // N-2 ④: 종전 문구는 원인을 "이미 있는 이름"으로 단정해 403(권한)을 오안내했다.
                // 서버가 사유를 주면 그게 정본, 없을 때만 이름 충돌 가능성을 언급한다.
                window.alert(
                  r.error ?? `'${v}'(으)로 변경할 수 없습니다 — 이미 있는 이름이거나 저장 오류입니다.`
                )
                setName(u.name)
              }
            })
          } else {
            setName(u.name)
          }
        }}
        className={cn(
          'w-24 min-w-0 bg-transparent text-[13px] font-semibold px-1 py-0.5 rounded focus:outline-none',
          canEdit ? 'hover:bg-muted focus:bg-fillable' : 'cursor-default'
        )}
      />
      <select
        value={TEAM_OPTIONS.includes(u.teamDept ?? '') ? (u.teamDept as string) : ''}
        disabled={!canEdit}
        onChange={(e) => patchOrTell({ teamDept: e.target.value || null }, '부서')}
        className="text-[11px] px-1 py-0.5 rounded border border-border bg-background disabled:opacity-60"
      >
        {!TEAM_OPTIONS.includes(u.teamDept ?? '') && <option value="">{u.teamDept || '(부서)'}</option>}
        {TEAM_OPTIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      {/* C-1: 경영진 행은 최종관리자만 편집 — 그 외 화면에선 표시 전용(선택지에도 '경영진' 없음) */}
      <select
        value={u.role}
        disabled={!canEdit || (u.role === 'executive' && !roleOptions.some((r) => r.value === 'executive'))}
        onChange={(e) => patchOrTell({ role: e.target.value as AppUserRole }, '역할')}
        className="text-[11px] px-1 py-0.5 rounded border border-border bg-background disabled:opacity-60"
      >
        {u.role === 'executive' && !roleOptions.some((r) => r.value === 'executive') && (
          <option value="executive">경영진</option>
        )}
        {roleOptions.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>

      <div className="ml-auto flex items-center gap-0.5 shrink-0">
        {/* 비밀번호 재설정(관리형 비번 체계, W4) — 관리팀이 4자리 지정·대장 관리. 웹은 manager+ 서버 가드 */}
        <button
          type="button"
          disabled={!canEdit}
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
              // M-10(8/13 검수): 403(권한)·401(세션) 이 무통지로 삼켜지던 자리 — 서버 안내문 표출
              .catch((e) => window.alert(invokeErrText(e, '재설정 실패 — 통신 오류. 다시 시도해 주세요.')))
          }}
          title={
            canEdit
              ? '비밀번호 재설정 — 4자리 숫자 지정(관리팀 비번 대장 정책)'
              : '비밀번호 재설정 — 최종관리자 전용'
          }
          className="rounded p-1 text-muted-foreground hover:bg-amber-50 hover:text-amber-700 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        >
          <KeyRound className="w-3.5 h-3.5" />
        </button>
        {/* 비활성/활성 토글 — 퇴사 처리의 기본 동작 */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => patchOrTell({ active: !u.active }, u.active ? '비활성' : '활성화')}
          title={
            canEdit
              ? u.active
                ? '비활성(퇴사·휴직) — 이름은 기록에 보존'
                : '다시 활성화'
              : '활성 전환 — 최종관리자 전용'
          }
          className={cn(
            'rounded p-1 transition-colors disabled:opacity-40 disabled:hover:bg-transparent',
            u.active ? 'text-muted-foreground hover:bg-muted' : 'text-green-600 hover:bg-green-50'
          )}
        >
          {u.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
        </button>
        {/* 완전 삭제 — 오타 정리용(확인 후). 기록 주체는 비활성 권장 */}
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => {
            void (async () => {
              const ok = await confirmDialog({
                title: `'${u.name}'을(를) 완전 삭제할까요?`,
                body: '퇴사자는 삭제하지 말고 비활성(전원 아이콘)하세요 — 과거 기록의 이름이 보존됩니다.\n삭제는 오타 입력 정리용입니다.',
                okLabel: '완전 삭제',
                danger: true
              })
              if (!ok) return
              // N-2 ③: 삭제 실패(403·FK 등)가 통째로 삼켜지던 자리 — 목록만 그대로라 성공 오인
              const r = await onDelete(u.id)
              if (!r.ok) window.alert(r.error ?? `'${u.name}' 삭제에 실패했습니다.`)
            })()
          }}
          title={canEdit ? '완전 삭제 — 오타 정리용(퇴사자는 비활성 권장)' : '삭제 — 최종관리자 전용'}
          className="rounded p-1 text-muted-foreground/60 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground/60"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}
