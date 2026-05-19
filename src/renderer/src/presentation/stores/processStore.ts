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
  loadDetail: (code: string) => Promise<void>

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
  loadDetail: async (code) => {
    set({ detailLoading: true })
    const res = (await window.api.invoke(ch('PROCESS_GET_DETAIL'), { code })) as
      | ProcessDetailDto
      | null
    set({ detail: res, detailLoading: false, currentPageIdx: 0 })
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
      if (detail) await loadDetail(detail.code)
    }
    return res
  },

  deletePageImage: async (pageId) => {
    await window.api.invoke(ch('PROCESS_PAGE_DELETE_IMAGE'), { pageId })
    const { detail, loadDetail } = get()
    if (detail) await loadDetail(detail.code)
  },

  addPage: async (pageLabel) => {
    const { detail } = get()
    if (!detail) return
    await window.api.invoke(ch('PROCESS_PAGE_ADD'), {
      processCode: detail.code,
      pageLabel
    })
    await get().loadDetail(detail.code)
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
