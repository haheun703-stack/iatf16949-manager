import { create } from 'zustand'

interface SimilarState {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

export const useSimilarStore = create<SimilarState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open }))
}))
