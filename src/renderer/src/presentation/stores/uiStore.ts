import { create } from 'zustand'

export type TabId = 'dashboard' | 'detail' | 'tasks' | 'gantt' | 'team'

interface UIState {
  activeTab: TabId
  selectedClauseId: string | null
  sidebarSearch: string
  expandedIds: Set<string>
  filterTeam: string
  filterStatus: string

  setActiveTab: (tab: TabId) => void
  setSelectedClause: (id: string | null) => void
  setSidebarSearch: (query: string) => void
  toggleExpanded: (id: string) => void
  setFilterTeam: (team: string) => void
  setFilterStatus: (status: string) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: 'dashboard',
  selectedClauseId: null,
  sidebarSearch: '',
  expandedIds: new Set(['4', '5', '6', '7', '8', '9', '10']),
  filterTeam: '전체',
  filterStatus: '전체',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedClause: (id) => set({ selectedClauseId: id }),
  setSidebarSearch: (query) => set({ sidebarSearch: query }),
  toggleExpanded: (id) =>
    set((state) => {
      const next = new Set(state.expandedIds)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return { expandedIds: next }
    }),
  setFilterTeam: (team) => set({ filterTeam: team }),
  setFilterStatus: (status) => set({ filterStatus: status })
}))
