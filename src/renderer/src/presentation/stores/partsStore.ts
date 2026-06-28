import { create } from 'zustand'
import type { PartListItem, PartDetailDto } from '@shared/ipc-types'

interface PartsState {
  list: PartListItem[]
  loadingList: boolean
  loadList: () => Promise<void>

  selected: string | null
  detail: PartDetailDto | null
  loadingDetail: boolean
  select: (partNo: string | null) => Promise<void>
}

/** 품번/ISIR 척추 — 목록 + 통합 상세(완비도·관리계획서·불량 이력). */
export const usePartsStore = create<PartsState>((set, get) => ({
  list: [],
  loadingList: false,
  loadList: async () => {
    set({ loadingList: true })
    try {
      const list = await window.api.invoke(window.api.channels.PARTS_LIST)
      set({ list })
    } finally {
      set({ loadingList: false })
    }
  },

  selected: null,
  detail: null,
  loadingDetail: false,
  select: async (partNo) => {
    const cur = get()
    // 동일 품번 + 이미 로드됨 → 재fetch 생략(빈화면 깜빡임 방지)
    if (partNo && cur.selected === partNo && cur.detail) return
    set({ selected: partNo, detail: null })
    if (!partNo) return
    set({ loadingDetail: true })
    try {
      const detail = await window.api.invoke(window.api.channels.PART_DETAIL, { partNo })
      // 비동기 경합 방지: 선택이 그대로일 때만 반영
      set((s) => (s.selected === partNo ? { detail } : {}))
    } finally {
      // 경합 방지: 늦게 끝난 이전 선택이 현재 로딩표시를 끄지 않도록
      set((s) => (s.selected === partNo ? { loadingDetail: false } : {}))
    }
  }
}))
