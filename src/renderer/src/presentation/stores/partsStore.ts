import { create } from 'zustand'
import type { PartListItem, PartDetailDto } from '@shared/ipc-types'

interface ImportNotice {
  kind: 'ok' | 'err'
  text: string
}

interface PartsState {
  list: PartListItem[]
  loadingList: boolean
  loadList: () => Promise<void>

  selected: string | null
  detail: PartDetailDto | null
  loadingDetail: boolean
  select: (partNo: string | null) => Promise<void>

  importing: boolean
  importNotice: ImportNotice | null
  dismissImportNotice: () => void
  importIsir: () => Promise<void>
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
  },

  importing: false,
  importNotice: null,
  dismissImportNotice: () => set({ importNotice: null }),
  importIsir: async () => {
    set({ importing: true, importNotice: null })
    try {
      const r = await window.api.invoke(window.api.channels.PARTS_IMPORT_ISIR)
      if (r.canceled) return
      if (!r.success) {
        set({ importNotice: { kind: 'err', text: r.error || 'ISIR 적재에 실패했습니다.' } })
        return
      }
      // 목록 갱신 후 적재 품번으로 강제 재선택(재임포트 시 상세 캐시 무효화)
      await get().loadList()
      if (r.partNo) {
        set({ selected: null, detail: null })
        await get().select(r.partNo)
      }
      const verb = r.replaced ? '갱신' : '적재'
      set({
        importNotice: {
          kind: 'ok',
          text: `${r.partNo} ${verb} 완료 — 관리항목 ${r.cpItemCount}개·${r.processCount}공정, 26종 중 보유 ${r.presentCount} · ${r.submitTypeLabel}`
        }
      })
    } finally {
      set({ importing: false })
    }
  }
}))
