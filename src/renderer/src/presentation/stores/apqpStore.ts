import { create } from 'zustand'
import type { ApqpBoard, ApqpStatus } from '@shared/ipc-types'

interface ApqpState {
  board: ApqpBoard | null
  isLoading: boolean

  loadBoard: () => Promise<void>
  updateElement: (data: {
    id: string
    status?: ApqpStatus
    targetDate?: string | null
    actualDate?: string | null
    note?: string | null
  }) => Promise<boolean>
}

export const useApqpStore = create<ApqpState>((set, get) => ({
  board: null,
  isLoading: false,

  loadBoard: async () => {
    set({ isLoading: true })
    const data = await window.api.invoke(window.api.channels.APQP_GET_BOARD)
    set({ board: data, isLoading: false })
  },

  updateElement: async (data) => {
    const result = await window.api.invoke(window.api.channels.APQP_UPDATE_ELEMENT, data)
    if (result.success) await get().loadBoard()
    return result.success
  }
}))
