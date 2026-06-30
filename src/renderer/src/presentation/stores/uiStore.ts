import { create } from 'zustand'

export type PageId =
  | 'dashboard'
  | 'sq-readiness'
  | 'parts'
  | 'case-work'
  | 'process-workbench'
  | 'form-builder'
  | 'document-bom'
  | 'schedule'
  | 'obligations'
  | 'ppap'
  | 'fmea'
  | 'msa'
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

  // form-builder 진입 시 열어야 할 기존 작성본 id (분배된 양식 [열기]용). 1회 소비 후 null.
  pendingSubmissionId: number | null
  setPendingSubmissionId: (id: number | null) => void

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

  pendingSubmissionId: null,
  setPendingSubmissionId: (id) => set({ pendingSubmissionId: id }),

  selectedProcessCode: null,
  setSelectedProcessCode: (code) => set({ selectedProcessCode: code }),

  selectedClauseId: null,
  setSelectedClauseId: (id) => set({ selectedClauseId: id })
}))
