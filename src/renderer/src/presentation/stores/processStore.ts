import { create } from 'zustand'
import type { ProcessListItemDto, ProcessDetailDto } from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface ProcessState {
  list: ProcessListItemDto[]
  listLoading: boolean
  loadList: () => Promise<void>

  detail: ProcessDetailDto | null
  detailLoading: boolean
  loadDetail: (code: string, opts?: { keepPageIdx?: boolean }) => Promise<void>

  currentPageIdx: number
  setCurrentPageIdx: (idx: number) => void

  uploadPageImage: (pageId: number) => Promise<{ success: boolean; error?: string }>
  deletePageImage: (pageId: number) => Promise<void>
  addPage: (pageLabel: string) => Promise<void>

  readPageImage: (pageId: number) => Promise<string | null>
}

export const useProcessStore = create<ProcessState>((set, get) => ({
  list: [],
  listLoading: false,
  loadList: async () => {
    set({ listLoading: true })
    const res = (await window.api.invoke(ch('PROCESS_LIST'))) as ProcessListItemDto[]
    set({ list: res, listLoading: false })
  },

  detail: null,
  detailLoading: false,
  loadDetail: async (code, opts) => {
    set({ detailLoading: true })
    const res = (await window.api.invoke(ch('PROCESS_GET_DETAIL'), { code })) as
      | ProcessDetailDto
      | null
    set((s) => {
      const pageCount = res?.pages.length ?? 0
      // 이미지 변경 후 재조회 시 현재 페이지 유지(범위 초과 시 clamp). 평소엔 0페이지.
      let idx = opts?.keepPageIdx ? s.currentPageIdx : 0
      if (idx > pageCount - 1) idx = Math.max(0, pageCount - 1)
      return { detail: res, detailLoading: false, currentPageIdx: idx }
    })
  },

  currentPageIdx: 0,
  setCurrentPageIdx: (idx) => set({ currentPageIdx: idx }),

  uploadPageImage: async (pageId) => {
    const res = (await window.api.invoke(ch('PROCESS_PAGE_UPLOAD'), { pageId })) as {
      success: boolean
      error?: string
    }
    if (res.success) {
      const { detail, loadDetail } = get()
      if (detail) await loadDetail(detail.code, { keepPageIdx: true })
    }
    return res
  },

  deletePageImage: async (pageId) => {
    await window.api.invoke(ch('PROCESS_PAGE_DELETE_IMAGE'), { pageId })
    const { detail, loadDetail } = get()
    if (detail) await loadDetail(detail.code, { keepPageIdx: true })
  },

  addPage: async (pageLabel) => {
    const { detail } = get()
    if (!detail) return
    await window.api.invoke(ch('PROCESS_PAGE_ADD'), {
      processCode: detail.code,
      pageLabel
    })
    await get().loadDetail(detail.code, { keepPageIdx: true })
    // 새로 추가된 마지막 페이지로 이동
    set((s) => ({ currentPageIdx: Math.max(0, (s.detail?.pages.length ?? 1) - 1) }))
  },

  readPageImage: async (pageId) => {
    const res = (await window.api.invoke(ch('PROCESS_PAGE_READ_IMAGE'), { pageId })) as {
      success: boolean
      dataUrl?: string
      error?: string
    }
    return res.success ? res.dataUrl || null : null
  }
}))
