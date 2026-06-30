import { create } from 'zustand'
import type { MsaStudyDto, MsaCreateInput, MsaUpdateInput } from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface MsaState {
  items: MsaStudyDto[]
  loading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: MsaCreateInput) => Promise<void>
  update: (input: MsaUpdateInput) => Promise<void>
  remove: (id: number) => Promise<void>
}

export const useMsaStore = create<MsaState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = (await window.api.invoke(ch('MSA_LIST'))) as MsaStudyDto[]
      set({ items: res, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  create: async (input) => {
    await window.api.invoke(ch('MSA_CREATE'), input)
    await get().load()
  },

  update: async (input) => {
    await window.api.invoke(ch('MSA_UPDATE'), input)
    await get().load()
  },

  remove: async (id) => {
    await window.api.invoke(ch('MSA_DELETE'), { id })
    await get().load()
  }
}))
