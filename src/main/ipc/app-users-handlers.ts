import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type { AppUserDto, AppUserUpsertInput, AppUserRole } from '@shared/ipc-types'

/**
 * P2 — 공용 PC 사용자 전환. app_users(0085) 명단 CRUD.
 * ⚠️활성 사용자(active_user_id)는 여기 저장 안 함 — 렌더러 로컬 상태(activeUserStore).
 *   회사 데이터(SQLite)에 세션 상태 미혼입(12번 지시서 §2(1)).
 */
const VALID_ROLES: AppUserRole[] = ['member', 'manager', 'executive']

/**
 * C-1(8/13 전수 검수) — 사용자 관리 쓰기 공통 방어(웹 PROTECTED executive 전용의 2중막):
 * ① 주체 없음(데스크톱 bridge 직행 = 세션 미주입) = 거부 — W4-C 데스크톱 방어선과 동일 계약.
 * ② executive 가 아니면 경영진을 만들 수도(role 지정) 건드릴 수도(수정·삭제·비번) 없다.
 * 반환 = 거부 사유 문구, 통과 시 null.
 */
function actorDenied(
  db: ReturnType<typeof getSqlite>,
  actorRole: string | undefined,
  targetId: number | undefined,
  wantRole?: string
): string | null {
  if (!actorRole) return '작업 주체가 없습니다 — 웹 로그인 세션에서만 가능합니다.'
  if (actorRole === 'executive') return null
  if (wantRole === 'executive') return '경영진 역할 부여는 최종관리자 전용입니다.'
  if (targetId != null) {
    const t = db.prepare('SELECT role FROM app_users WHERE id=?').get(targetId) as { role?: string } | undefined
    if (t?.role === 'executive') return '경영진 계정은 최종관리자만 관리할 수 있습니다.'
  }
  return null
}

export function registerAppUsersHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.APP_USER_LIST, (): AppUserDto[] => {
    try {
      const rows = db
        .prepare(
          `SELECT id, name, team_dept, role, active, sort_order
           FROM app_users ORDER BY active DESC, sort_order ASC, id ASC`
        )
        .all() as Array<Record<string, unknown>>
      return rows.map((r) => ({
        id: r.id as number,
        name: r.name as string,
        teamDept: (r.team_dept as string) || null,
        role: ((r.role as string) || 'member') as AppUserRole,
        active: (r.active as number) === 1,
        sortOrder: (r.sort_order as number) ?? 0
      }))
    } catch (err) {
      console.error('[appUser:list] failed:', (err as Error).message)
      return []
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.APP_USER_UPSERT,
    (_e, input: AppUserUpsertInput): { success: boolean; id?: number; error?: string } => {
      try {
        const name = (input.name || '').trim()
        if (!name) return { success: false }
        const role: AppUserRole = input.role && VALID_ROLES.includes(input.role) ? input.role : 'member'
        // C-1: INSERT 경로도 name UNIQUE 충돌 시 기존 행을 UPDATE 하므로, 대상 = id 또는 동명 기존 행.
        const existing = input.id
          ? input.id
          : (db.prepare('SELECT id FROM app_users WHERE name=?').get(name) as { id?: number } | undefined)?.id
        const denied = actorDenied(db, input.actorRole, existing, role)
        if (denied) return { success: false, error: denied }
        const active = input.active === false ? 0 : 1
        const teamDept = input.teamDept ?? null
        const sortOrder = input.sortOrder ?? 0
        if (input.id) {
          db.prepare(
            `UPDATE app_users SET name=?, team_dept=?, role=?, active=?, sort_order=? WHERE id=?`
          ).run(name, teamDept, role, active, sortOrder, input.id)
          return { success: true, id: input.id }
        }
        // name UNIQUE — 같은 이름 재등록 시 갱신(중복 행 방지)
        const info = db
          .prepare(
            `INSERT INTO app_users (name, team_dept, role, active, sort_order) VALUES (?,?,?,?,?)
             ON CONFLICT(name) DO UPDATE SET
               team_dept=excluded.team_dept, role=excluded.role,
               active=excluded.active, sort_order=excluded.sort_order`
          )
          .run(name, teamDept, role, active, sortOrder)
        return { success: true, id: Number(info.lastInsertRowid) }
      } catch (err) {
        console.error('[appUser:upsert] failed:', (err as Error).message)
        return { success: false }
      }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.APP_USER_DELETE,
    (_e, { id, actorRole }: { id: number; actorName?: string; actorRole?: string }): { success: boolean; error?: string } => {
      try {
        const denied = actorDenied(db, actorRole, id)
        if (denied) return { success: false, error: denied }
        db.prepare('DELETE FROM app_users WHERE id=?').run(id)
        return { success: true }
      } catch (err) {
        console.error('[appUser:delete] failed:', (err as Error).message)
        return { success: false }
      }
    }
  )

  // 관리형 비번 체계(W4, 사장님 7/25): 관리팀이 4자리 숫자 비번을 지정·재설정.
  // must_change_pw=0 고정 — 강제 변경 없음, 대장(관리팀 보관)이 정본. 웹 모드는 manager+ 가드(server PROTECTED).
  ipcMain.handle(
    IPC_CHANNELS.APP_USER_RESET_PASSWORD,
    (
      _e,
      { id, newPassword, actorName, actorRole }: { id: number; newPassword: string; actorName?: string; actorRole?: string }
    ): { success: boolean; error?: string } => {
      try {
        const denied = actorDenied(db, actorRole, id)
        if (denied) return { success: false, error: denied }
        if (!/^\d{4}$/.test(newPassword ?? '')) {
          return { success: false, error: '비밀번호는 4자리 숫자입니다(관리팀 대장 정책).' }
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const bcrypt = require('bcryptjs') as { hashSync: (s: string, r: number) => string }
        const hash = bcrypt.hashSync(newPassword, 10)
        // C-1 감사 각인(0143): 누가 언제 바꿨나 — 세션 주입 actorName 이 주체(무기록 금지)
        const res = db
          .prepare(
            "UPDATE app_users SET password_hash=?, must_change_pw=0, pw_reset_by=?, pw_reset_at=datetime('now','localtime') WHERE id=?"
          )
          .run(hash, actorName ?? null, id)
        return res.changes > 0 ? { success: true } : { success: false, error: '대상 사용자가 없습니다.' }
      } catch (err) {
        // 0100/0143 미적용 DB(구 설치판) 등 — 정직 실패
        console.error('[appUser:resetPassword] failed:', (err as Error).message)
        return { success: false, error: (err as Error).message }
      }
    }
  )
}
