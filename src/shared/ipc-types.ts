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
  /** 양식 자동채움 작성자(로그인 도입 전 stub). Sidebar 에서 설정. */
  defaultAuthor: string
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
  | 'select' | 'radio' | 'checkbox' | 'photo' | 'auto' | 'grid'

/** 격자/대장형 필드의 컬럼 정의(렌더러 grid 에디터용) */
export interface GridColumnDto {
  colKey: string
  label: string
  type: string
}

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
  gridColumns?: GridColumnDto[] // type='grid' 일 때만
}

/** 양식 배치 설계도 — 범용 렌더러가 읽어 실양식처럼 그린다(향후 AI가 양식별 생성). */
export interface FormLayoutCell {
  fieldKey: string
  /** 그리드에서 차지하는 라벨-값 쌍 수(기본 1) */
  colSpan?: number
}
export type FormLayoutBlock =
  | { type: 'section'; title: string }
  | { type: 'grid'; columns: number; cells: FormLayoutCell[] }
  | { type: 'full'; fieldKey: string }
export interface FormLayout {
  blocks: FormLayoutBlock[]
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
  /** 배치 설계도. 없으면 렌더러가 섹션 기반 auto-layout 으로 폴백. */
  layout: FormLayout | null
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

// ===== AI 레이어 (Phase C) — 그라운디드 코파일럿 =====
export interface CopilotMessage {
  role: 'user' | 'assistant'
  text: string
}
export interface CopilotSource {
  kind: string // clause|sq_item|form_def|case|process
  ref_key: string
  title: string
}
export interface CopilotAskRequest {
  messages: CopilotMessage[]
}
export interface CopilotAskResponse {
  success: boolean
  text?: string
  sources?: CopilotSource[]
  tools?: Array<{ name: string; ok: boolean }>
  costUsd?: number | null
  error?: string
}

// ===== AI 레이어 (Phase C2) — 매일 브리핑 =====
export interface BriefingItem {
  kind: 'schedule' | 'case'
  ref: string
  title: string
  dueDate: string
  owner: string | null
  daysLeft: number
}
export interface BriefingFacts {
  today: string
  overdue: BriefingItem[]
  dueSoon: BriefingItem[]
  audit: { label: string; dday: number; date: string } | null
  sq: { total: number; missingEvidence: number; examples: string[] }
}
export interface BriefingSummarizeResponse {
  success: boolean
  text?: string
  costUsd?: number | null
  error?: string
}

// ===== AI 레이어 (Phase A2/D) — draft→결재 =====
export type DraftTargetKind = 'form_entry' | 'case' | 'assignment' | 'schedule' | 'sq_self'
export type DraftStatus = 'proposed' | 'approved' | 'rejected' | 'superseded' | 'expired'
export interface DraftSourceRef {
  kind: string
  key: string
  quote_short?: string
}
export interface AiDraftDto {
  id: number
  targetKind: DraftTargetKind
  targetKey: string | null
  payload: unknown
  rationale: string | null
  sourceRefs: DraftSourceRef[]
  confidence: number | null
  status: DraftStatus
  createdBy: string
  model: string | null
  createdAt: string
  decidedBy: string | null
  decidedAt: string | null
  decidedNote: string | null
  appliedRef: string | null
}
export interface StructureCaptureResponse {
  success: boolean
  draft?: AiDraftDto | null
  aiText?: string
  captureId?: number
  error?: string
}

// ===== AI 레이어 (시크릿 #2/G2) — 수용률 플라이휠 + 비용 =====
export interface DraftStats {
  proposed: number
  approved: number
  approvedAsIs: number
  approvedEdited: number
  rejected: number
  acceptanceRate: number | null // 승인/(승인+거절)
  editRate: number | null // 수정승인/승인
  byForm: Array<{ formCode: string; proposed: number; approved: number; rejected: number }>
  cost: {
    totalUsd: number
    totalCalls: number
    byPurpose: Array<{ purpose: string; calls: number; tokensIn: number; tokensOut: number; costUsd: number }>
  }
}

// ===== AI 레이어 (Phase E1) — SQ 준비도 예측 =====
export interface ReadinessRed {
  code: string
  title: string
  points: number
  signal: 'red' | 'gray'
  reason: string
}
export interface ReadinessPrediction {
  score: number // 0~totalPoints (gray=미측정=0)
  totalPoints: number
  measurablePoints: number
  counts: { green: number; yellow: number; red: number; gray: number }
  categories: Array<{ name: string; points: number; signal: string; score: number }>
  reds: ReadinessRed[]
}
export interface ReadinessExplainResponse {
  success: boolean
  text?: string
  costUsd?: number | null
  error?: string
}

// ===== AI 레이어 (Phase F1) — 부재 감지(expected-set) =====
export interface AbsenceTrigger {
  key: string
  label: string
  description: string
}
export const ABSENCE_TRIGGERS: AbsenceTrigger[] = [
  { key: '4m_change', label: '4M 변경', description: '사람·설비·자재·방법 변경 시 개정해야 할 양식' },
  { key: 'new_mp', label: '신규 양산(PPAP)', description: '신규 양산 승인에 필요한 양식' },
  { key: 'customer_claim', label: '고객 클레임/부적합', description: '고객 불만·부적합 발생 시 필요한 양식' }
]
export type AbsenceStatus = 'ok' | 'unwritten' | 'missing'
export interface AbsenceItem {
  regCode: string
  expected: string // 기대 산출물 설명
  formCount: number
  submittedForms: number
  status: AbsenceStatus // ok=작성됨 / unwritten=양식있으나 미작성 / missing=양식자체 없음
  sampleForm: string | null
}
export interface AbsenceCheck {
  triggerKey: string
  triggerLabel: string
  items: AbsenceItem[]
  summary: { total: number; ok: number; unwritten: number; missing: number }
}
export interface AbsenceExplainResponse {
  success: boolean
  text?: string
  costUsd?: number | null
  error?: string
}

// ===== 품번/ISIR 척추 — 관리계획서(Control Plan) = 부품 단위 통제 =====
/** 제출유형 라벨(저장값 → 표시). */
export const ISIR_SUBMIT_TYPE_LABEL: Record<string, string> = {
  agreement: '검사협정',
  isir_new: 'ISIR 신규개발',
  isir_change: 'ISIR 설계변경'
}
export interface PartListItem {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  isirCount: number // 제출본 수
  cpItemCount: number // 관리계획서 항목 수
  defectCount: number // 불량 케이스 수
}
export interface IsirPackageDto {
  id: number
  revCode: string | null
  revDate: string | null
  submitType: string | null // agreement|isir_new|isir_change
  submitTypeLabel: string
  customerRecipient: string | null
  ireRisk: string | null
  qaManager: string | null
  submittedAt: string | null
}
export interface IsirDocItemDto {
  docNo: number
  docName: string
  required: boolean // 현재 제출유형 기준 필수
  present: boolean // 제출(보유) 여부
  status: 'ok' | 'missing' // 필수인데 미제출 = missing
}
export interface ControlPlanItemDto {
  seq: number
  processNo: string | null
  processName: string | null
  charKind: string | null // 제품|공정
  controlItem: string | null // 관리항목(특성)
  special: string | null
  spec: string | null // 규격
  method: string | null // 확인방법
  frequency: string | null // 주기
  controlMethod: string | null // 관리방안
  reaction: string | null // 이상시 조치
  note: string | null
}
/** ISIR 완비도(F1 ISIR판) — 결정론. submit_type 기준 필수 26종 대비 제출 + 관리계획서 커버리지. */
export interface IsirCompleteness {
  partNo: string
  partName: string | null
  pkg: IsirPackageDto | null
  docs: IsirDocItemDto[]
  cpItemCount: number
  processCount: number
  summary: { totalRequired: number; present: number; missing: number }
}
export interface IsirExplainResponse {
  success: boolean
  text?: string
  costUsd?: number | null
  error?: string
}
/** 런타임 ISIR xlsx 임포트 결과(파일선택→파싱→적재). */
export interface IsirImportResult {
  success: boolean
  canceled?: boolean // 사용자가 파일 선택 취소
  error?: string
  partNo?: string
  partName?: string | null
  revCode?: string | null
  submitType?: string | null
  submitTypeLabel?: string
  customer?: string | null
  docCount?: number // 표지 체크리스트 항목 수(통상 26)
  presentCount?: number // 그중 보유(present) 수
  cpItemCount?: number // 관리계획서 라인아이템 수
  processCount?: number // 공정 수(distinct)
  replaced?: boolean // 동일(part_no, rev_code) 기존 패키지 교체 여부
  reindexChunks?: number // 임포트 후 지식 인덱스 청크 수(null 가능)
}
export interface PartDefectDto {
  caseNo: string | null
  title: string | null
  defectDesc: string | null
  occurredDate: string | null
  status: string | null
}
export interface PartDetailDto {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  plant: string | null
  completeness: IsirCompleteness
  controlPlan: ControlPlanItemDto[]
  defects: PartDefectDto[]
}

// ===== AI 레이어 (Phase E3) — 모의 심사(AI가 심사원) =====
export interface MockAuditResult {
  itemCode: string
  itemTitle: string
  category: string
  points: number
  formCount: number
  submittedCount: number
  expectedDocCount: number
  text: string // AI 모의심사(예상질문 + 증빙 판정)
  costUsd: number | null
}
export interface MockAuditResponse {
  success: boolean
  result?: MockAuditResult
  error?: string
}

// ===== AI 레이어 (Phase E2) — 유사 케이스 + 8D/5Why 초안 =====
export interface SimilarCase {
  caseNo: string
  title: string
  customer: string | null
  partName: string | null
  defectDesc: string | null
  occurredDate: string | null
}
export interface SimilarCaseResult {
  similar: SimilarCase[]
  analysis: string // AI 5Why 원인 + 재발방지 대책
  costUsd: number | null
}
export interface SimilarCaseResponse {
  success: boolean
  result?: SimilarCaseResult
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

// ===== SQ 준비도 DTOs (SQ 평가 백본) =====

export type SqSignal = 'green' | 'yellow' | 'red' | 'gray'

export interface SqReadinessItem {
  code: string // '2_7'
  title: string
  points: number
  signal: SqSignal
  formCount: number // reg_code로 매핑된 양식 수(N)
  standardizedCount: number // layout_json 보유(작성가능) 양식 수
  draftedCount: number // 작성본 1건+ 양식 수
}

export interface SqReadinessCategory {
  id: number
  name: string
  points: number
  iatfClause: string | null
  signal: SqSignal
  items: SqReadinessItem[]
}

export interface SqReadinessDto {
  categories: SqReadinessCategory[]
  totalPoints: number
}

export interface SqItemFormRef {
  formCode: string
  formName: string
  regCode: string
  standardized: boolean // layout_json 보유 → 바로 작성 가능
  draftCount: number // 작성본 수
}

export interface SqItemDoc {
  docCode: string | null
  docName: string | null
  dept: string | null
}

export interface SqItemDetailDto {
  code: string
  title: string
  points: number
  requirement: string | null
  categoryName: string
  docs: SqItemDoc[] // 지배규정
  forms: SqItemFormRef[] // 매핑 양식
  formTypes: string[] // 기대 양식유형(코워크 분류)
}

// ===== 사건중심 8D 워크플로우 DTOs =====

export interface CaseIntakeInput {
  title?: string
  customer?: string
  source?: string
  partNo?: string
  partName?: string
  model?: string
  defectDesc?: string
  defectQty?: number | null
  attributable?: string
  occurredDate?: string
  receivedDate?: string
  dueDate?: string
  owner?: string
  /** LOT NO — cases 컬럼이 아니라 case_facts.lot 로 저장(분배 B1100-01 i4 의존). */
  lot?: string
}

export interface CaseListItem {
  id: number
  caseNo: string
  title: string
  customer: string
  partNo: string
  defectDesc: string
  status: string
  dueDate: string | null
  createdAt: string
}

export interface CaseStepDto {
  stepKey: string
  label: string
  status: string // todo | doing | done
  doneAt: string | null
  sortOrder: number
}

export interface CaseScreeningDto {
  scope: 'internal' | 'customer' // 사내재고 | 고객사
  ownerDept: string
  totalQty: number | null
  screenedQty: number | null
  defectQty: number | null
  status: string
  note: string | null
}

export interface CaseLinkedForm {
  id: number // form_submissions.id
  formCode: string
  formName: string
  serialNo: string
  status: string
}

/** 불량 케이스 ↔ ISIR 연결 — 이 부품의 관리계획서(통제 기준). 불량 = 이 기준의 실패. */
export interface CasePartControlDto {
  partNo: string
  partName: string | null
  hasIsir: boolean // parts에 ISIR 제출본이 적재돼 있는가
  revCode: string | null
  submitTypeLabel: string | null
  ireRisk: string | null
  itemCount: number // 관리계획서 라인아이템 수
  processCount: number // 공정 수(distinct)
  items: ControlPlanItemDto[] // 관리계획서 항목(통제 기준)
}

export interface CaseDetailDto {
  id: number
  caseNo: string
  title: string
  customer: string
  source: string
  partNo: string
  partName: string
  model: string
  defectDesc: string
  defectQty: number | null
  attributable: string
  occurredDate: string
  receivedDate: string
  dueDate: string
  status: string
  owner: string
  steps: CaseStepDto[]
  screening: CaseScreeningDto[]
  facts: Record<string, string>
  forms: CaseLinkedForm[] // 분배된 양식 작성본
  partControl: CasePartControlDto | null // 이 부품의 관리계획서(ISIR 연결). part_no 없으면 null
}

export interface CaseCreateResult {
  id: number
  caseNo: string
}

export interface CaseDistributeResult {
  created: number
  updated: number
  forms: CaseLinkedForm[]
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

/** 양식 분류 라벨: 전사 공통 또는 사업부 명칭(TPC 5개 사업부). */
export type FormScope = '공통' | '조관' | '인발' | '필라넥' | 'AM' | '쇼바'

/** picker 선택지 순서 (공통 우선, 이후 사업부). */
export const FORM_SCOPES: FormScope[] = ['공통', '조관', '인발', '필라넥', 'AM', '쇼바']

export interface ProcessFormRefDto {
  formCode: string
  formName: string
  regCode: string
  fieldsCount: number
  submissionsCount: number
  draftCount: number
  sortOrder: number
  /** 사업부 분류 라벨: '공통' 또는 사업부 명칭. */
  scope: FormScope
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

export interface ProcessPagesBulkUploadResponse {
  success: boolean
  /** 이미지가 등록된 페이지 수(기존 빈 페이지 채움 + 신규 생성 합계) */
  added: number
  /** 취소(파일 미선택)인지 여부 */
  canceled?: boolean
  error?: string
}

// ── 캡쳐 이미지 → 구조화 추출(AI 비전) PoC ──
export interface ProcessPageExtractedRevision {
  no: string
  date: string
  reason: string
  author: string
  kpi: string
  formula: string
  cycle: string
  owner: string
}
export interface ProcessPageExtractedApproval {
  role: string
  title: string
  name: string
}
export interface ProcessPageExtracted {
  docNo: string | null
  title: string | null
  revNo: string | null
  revDate: string | null
  scope: string | null
  purpose: string | null
  revisions: ProcessPageExtractedRevision[]
  approvals: ProcessPageExtractedApproval[]
}
export interface ProcessPageAiExtractResponse {
  success: boolean
  data?: ProcessPageExtracted
  /** 모델 원문 응답(파싱 실패 시 디버그용) */
  raw?: string
  provider?: string
  model?: string
  error?: string
}

// ── 프로세스 문서 구조화(표지 + 개정이력) ──
export interface ProcessDocRevision {
  no: string
  date: string
  reason: string
  author: string
  kpi: string
  formula: string
  cycle: string
  owner: string
}
export interface ProcessDocApproval {
  role: string
  title: string
  name: string
}
export interface ProcessDocDto {
  processCode: string
  docNo: string | null
  title: string | null
  revNo: string | null
  revDate: string | null
  scope: string | null
  purpose: string | null
  approvals: ProcessDocApproval[]
  revisions: ProcessDocRevision[]
}
export interface ProcessDocSaveRequest {
  processCode: string
  docNo: string | null
  title: string | null
  revNo: string | null
  revDate: string | null
  scope: string | null
  purpose: string | null
  approvals: ProcessDocApproval[]
  revisions: ProcessDocRevision[]
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
  [IPC_CHANNELS.FORM_SET_SCOPE]: {
    request: { formCode: string; scope: FormScope }
    response: { success: boolean; scope: FormScope }
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
  [IPC_CHANNELS.FORM_DRAFT_DEFAULTS]: {
    request: { formCode: string }
    response: { values: Record<string, string>; serialPreview: string | null }
  }
  [IPC_CHANNELS.FORM_EXPORT_XLSX]: {
    request: { submissionId: number; pdf?: boolean }
    response: FormExportResult
  }
  [IPC_CHANNELS.FORM_REVISION_SAVE]: {
    request: { submissionId: number; changeReason?: string }
    response: { success: boolean; revNo?: number; error?: string }
  }
  [IPC_CHANNELS.FORM_REVISION_LIST]: {
    request: { submissionId: number }
    response: FormRevisionListItemDto[]
  }
  [IPC_CHANNELS.FORM_REVISION_GET]: {
    request: { id: number }
    response: FormRevisionDto | null
  }
  [IPC_CHANNELS.PRINT_TO_PDF]: {
    request: { defaultName?: string }
    response: { success: boolean; filePath?: string; canceled?: boolean; error?: string }
  }
  [IPC_CHANNELS.AI_GENERATE]: {
    request: AiGenerateRequest
    response: AiGenerateResponse
  }
  [IPC_CHANNELS.AI_COPILOT_ASK]: {
    request: CopilotAskRequest
    response: CopilotAskResponse
  }
  [IPC_CHANNELS.AI_BRIEFING_FACTS]: {
    request: Record<string, never>
    response: BriefingFacts
  }
  [IPC_CHANNELS.AI_BRIEFING_SUMMARIZE]: {
    request: { facts: BriefingFacts }
    response: BriefingSummarizeResponse
  }
  [IPC_CHANNELS.AI_STRUCTURE_CAPTURE]: {
    request: { memo: string; formCode: string }
    response: StructureCaptureResponse
  }
  [IPC_CHANNELS.AI_DRAFT_LIST]: {
    request: { status?: DraftStatus }
    response: AiDraftDto[]
  }
  [IPC_CHANNELS.AI_DRAFT_APPROVE]: {
    request: { id: number; editedPayload?: unknown }
    response: { success: boolean; appliedRef?: string; error?: string }
  }
  [IPC_CHANNELS.AI_DRAFT_REJECT]: {
    request: { id: number; note?: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.AI_DRAFT_STATS]: {
    request: Record<string, never>
    response: DraftStats
  }
  [IPC_CHANNELS.AI_READINESS_PREDICT]: {
    request: Record<string, never>
    response: ReadinessPrediction
  }
  [IPC_CHANNELS.AI_READINESS_EXPLAIN]: {
    request: { prediction: ReadinessPrediction }
    response: ReadinessExplainResponse
  }
  [IPC_CHANNELS.AI_ABSENCE_CHECK]: {
    request: { triggerKey: string }
    response: AbsenceCheck
  }
  [IPC_CHANNELS.AI_ABSENCE_EXPLAIN]: {
    request: { check: AbsenceCheck }
    response: AbsenceExplainResponse
  }
  [IPC_CHANNELS.AI_MOCK_AUDIT]: {
    request: { sqItemKey: string }
    response: MockAuditResponse
  }
  [IPC_CHANNELS.AI_SIMILAR_CASES]: {
    request: { defect: string }
    response: SimilarCaseResponse
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
  [IPC_CHANNELS.PROCESS_PAGES_BULK_UPLOAD]: {
    request: { processCode: string }
    response: ProcessPagesBulkUploadResponse
  }
  [IPC_CHANNELS.PROCESS_PAGE_AI_EXTRACT]: {
    request: { pageId: number }
    response: ProcessPageAiExtractResponse
  }
  [IPC_CHANNELS.PROCESS_DOC_GET]: {
    request: { processCode: string }
    response: ProcessDocDto | null
  }
  [IPC_CHANNELS.PROCESS_DOC_SAVE]: {
    request: ProcessDocSaveRequest
    response: { success: boolean }
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
  [IPC_CHANNELS.SQ_READINESS]: {
    request: void
    response: SqReadinessDto
  }
  [IPC_CHANNELS.SQ_ITEM_DETAIL]: {
    request: { code: string }
    response: SqItemDetailDto | null
  }
  [IPC_CHANNELS.CASE_LIST]: {
    request: void
    response: CaseListItem[]
  }
  [IPC_CHANNELS.CASE_GET]: {
    request: { id: number }
    response: CaseDetailDto | null
  }
  [IPC_CHANNELS.CASE_CREATE]: {
    request: CaseIntakeInput
    response: CaseCreateResult
  }
  [IPC_CHANNELS.CASE_UPDATE]: {
    request: { id: number } & Partial<CaseIntakeInput>
    response: { success: boolean }
  }
  [IPC_CHANNELS.CASE_STEP_UPDATE]: {
    request: { id: number; stepKey: string; status: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.CASE_SCREENING_SAVE]: {
    request: {
      id: number
      scope: 'internal' | 'customer'
      ownerDept?: string
      totalQty?: number | null
      screenedQty?: number | null
      defectQty?: number | null
      status?: string
      note?: string | null
    }
    response: { success: boolean }
  }
  [IPC_CHANNELS.CASE_FACT_SAVE]: {
    request: { id: number; key: string; value: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.CASE_DISTRIBUTE]: {
    request: { id: number }
    response: CaseDistributeResult
  }
  [IPC_CHANNELS.PARTS_LIST]: {
    request: void
    response: PartListItem[]
  }
  [IPC_CHANNELS.PART_DETAIL]: {
    request: { partNo: string }
    response: PartDetailDto | null
  }
  [IPC_CHANNELS.PARTS_IMPORT_ISIR]: {
    request: void
    response: IsirImportResult
  }
  [IPC_CHANNELS.AI_ISIR_COMPLETENESS]: {
    request: { partNo: string }
    response: IsirCompleteness
  }
  [IPC_CHANNELS.AI_ISIR_EXPLAIN]: {
    request: { check: IsirCompleteness }
    response: IsirExplainResponse
  }
}

export interface ReportExportResult {
  success: boolean
  filePath?: string
  count?: number
  canceled?: boolean
  error?: string
}

/** 공식 엑셀(원본양식 주입) 출력 결과. 핸들러·formStore·FormCanvas 공용 단일출처. */
export interface FormExportResult {
  success: boolean
  filePath?: string
  error?: string
  canceled?: boolean
  applied?: number
  unmapped?: string[]
  /** 격자/대장형 행반복 결과(필드별 주입행수/잘림행수) */
  grids?: Array<{ gridKey: string; written: number; dropped: number }>
  /** 옵션별 분리셀형 라디오/체크박스 마킹 결과(필드별 마킹 셀 수) */
  optCells?: Array<{ fieldKey: string; marked: number }>
  verify?: { values: string; mediaOk: boolean; mergesOk: boolean }
}

/** 개정 이력 목록 항목(값 제외 경량) */
export interface FormRevisionListItemDto {
  id: number
  revNo: number
  changeReason: string | null
  author: string | null
  status: string | null
  createdAt: string
}

/** 개정 단건(스냅샷 값 포함) */
export interface FormRevisionDto {
  id: number
  submissionId: number
  revNo: number
  values: Record<string, unknown>
  changeReason: string | null
  author: string | null
  status: string | null
  createdAt: string
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
