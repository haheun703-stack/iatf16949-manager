import { create } from 'zustand'
import type { ScreenPermEffectiveDto, ScreenPermBits } from '@shared/ipc-types'
import type { PageId } from './uiStore'

/**
 * W4-B(37호 — 34호 #19) — 화면 숨김(보조)용 유효 권한.
 * 정본은 서버 디스패처(SCREEN_GUARD — 쓰기·수정·삭제·엑셀 서버 403). 여기는 메뉴/탭에서
 * 읽기 꺼진 화면을 감추는 보조막 — 숨겨도 서버 정본이 최종 방어선(딥링크 등).
 * perm:effective 는 세션 사용자 기준(서버 STAMP) — 데스크톱(세션 없음)·executive = bypass
 * (규칙 미적용 = 현행 그대로). 로드 실패 시에도 bypass 유지(가짜 차단 금지).
 */
interface PermState {
  bypass: boolean
  rules: Record<string, ScreenPermBits>
  loaded: boolean
  load: () => Promise<void>
  /** 규칙 없는 화면 = 허용(현행). 읽기 0 규칙만 false. */
  canRead: (page: PageId) => boolean
}

export const usePermStore = create<PermState>((set, get) => ({
  bypass: true,
  rules: {},
  loaded: false,

  load: async () => {
    try {
      const res = (await window.api.invoke(window.api.channels.PERM_EFFECTIVE)) as ScreenPermEffectiveDto
      set({ bypass: res.bypass, rules: res.rules ?? {}, loaded: true })
    } catch {
      set({ bypass: true, rules: {}, loaded: true })
    }
  },

  canRead: (page) => {
    const { bypass, rules } = get()
    if (bypass) return true
    const r = rules[page]
    return r ? r.read : true
  }
}))
