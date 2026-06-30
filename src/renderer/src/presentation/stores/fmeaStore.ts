import { create } from 'zustand'
import type {
  FmeaDocDto,
  FmeaBoardDto,
  FmeaDocCreateInput,
  FmeaDocUpdateInput,
  FmeaRowUpdateInput
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface FmeaState {
  docs: FmeaDocDto[]
  selectedId: number | null
  board: FmeaBoardDto | null
  loading: boolean
  error: string | null

  load: () => Promise<void>
  select: (id: number) => Promise<void>
  reloadBoard: () => Promise<void>
  updateRow: (input: FmeaRowUpdateInput) => Promise<void>
  addRow: () => Promise<void>
  deleteRow: (id: number) => Promise<void>
  createDoc: (input: FmeaDocCreateInput) => Promise<void>
  updateDoc: (input: FmeaDocUpdateInput) => Promise<void>
}

export const useFmeaStore = create<FmeaState>((set, get) => ({
  docs: [],
  selectedId: null,
  board: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const docs = (await window.api.invoke(ch('FMEA_DOC_LIST'))) as FmeaDocDto[]
      set({ docs, loading: false })
      const cur = get().selectedId
      const stillExists = cur != null && docs.some((d) => d.id === cur)
      if (!stillExists && docs.length > 0) await get().select(docs[0].id)
      else if (docs.length === 0) set({ selectedId: null, board: null })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  select: async (id) => {
    set({ selectedId: id })
    await get().reloadBoard()
  },

  reloadBoard: async () => {
    const id = get().selectedId
    if (id == null) {
      set({ board: null })
      return
    }
    try {
      const board = (await window.api.invoke(ch('FMEA_BOARD'), { docId: id })) as FmeaBoardDto | null
      set({ board })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  updateRow: async (input) => {
    // 낙관적 반영 후, RPN/요약 정확성을 위해 보드 재조회
    const prev = get().board
    if (prev) {
      const rows = prev.rows.map((r) => (r.id === input.id ? { ...r, ...input } : r))
      set({ board: { ...prev, rows } })
    }
    try {
      await window.api.invoke(ch('FMEA_ROW_UPDATE'), input)
      await get().reloadBoard()
    } catch (err) {
      set({ board: prev, error: err instanceof Error ? err.message : String(err) })
    }
  },

  addRow: async () => {
    const id = get().selectedId
    if (id == null) return
    await window.api.invoke(ch('FMEA_ROW_CREATE'), { docId: id })
    await get().reloadBoard()
  },

  deleteRow: async (rowId) => {
    await window.api.invoke(ch('FMEA_ROW_DELETE'), { id: rowId })
    await get().reloadBoard()
  },

  createDoc: async (input) => {
    const res = (await window.api.invoke(ch('FMEA_DOC_CREATE'), input)) as { id: number }
    await get().load()
    if (res?.id) await get().select(res.id)
  },

  updateDoc: async (input) => {
    await window.api.invoke(ch('FMEA_DOC_UPDATE'), input)
    await get().load()
    await get().reloadBoard()
  }
}))
