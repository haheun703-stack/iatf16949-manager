import type { IPC_CHANNELS } from './ipc-channels'

// ===== DTO Types =====

export interface ClauseTreeNode {
  id: string
  title: string
  description: string | null
  parentId: string | null
  depth: number
  sortOrder: number
  category: string | null
  hasChildren: boolean
  documentCount: number
}

export interface ClauseDetail {
  id: string
  title: string
  description: string | null
  parentId: string | null
  depth: number
  category: string | null
  documents: DocumentSummary[]
  tasks: TaskListItem[]
}

export interface DocumentSummary {
  id: string
  name: string
  type: string
  currentVersion: string
  clauseId: string
  docCode: string | null
  teamId: string | null
  teamName: string | null
  revision: string | null
}

export interface RegulationItem {
  id: string
  docCode: string
  name: string
  type: string
  clauseId: string
  clauseTitle: string
  teamId: string
  teamName: string
  revision: string | null
}

export interface TaskListItem {
  id: string
  clauseId: string
  clauseTitle: string
  documentId: string | null
  documentName: string | null
  team: string
  teamId: string
  assignee: string
  assigneeId: string
  status: string
  priority: string
  deadline: string | null
  completedAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export interface TaskHistoryItem {
  id: number
  taskId: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
  changedBy: string | null
  note: string | null
}

export interface DashboardStats {
  total: number
  done: number
  inProgress: number
  overdue: number
  pending: number
  plan: number
  check: number
  act: number
}

export interface TeamSummary {
  id: string
  name: string
  managerId: string | null
}

export interface PersonSummary {
  id: string
  name: string
  role: string | null
  teamId: string
}

export interface DbStatus {
  clauses: number
  documents: number
  teams: number
  persons: number
  tasks: number
}

export interface CalendarEvent {
  date: string
  type: 'audit' | 'deadline' | 'meeting' | 'holiday'
  label: string
}

export interface DashboardFullData {
  stats: DashboardStats
  tasks: TaskListItem[]
  teams: TeamSummary[]
  members: PersonSummary[]
  calendarEvents: CalendarEvent[]
  nextAudit: { label: string; daysUntil: number } | null
}

export interface CompanyProfile {
  companyName: string
  ceoName: string
  address: string
  phone: string
  fax: string
  factoryName: string
  revisionNumber: string
  revisionDate: string
}

export interface DocGenRequest {
  templateId: string
  profile: CompanyProfile
  outputPath: string
}

export interface DocGenResult {
  success: boolean
  outputPath?: string
  error?: string
  replacedCount?: number
}

// ===== IPC Channel → Request/Response Map =====

export interface IpcChannelMap {
  [IPC_CHANNELS.CLAUSE_GET_TREE]: {
    request: void
    response: ClauseTreeNode[]
  }
  [IPC_CHANNELS.CLAUSE_GET_BY_ID]: {
    request: { id: string }
    response: ClauseDetail | null
  }
  [IPC_CHANNELS.CLAUSE_SEARCH]: {
    request: { query: string }
    response: ClauseTreeNode[]
  }
  [IPC_CHANNELS.DOCUMENT_LIST_BY_CLAUSE]: {
    request: { clauseId: string }
    response: DocumentSummary[]
  }
  [IPC_CHANNELS.DOCUMENT_GET_BY_ID]: {
    request: { id: string }
    response: DocumentSummary | null
  }
  [IPC_CHANNELS.TASK_CREATE]: {
    request: {
      clauseId: string
      documentId?: string
      assigneeId: string
      teamId: string
      priority: string
      deadline: string
    }
    response: { id: string }
  }
  [IPC_CHANNELS.TASK_UPDATE]: {
    request: { id: string; [key: string]: unknown }
    response: { success: boolean }
  }
  [IPC_CHANNELS.TASK_LIST]: {
    request: { clauseId?: string; teamId?: string; status?: string }
    response: TaskListItem[]
  }
  [IPC_CHANNELS.TASK_GET_BY_ID]: {
    request: { id: string }
    response: TaskListItem | null
  }
  [IPC_CHANNELS.TASK_DELETE]: {
    request: { id: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.TASK_UPDATE_STATUS]: {
    request: { taskId: string; newStatus: string; note?: string; changedBy?: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.TASK_GET_HISTORY]: {
    request: { taskId: string }
    response: TaskHistoryItem[]
  }
  [IPC_CHANNELS.TEAM_LIST]: {
    request: void
    response: TeamSummary[]
  }
  [IPC_CHANNELS.TEAM_GET_MEMBERS]: {
    request: { teamId: string }
    response: PersonSummary[]
  }
  [IPC_CHANNELS.TASK_BULK_CREATE]: {
    request: { deadline: string }
    response: { created: number }
  }
  [IPC_CHANNELS.REGULATION_LIST]: {
    request: void
    response: RegulationItem[]
  }
  [IPC_CHANNELS.DASHBOARD_STATS]: {
    request: void
    response: DashboardStats
  }
  [IPC_CHANNELS.DASHBOARD_FULL]: {
    request: void
    response: DashboardFullData
  }
  [IPC_CHANNELS.DB_STATUS]: {
    request: void
    response: DbStatus
  }
  [IPC_CHANNELS.COMPANY_PROFILE_GET]: {
    request: void
    response: CompanyProfile
  }
  [IPC_CHANNELS.COMPANY_PROFILE_SAVE]: {
    request: CompanyProfile
    response: { success: boolean }
  }
  [IPC_CHANNELS.DOCGEN_GENERATE]: {
    request: DocGenRequest
    response: DocGenResult
  }
  [IPC_CHANNELS.DOCGEN_SAVE_DIALOG]: {
    request: { defaultName: string }
    response: { filePath: string | null }
  }
}
