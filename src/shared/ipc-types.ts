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

// ===== Form / Regulation DTOs (v5) =====

export type FormFieldTypeDto =
  | 'text' | 'textarea' | 'date' | 'number'
  | 'select' | 'radio' | 'checkbox' | 'photo' | 'auto'

export interface FormFieldDto {
  id: number
  formCode: string
  fieldKey: string
  label: string
  type: FormFieldTypeDto
  section: string | null
  placeholder: string | null
  options: string[] | null
  unit: string | null
  aiEnabled: boolean
  aiPromptHint: string | null
  sortOrder: number
}

export interface FormDefinitionDto {
  code: string
  name: string
  regCode: string
  description: string | null
  approvals: string[]
  nextFormCode: string | null
  nextFormLabel: string | null
  prevFormCode: string | null
  fields: FormFieldDto[]
}

export interface FormListItemDto {
  code: string
  name: string
  regCode: string
  approvalsCount: number
  fieldsCount: number
  submissionsCount: number
  draftCount: number
}

export interface FormSubmissionDto {
  id: number
  formCode: string
  serialNo: string | null
  values: Record<string, unknown>
  status: 'draft' | 'submitted' | 'approved'
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface FormSubmissionListItemDto {
  id: number
  formCode: string
  formName: string
  serialNo: string | null
  status: 'draft' | 'submitted' | 'approved'
  updatedAt: string
  preview: string
}

export interface RegulationSectionDto {
  id: number
  regCode: string
  sectionTitle: string
  sectionBody: string
  sortOrder: number
}

export interface AiGenerateRequest {
  formCode: string
  fieldKey: string
  currentValues: Record<string, unknown>
}

export interface AiGenerateResponse {
  success: boolean
  text?: string
  error?: string
}

// ===== Process DTOs (v5 - 기본서) =====

export type ProcessCategoryDto = 'CP' | 'MP' | 'SP'

export interface ProcessListItemDto {
  code: string
  category: ProcessCategoryDto
  name: string
  docNo: string | null
  pagesCount: number
  formsCount: number
  hasImages: boolean
  sortOrder: number
}

export interface ProcessPageDto {
  id: number
  processCode: string
  pageNo: number
  pageLabel: string | null
  imagePath: string | null
}

export interface ProcessFormRefDto {
  formCode: string
  formName: string
  regCode: string
  fieldsCount: number
  submissionsCount: number
  draftCount: number
  sortOrder: number
}

export interface ProcessDetailDto {
  code: string
  category: ProcessCategoryDto
  name: string
  description: string | null
  docNo: string | null
  pages: ProcessPageDto[]
  forms: ProcessFormRefDto[]
}

export interface ProcessPageUploadRequest {
  pageId: number
}

export interface ProcessPageUploadResponse {
  success: boolean
  imagePath?: string
  error?: string
}

export interface ProcessPageAddRequest {
  processCode: string
  pageLabel: string
}

export interface ProcessPageAddResponse {
  success: boolean
  pageId?: number
  pageNo?: number
  error?: string
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
  [IPC_CHANNELS.FORM_LIST]: {
    request: void
    response: FormListItemDto[]
  }
  [IPC_CHANNELS.FORM_GET_DEFINITION]: {
    request: { code: string }
    response: FormDefinitionDto | null
  }
  [IPC_CHANNELS.REGULATION_GET_SECTIONS]: {
    request: { regCode: string }
    response: RegulationSectionDto[]
  }
  [IPC_CHANNELS.FORM_SUBMISSION_CREATE]: {
    request: { formCode: string; values: Record<string, unknown>; serialNo?: string; createdBy?: string }
    response: { id: number }
  }
  [IPC_CHANNELS.FORM_SUBMISSION_UPDATE]: {
    request: { id: number; values: Record<string, unknown>; status?: 'draft' | 'submitted' | 'approved' }
    response: { success: boolean }
  }
  [IPC_CHANNELS.FORM_SUBMISSION_LIST]: {
    request: { formCode?: string }
    response: FormSubmissionListItemDto[]
  }
  [IPC_CHANNELS.FORM_SUBMISSION_GET]: {
    request: { id: number }
    response: FormSubmissionDto | null
  }
  [IPC_CHANNELS.FORM_SUBMISSION_DELETE]: {
    request: { id: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.AI_GENERATE]: {
    request: AiGenerateRequest
    response: AiGenerateResponse
  }
  [IPC_CHANNELS.PROCESS_LIST]: {
    request: void
    response: ProcessListItemDto[]
  }
  [IPC_CHANNELS.PROCESS_GET_DETAIL]: {
    request: { code: string }
    response: ProcessDetailDto | null
  }
  [IPC_CHANNELS.PROCESS_PAGE_UPLOAD]: {
    request: ProcessPageUploadRequest
    response: ProcessPageUploadResponse
  }
  [IPC_CHANNELS.PROCESS_PAGE_DELETE_IMAGE]: {
    request: { pageId: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.PROCESS_PAGE_ADD]: {
    request: ProcessPageAddRequest
    response: ProcessPageAddResponse
  }
  [IPC_CHANNELS.PROCESS_PAGE_READ_IMAGE]: {
    request: { pageId: number }
    response: { success: boolean; dataUrl?: string; error?: string }
  }
}
