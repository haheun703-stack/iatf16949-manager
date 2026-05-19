import { create } from 'zustand'
import type { ClauseTreeNode, ClauseDetail, DashboardStats, DbStatus } from '@shared/ipc-types'

interface ClauseState {
  clauses: ClauseTreeNode[]
  clauseDetail: ClauseDetail | null
  dashboardStats: DashboardStats | null
  dbStatus: DbStatus | null
  isLoading: boolean

  loadClauses: () => Promise<void>
  loadClauseDetail: (id: string) => Promise<void>
  loadDashboardStats: () => Promise<void>
  loadDbStatus: () => Promise<void>
}

export const useClauseStore = create<ClauseState>((set) => ({
  clauses: [],
  clauseDetail: null,
  dashboardStats: null,
  dbStatus: null,
  isLoading: false,

  loadClauses: async () => {
    set({ isLoading: true })
    const data = await window.api.invoke(window.api.channels.CLAUSE_GET_TREE)
    set({ clauses: data, isLoading: false })
  },

  loadClauseDetail: async (id: string) => {
    set({ isLoading: true })
    const data = await window.api.invoke(window.api.channels.CLAUSE_GET_BY_ID, { id })
    set({ clauseDetail: data, isLoading: false })
  },

  loadDashboardStats: async () => {
    const stats = await window.api.invoke(window.api.channels.DASHBOARD_STATS)
    set({ dashboardStats: stats })
  },

  loadDbStatus: async () => {
    const status = await window.api.invoke(window.api.channels.DB_STATUS)
    set({ dbStatus: status })
  }
}))
