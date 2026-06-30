import { create } from 'zustand'
import type {
  PpapSubmissionDto,
  PpapBoardDto,
  PpapElementStatus,
  PpapSubmissionCreateInput,
  PpapSubmissionUpdateInput
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface PpapState {
  submissions: PpapSubmissionDto[]
  selectedId: number | null
  board: PpapBoardDto | null
  loading: boolean
  error: string | null

  load: () => Promise<void>
  select: (id: number) => Promise<void>
  reloadBoard: () => Promise<void>
  setElementStatus: (elementId: number, status: PpapElementStatus) => Promise<void>
  createSubmission: (input: PpapSubmissionCreateInput) => Promise<void>
  updateSubmission: (input: PpapSubmissionUpdateInput) => Promise<void>
}

export const usePpapStore = create<PpapState>((set, get) => ({
  submissions: [],
  selectedId: null,
  board: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const subs = (await window.api.invoke(ch('PPAP_SUBMISSION_LIST'))) as PpapSubmissionDto[]
      set({ submissions: subs, loading: false })
      // 선택 없으면 첫 제출 자동 선택
      const cur = get().selectedId
      const stillExists = cur != null && subs.some((s) => s.id === cur)
      if (!stillExists && subs.length > 0) {
        await get().select(subs[0].id)
      } else if (subs.length === 0) {
        set({ selectedId: null, board: null })
      }
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
      const board = (await window.api.invoke(ch('PPAP_BOARD'), { submissionId: id })) as PpapBoardDto | null
      set({ board })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err) })
    }
  },

  setElementStatus: async (elementId, status) => {
    // 낙관적 업데이트 + 진척률 재계산은 reloadBoard 로 보정
    const prev = get().board
    if (prev) {
      const elements = prev.elements.map((e) => (e.id === elementId ? { ...e, status } : e))
      const applicable = elements.filter((e) => e.status !== 'na').length
      const completed = elements.filter((e) => e.status === 'completed').length
      const percent = applicable > 0 ? Math.round((completed / applicable) * 100) : 0
      set({ board: { ...prev, elements, progress: { completed, applicable, percent } } })
    }
    try {
      await window.api.invoke(ch('PPAP_ELEMENT_UPDATE'), { id: elementId, status })
    } catch (err) {
      set({ board: prev, error: err instanceof Error ? err.message : String(err) })
    }
  },

  createSubmission: async (input) => {
    const res = (await window.api.invoke(ch('PPAP_SUBMISSION_CREATE'), input)) as { id: number }
    await get().load()
    if (res?.id) await get().select(res.id)
  },

  updateSubmission: async (input) => {
    await window.api.invoke(ch('PPAP_SUBMISSION_UPDATE'), input)
    await get().load()
    await get().reloadBoard()
  }
}))
