import { create } from 'zustand'

interface AiAuthorState {
  open: boolean
  setOpen: (v: boolean) => void
  toggle: () => void
}

export const useAiAuthorStore = create<AiAuthorState>((set) => ({
  open: false,
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open }))
}))
