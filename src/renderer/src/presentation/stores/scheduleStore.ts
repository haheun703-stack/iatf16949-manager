import { create } from 'zustand'
import type {
  ScheduleItemDto,
  ScheduleCreateInput,
  ScheduleUpdateInput,
  ScheduleStatus
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

export type ScheduleView = 'board' | 'calendar' | 'timeline'

interface ScheduleState {
  items: ScheduleItemDto[]
  loading: boolean
  error: string | null
  view: ScheduleView
  setView: (v: ScheduleView) => void

  load: () => Promise<void>
  create: (input: ScheduleCreateInput) => Promise<void>
  update: (input: ScheduleUpdateInput) => Promise<void>
  remove: (id: number) => Promise<void>
  setStatus: (id: number, status: ScheduleStatus) => Promise<void>

  // 모달 (생성/편집)
  modalOpen: boolean
  editing: ScheduleItemDto | null
  modalDefaults: Partial<ScheduleCreateInput>
  openCreate: (defaults?: Partial<ScheduleCreateInput>) => void
  openEdit: (item: ScheduleItemDto) => void
  closeModal: () => void
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  view: 'calendar',
  setView: (v) => set({ view: v }),

  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = (await window.api.invoke(ch('SCHEDULE_LIST'))) as ScheduleItemDto[]
      set({ items: res, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  create: async (input) => {
    await window.api.invoke(ch('SCHEDULE_CREATE'), input)
    await get().load()
  },

  update: async (input) => {
    await window.api.invoke(ch('SCHEDULE_UPDATE'), input)
    await get().load()
  },

  remove: async (id) => {
    await window.api.invoke(ch('SCHEDULE_DELETE'), { id })
    await get().load()
  },

  setStatus: async (id, status) => {
    // 낙관적 업데이트 후 영속화
    set((s) => ({ items: s.items.map((it) => (it.id === id ? { ...it, status } : it)) }))
    await window.api.invoke(ch('SCHEDULE_UPDATE'), { id, status })
    await get().load()
  },

  modalOpen: false,
  editing: null,
  modalDefaults: {},
  openCreate: (defaults = {}) => set({ modalOpen: true, editing: null, modalDefaults: defaults }),
  openEdit: (item) => set({ modalOpen: true, editing: item, modalDefaults: {} }),
  closeModal: () => set({ modalOpen: false, editing: null, modalDefaults: {} })
}))
