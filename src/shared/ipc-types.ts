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

// ===== AI 작성가이드 + 채점 (v5 Stage 2) =====

/** 양식별 AI 작성 가이드 — "이 양식을 왜·어떻게 써야 심사를 통과하는가". */
export interface FormGuideDto {
  formCode: string
  purpose: string // 이 양식의 목적 (1~2문장)
  mustInclude: string[] // 반드시 포함해야 할 항목
  auditPoints: string[] // 심사원이 확인하는 포인트
  commonFindings: string[] // 자주 나오는 부적합/지적사항
  tips: string[] // 작성 실무 팁
  generatedAt: string | null
}

export interface AiGuideResponse {
  success: boolean
  guide?: FormGuideDto
  error?: string
}

export type ScoreSeverity = '경미' | '중대' | '치명'

export interface FormScoreGapDto {
  item: string // 감점/미흡 사유
  severity: ScoreSeverity
  regRef?: string | null // 관련 IATF 조항/규정
}

/** AI 채점 본문 (점수 + 근거). */
export interface FormScoreResultDto {
  score: number // 0~100
  grade: string // A | B | C | D (점수에서 정규화)
  verdict: string // 적합 | 보완필요 | 부적합 (점수에서 정규화)
  summary: string // 총평 (2~3문장)
  strengths: string[] // 잘 작성된 점
  gaps: FormScoreGapDto[] // 감점 사유 + 심각도
  suggestions: string[] // 개선 지시 (그대로 반영 가능한 문장)
  missingFields: string[] // 비어있거나 불충분한 필드 label
}

export interface FormScoreDto extends FormScoreResultDto {
  id: number
  formCode: string
  submissionId: number | null
  provider: string | null
  model: string | null
  scoredAt: string
}

export interface AiScoreRequest {
  formCode: string
  values: Record<string, unknown>
  submissionId?: number | null
}

export interface AiScoreResponse {
  success: boolean
  result?: FormScoreDto
  error?: string
}

/** 대시보드 집계용 (Stage 3에서 사용). */
export interface FormScoreSummaryDto {
  formCode: string
  formName: string
  regCode: string
  latestScore: number | null
  grade: string | null
  verdict: string | null
  scoredAt: string | null
}

// ===== 대시보드 v5 (실데이터 집계) =====

export interface DashboardGradeBucket {
  grade: string // A | B | C | D
  count: number
}

export interface DashboardRecentScore {
  formCode: string
  formName: string
  regCode: string
  score: number
  grade: string
  verdict: string
  scoredAt: string
}

export interface DashboardAttentionItem {
  formCode: string
  formName: string
  regCode: string
  score: number | null // null = 미채점(초안만 존재)
  grade: string | null
  verdict: string | null
  reason: string // 보완필요 / 부적합 / 미채점 초안
}

export interface DashboardV5Dto {
  formsTotal: number // 정의된 양식 수
  formsScored: number // AI 채점된 양식 수(중복 제거)
  formsWithDraft: number // 초안이 있는 양식 수
  avgScore: number | null // 양식별 최신 점수 평균
  gradeDist: DashboardGradeBucket[] // A/B/C/D 분포
  needsAttentionCount: number // 보완필요+부적합+미채점초안
  needsAttention: DashboardAttentionItem[] // 상위 N건
  recentScores: DashboardRecentScore[] // 최근 채점 N건
  bomTotalDocs: number
  bomTotalForms: number
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

// ===== 일정표 (v5 Stage 4 - 노션형 스케줄) =====

export type ScheduleStatus = '예정' | '진행' | '완료' | '보류'
export type ScheduleCategory =
  | '심사준비'
  | '내부심사'
  | '교육훈련'
  | '문서/양식'
  | '시정조치'
  | '기타'
export type SchedulePriority = '높음' | '보통' | '낮음'

export const SCHEDULE_STATUSES: ScheduleStatus[] = ['예정', '진행', '완료', '보류']
export const SCHEDULE_CATEGORIES: ScheduleCategory[] = [
  '심사준비',
  '내부심사',
  '교육훈련',
  '문서/양식',
  '시정조치',
  '기타'
]
export const SCHEDULE_PRIORITIES: SchedulePriority[] = ['높음', '보통', '낮음']

export interface ScheduleItemDto {
  id: number
  title: string
  category: ScheduleCategory
  status: ScheduleStatus
  priority: SchedulePriority
  owner: string | null
  startDate: string | null
  dueDate: string | null
  note: string | null
  formCode: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ScheduleCreateInput {
  title: string
  category?: ScheduleCategory
  status?: ScheduleStatus
  priority?: SchedulePriority
  owner?: string | null
  startDate?: string | null
  dueDate?: string | null
  note?: string | null
  formCode?: string | null
}

export interface ScheduleUpdateInput {
  id: number
  title?: string
  category?: ScheduleCategory
  status?: ScheduleStatus
  priority?: SchedulePriority
  owner?: string | null
  startDate?: string | null
  dueDate?: string | null
  note?: string | null
  formCode?: string | null
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
  [IPC_CHANNELS.AI_GENERATE_GUIDE]: {
    request: { formCode: string; force?: boolean }
    response: AiGuideResponse
  }
  [IPC_CHANNELS.FORM_GUIDE_GET]: {
    request: { formCode: string }
    response: FormGuideDto | null
  }
  [IPC_CHANNELS.AI_SCORE_FORM]: {
    request: AiScoreRequest
    response: AiScoreResponse
  }
  [IPC_CHANNELS.FORM_SCORE_LATEST]: {
    request: { formCode: string; submissionId?: number | null }
    response: FormScoreDto | null
  }
  [IPC_CHANNELS.FORM_SCORE_LIST]: {
    request: { formCode?: string }
    response: FormScoreSummaryDto[]
  }
  [IPC_CHANNELS.DASHBOARD_V5]: {
    request: void
    response: DashboardV5Dto
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
  [IPC_CHANNELS.BOM_STATS]: {
    request: void
    response: BomStats
  }
  [IPC_CHANNELS.BOM_LIST_DOCS]: {
    request: { category?: BomCategory; status?: string } | void
    response: BomDocListItem[]
  }
  [IPC_CHANNELS.BOM_GET_DOC_DETAIL]: {
    request: { docNoNorm: string }
    response: BomDocDetail | null
  }
  [IPC_CHANNELS.BOM_FORM_USAGE]: {
    request: { formNoNorm: string }
    response: BomFormUsage
  }
  [IPC_CHANNELS.SCHEDULE_LIST]: {
    request: void
    response: ScheduleItemDto[]
  }
  [IPC_CHANNELS.SCHEDULE_CREATE]: {
    request: ScheduleCreateInput
    response: { id: number }
  }
  [IPC_CHANNELS.SCHEDULE_UPDATE]: {
    request: ScheduleUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.SCHEDULE_DELETE]: {
    request: { id: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.REPORT_EXPORT_SCORES]: {
    request: void
    response: ReportExportResult
  }
}

export interface ReportExportResult {
  success: boolean
  filePath?: string
  count?: number
  canceled?: boolean
  error?: string
}

// ===== Document BOM =====

export type BomCategory = 'manual' | 'process' | 'quality' | 'safety_env' | 'other'

export const BOM_CATEGORY_LABELS: Record<BomCategory, string> = {
  manual: '품질·환경 매뉴얼',
  process: '품질·환경 프로세스',
  quality: 'IATF16949 규정·지침(품질)',
  safety_env: '안전보건환경(ISO45001) 규정·지침',
  other: '기타'
}

export type BomFormType = 'form' | 'variant' | 'appendix' | 'external_ref'

export interface BomStats {
  totalDocs: number
  totalForms: number
  byStatus: { status: string; count: number }[]
  byCategory: { category: BomCategory; categoryLabel: string; count: number }[]
  byFormType: { type: BomFormType; count: number }[]
}

export interface BomDocListItem {
  docNoNorm: string
  docNoRaw: string
  category: BomCategory
  categoryLabel: string
  name: string
  ownerDept: string | null
  listRev: number | null
  listDate: string | null
  fileRev: number | null
  fileDate: string | null
  status: string
  formsCount: number
}

export interface BomFormRef {
  id: number
  formType: BomFormType
  formNoRaw: string | null
  formNoNorm: string | null
  label: string
  sortOrder: number
}

export interface BomDocDetail extends BomDocListItem {
  forms: BomFormRef[]
}

export interface BomFormUsage {
  formNoNorm: string
  usedBy: { docNoNorm: string; docNoRaw: string; name: string }[]
}
