import { create } from 'zustand'
import type {
  SqTrackOverviewDto,
  SqTrackPartDetailDto,
  SqTrackItemUpdateInput,
  SqTrackStatus
} from '@shared/ipc-types'

interface SqTrackState {
  overview: SqTrackOverviewDto | null
  loadingOverview: boolean
  loadOverview: () => Promise<void>

  selected: string | null
  detail: SqTrackPartDetailDto | null
  loadingDetail: boolean
  selectPart: (partNo: string | null) => Promise<void>
  back: () => void

  /** 상태·메모 낙관 갱신 → IPC → 실패 시 상세 재로드. 오버뷰 카운트는 재조회. */
  updateItem: (input: SqTrackItemUpdateInput) => Promise<void>

  setAuditDate: (date: string) => Promise<void>
}

/** SQ 심사 아이템 트랙 — 품번 4종 × 4단계(서류/정합성/현장/인터뷰) 체크리스트. */
export const useSqTrackStore = create<SqTrackState>((set, get) => ({
  overview: null,
  loadingOverview: false,
  loadOverview: async () => {
    set({ loadingOverview: true })
    try {
      const overview = await window.api.invoke(window.api.channels.SQTRACK_OVERVIEW)
      set({ overview })
    } finally {
      set({ loadingOverview: false })
    }
  },

  selected: null,
  detail: null,
  loadingDetail: false,
  selectPart: async (partNo) => {
    const cur = get()
    if (partNo && cur.selected === partNo && cur.detail) return
    set({ selected: partNo, detail: null })
    if (!partNo) return
    set({ loadingDetail: true })
    try {
      const detail = await window.api.invoke(window.api.channels.SQTRACK_PART_DETAIL, { partNo })
      set((s) => (s.selected === partNo ? { detail } : {}))
    } finally {
      set((s) => (s.selected === partNo ? { loadingDetail: false } : {}))
    }
  },
  back: () => set({ selected: null, detail: null }),

  updateItem: async (input) => {
    const { detail, selected } = get()
    if (detail) {
      // 낙관 갱신: 화면 즉시 반영
      const next: SqTrackPartDetailDto = {
        ...detail,
        phases: detail.phases.map((p) => ({
          ...p,
          items: p.items.map((it) =>
            it.code === input.itemCode
              ? {
                  ...it,
                  status: (input.status ?? it.status) as SqTrackStatus,
                  note: 'note' in input ? (input.note ?? null) : it.note
                }
              : it
          )
        }))
      }
      set({ detail: next })
    }
    const res = await window.api.invoke(window.api.channels.SQTRACK_ITEM_UPDATE, input)
    if (!res.success && selected) {
      // 실패 시 서버 상태로 복원
      set({ detail: null })
      await get().selectPart(selected)
      return
    }
    // 오버뷰 카운트 동기화(가벼운 재조회)
    void get().loadOverview()
  },

  setAuditDate: async (date) => {
    await window.api.invoke(window.api.channels.SQTRACK_SET_AUDIT_DATE, { date })
    await get().loadOverview()
  }
}))
