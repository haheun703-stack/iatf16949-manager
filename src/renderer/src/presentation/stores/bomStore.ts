import { create } from 'zustand'
import type {
  BomStats,
  BomDocListItem,
  BomDocDetail,
  BomCategory,
  BomFormUsage
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface BomState {
  stats: BomStats | null
  statsLoading: boolean
  loadStats: () => Promise<void>

  docs: BomDocListItem[]
  docsLoading: boolean
  loadDocs: (filter?: { category?: BomCategory; status?: string }) => Promise<void>

  selectedDocNoNorm: string | null
  setSelectedDocNoNorm: (n: string | null) => void

  detail: BomDocDetail | null
  detailLoading: boolean
  loadDetail: (docNoNorm: string) => Promise<void>

  categoryFilter: BomCategory | null
  setCategoryFilter: (c: BomCategory | null) => void

  loadFormUsage: (formNoNorm: string) => Promise<BomFormUsage>
}

export const useBomStore = create<BomState>((set, get) => ({
  stats: null,
  statsLoading: false,
  loadStats: async () => {
    set({ statsLoading: true })
    const res = (await window.api.invoke(ch('BOM_STATS'))) as BomStats
    set({ stats: res, statsLoading: false })
  },

  docs: [],
  docsLoading: false,
  loadDocs: async (filter) => {
    set({ docsLoading: true })
    const res = (await window.api.invoke(ch('BOM_LIST_DOCS'), filter ?? undefined)) as BomDocListItem[]
    set({ docs: res, docsLoading: false })
  },

  selectedDocNoNorm: null,
  setSelectedDocNoNorm: (n) => {
    set({ selectedDocNoNorm: n })
    if (n) void get().loadDetail(n)
  },

  detail: null,
  detailLoading: false,
  loadDetail: async (docNoNorm) => {
    set({ detailLoading: true })
    const res = (await window.api.invoke(ch('BOM_GET_DOC_DETAIL'), { docNoNorm })) as
      | BomDocDetail
      | null
    set({ detail: res, detailLoading: false })
  },

  categoryFilter: null,
  setCategoryFilter: (c) => {
    set({ categoryFilter: c })
    void get().loadDocs({ category: c ?? undefined })
  },

  loadFormUsage: async (formNoNorm) => {
    const res = (await window.api.invoke(ch('BOM_FORM_USAGE'), { formNoNorm })) as BomFormUsage
    return res
  }
}))
