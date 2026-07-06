import { create } from 'zustand'
import type { TeamId } from '@shared/team-theme'

export type PageId =
  | 'home'
  | 'team-detail'
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
  | 'apqp'
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

  /** 팀별 허브에서 선택된 팀(팀 상세 진입용) */
  selectedTeam: TeamId | null
  setSelectedTeam: (id: TeamId | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'home', // 팀별 허브가 첫 화면 (7/6 UI 재편)
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
  setSelectedClauseId: (id) => set({ selectedClauseId: id }),

  selectedTeam: null,
  setSelectedTeam: (id) => set({ selectedTeam: id })
}))
