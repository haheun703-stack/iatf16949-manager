import { create } from 'zustand'
import type {
  ObligationDto,
  ObligationCreateInput,
  ObligationUpdateInput
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface ObligationState {
  items: ObligationDto[]
  loading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: ObligationCreateInput) => Promise<void>
  update: (input: ObligationUpdateInput) => Promise<void>
  remove: (id: number) => Promise<void>
  complete: (id: number) => Promise<void>

  // 모달 (생성/편집)
  modalOpen: boolean
  editing: ObligationDto | null
  openCreate: () => void
  openEdit: (item: ObligationDto) => void
  closeModal: () => void
}

export const useObligationStore = create<ObligationState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = (await window.api.invoke(ch('OBLIGATION_LIST'))) as ObligationDto[]
      set({ items: res, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  create: async (input) => {
    await window.api.invoke(ch('OBLIGATION_CREATE'), input)
    await get().load()
  },

  update: async (input) => {
    await window.api.invoke(ch('OBLIGATION_UPDATE'), input)
    await get().load()
  },

  remove: async (id) => {
    await window.api.invoke(ch('OBLIGATION_DELETE'), { id })
    await get().load()
  },

  complete: async (id) => {
    await window.api.invoke(ch('OBLIGATION_COMPLETE'), { id })
    await get().load()
  },

  modalOpen: false,
  editing: null,
  openCreate: () => set({ modalOpen: true, editing: null }),
  openEdit: (item) => set({ modalOpen: true, editing: item }),
  closeModal: () => set({ modalOpen: false, editing: null })
}))
