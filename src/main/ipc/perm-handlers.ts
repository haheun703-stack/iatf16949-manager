import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { SCREEN_PERM_PAGE_IDS } from '@shared/screen-perm-pages'
import { getSqlite } from '../database/connection'
import type {
  ScreenPermBits,
  ScreenPermRuleDto,
  ScreenPermSaveInput,
  ScreenPermEffectiveDto
} from '@shared/ipc-types'

/**
 * W4-B(37호 — 34호 #19) — 화면별 권한 매트릭스(0142 screen_permission).
 * 그림33 골격: 권한그룹(부서 = team_dept) + 개인 오버라이드 × 화면(PageId) × 7종 체크.
 * - 규칙 부재 = 현행 허용(효력은 규칙이 있는 화면·주체에만) — 시드 0행 원칙.
 * - 단가(can_price)는 스키마 CHECK 하드락(37호 ③ 전원 잠금) — 여기서도 친절 거부(이중 방어).
 * - 강제(서버 정본)는 server/index.cjs 디스패처의 SCREEN_GUARD — 여기는 조회·저장 채널만.
 * - executive = 그림33 [그룹] 최종관리자: effective 에서 bypass(매트릭스 무시 전권).
 */

interface PermRow {
  id: number
  subject_kind: 'team' | 'user'
  subject_key: string
  page_id: string
  can_read: number
  can_write: number
  can_edit: number
  can_delete: number
  can_excel: number
  can_print: number
  can_price: number
  updated_by: string | null
  updated_at: string
}

function bitsOf(r: PermRow): ScreenPermBits {
  return {
    read: r.can_read === 1,
    write: r.can_write === 1,
    edit: r.can_edit === 1,
    delete: r.can_delete === 1,
    excel: r.can_excel === 1,
    print: r.can_print === 1,
    price: r.can_price === 1
  }
}

export function registerPermHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.PERM_LIST, (): ScreenPermRuleDto[] => {
    try {
      const rows = db
        .prepare('SELECT * FROM screen_permission ORDER BY subject_kind, subject_key, page_id')
        .all() as PermRow[]
      return rows.map((r) => ({
        id: r.id,
        subjectKind: r.subject_kind,
        subjectKey: r.subject_key,
        pageId: r.page_id,
        ...bitsOf(r),
        updatedBy: r.updated_by,
        updatedAt: r.updated_at
      }))
    } catch (err) {
      console.error('[perm:list] failed:', (err as Error).message)
      return []
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.PERM_SAVE,
    (_e, input: ScreenPermSaveInput): { success: boolean; saved?: number; error?: string } => {
      try {
        if (input?.subjectKind !== 'team' && input?.subjectKind !== 'user') {
          return { success: false, error: '주체 종류(team/user)가 없습니다.' }
        }
        let subjectKey = String(input.subjectKey ?? '').trim()
        if (!subjectKey) return { success: false, error: '주체(부서/개인)가 없습니다.' }
        if (input.subjectKind === 'user' && !input.remove) {
          // Minor(8/13 검수) — subject_key 정규화: '007' 같은 표기 변형이 별도 규칙 행이 되는
          // 것을 차단(개인 키 = 정규 숫자 문자열 단일 표기). remove 는 정규화·존재 검사 제외 —
          // 퇴사자 삭제·부서 개명으로 생긴 고아 규칙도 해제는 가능해야 한다(고아 정리 동선).
          const idNum = Number(subjectKey)
          if (!Number.isInteger(idNum) || idNum <= 0) {
            return { success: false, error: `개인 주체 키가 숫자가 아닙니다: '${subjectKey}'` }
          }
          subjectKey = String(idNum)
          const u = db.prepare('SELECT id FROM app_users WHERE id = ?').get(idNum)
          if (!u) return { success: false, error: `개인 주체(#${subjectKey})가 명단에 없습니다.` }
        }
        const pageIds = (input.pageIds ?? []).map((p) => String(p).trim()).filter(Boolean)
        if (pageIds.length === 0) return { success: false, error: '저장할 화면을 선택하세요.' }
        // Minor(8/13 검수) — pageIds 화이트리스트: 오타·임의 문자열이 유령 규칙 행으로
        // 쌓이는 것을 차단(고아 규칙 예방 — 목록 계약은 shared/screen-perm-pages).
        // remove 는 제외 — 구판이 남긴 목록 밖 규칙도 해제는 가능해야 한다.
        if (!input.remove) {
          const unknown = pageIds.filter((p) => !(SCREEN_PERM_PAGE_IDS as readonly string[]).includes(p))
          if (unknown.length > 0) {
            return { success: false, error: `알 수 없는 화면 ID: ${unknown.join(', ')} — 메뉴 트리의 화면만 저장할 수 있습니다.` }
          }
        }

        if (input.remove) {
          const del = db.prepare(
            'DELETE FROM screen_permission WHERE subject_kind = ? AND subject_key = ? AND page_id = ?'
          )
          const txn = db.transaction(() => {
            let n = 0
            for (const p of pageIds) n += del.run(input.subjectKind, subjectKey, p).changes
            return n
          })
          return { success: true, saved: txn() }
        }

        const b = input.bits
        if (!b) return { success: false, error: '권한 값(bits)이 없습니다.' }
        // 37호 ③ — 단가 전원 잠금(스키마 CHECK 이전의 친절 거부·이중 방어)
        if (b.price) {
          return { success: false, error: '단가 권한은 잠겨 있습니다(돈 경계 헌법 — 개방은 별도 판정).' }
        }
        // 읽기 0 + 다른 비트 1 = 모순 규칙(못 보는 화면에 쓰기?) — 저장 전 거부(정직 매트릭스)
        if (!b.read && (b.write || b.edit || b.delete || b.excel || b.print)) {
          return { success: false, error: '읽기가 꺼진 화면에 다른 권한을 켤 수 없습니다.' }
        }
        const updatedBy = (input.updatedBy ?? '').trim() || null
        const up = db.prepare(
          `INSERT INTO screen_permission
             (subject_kind, subject_key, page_id, can_read, can_write, can_edit, can_delete,
              can_excel, can_print, can_price, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))
           ON CONFLICT(subject_kind, subject_key, page_id) DO UPDATE SET
             can_read = excluded.can_read, can_write = excluded.can_write,
             can_edit = excluded.can_edit, can_delete = excluded.can_delete,
             can_excel = excluded.can_excel, can_print = excluded.can_print,
             updated_by = excluded.updated_by, updated_at = excluded.updated_at`
        )
        const txn = db.transaction(() => {
          for (const p of pageIds) {
            up.run(
              input.subjectKind, subjectKey, p,
              b.read ? 1 : 0, b.write ? 1 : 0, b.edit ? 1 : 0, b.delete ? 1 : 0,
              b.excel ? 1 : 0, b.print ? 1 : 0, updatedBy
            )
          }
          return pageIds.length
        })
        return { success: true, saved: txn() }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  // 현 세션 사용자의 병합 규칙(개인 행이 그 화면의 팀 행을 통째로 대체 — 그림33 오버라이드).
  // userName 은 서버 STAMP 주입(세션 정본). 미주입(데스크톱·세션 없음) = bypass(현행 유지).
  ipcMain.handle(
    IPC_CHANNELS.PERM_EFFECTIVE,
    (_e, req: { userName?: string } | undefined): ScreenPermEffectiveDto => {
      try {
        const name = (req?.userName ?? '').trim()
        if (!name) return { bypass: true, rules: {} }
        const u = db
          .prepare('SELECT id, role, team_dept FROM app_users WHERE name = ? AND active = 1')
          .get(name) as { id: number; role: string; team_dept: string | null } | undefined
        if (!u) return { bypass: true, rules: {} }
        if (u.role === 'executive') return { bypass: true, rules: {} }
        const rules: Record<string, ScreenPermBits> = {}
        if (u.team_dept) {
          const teamRows = db
            .prepare("SELECT * FROM screen_permission WHERE subject_kind = 'team' AND subject_key = ?")
            .all(u.team_dept) as PermRow[]
          for (const r of teamRows) rules[r.page_id] = bitsOf(r)
        }
        const userRows = db
          .prepare("SELECT * FROM screen_permission WHERE subject_kind = 'user' AND subject_key = ?")
          .all(String(u.id)) as PermRow[]
        for (const r of userRows) rules[r.page_id] = bitsOf(r)
        return { bypass: false, rules }
      } catch (err) {
        // 0142 미적용 DB(구 설치판) 등 — 통제 불능 시 현행 유지가 안전(가짜 차단 금지)
        console.error('[perm:effective] failed:', (err as Error).message)
        return { bypass: true, rules: {} }
      }
    }
  )
}
