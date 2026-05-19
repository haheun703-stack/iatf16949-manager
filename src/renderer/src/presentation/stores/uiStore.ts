import { create } from 'zustand'

export type PageId =
  | 'dashboard'
  | 'process-workbench'
  | 'form-builder'
  | 'form-chain'
  | 'clause-tree'
  | 'team'

interface UIState {
  currentPage: PageId
  setPage: (page: PageId) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  selectedFormCode: string | null
  setSelectedFormCode: (code: string | null) => void

  selectedProcessCode: string | null
  setSelectedProcessCode: (code: string | null) => void

  selectedClauseId: string | null
  setSelectedClauseId: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'dashboard',
  setPage: (page) => set({ currentPage: page }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  selectedFormCode: null,
  setSelectedFormCode: (code) => set({ selectedFormCode: code }),

  selectedProcessCode: null,
  setSelectedProcessCode: (code) => set({ selectedProcessCode: code }),

  selectedClauseId: null,
  setSelectedClauseId: (id) => set({ selectedClauseId: id })
}))
