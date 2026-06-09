import { create } from 'zustand'
import type { DashboardV5Dto } from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface DashboardState {
  data: DashboardV5Dto | null
  loading: boolean
  error: string | null
  load: () => Promise<void>
}

export const useDashboardStore = create<DashboardState>((set) => ({
  data: null,
  loading: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = (await window.api.invoke(ch('DASHBOARD_V5'))) as DashboardV5Dto
      set({ data: res, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  }
}))
