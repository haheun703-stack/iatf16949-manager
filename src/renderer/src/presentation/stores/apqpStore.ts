import { create } from 'zustand'
import type { ApqpBoardDto, ApqpElementUpdateInput } from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface ApqpState {
  board: ApqpBoardDto | null
  loading: boolean
  error: string | null
  /** 화면에서 펼친 단계 (기본 = 현재 단계) */
  openPhaseId: string | null

  load: () => Promise<void>
  setOpenPhase: (id: string | null) => void
  updateElement: (input: ApqpElementUpdateInput) => Promise<void>
}

export const useApqpStore = create<ApqpState>((set, get) => ({
  board: null,
  loading: false,
  error: null,
  openPhaseId: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const board = (await window.api.invoke(ch('APQP_BOARD'))) as ApqpBoardDto
      set({ board, loading: false })
      // 처음 로드면 현재 단계를 펼침
      if (get().openPhaseId === null) {
        const cur = board.phases.find((p) => p.phaseNo === board.currentPhaseNo)
        set({ openPhaseId: cur?.id ?? board.phases[0]?.id ?? null })
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  setOpenPhase: (id) => set({ openPhaseId: id }),

  updateElement: async (input) => {
    // 낙관적 반영 후 보드 재조회(진척률·현재단계 재계산)
    const prev = get().board
    if (prev) {
      const phases = prev.phases.map((p) => ({
        ...p,
        elements: p.elements.map((e) => (e.id === input.id ? { ...e, ...input } : e))
      }))
      set({ board: { ...prev, phases } })
    }
    try {
      await window.api.invoke(ch('APQP_ELEMENT_UPDATE'), input)
      const board = (await window.api.invoke(ch('APQP_BOARD'))) as ApqpBoardDto
      set({ board })
    } catch (err) {
      set({ board: prev, error: err instanceof Error ? err.message : String(err) })
    }
  }
}))
