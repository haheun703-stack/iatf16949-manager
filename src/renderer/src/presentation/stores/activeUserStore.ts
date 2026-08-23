import { create } from 'zustand'
import { invokeErrText } from '../lib/errText'
import type { AppUserDto, AppUserRole, AppUserUpsertInput } from '@shared/ipc-types'

/**
 * P2 — 공용 PC 사용자 전환 (12번 지시서 §2(1)·§4).
 * 활성 사용자는 회사 DB가 아니라 로컬 상태(localStorage 'active_user_id')에만 둔다.
 * currentUser() 이름이 완료·작성 기록의 주체(doneBy/createdBy/updatedBy)로 전달된다.
 *
 * ⚠ activeUserId 는 **권한 판정 근거가 아니다**(N-7, 8/14 검수 2차): 스위처는 비번 없이
 * 아무나 바꿀 수 있어 로컬 role 을 믿으면 클릭 1회로 '경영진' 화면이 열린다. 권한 판정은
 * 아래 `session`(= /api/auth:me · 서버 세션 정본)만 쓴다.
 */
const ACTIVE_KEY = 'active_user_id'

/** 서버 세션 사용자(웹 정본). 데스크톱(세션 개념 없음)·비로그인 = null. */
export interface SessionUser {
  id: number
  name: string
  role: AppUserRole
  teamDept: string | null
  /** M2(8/23) 라이선스 — IATF 애드온 언락 여부(app_config license.iatf_addon). 데스크톱/구서버 = undefined → 잠금 없음(현행 유지) */
  license?: { iatfAddon: boolean }
}

/** 쓰기 결과 — 실패 사유를 호출부까지 올린다(N-2: 종전엔 store catch 가 삼켰다). */
export interface WriteResult {
  ok: boolean
  error?: string
}

/** 세션 조회. 실패(Electron·오프라인·401) = null — "모름"이 아니라 "세션 없음"으로 확정한다. */
async function fetchSession(): Promise<SessionUser | null> {
  try {
    const r = await fetch('/api/auth:me')
    if (!r.ok) return null
    const me = (await r.json()) as Partial<SessionUser>
    if (typeof me.id !== 'number' || typeof me.role !== 'string') return null
    return {
      id: me.id,
      name: String(me.name ?? ''),
      role: me.role as AppUserRole,
      teamDept: me.teamDept ?? null,
      license: me.license && typeof me.license.iatfAddon === 'boolean' ? { iatfAddon: me.license.iatfAddon } : undefined
    }
  } catch {
    return null
  }
}

function readActiveId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

interface ActiveUserState {
  users: AppUserDto[]
  activeUserId: number | null
  loaded: boolean
  /** 서버 세션(웹 정본) — 권한 판정의 유일한 근거. 데스크톱·비로그인 = null (N-7) */
  session: SessionUser | null
  /** 세션 조회를 1회라도 마쳤는가 — 판정 전 "확인 중" 표기용(가짜 거부 화면 깜빡임 방지) */
  sessionChecked: boolean
  /** app_users 목록 로드 + 세션 확정 + 저장된 활성 id 유효성 재검(삭제/비활성 시 해제) */
  loadUsers: () => Promise<void>
  /** 세션만 다시 읽기(라이선스 언락 직후 등) */
  refreshSession: () => Promise<void>
  setActiveUser: (id: number | null) => void
  /** 사용자 추가/편집(SettingsMenu 관리). 실패 사유 동반 반환 + 목록 재로드 */
  upsertUser: (input: AppUserUpsertInput) => Promise<WriteResult>
  /** 완전 삭제 — 오타 정리용. 퇴사자는 삭제 대신 active=false 로 비활성(기록 주체 이름 보존) */
  deleteUser: (id: number) => Promise<WriteResult>
}

export const useActiveUserStore = create<ActiveUserState>((set, get) => ({
  users: [],
  activeUserId: readActiveId(),
  loaded: false,
  session: null,
  sessionChecked: false,

  refreshSession: async () => {
    const session = await fetchSession()
    set({ session, sessionChecked: true })
  },
  loadUsers: async () => {
    // N-7: 세션을 **목록보다 먼저** 확정한다 — 목록 조회가 실패해도 권한 판정은 남아야 하고
    //      (종전엔 try 안에 있어 실패 시 sessionChecked 가 영원히 false), 판정 근거를
    //      localStorage 가 아니라 서버 세션으로 못 박는 자리이기도 하다.
    const session = await fetchSession()
    set({ session, sessionChecked: true })

    try {
      const users = (await window.api.invoke(window.api.channels.APP_USER_LIST)) as AppUserDto[]

      // 웹 모드: 기록 주체는 세션이 정본 — 활성 사용자를 세션 사용자로 강제 동기화(검수 7/30
      // M-작성자: values_json 작성자 칸이 localStorage 사용자로 채워져 DB created_by 와 불일치).
      // Electron(세션 없음)에서는 session=null → 로컬 선택을 유지한다.
      // 알려진 한계: 웹에서 로드 후 수동 전환하면 다시 어긋날 수 있다 — 서버 STAMP 가 created_by
      // 를 세션으로 강제하므로 DB 주체는 항상 옳고, 다음 로드 때 재동기화된다.
      const sessionId = session?.id ?? null
      if (sessionId != null && users.some((u) => u.id === sessionId && u.active)) {
        try {
          localStorage.setItem(ACTIVE_KEY, String(sessionId))
        } catch {
          /* 무시 */
        }
        set({ users, loaded: true, activeUserId: sessionId })
        return
      }

      const cur = get().activeUserId
      // 저장된 활성 id가 목록에 없거나 비활성이면 선택 해제(공용 PC에서 삭제된 사용자 잔존 방지)
      const stillValid = cur != null && users.some((u) => u.id === cur && u.active)
      if (cur != null && !stillValid) {
        try {
          localStorage.removeItem(ACTIVE_KEY)
        } catch {
          /* 무시 */
        }
      }
      set({ users, loaded: true, activeUserId: stillValid ? cur : null })
    } catch {
      set({ loaded: true })
    }
  },

  setActiveUser: (id) => {
    try {
      if (id == null) localStorage.removeItem(ACTIVE_KEY)
      else localStorage.setItem(ACTIVE_KEY, String(id))
    } catch {
      /* 무시 */
    }
    set({ activeUserId: id })
  },

  // N-2(8/14 검수 2차): C-1 로 appUser 쓰기 3종이 executive 전용이 되면서 부서·역할·활성·
  // 등록·삭제 5동선이 **전부 무통지**가 됐다(여기 catch 가 403 을 삼키고 호출부는 이유를
  // 모른 채 "이미 있는 이름"으로 단정 오안내). 실패 사유는 서버 안내문이 정본 —
  // invokeErrText 경유로 그대로 올린다(신규 쓰기 화면 규약, W4-B 소견).
  upsertUser: async (input) => {
    try {
      const res = (await window.api.invoke(window.api.channels.APP_USER_UPSERT, input)) as {
        success: boolean
        id?: number
        error?: string
      }
      await get().loadUsers()
      return res.success ? { ok: true } : { ok: false, error: res.error }
    } catch (e) {
      return { ok: false, error: invokeErrText(e, '저장 실패 — 통신 오류. 다시 시도해 주세요.') }
    }
  },

  deleteUser: async (id) => {
    try {
      const res = (await window.api.invoke(window.api.channels.APP_USER_DELETE, { id })) as {
        success: boolean
        error?: string
      }
      await get().loadUsers()
      return res.success ? { ok: true } : { ok: false, error: res.error }
    } catch (e) {
      // 실패 시 목록 불변 — 사유는 화면이 알린다
      return { ok: false, error: invokeErrText(e, '삭제 실패 — 통신 오류. 다시 시도해 주세요.') }
    }
  }
}))
