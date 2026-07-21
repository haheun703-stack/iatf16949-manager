import { create } from 'zustand'
import type { AppUserDto, AppUserUpsertInput } from '@shared/ipc-types'

/**
 * P2 — 공용 PC 사용자 전환 (12번 지시서 §2(1)·§4).
 * 활성 사용자는 회사 DB가 아니라 로컬 상태(localStorage 'active_user_id')에만 둔다.
 * currentUser() 이름이 완료·작성 기록의 주체(doneBy/createdBy/updatedBy)로 전달된다.
 */
const ACTIVE_KEY = 'active_user_id'

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
  /** app_users 목록 로드 + 저장된 활성 id 유효성 재검(삭제/비활성 시 해제) */
  loadUsers: () => Promise<void>
  setActiveUser: (id: number | null) => void
  /** 현재 활성 사용자 객체(없으면 null) */
  currentUser: () => AppUserDto | null
  /** 기록 주체로 넘길 이름(없으면 null → 호출측이 defaultAuthor 폴백) */
  currentName: () => string | null
  /** 사용자 추가/편집(SettingsMenu 관리). 성공 후 목록 재로드 */
  upsertUser: (input: AppUserUpsertInput) => Promise<void>
  /** 완전 삭제 — 오타 정리용. 퇴사자는 삭제 대신 active=false 로 비활성(기록 주체 이름 보존) */
  deleteUser: (id: number) => Promise<void>
}

export const useActiveUserStore = create<ActiveUserState>((set, get) => ({
  users: [],
  activeUserId: readActiveId(),
  loaded: false,

  loadUsers: async () => {
    try {
      const users = (await window.api.invoke(window.api.channels.APP_USER_LIST)) as AppUserDto[]
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

  currentUser: () => {
    const { users, activeUserId } = get()
    return users.find((u) => u.id === activeUserId) || null
  },

  currentName: () => {
    const u = get().currentUser()
    return u ? u.name : null
  },

  upsertUser: async (input) => {
    try {
      await window.api.invoke(window.api.channels.APP_USER_UPSERT, input)
      await get().loadUsers()
    } catch {
      /* 실패 시 목록 불변 */
    }
  },

  deleteUser: async (id) => {
    try {
      await window.api.invoke(window.api.channels.APP_USER_DELETE, { id })
      await get().loadUsers()
    } catch {
      /* 실패 시 목록 불변 */
    }
  }
}))
