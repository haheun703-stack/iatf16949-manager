import type { IPC_CHANNELS } from './ipc-channels'
import type { TeamId } from './team-theme'

// ===== DTO Types =====

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
  /** 정본(마스터 양식) 폴더 경로. 공식 xlsx 출력의 원본 위치. Sidebar 에서 폴더 선택. */
  mastersDir: string
  /** 정기 인증심사일(YYYY-MM-DD). D-day 배지·브리핑의 기준. Sidebar 에서 설정. */
  auditDate: string
}

/** 제품(앱) 정보 — 제품 정보 화면(버전·제조사)용. main 에서 app.getVersion 등으로 수집. (UI P3) */
export interface AppInfo {
  /** 제품명 (electron-builder productName) */
  productName: string
  /** 앱 버전 (package.json version) */
  version: string
  /** 저작권 */
  copyright: string
  /** 런타임 버전 */
  electron: string
  chrome: string
  node: string
  v8: string
  /** OS 플랫폼·아키텍처 */
  platform: string
  arch: string
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
  /** 틀(frame)/사실(fact) 분류(0085) — fact 는 예시 자동주입 금지·저장 검증 대상(P5) */
  fieldClass: 'frame' | 'fact'
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
  /** 소프트 폐기(신판 등으로 대체된 구판). true 면 작성/출력 대신 대체 모듈로 안내. */
  deprecated: boolean
  /** 폐기 안내 문구(대체 사유·이동 안내). */
  deprecatedNote: string | null
  /** 대체 모듈 페이지 id(uiStore PageId). 예: 'fmea'. */
  replacementPage: string | null
}

export interface FormListItemDto {
  code: string
  name: string
  regCode: string
  approvalsCount: number
  fieldsCount: number
  submissionsCount: number
  draftCount: number
  // P10 — 문서 작성 화면(양식 행 리스트)용 부가 메타
  respDept: string | null // 책임부서(팀 뱃지·내 관련순 정렬)
  hasExample: boolean // 모범 예시(form_examples) 보유
  obligationLinked: boolean // 정기 의무(recurring_obligations)에 연결됨
  inSqPack: boolean // SQ 미니멀 팩(pack_forms 'sq-minimal') 소속 — 29번 §5
  lastWrittenAt: string | null // 최근 작성본 시각(updated_at 우선)
  deprecated: boolean // 구판(대체됨) — 기본 목록에서 숨김
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
/** 런타임 ISIR xlsx 임포트 — 파일 1개 결과(파싱→적재). */
export interface IsirImportResult {
  success: boolean
  canceled?: boolean // 사용자가 파일 선택 취소
  error?: string
  file?: string // 원본 파일명(basename) — 배치에서 식별
  warnings?: string[] // 부분 추출 경고(표지0종·관리0항목·다중시트 등) — 비었으면 clean
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

/** 다품번 배치 임포트 결과 — 파일별 결과 + 품질 집계. */
export interface IsirImportBatchResult {
  canceled?: boolean // 파일 선택 취소
  total: number // 선택 파일 수
  clean: number // 성공 & 경고 없음
  partial: number // 성공 & 경고 있음(부분 추출)
  failed: number // 실패(ISIR 아님 등)
  results: IsirImportResult[] // 파일별 상세(각 .file/.warnings/.success/.error)
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
  // ── v3 대시보드 KPI 확장 ──
  /** 미결 불량 케이스 수 (open·in_progress) */
  openCases: number
  /** 작성 가능(form_fields 정의) 양식 수 — 작성 커버리지 분자 */
  formsFillable: number
  /** 최근 28일 신규 작성본이 생긴 SQ 매핑 양식 수 — 준비도 궤적 '현 페이스' 근거 */
  sqNewDrafts4w: number
}

// ===== 양식 캔버스 (엑셀형 작성 화면) — RenderModel =====

/** 원본 마스터 시트의 셀 하나(병합 마스터만; 슬레이브는 생략). 스타일은 CSS로 미리 계산. */
export interface RenderCellDto {
  r: number
  c: number
  text: string
  rowspan: number
  colspan: number
  bg?: string
  color?: string
  bold?: boolean
  fontSize?: number
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'middle' | 'bottom'
  wrap?: boolean
  /** 테두리 CSS 값 (예: '1px solid #000') */
  bt?: string
  br?: string
  bb?: string
  bl?: string
}

/** 입력 가능 셀 — form_cell_map ↔ form_fields 브리지 해소 결과. */
export interface RenderEditCellDto {
  cell: string
  r: number
  c: number
  /** values_json 키(form_fields.field_key). */
  fieldKey: string
  label: string
  type: string
}

export interface FormRenderModelDto {
  formCode: string
  sheetName: string
  rowCount: number
  colCount: number
  colWidthsPx: number[]
  rowHeightsPx: number[]
  cells: RenderCellDto[]
  editCells: RenderEditCellDto[]
  error?: string
}

// ===== 팀별 허브 (홈) =====

/** 팀에 배정된 SQ 항목(팀 상세 단계 리스트의 재료). */
export interface TeamSqItemDto {
  code: string
  title: string
  points: number
  signal: SqSignal
  /** 이 항목의 근거 규정 중 이 팀 책임인 것들 */
  regs: string[]
}

export interface TeamSummaryDto {
  teamId: TeamId
  /** SQ 기반 준비도(0~100). 배정 항목 없으면 null(측정 전). */
  readinessPct: number | null
  itemCount: number
  redCount: number
  /** 도래·연체 정기의무 수(팀 책임 양식 기준 배정) */
  dueCount: number
  urgent: boolean
  /** 팀 책임 양식 보유/작성가능 수 */
  formsTotal: number
  formsFillable: number
  /** 배점 큰 순 SQ 항목(상세 스켈레톤용) */
  items: TeamSqItemDto[]
}

/** 팀 책임 규정(지침) 하위 양식 */
export interface TeamRegFormDto {
  code: string
  name: string
  /** form_fields 수 — 0이면 문서 등록만 */
  fieldsCount: number
  draftCount: number
}

/** 팀 책임 규정(지침) — 문서 BOM 트리의 팀 렌즈 */
export interface TeamRegDto {
  regCode: string
  regName: string
  /** regulation_sections 본문 보유 여부 */
  hasBody: boolean
  iatfClause: string | null
  forms: TeamRegFormDto[]
}

// ===== 관제탑 홈: 팀별 오늘 할 일 보드 (포털 1단계) =====

/** done=이행됨 / due=오늘 마감 미이행 / overdue=기한 경과 / upcoming=lead 창 내 예정 */
export type TodayTaskStatus = 'done' | 'due' | 'overdue' | 'upcoming'

export interface TodayTaskDto {
  id: number
  title: string
  cadence: string
  /** 담당자 개인(0066, 자유 텍스트) — 개인별 보드 그룹핑용 */
  assignee: string | null
  status: TodayTaskStatus
  /** 다음 도래일(YYYY-MM-DD). */
  dueDate: string | null
  /** 오늘 기준 남은 일수(음수=연체). done 이면 null. */
  daysLeft: number | null
  /** 오늘 이행된 경우 이행일. */
  doneAt: string | null
  /** manual=완료 버튼 / form=연결 양식의 오늘 작성 기록 감지(자동 판정) */
  doneSource: 'manual' | 'form' | null
  formCode: string | null
  /**
   * 연결 양식이 오늘 작성됨(form_submissions). done 이 아니어도 true 가능 —
   * §0.6 결정2: 작성기록만 있고 미확정이면 done 이 아니라 '작성기록 있음 — 완료 확정 필요'(앰버).
   */
  hasFormRecord: boolean
  /** 연계 SQ 항목 코드(예: '2_7') — 심사는 항목 각주로만. */
  sqBadges: string[]
  /** 데이터 트리거 이슈(M3, 15번 §3) — 있으면 이 항목은 의무가 아니라 트리거 발행 건. */
  triggerIssueId?: number
  /** 원천 데이터가 해소함('해소표시') — ✓ 확정은 사람 대기(자동 완료 금지 §3-2). */
  triggerResolved?: boolean
  /**
   * [심사 갭] 팀당 집계 행(코워크 7/25 판단①-b) — N=장기연체 의무 수. 완료 개념 없음(자동
   * 소멸형: 원 의무 완료로 N 감소, 0이면 행 소멸). 팀 done/open 집계에 미포함(표출 전용).
   */
  gapCount?: number
}

export interface TeamTodayDto {
  teamId: TeamId
  /** 오늘 이행 완료 수 */
  done: number
  /** 오늘 해야 하는데 미이행(due+overdue) */
  open: number
  overdue: number
  upcoming: number
  tasks: TodayTaskDto[]
}

export interface TeamTodayBoardDto {
  /** 기준일(로컬 YYYY-MM-DD) */
  date: string
  totals: { done: number; open: number; overdue: number }
  /** 최근 7일 완료 건수(0063 이력 기반 — 오늘부터 쌓임) */
  trend: Array<{ date: string; done: number }>
  teams: TeamTodayDto[]
  /** 팀 매핑 실패 의무(정직 노출 — owner 표기 정비 대상) */
  unassigned: TodayTaskDto[]
}

// ===== 관제탑 홈 KPI 지수 (0066) =====

export interface KpiMeasurementDto {
  period: string // 'YYYY-MM'
  value: number
}

export interface KpiIndicatorDto {
  id: number
  name: string
  unit: string
  /** null = 목표 미설정 */
  target: number | null
  /** higher=높을수록 좋음 / lower=낮을수록 좋음 */
  direction: 'higher' | 'lower'
  ownerTeam: string | null
  /** 0066 대표 6종 < 100 ≤ v4 §04 팀별 지표(0082) — 홈 '대표 지표' 필터 기준 */
  sortOrder: number
  note: string | null
  /** 최신 측정값(없으면 null → '미입력' 표시) */
  latest: KpiMeasurementDto | null
  /** 직전 측정값(추세 표시용) */
  prev: KpiMeasurementDto | null
}

export interface KpiSaveInput {
  indicatorId: number
  period: string // 'YYYY-MM'
  value: number
  enteredBy?: string
}

/** 특정 월의 지표별 실적값(일괄 입력 화면 프리필용) */
export interface KpiMonthValueDto {
  indicatorId: number
  value: number
}

/** 월별 실적 일괄 저장 — 값이 채워진 지표만 upsert(빈칸=미입력 유지) */
export interface KpiBatchSaveInput {
  period: string // 'YYYY-MM'
  entries: Array<{ indicatorId: number; value: number }>
  enteredBy?: string
}

// ===== P5 양식별 모범 예시(form_examples, 0085) — 좌측 정답 패널 =====

export interface FormExampleDto {
  fieldKey: string
  label: string
  exampleValue: string
  whyNote: string | null
  /** form_fields.field_class — frame=[틀 가져오기] 대상 / fact=자동주입 금지·저장검증 대상 */
  fieldClass: 'frame' | 'fact'
  /** form_fields.type — date·select·radio·checkbox·auto + 판정류 값은 완전일치 차단에서 제외(form-validation.ts, 오탐 방지) */
  fieldType: string
}

// ===== P2 앱 사용자(공용 PC 사람 전환) — app_users(0085) =====

export type AppUserRole = 'member' | 'manager' | 'executive'

export interface AppUserDto {
  id: number
  name: string
  /** normalizeTeam 가능한 부서 문자열(team-theme deptKeys). null 가능 */
  teamDept: string | null
  role: AppUserRole
  active: boolean
  sortOrder: number
}

export interface AppUserUpsertInput {
  /** 있으면 UPDATE, 없으면 INSERT(name UNIQUE 충돌 시 UPDATE) */
  id?: number
  name: string
  teamDept?: string | null
  role?: AppUserRole
  active?: boolean
  sortOrder?: number
}

// ===== SQ 작성 가이드층 (0064, 코워크 07/08 지시서) =====

export type SqCheckpointStatus = 'met' | 'partial' | 'missing' | 'na'
/** 이행상태 제안값 — 자체평가 확정값과 동일 어휘(채점 계수는 app_config) */
export type SqSuggestedState = '우수' | '양호' | '보완' | '일부미흡' | '다수미흡' | '미관리' | '미해당'

export interface SqGuideCheckpointDto {
  id: number
  guideId: number
  content: string
  status: SqCheckpointStatus
  evidenceNote: string | null
}

export interface SqGuideDto {
  itemCode: string
  title: string
  area: string
  score: number
  highValue: boolean
  regulationsText: string | null
  formsText: string | null
  cycleRetention: string | null
  guideVersion: string
  /** 증빙 체크리스트(evidence 불릿, 체크 상태 연동) */
  checkpoints: SqGuideCheckpointDto[]
  howToWrite: string[]
  examples: string[]
  penaltyPatterns: string[]
  /** 체크 상태에서 결정론 산출한 제안 이행상태 — 확정은 자체평가(사람) */
  suggestedState: SqSuggestedState
}

export interface SqCheckpointUpdateInput {
  checkpointId: number
  status: SqCheckpointStatus
  evidenceNote?: string | null
  updatedBy?: string
}

// ===== SQ 대시보드 (09 목업 실구현 — 제안 기준) =====

export interface SqDashboardItemDto {
  code: string
  title: string
  area: string
  score: number
  suggestedState: SqSuggestedState
  /** 제안 상태 × 계수로 환산한 취득점수(미해당은 0이지만 분모 제외) */
  earned: number
  /** 손실 = 배점 - 취득 (미해당은 0) */
  loss: number
  teams: TeamId[]
}

// ===== IATF 대시보드 (인증 심사 준비 한 장) =====

export interface IatfDutyDto {
  id: number
  title: string
  category: string
  clauseRef: string | null
  cadence: string
  lastDoneDate: string | null
  nextDueDate: string | null
  /** 음수 = 연체 */
  daysLeft: number | null
  status: 'ok' | 'due' | 'overdue'
}

export interface IatfDashboardDto {
  clauses: Array<{ clause: string; title: string; regCount: number }>
  /** 심사 핵심 카테고리(내부심사·경영검토·교정/MSA·교육/인식·문서관리·안전/비상) 의무 */
  duties: IatfDutyDto[]
  docs: {
    regsTotal: number
    regBodies: number
    formsTotal: number
    formsFillable: number
    formsWithSubmission: number
  }
}

// ===== 규정·양식 찾아보기 (포털 2단계) =====

export interface RegBrowseDto {
  regCode: string
  regName: string
  respDepts: string[]
  iatfClause: string | null
  hasBody: boolean
  formsTotal: number
  formsFillable: number
  draftCount: number
}

// ===== SQ 자체평가 (코워크 07 Phase B) =====

export interface SqAssessmentLineDto {
  itemCode: string
  title: string
  area: string
  score: number
  suggestedState: SqSuggestedState | null
  finalState: SqSuggestedState | null
  observation: string | null
  extraFinding: string | null
}

export interface SqAssessmentDto {
  id: string
  assessedAt: string
  assessor: string | null
  witness: string | null
  summaryOpinion: string | null
  nextDue: string | null
  totalScore: number | null
  grade: string | null
  reportPath: string | null
  approvedBy: string | null
  approvedAt: string | null
  confirmedCount: number
  lines: SqAssessmentLineDto[]
}

export interface SqAssessmentSummaryDto {
  id: string
  assessedAt: string
  totalScore: number | null
  grade: string | null
  reportPath: string | null
  confirmedCount: number
}

export interface SqAssessConfirmInput {
  assessmentId: string
  itemCode: string
  finalState?: SqSuggestedState | null
  observation?: string | null
  extraFinding?: string | null
}

export interface SqAssessMetaInput {
  assessmentId: string
  assessedAt?: string
  assessor?: string | null
  witness?: string | null
  summaryOpinion?: string | null
  nextDue?: string | null
  approvedBy?: string | null
}

export interface SqDashboardDto {
  /** 'suggested' = 체크리스트 기반 자동 제안치 (자체평가 확정 전) */
  basis: 'suggested'
  guideVersion: string
  /** 미해당 제외 원점수 합 */
  totalRaw: number
  /** 미해당 배점 합 */
  naScore: number
  /** 모드① 환산: 원점수 ÷ (1000-미해당배점) × 1000, 반올림 */
  totalConverted: number
  grade: 'S' | 'G' | '불합격'
  gradeRule: { S: number; G: number }
  checkpoint: { met: number; partial: number; missing: number; na: number }
  areas: Array<{ area: string; score: number; earned: number; naAll: boolean }>
  topLosses: SqDashboardItemDto[]
  /** 손실 큰 순 팀 목록 — 팀별로 해야 할 항목들 */
  teams: Array<{ teamId: TeamId; loss: number; items: SqDashboardItemDto[] }>
  /** 팀 미배정 항목(정직 노출) */
  unassigned: SqDashboardItemDto[]
  /** 최근 확정 자체평가(있으면 이것이 정본 — 제안치는 참고로 강등) */
  confirmed: { id: string; assessedAt: string; totalScore: number; grade: string } | null
}

// ===== 정합성 점검 (7/19 검수 체계 1층 — 팀 체인 결정론 검사) =====

export interface IntegrityCheckRow {
  key: string
  name: string
  status: 'ok' | 'warn' | 'fail'
  count: number
  /** 문제 상세(최대 20건 표시) */
  details: string[]
  /** 검사 설명(판정 기준) */
  note: string
}

export interface IntegrityReportDto {
  ranAt: string
  totals: { ok: number; warn: number; fail: number }
  rows: IntegrityCheckRow[]
}

// ===== LOT 계보 조회 (7/19 Scan-to-Trace — MES POP_TRACE 사이드카) =====

export interface MesTraceStatusDto {
  available: boolean
  path: string
  builtAt: string | null
  sourceDmp: string | null
  lotCount: number
  edgeCount: number
  /** 계보 링크 연도 범위 (예: '2021~2026') */
  yearRange: string | null
}

export interface MesTraceLotDto {
  id: number
  barcode: string
  lotseq: number
  /** 품번 (POP_LOT_INFO.PNO — 원장 밖 LOT 은 null) */
  pno: string | null
  addymd: string | null
  gbn: string | null
  qty: number | null
}

export interface MesTraceLevelDto {
  /** 1 = 직계 (부모/자식), 2 = 그 다음 단계 ... */
  depth: number
  /** 해당 단계 실제 건수 (lots 는 표시 상한으로 잘릴 수 있음) */
  count: number
  lots: MesTraceLotDto[]
}

export interface MesTraceDirectionDto {
  levels: MesTraceLevelDto[]
  /** 전개된 LOT 총수 (start 제외) */
  total: number
  /** 그래프 전개 소요(ms) — 심사 시연 수치 */
  ms: number
  /** 상한 도달로 잘렸는지 */
  truncated: boolean
}

export interface MesTraceExpandDto {
  start: MesTraceLotDto
  /** 역추적 — 이 LOT 에 들어온 것(자재 방향) */
  up: MesTraceDirectionDto
  /** 정추적 — 이 LOT 이 들어간 곳(완제품 방향) */
  down: MesTraceDirectionDto
}

// ===== MES 기록 현황 (7/20 — 기록이 들어왔는지/비었는지 커버리지 판정) =====

export interface MesRecordsTypeStat {
  /** 'W'자주 / 'I'수입 / 'P'패트롤 / 'O'출하 / 'MAC'설비 일상점검 */
  key: string
  label: string
  totalItems: number
  firstYmd: string | null
  lastYmd: string | null
}

export interface MesRecordsStatusDto {
  available: boolean
  path: string
  builtAt: string | null
  sourceDmp: string | null
  /** 덤프 데이터 마지막 일자 — 이후 날짜 공백은 '새 덤프 반입 필요'(결측 아님) */
  dataEndYmd: string | null
  /** 미래 일자로 잘못 입력된 MES 행 수(빌드에서 제외, 정직 표기) */
  futureRows: number
  types: MesRecordsTypeStat[]
}

export interface MesRecordsDayCell {
  ymd: string
  /** 0 = 기록 없음 */
  items: number
  /** 기록된 품번수(설비점검은 설비수) */
  parts: number
}

export interface MesRecordsCoverageDto {
  days: number
  dataEndYmd: string | null
  strips: Array<{ key: string; label: string; cells: MesRecordsDayCell[] }>
}

export interface MesRecordsPartRow {
  /** 품번(설비점검은 설비코드) */
  pno: string
  /** 품명 / 설비명(mes_codes WRKCTR) */
  name: string | null
  firstYmd: string | null
  lastYmd: string | null
  totalItems: number
  activeDays: number
  /** 데이터 종료일 기준 미기록 경과일 — 큰 값 = 기록이 끊긴 품번/설비 */
  staleDays: number
}

export interface MesRecordsDetailDto {
  key: string
  label: string
  /** 미기록 경과일 큰 순 */
  rows: MesRecordsPartRow[]
  /** 데이터 종료일 기준 최근 30일 중 기록 있는 날 */
  recent: Array<{ ymd: string; items: number; parts: number; inspectors: number; confirmedPct: number | null }>
}

// ===== P1 ⓑ 공정 실황 행렬 (커버리지 모드 — 25번 §3, 0125 트랙) =====

export type MesProcessStatus = 'active' | 'gap' | 'stale' | 'nosource'

export interface MesProcessLiveCol {
  key: string
  label: string
  /** 요청일 기록 건수 = MES(sqc 품번×구분 행 + mac 설비 행) + 앱 작성 제출 */
  todayRecords: number
  /** 요청일 MES 측정 항목 수(sqc items 합 — 생산수량 EA 아님, 정직 명칭) */
  todayItems: number
  /** 요청일 앱 작성 기록 수(공정 매핑 양식의 form_submissions) */
  todayForms: number
  /** 이 공정의 마지막 MES 기록일(전체 이력 기준) */
  lastYmd: string | null
  /** 덤프 데이터 끝(dataEndYmd) 대비 마지막 기록 공백일 */
  gapDays: number | null
  status: MesProcessStatus
  /** 원천 조합 라벨('MES 자주+설비점검' 등) — 없으면 '—' */
  source: string
  /**
   * PB2 ⓑ 도넛(30번 v2): 최근 7일 **가동일 대비** 기록일 %(0~100).
   * 분모 = 창 안에서 어느 공정이든 기록이 있던 날(가동일 프록시 — 가짜 분모 금지),
   * 분자 = 이 공정 기록일. 가동일 0(원천 없음·미반입 전체)이면 null — 도넛 회색 정직.
   */
  weekPct: number | null
}

export interface MesProcessLiveDto {
  /** 판정 기준일(기본 = 오늘) */
  ymd: string
  /** 덤프 데이터 끝 — ymd 가 이보다 뒤면 MES 원천은 미반입(stale) 구간 */
  dataEndYmd: string | null
  available: boolean
  columns: MesProcessLiveCol[]
  /** 도넛 % 분모 원천(배치⑶ #18): calendar = 조업달력 등록분 · proxy = 종전 기록일 프록시(달력 미등록 구간 — 정직 표기) */
  denomSource: 'calendar' | 'proxy'
}

// ===== PB2 ⓒ SQ 심사 뷰 (SQ 항목 × 공정 ●◐× — 30번 v2 하단부, 29번 §11) =====

/** 셀 기호: ● 창 내 가동일 전부 기록 · ◐ 일부 · × 공백(대상인데 0) · — 비대상(이력 원천 없음) */
export type SqAuditMark = '●' | '◐' | '×' | '—'

export interface SqAuditCellDto {
  mark: SqAuditMark
  /** 이 공정×검사종류 최근 기록일(전체 이력) */
  lastYmd: string | null
  /** 창 내 기록일 수 */
  days: number
}

export interface SqAuditRowDto {
  /** SQ 항목 코드('1_4' 등) — 갭 행은 '' */
  sqItem: string
  title: string
  /** 근거 양식 코드 */
  formCode: string
  /** IATF 조항(갭 행·매핑분) — 없으면 '' */
  iatfClause: string
  /** IATF 추가 요구 ＋행 여부(pack_forms 'iatf-gap' — 0135 시드, 확장 = 행 추가만) */
  gap: boolean
  /** procKey → 셀. 갭 행은 공정축 미분해 — overall 만 사용 */
  cells: Record<string, SqAuditCellDto>
  /** 갭 행 전용 — 전사 축 판정(근거 양식 작성 기록, 창 내) */
  overall?: { mark: '●' | '×'; lastYmd: string | null; count: number }
}

export interface SqAuditMatrixDto {
  ymd: string
  dataEndYmd: string | null
  available: boolean
  /** 판정 창(도넛과 동일 — 끝 = min(오늘, 데이터 끝), 7일) */
  windowStart: string
  windowEnd: string
  /** 창 내 가동일 수(분모 — denomSource 참조) */
  opDays: number
  /** 분모 원천(배치⑶ #18): calendar = 조업달력 등록분 · proxy = 종전 기록일 프록시(정직 표기) */
  denomSource: 'calendar' | 'proxy'
  columns: { key: string; label: string }[]
  rows: SqAuditRowDto[]
}

// ===== P1 ⓒ 품번×공정 매트릭스 (월 수불량 SO 정렬 — R1 확정 260730) =====

export interface MesPartProcessCell {
  /** 기준일 MES 검사 항목 수(sqc items 합) */
  today: number
  /** 이 품번×공정 마지막 기록일 */
  lastYmd: string | null
}

export interface MesPartProcessRow {
  pno: string
  pname: string | null
  /** 정렬 기준월 SO(출하) 수량 합 */
  monthQty: number
  /** procKey → 셀 (기록 없던 공정은 키 없음) */
  cells: Record<string, MesPartProcessCell>
}

export interface MesPartProcessDto {
  ymd: string
  dataEndYmd: string | null
  /** 정렬에 쓴 수불 기준월(YYYY-MM) — 데이터 있는 최신 월 */
  subulMonth: string | null
  available: boolean
  columns: Array<{ key: string; label: string }>
  rows: MesPartProcessRow[]
}

// ===== SQ 심사 아이템 트랙 (0068/0069 — 품번 4종 × 4단계 체크리스트) =====

export type SqTrackStatus = 'open' | 'in_progress' | 'done' | 'na'
export type SqTrackSeverity = 'red' | 'orange' | 'yellow'

export interface SqTrackPartCardDto {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  binderInfo: string | null
  scanRef: string | null
  total: number
  done: number
  na: number
  /** open + in_progress 를 심각도별 집계 */
  openBySeverity: { red: number; orange: number; yellow: number }
}

export interface SqTrackOverviewDto {
  auditDate: string | null
  title: string
  goal: string | null
  /** 심사 대상 정본 품번 (app_config audit.primaryPartNo — 2026-07-25 사장님 확정 28236-2MAA0) */
  primaryPartNo: string | null
  parts: SqTrackPartCardDto[]
  totals: { total: number; open: number; done: number }
}

export interface SqTrackItemDto {
  code: string
  phase: number
  seq: number
  title: string
  detail: string | null
  evidencePages: string | null
  severity: SqTrackSeverity
  team: TeamId | null
  formCode: string | null
  formName: string | null
  sqItemCode: string | null
  tag: string | null
  status: SqTrackStatus
  note: string | null
  updatedBy: string | null
  updatedAt: string | null
}

export interface SqTrackPartDetailDto {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  binderInfo: string | null
  scanRef: string | null
  phases: Array<{ phase: number; label: string; items: SqTrackItemDto[] }>
}

export interface SqTrackItemUpdateInput {
  itemCode: string
  status?: SqTrackStatus
  note?: string | null
  updatedBy?: string
}

// ===== 오늘 할 일 (매일 관리 보드) =====

export interface DailyObligationDto {
  id: number
  title: string
  cadence: string
  nextDueDate: string
  /** 오늘 기준 남은 일수. 음수 = 연체. */
  daysLeft: number
  owner: string | null
  formCode: string | null
}

export interface DailySqRedDto {
  code: string
  title: string
  points: number
  categoryName: string
  /** 매핑된 양식 수 — 이 중 하나라도 작성하면 신호 개선. */
  formCount: number
}

export interface DailyDraftDto {
  submissionId: number
  formCode: string
  formName: string
  serialNo: string | null
  updatedAt: string
}

export interface DailyBoardDto {
  /** 연체된 정기 의무 (next_due_date < 오늘) */
  overdue: DailyObligationDto[]
  /** 임박 정기 의무 (오늘 ~ lead_days 이내) */
  dueSoon: DailyObligationDto[]
  /** SQ 🔴 미충족 중 양식 작성으로 해결 가능한 항목(점수 높은 순) */
  sqRed: DailySqRedDto[]
  /** 작성 중 초안 — 이어쓰기 */
  drafts: DailyDraftDto[]
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
  /** form_fields 수 — 0이면 문서 등록만(작성 준비 전) */
  fieldsCount?: number
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
  /** 책임부서(팀). 정본 0.7 매트릭스 기준. 총무/영업/품질보증/개발/구매/생산/생산기술. */
  respDept: string | null
}

/** IATF 조항별 커버리지: 한 규정의 조항 내 참조. */
export interface ClauseRegRefDto {
  regCode: string
  name: string
  respDept: string | null
  /** 이 규정을 참조하는 프로세스 코드들. */
  processes: string[]
}

/** IATF 조항(4~10) 하나의 커버리지. */
export interface ClauseCoverageDto {
  clause: string
  title: string
  regs: ClauseRegRefDto[]
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

// ===== 정기 의무 캘린더 (반복 의무: 일/주/월/분기/년) =====

export type ObligationCadence = '일' | '주' | '월' | '분기' | '반기' | '년'
export type ObligationCategory =
  | '내부심사'
  | '경영검토'
  | '모니터링'
  | '공급업체'
  | '교육/인식'
  | '교정/MSA'
  | 'FMEA/관리계획서'
  | '안전/비상'
  | '문서관리'
  | '기타'

export const OBLIGATION_CADENCES: ObligationCadence[] = ['일', '주', '월', '분기', '반기', '년']
export const OBLIGATION_CATEGORIES: ObligationCategory[] = [
  '내부심사',
  '경영검토',
  '모니터링',
  '공급업체',
  '교육/인식',
  '교정/MSA',
  'FMEA/관리계획서',
  '안전/비상',
  '문서관리',
  '기타'
]

export interface ObligationDto {
  id: number
  title: string
  cadence: ObligationCadence
  category: ObligationCategory
  clauseRef: string | null
  owner: string | null
  /** 담당자 개인(0066) — 홈 보드 개인별 그룹핑 */
  assignee: string | null
  leadDays: number
  anchorDate: string | null
  lastDoneDate: string | null
  nextDueDate: string | null
  formCode: string | null
  active: boolean
  note: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ObligationCreateInput {
  title: string
  cadence?: ObligationCadence
  category?: ObligationCategory
  clauseRef?: string | null
  owner?: string | null
  assignee?: string | null
  leadDays?: number
  nextDueDate?: string | null
  formCode?: string | null
  active?: boolean
  note?: string | null
}

export interface ObligationUpdateInput {
  id: number
  title?: string
  cadence?: ObligationCadence
  category?: ObligationCategory
  clauseRef?: string | null
  owner?: string | null
  assignee?: string | null
  leadDays?: number
  nextDueDate?: string | null
  formCode?: string | null
  active?: boolean
  note?: string | null
}

// ===== PPAP (양산부품승인) — Core Tool #1 =====

export type PpapLevel = 1 | 2 | 3 | 4 | 5
export type PpapSubmissionStatus = 'draft' | 'submitted' | 'approved' | 'interim' | 'rejected'
export type PpapElementStatus = 'not_started' | 'in_progress' | 'completed' | 'na'

export const PPAP_SUBMISSION_STATUSES: PpapSubmissionStatus[] = [
  'draft',
  'submitted',
  'approved',
  'interim',
  'rejected'
]
export const PPAP_ELEMENT_STATUSES: PpapElementStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'na'
]

export interface PpapSubmissionDto {
  id: number
  partNo: string
  partName: string | null
  customer: string | null
  level: PpapLevel
  status: PpapSubmissionStatus
  submittedDate: string | null
  approvedDate: string | null
  note: string | null
  createdAt: string
  updatedAt: string
}

export interface PpapElementDto {
  id: number
  submissionId: number
  seq: number
  name: string
  nameEn: string | null
  clauseId: string | null
  teamId: string | null
  teamName: string | null
  status: PpapElementStatus
  note: string | null
  sortOrder: number
  updatedAt: string
}

export interface PpapBoardDto {
  submission: PpapSubmissionDto
  elements: PpapElementDto[]
  progress: { completed: number; applicable: number; percent: number }
}

export interface PpapSubmissionCreateInput {
  partNo: string
  partName?: string | null
  customer?: string | null
  level?: PpapLevel
  status?: PpapSubmissionStatus
  submittedDate?: string | null
  approvedDate?: string | null
  note?: string | null
}

export interface PpapSubmissionUpdateInput {
  id: number
  partNo?: string
  partName?: string | null
  customer?: string | null
  level?: PpapLevel
  status?: PpapSubmissionStatus
  submittedDate?: string | null
  approvedDate?: string | null
  note?: string | null
}

export interface PpapElementUpdateInput {
  id: number
  status?: PpapElementStatus
  note?: string | null
}

// ===== APQP (사전 제품 품질 계획) — 5단계 여정 =====

export type ApqpStatus = 'not_started' | 'in_progress' | 'completed' | 'na'
/** 산출물의 Core Tool 태그 — 기존 v5 모듈 딥링크용. */
export type ApqpCoreTool = 'FMEA' | 'CP' | 'MSA' | 'SPC' | 'PPAP'

/** 산출물의 실데이터 증거(결정론 집계). 상태는 사람이 확정 — [반영] 원클릭 제안. */
export interface ApqpEvidenceDto {
  /** 예: 'FMEA 문서 1건 (승인 0)' */
  summary: string
  suggestedStatus: ApqpStatus
}

export interface ApqpElementDto {
  id: string
  phaseId: string
  seq: number
  name: string
  nameEn: string | null
  io: 'input' | 'output'
  coreTool: ApqpCoreTool | null
  clauseId: string | null
  clauseTitle: string | null
  teamId: string | null
  teamName: string | null
  status: ApqpStatus
  targetDate: string | null
  actualDate: string | null
  note: string | null
  /** 연동된 실데이터 요약(FMEA/MSA/PPAP/ISIR CP). 미연동 산출물은 null. */
  evidence: ApqpEvidenceDto | null
}

export interface ApqpPhaseDto {
  id: string
  phaseNo: number
  title: string
  titleEn: string | null
  description: string | null
  elements: ApqpElementDto[]
  /** 진척 요약 (na 제외 완료율) */
  total: number
  completed: number
  inProgress: number
}

export interface ApqpBoardDto {
  phases: ApqpPhaseDto[]
  /** 전체 진척률(%) — na 제외 */
  overallPct: number
  /** 현재 단계 = 미완료 요소가 남은 첫 단계의 phase_no (전부 완료면 5) */
  currentPhaseNo: number
}

export interface ApqpElementUpdateInput {
  id: string
  status?: ApqpStatus
  targetDate?: string | null
  actualDate?: string | null
  note?: string | null
}

// ===== 공정 FMEA (신판 AIAG-VDA 7-step) — Core Tool #2 =====

export type FmeaDocStatus = 'draft' | 'in_review' | 'approved'
export type FmeaActionPriority = 'H' | 'M' | 'L'
export const FMEA_DOC_STATUSES: FmeaDocStatus[] = ['draft', 'in_review', 'approved']
export const FMEA_ACTION_PRIORITIES: FmeaActionPriority[] = ['H', 'M', 'L']

export interface FmeaDocDto {
  id: number
  fmeaNo: string
  partName: string | null
  partNo: string | null
  procOwner: string | null
  model: string | null
  /** 고객사명(제출처). 신판 시트 헤더 C5. */
  customer: string | null
  author: string | null
  reviewer: string | null
  approver: string | null
  dueDate: string | null
  mpDate: string | null
  teamMembers: string | null
  revisionNote: string | null
  status: FmeaDocStatus
  createdAt: string
  updatedAt: string
}

export interface FmeaRowDto {
  id: number
  docId: number
  seq: number
  // 구조분석
  procItem: string | null
  procStep: string | null
  procElement: string | null
  // 기능분석
  funcItem: string | null
  funcStep: string | null
  funcElement: string | null
  // 고장분석
  failureEffect: string | null
  severity: number | null
  failureMode: string | null
  failureCause: string | null
  // 리스크분석
  preventionCtrl: string | null
  occurrence: number | null
  detectionCtrl: string | null
  detection: number | null
  actionPriority: FmeaActionPriority | null
  specialChar: string | null
  // 최적화
  preventionAction: string | null
  detectionAction: string | null
  responsible: string | null
  dueDate: string | null
  actionStatus: string | null
  evidence: string | null
  completedDate: string | null
  reSeverity: number | null
  reOccurrence: number | null
  reDetection: number | null
  specialProdChar: string | null
  reActionPriority: FmeaActionPriority | null
  note: string | null
  sortOrder: number
  // 파생(서버 계산)
  rpn: number | null
  reRpn: number | null
}

export interface FmeaBoardDto {
  doc: FmeaDocDto
  rows: FmeaRowDto[]
  summary: { total: number; highAp: number; avgRpn: number }
}

export interface FmeaDocCreateInput {
  fmeaNo: string
  partName?: string | null
  partNo?: string | null
  procOwner?: string | null
  model?: string | null
  customer?: string | null
  author?: string | null
  teamMembers?: string | null
}

export interface FmeaDocUpdateInput {
  id: number
  fmeaNo?: string
  partName?: string | null
  partNo?: string | null
  procOwner?: string | null
  model?: string | null
  customer?: string | null
  author?: string | null
  reviewer?: string | null
  approver?: string | null
  dueDate?: string | null
  mpDate?: string | null
  teamMembers?: string | null
  revisionNote?: string | null
  status?: FmeaDocStatus
}

// ===== MSA (측정시스템분석) — Core Tool #3 =====

export type MsaMethod = 'gage_rr' | 'bias' | 'linearity' | 'stability'
export type MsaResult = 'acceptable' | 'marginal' | 'unacceptable' | 'pending'
export const MSA_METHODS: MsaMethod[] = ['gage_rr', 'bias', 'linearity', 'stability']

export interface MsaStudyDto {
  id: number
  gageName: string
  gageNo: string | null
  characteristic: string | null
  method: MsaMethod
  grrPercent: number | null
  ndc: number | null
  result: MsaResult
  clauseId: string | null
  teamId: string | null
  teamName: string | null
  studyDate: string | null
  note: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface MsaCreateInput {
  gageName: string
  gageNo?: string | null
  characteristic?: string | null
  method?: MsaMethod
  grrPercent?: number | null
  ndc?: number | null
  clauseId?: string | null
  teamId?: string | null
  studyDate?: string | null
  note?: string | null
}

export interface MsaUpdateInput {
  id: number
  gageName?: string
  gageNo?: string | null
  characteristic?: string | null
  method?: MsaMethod
  grrPercent?: number | null
  ndc?: number | null
  clauseId?: string | null
  teamId?: string | null
  studyDate?: string | null
  note?: string | null
}

/** 행 부분 수정 — 전 컬럼 선택적. id 외 전달된 필드만 화이트리스트 UPDATE. */
export interface FmeaRowUpdateInput {
  id: number
  procItem?: string | null
  procStep?: string | null
  procElement?: string | null
  funcItem?: string | null
  funcStep?: string | null
  funcElement?: string | null
  failureEffect?: string | null
  severity?: number | null
  failureMode?: string | null
  failureCause?: string | null
  preventionCtrl?: string | null
  occurrence?: number | null
  detectionCtrl?: string | null
  detection?: number | null
  specialChar?: string | null
  preventionAction?: string | null
  detectionAction?: string | null
  responsible?: string | null
  dueDate?: string | null
  actionStatus?: string | null
  evidence?: string | null
  completedDate?: string | null
  reSeverity?: number | null
  reOccurrence?: number | null
  reDetection?: number | null
  specialProdChar?: string | null
  note?: string | null
}

// ===== IPC Channel → Request/Response Map =====

export interface IpcChannelMap {
  [IPC_CHANNELS.APP_INFO]: {
    request: void
    response: AppInfo
  }
  [IPC_CHANNELS.COMPANY_PROFILE_GET]: {
    request: void
    response: CompanyProfile
  }
  [IPC_CHANNELS.COMPANY_PROFILE_SAVE]: {
    request: CompanyProfile
    response: { success: boolean }
  }
  [IPC_CHANNELS.COMPANY_PICK_MASTERS_DIR]: {
    request: void
    response: { filePath: string | null; canceled?: boolean }
  }
  [IPC_CHANNELS.CLAUSE_COVERAGE]: {
    request: void
    response: ClauseCoverageDto[]
  }
  [IPC_CHANNELS.SEMIMES_SUMMARY]: {
    request: void
    response: SemimesSummaryDto
  }
  [IPC_CHANNELS.SEMIMES_TREE]: {
    request: void
    response: SemimesTreeDto
  }
  [IPC_CHANNELS.SEMIMES_ITEM]: {
    request: { itemCode: string }
    response: SemimesItemDetailDto | null
  }
  [IPC_CHANNELS.SEMIMES_CAPTURE_LIST]: {
    request: void
    response: SemimesCaptureListDto
  }
  [IPC_CHANNELS.SEMIMES_CAPTURE_CREATE]: {
    request: { kind: SemimesCaptureKind; imageBase64: string; fileName?: string; createdBy?: string }
    response: { success: boolean; id?: number; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_CAPTURE_IMAGE]: {
    request: { id: number }
    response: { dataUrl: string | null }
  }
  [IPC_CHANNELS.SEMIMES_CAPTURE_TAG]: {
    request: SemimesCaptureTagInput
    response: { success: boolean; receiptIds?: number[]; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_ITEM_SEARCH]: {
    request: { query: string; limit?: number }
    response: SemimesItemSearchRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_SCAN_RESOLVE]: {
    request: { query: string }
    response: SemimesScanContextDto
  }
  [IPC_CHANNELS.SEMIMES_LOT_ISSUE]: {
    request: { itemCode: string; date?: string; createdBy?: string }
    response: { success: boolean; lotNo?: string; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_PROD_CREATE]: {
    request: SemimesProdCreateInput
    response: { success: boolean; id?: number; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_INSP_CREATE]: {
    request: SemimesInspCreateInput
    response: { success: boolean; id?: number; suggestion?: string; specRevision?: number | null; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_WORK_ORDER_UPSERT]: {
    request: SemimesWorkOrderInput
    response: { success: boolean; id?: number; orderNo?: string; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_WORK_ORDER_LIST]: {
    request: { status?: string; limit?: number } | undefined
    response: SemimesWorkOrderRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_TODAY_RECORDS]: {
    request: { ymd?: string } | undefined
    response: SemimesTodayRecordsDto
  }
  [IPC_CHANNELS.SEMIMES_RECORD_CANCEL]: {
    request: { kind: 'prod' | 'insp' | 'receipt'; id: number; reason: string; canceledBy?: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_INSP_CONFIRM]: {
    request: { id: number; confirmer?: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_PROD_LIST]: {
    request: SemimesProdListReq
    response: { rows: SemimesProdRowDto[]; agg: SemimesProdAggRowDto[] }
  }
  [IPC_CHANNELS.SEMIMES_INSP_LIST]: {
    request: SemimesInspListReq
    response: SemimesInspRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_INSP_VALUES]: {
    request: { id: number }
    response: SemimesInspValueRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_MAT_STOCK]: {
    request: { itemCode?: string } | undefined
    response: SemimesMatStockRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_HOME_KPIS]: {
    request: { ymd?: string } | undefined
    response: SemimesHomeKpisDto
  }
  [IPC_CHANNELS.SEMIMES_RECEIPT_LIST]: {
    request: { from: string; to: string; itemCode?: string; receiptClass?: string }
    response: SemimesReceiptRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_SPEC_LIST]: {
    request: { itemCode: string; inspKind?: string }
    response: SemimesSpecRegistryRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_SPEC_SAVE]: {
    request: SemimesSpecSaveInput
    response: { success: boolean; id?: number; revision?: number; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_PPM_DASH]: {
    request: { year?: string } | undefined
    response: SemimesPpmDashDto
  }
  [IPC_CHANNELS.SEMIMES_PPM_TARGET_SAVE]: {
    request: { value: number; savedBy?: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_ITEM_LIST]: {
    request: { query?: string; itemType?: string; includeInactive?: boolean; limit?: number }
    response: { rows: SemimesItemMasterRowDto[]; total: number; types: string[] }
  }
  [IPC_CHANNELS.SEMIMES_ITEM_UPDATE]: {
    request: SemimesItemUpdateInput
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_PARTNER_LIST]: {
    request: { query?: string; partnerType?: string; includeInactive?: boolean }
    response: { rows: SemimesPartnerRowDto[]; types: string[] }
  }
  [IPC_CHANNELS.SEMIMES_PARTNER_UPDATE]: {
    request: SemimesPartnerUpdateInput
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_BOM_EXPLODE]: {
    request: { itemCode: string; direction: 'down' | 'up' }
    response: SemimesBomExplodeRowDto[]
  }
  [IPC_CHANNELS.SEMIMES_CODE_GROUPS]: {
    request: void
    response: SemimesCodeGroupDto[]
  }
  [IPC_CHANNELS.SEMIMES_WORK_CALENDAR]: {
    request: { month: string }
    response: SemimesWorkCalendarDto
  }
  [IPC_CHANNELS.SEMIMES_WORK_CALENDAR_SAVE]: {
    request: { ymd: string; workType: '조업' | '휴무'; note?: string | null; updatedBy?: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SEMIMES_PERF_INDICATORS]: {
    request: { year?: string } | undefined
    response: SemimesPerfIndicatorsDto
  }
  [IPC_CHANNELS.SEMIMES_PROD_CHART]: {
    request: { from: string; to: string }
    response: SemimesProdChartDto
  }
  [IPC_CHANNELS.SEMIMES_TRACE_BAND]: {
    request: { orderNo: string }
    response: SemimesTraceBandDto
  }
  [IPC_CHANNELS.PROCESS_FLOW_LIST]: {
    request: void
    response: ProcessFlowPartDto[]
  }
  [IPC_CHANNELS.PROCESS_FLOW_GET]: {
    request: { partNo: string }
    response: ProcessFlowDto | null
  }
  [IPC_CHANNELS.OBLIGATION_TRIGGER_COMPLETE]: {
    request: { issueId: number; doneBy?: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.APP_USER_RESET_PASSWORD]: {
    request: { id: number; newPassword: string }
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.OBLIGATION_MATRIX]: {
    request: { days?: number } | undefined
    response: ObligationMatrixDto
  }
  [IPC_CHANNELS.APQP_BOARD]: {
    request: void
    response: ApqpBoardDto
  }
  [IPC_CHANNELS.APQP_ELEMENT_UPDATE]: {
    request: ApqpElementUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.DAILY_BOARD]: {
    request: void
    response: DailyBoardDto
  }
  [IPC_CHANNELS.TEAM_SUMMARY]: {
    request: void
    response: TeamSummaryDto[]
  }
  [IPC_CHANNELS.TEAM_TODAY_BOARD]: {
    request: void
    response: TeamTodayBoardDto
  }
  [IPC_CHANNELS.KPI_HOME]: {
    request: void
    response: KpiIndicatorDto[]
  }
  [IPC_CHANNELS.KPI_SAVE]: {
    request: KpiSaveInput
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.KPI_MONTH]: {
    request: { period: string }
    response: KpiMonthValueDto[]
  }
  [IPC_CHANNELS.KPI_SAVE_BATCH]: {
    request: KpiBatchSaveInput
    response: { success: boolean; saved: number; error?: string }
  }
  [IPC_CHANNELS.KPI_EXPORT_XLSX]: {
    request: { year: string }
    response: { success: boolean; filePath?: string; canceled?: boolean; error?: string }
  }
  [IPC_CHANNELS.APP_USER_LIST]: {
    request: void
    response: AppUserDto[]
  }
  [IPC_CHANNELS.APP_USER_UPSERT]: {
    request: AppUserUpsertInput
    response: { success: boolean; id?: number }
  }
  [IPC_CHANNELS.APP_USER_DELETE]: {
    request: { id: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.IATF_DASHBOARD]: {
    request: void
    response: IatfDashboardDto
  }
  [IPC_CHANNELS.REG_BROWSE]: {
    request: void
    response: RegBrowseDto[]
  }
  [IPC_CHANNELS.REG_FORMS]: {
    request: { regCode: string }
    response: TeamRegFormDto[]
  }
  [IPC_CHANNELS.SQ_GUIDE_GET]: {
    request: { itemCode: string }
    response: SqGuideDto | null
  }
  [IPC_CHANNELS.SQ_CHECKPOINT_UPDATE]: {
    request: SqCheckpointUpdateInput
    response: { success: boolean; suggestedState: SqSuggestedState }
  }
  [IPC_CHANNELS.SQ_DASHBOARD]: {
    request: void
    response: SqDashboardDto | null
  }
  [IPC_CHANNELS.INTEGRITY_CHECK]: {
    request: void
    response: IntegrityReportDto
  }
  [IPC_CHANNELS.MES_TRACE_STATUS]: {
    request: void
    response: MesTraceStatusDto
  }
  [IPC_CHANNELS.MES_TRACE_SEARCH]: {
    request: { query: string }
    response: MesTraceLotDto[]
  }
  [IPC_CHANNELS.MES_TRACE_EXPAND]: {
    request: { lotId: number }
    response: MesTraceExpandDto | null
  }
  [IPC_CHANNELS.MES_RECORDS_STATUS]: {
    request: void
    response: MesRecordsStatusDto
  }
  [IPC_CHANNELS.MES_RECORDS_COVERAGE]: {
    request: { days?: number }
    response: MesRecordsCoverageDto
  }
  [IPC_CHANNELS.MES_RECORDS_DETAIL]: {
    request: { key: string }
    response: MesRecordsDetailDto | null
  }
  [IPC_CHANNELS.MES_RECORDS_PROCESS_LIVE]: {
    request: { ymd?: string }
    response: MesProcessLiveDto
  }
  [IPC_CHANNELS.MES_RECORDS_PART_PROCESS]: {
    request: { ymd?: string; limit?: number }
    response: MesPartProcessDto
  }
  [IPC_CHANNELS.SQ_AUDIT_MATRIX]: {
    request: { ymd?: string; days?: number } | undefined
    response: SqAuditMatrixDto
  }
  [IPC_CHANNELS.SQ_ASSESS_RUN]: {
    request: void
    response: { success: boolean; id?: string; error?: string }
  }
  [IPC_CHANNELS.SQ_ASSESS_LIST]: {
    request: void
    response: SqAssessmentSummaryDto[]
  }
  [IPC_CHANNELS.SQ_ASSESS_GET]: {
    request: { id?: string }
    response: SqAssessmentDto | null
  }
  [IPC_CHANNELS.SQ_ASSESS_CONFIRM]: {
    request: SqAssessConfirmInput
    response: { success: boolean; confirmedCount: number }
  }
  [IPC_CHANNELS.SQ_ASSESS_META]: {
    request: SqAssessMetaInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.SQ_ASSESS_FINALIZE]: {
    request: { assessmentId: string }
    response: { success: boolean; totalScore?: number; grade?: string; remaining?: number }
  }
  [IPC_CHANNELS.SQ_ASSESS_EXPORT]: {
    request: { assessmentId: string }
    response: { success: boolean; filePath?: string; canceled?: boolean; validationsPreserved?: boolean; error?: string }
  }
  [IPC_CHANNELS.SQTRACK_OVERVIEW]: {
    request: void
    response: SqTrackOverviewDto | null
  }
  [IPC_CHANNELS.SQTRACK_PART_DETAIL]: {
    request: { partNo: string }
    response: SqTrackPartDetailDto | null
  }
  [IPC_CHANNELS.SQTRACK_ITEM_UPDATE]: {
    request: SqTrackItemUpdateInput
    response: { success: boolean; error?: string }
  }
  [IPC_CHANNELS.SQTRACK_SET_AUDIT_DATE]: {
    request: { date: string }
    response: { success: boolean }
  }
  [IPC_CHANNELS.TEAM_REGS]: {
    request: { teamId: string }
    response: TeamRegDto[]
  }
  [IPC_CHANNELS.FORM_RENDER_MODEL]: {
    request: { formCode: string }
    response: FormRenderModelDto
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
  [IPC_CHANNELS.FORM_EXAMPLES_GET]: {
    request: { formCode: string }
    response: FormExampleDto[]
  }
  [IPC_CHANNELS.FORM_SUBMISSION_CREATE]: {
    request: { formCode: string; values: Record<string, unknown>; serialNo?: string; createdBy?: string }
    response: { id: number }
  }
  [IPC_CHANNELS.FORM_SUBMISSION_UPDATE]: {
    request: { id: number; values: Record<string, unknown>; status?: 'draft' | 'submitted' | 'approved'; createdBy?: string }
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
  [IPC_CHANNELS.OBLIGATION_LIST]: {
    request: void
    response: ObligationDto[]
  }
  [IPC_CHANNELS.OBLIGATION_CREATE]: {
    request: ObligationCreateInput
    response: { id: number }
  }
  [IPC_CHANNELS.OBLIGATION_UPDATE]: {
    request: ObligationUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.OBLIGATION_DELETE]: {
    request: { id: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.OBLIGATION_COMPLETE]: {
    request: { id: number; doneDate?: string; doneBy?: string; source?: 'manual' | 'form' }
    response: { success: boolean; nextDueDate: string | null }
  }
  [IPC_CHANNELS.OBLIGATION_RESET_DUE]: {
    request: { by?: string }
    response: { success: boolean; count: number }
  }
  [IPC_CHANNELS.PPAP_SUBMISSION_LIST]: {
    request: void
    response: PpapSubmissionDto[]
  }
  [IPC_CHANNELS.PPAP_BOARD]: {
    request: { submissionId: number }
    response: PpapBoardDto | null
  }
  [IPC_CHANNELS.PPAP_ELEMENT_UPDATE]: {
    request: PpapElementUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.PPAP_SUBMISSION_CREATE]: {
    request: PpapSubmissionCreateInput
    response: { id: number }
  }
  [IPC_CHANNELS.PPAP_SUBMISSION_UPDATE]: {
    request: PpapSubmissionUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.FMEA_DOC_LIST]: {
    request: void
    response: FmeaDocDto[]
  }
  [IPC_CHANNELS.FMEA_BOARD]: {
    request: { docId: number }
    response: FmeaBoardDto | null
  }
  [IPC_CHANNELS.FMEA_DOC_CREATE]: {
    request: FmeaDocCreateInput
    response: { id: number }
  }
  [IPC_CHANNELS.FMEA_DOC_UPDATE]: {
    request: FmeaDocUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.FMEA_ROW_CREATE]: {
    request: { docId: number }
    response: { id: number }
  }
  [IPC_CHANNELS.FMEA_ROW_UPDATE]: {
    request: FmeaRowUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.FMEA_ROW_DELETE]: {
    request: { id: number }
    response: { success: boolean }
  }
  [IPC_CHANNELS.FMEA_EXPORT_XLSX]: {
    request: { docId: number }
    response: { success: boolean; filePath?: string; rows?: number; canceled?: boolean; error?: string }
  }
  [IPC_CHANNELS.MSA_LIST]: {
    request: void
    response: MsaStudyDto[]
  }
  [IPC_CHANNELS.MSA_CREATE]: {
    request: MsaCreateInput
    response: { id: number }
  }
  [IPC_CHANNELS.MSA_UPDATE]: {
    request: MsaUpdateInput
    response: { success: boolean }
  }
  [IPC_CHANNELS.MSA_DELETE]: {
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
    response: IsirImportBatchResult
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
  verify?: {
    values: string
    valuesOk?: boolean
    mediaOk: boolean
    mergesOk: boolean
    /** 격자 주입분 재검증(0730 검수 M-3 — 종전 사각지대) */
    grid?: string
    gridOk?: boolean
    /** 수식 셀을 건드리지 않았는가(false = 셀맵이 수식 셀을 가리켜 주입을 차단함) */
    formulaSafe?: boolean
  }
  /** 셀 가드 신호(0730 검수 C-7·C-8): 수식 차단·병합 앵커 리다이렉트·기존 텍스트 덮어씀 */
  guard?: {
    skippedFormula: Array<{ cell: string; kind: string; ctx: string; detail: string }>
    mergeRedirects: Array<{ cell: string; kind: string; ctx: string; detail: string }>
    overwrites: Array<{ cell: string; kind: string; ctx: string; detail: string }>
  }
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

// ── 반(半)-MES 코어 (15번 M0 — 품번 트리·마스터 요약) ─────────────────

export interface SemimesSummaryDto {
  items: number
  itemsByType: { type: string; count: number }[]
  edgesActive: number
  edgesTotal: number
  routingSteps: number
  processes: number
  partners: number
  defectTypes: number
  lastImport: {
    runAt: string
    source: string
    fileName: string | null
    added: number
    updated: number
    deactivated: number
    unchanged: number
    itemsNew: number
  } | null
}

export interface SemimesTreeEdgeDto {
  parent: string
  child: string
  qty: number
  active: number
  source: string | null
}

export interface SemimesTreeDto {
  roots: string[]
  edges: SemimesTreeEdgeDto[]
  /** item_code → [item_type, source] (트리 렌더 뱃지용 압축 맵) */
  items: Record<string, [string, string]>
}

export interface SemimesRoutingStepDto {
  seq: number
  procCode: string
  procName: string | null
  outYn: number
}

export interface SemimesItemDetailDto {
  itemCode: string
  itemName: string | null
  itemType: string
  source: string | null
  active: number
  traceGbn: number
  inlotuse: number
  outYn: number
  custPno1: string | null
  carType: string | null
  routing: SemimesRoutingStepDto[]
  children: { code: string; qty: number; active: number }[]
  usedBy: { code: string; qty: number; active: number }[]
}

// ── G1 수집함 (29번 §8-⑥ · M1 견적 — 전표 사진 1:N 태깅, 마이그 0136) ──

/** 수집함 유형 태그 — 방 1개 + 유형(M1 §0 외주 왕복 실측이 근거). */
export type SemimesCaptureKind = 'receipt_in' | 'receipt_out'

/** raw_captures.content JSON 명세 v1 (M1 §2.5 — 자유 JSON 금지, M4 AI 판독 계약) */
export interface SemimesCaptureContentV1 {
  v: 1
  docDate: string
  partnerCode: string
  items: { itemCode: string; qty: number; vendorLot: string | null }[]
  /** 입고만: '원자재' | '외주재입고' */
  receiptClass?: string
  note: string
}

export interface SemimesCaptureRowDto {
  id: number
  kind: SemimesCaptureKind
  status: '미분류' | '태깅완료'
  createdBy: string | null
  createdAt: string
  hasImage: boolean
  /** 태깅완료 시 content JSON 요약(미분류 = null) */
  docDate: string | null
  partnerCode: string | null
  partnerName: string | null
  itemCount: number
  receiptClass: string | null
  /** 연결된 mat_receipt 행 수(1:N 실증) */
  receiptRows: number
}

export interface SemimesCaptureListDto {
  rows: SemimesCaptureRowDto[]
  untagged: number
  todayIn: number
  todayOut: number
  /** 태깅 폼 거래처 선택지(active만 — partner_type 으로 receipt_class 초안 유도) */
  partners: { code: string; name: string; type: string }[]
}

export interface SemimesCaptureTagInput {
  captureId: number
  /** 태깅 시 유형 정정 가능(M1 §3 2차) */
  kind: SemimesCaptureKind
  docDate: string
  partnerCode: string
  /** 입고만(원자재|외주재입고) — 미지정 시 partner_type 초안 */
  receiptClass?: string
  /** 다품목 1:N — 입고는 mat_receipt N행 생성, 출하는 content 구조화만(15번 경계) */
  items: { itemCode: string; qty: number; vendorLot?: string | null }[]
  note?: string
  /** 서버 세션 강제(STAMP) — 클라 값 무시 */
  createdBy?: string
}

export interface SemimesItemSearchRowDto {
  itemCode: string
  itemName: string | null
  itemType: string
}

// ── PC 기록 쓰기 (29번 §4 · dailyq-PC 견적 — append-only·실측값 강제·§10-1 각인) ──

export interface SemimesSpecRowDto {
  id: number
  inspItem: string
  instrument: string | null
  unit: string | null
  su: number | null
  sl: number | null
  nominal: number | null
  sampleCnt: number | null
  /** §10-1 — 기록 시 spec_revision 스냅샷의 원천 */
  revision: number
}

/** 스캔/품번 [조회] → 현장 문맥 전부 (scanResolve) */
export interface SemimesScanContextDto {
  found: boolean
  itemCode: string | null
  itemName: string | null
  itemType: string | null
  routing: { seq: number; procCode: string; procName: string | null }[]
  recentLots: { lotNo: string; lotDate: string }[]
  /** 검사종류 → 활성 스펙 행(최신 revision) */
  specs: Record<string, SemimesSpecRowDto[]>
  /** 불량유형 마스터(활성) — 실적 불량 기록용 */
  defects: { code: string; name: string }[]
  /** 쿼리가 LOT 번호로 해석된 경우 그 LOT */
  matchedLot: string | null
}

export interface SemimesInspValueInput {
  specId?: number
  inspItem: string
  sampleNo: number
  /** 실측값 강제 — 수치 필수(○/× 단독 저장 거부, 29번 §4) */
  value: number
  valueText?: string | null
}

export interface SemimesInspCreateInput {
  inspDate: string
  inspKind: string
  itemCode: string
  lotNo?: string | null
  procCode?: string | null
  /** 자주검사 = 초품/중품/종품 필수(3차 노트 §4-2) */
  samplePhase?: string | null
  /** 사람 확정 판정(자동판정은 제안만 — 응답 suggestion) */
  judgment: string
  values: SemimesInspValueInput[]
  note?: string
  /** 세션 강제(STAMP) */
  inspector?: string
}

export interface SemimesProdCreateInput {
  recordDate: string
  itemCode: string
  lotNo?: string | null
  procCode?: string | null
  okQty: number
  ngQty: number
  defectCode?: string | null
  shift?: string | null
  workOrderId?: number | null
  note?: string
  /** 세션 강제(STAMP) */
  worker?: string
}

export interface SemimesWorkOrderInput {
  /** 있으면 상태·수량 등 갱신(작업지시는 기록이 아니라 계획 앵커 — 갱신 허용) */
  id?: number
  itemCode?: string
  orderQty?: number | null
  lineNo?: string | null
  startDate?: string | null
  endDate?: string | null
  status?: string
  note?: string | null
  /** 세션 강제(STAMP) */
  createdBy?: string
}

export interface SemimesWorkOrderRowDto {
  id: number
  orderNo: string
  itemCode: string
  itemName: string | null
  orderQty: number | null
  lineNo: string | null
  startDate: string | null
  endDate: string | null
  status: string
  createdBy: string | null
  /** 연결 생산실적 합(양품) — 진척 참고 */
  okSum: number
}

export interface SemimesTodayRecordsDto {
  ymd: string
  prod: Array<{
    id: number
    itemCode: string
    lotNo: string | null
    procCode: string | null
    okQty: number
    ngQty: number
    worker: string | null
    canceled: boolean
  }>
  insp: Array<{
    id: number
    inspKind: string
    itemCode: string
    lotNo: string | null
    samplePhase: string | null
    judgment: string | null
    inspector: string | null
    confirmer: string | null
    valueCnt: number
    canceled: boolean
  }>
}

// ── 32호 1차분 — MES 조회 화면 원천 DTO (semimes-query-handlers · 읽기 전용) ──

export interface SemimesProdListReq {
  from: string
  to: string
  itemCode?: string
  /** detail = 행 단위 · daily/monthly = 집계(취소 제외) */
  mode?: 'detail' | 'daily' | 'monthly'
}

export interface SemimesProdRowDto {
  id: number
  recordDate: string
  orderNo: string | null
  itemCode: string
  itemName: string | null
  lotNo: string | null
  procCode: string | null
  okQty: number
  ngQty: number
  defectCode: string | null
  shift: string | null
  worker: string | null
  canceled: boolean
}

export interface SemimesProdAggRowDto {
  /** daily = YYYY-MM-DD · monthly = YYYY-MM */
  bucket: string
  rows: number
  okSum: number
  ngSum: number
}

export interface SemimesInspListReq {
  from: string
  to: string
  /** 미지정 = 전체 */
  kind?: string
  itemCode?: string
}

export interface SemimesInspRowDto {
  id: number
  inspDate: string
  inspKind: string
  itemCode: string
  itemName: string | null
  lotNo: string | null
  procCode: string | null
  inspector: string | null
  judgment: string
  defectQty: number | null
  samplePhase: string | null
  specRevision: number | null
  confirmer: string | null
  confirmedAt: string | null
  valueCnt: number
  canceled: boolean
}

export interface SemimesInspValueRowDto {
  inspItem: string
  sampleNo: number
  value: number
  valueText: string | null
  /** 연결 스펙 규격(있으면) — 이탈 표시용 */
  su: number | null
  sl: number | null
  unit: string | null
}

export interface SemimesMatStockRowDto {
  itemCode: string
  itemName: string | null
  itemType: string | null
  /** 입고 합(취소 제외) − 투입 합 = 잔량 */
  receiptSum: number
  inputSum: number
  balance: number
  lastReceiptDate: string | null
}

export interface SemimesReceiptRowDto {
  id: number
  receiptDate: string
  itemCode: string
  itemName: string | null
  partnerCode: string | null
  partnerName: string | null
  qty: number
  vendorLot: string | null
  internalLot: string | null
  receiptClass: string | null
  /** 수집함 전표 사진 연결(1:N) — 있으면 전표 증빙 존재 */
  captureId: number | null
  createdBy: string | null
  canceled: boolean
}

export interface SemimesSpecRegistryRowDto {
  id: number
  itemCode: string
  inspKind: string
  inspItem: string
  instrument: string | null
  unit: string | null
  sl: number | null
  su: number | null
  nominal: number | null
  sampleCnt: number | null
  revision: number
  revDate: string | null
  active: boolean
  createdBy: string | null
}

export interface SemimesSpecSaveInput {
  itemCode: string
  inspKind: string
  inspItem: string
  instrument?: string | null
  unit?: string | null
  sl?: number | null
  su?: number | null
  nominal?: number | null
  sampleCnt?: number | null
  /** 개정 주체 — 세션 강제(STAMP) */
  createdBy?: string
}

export interface SemimesPpmDashDto {
  year: string
  targetPpm: number | null
  /** 월별 양품/불량 합 + PPM(취소 제외 · 실적 없으면 ppm null) */
  months: Array<{ month: string; ok: number; ng: number; ppm: number | null }>
  byItem: Array<{ itemCode: string; itemName: string | null; ok: number; ng: number; ppm: number | null }>
  byDefect: Array<{ code: string; name: string | null; ng: number }>
  currentMonthPpm: number | null
}

// ── 34호 배치⑶ — 지표·달력·추적 DTO ──

/** #18 조업달력 — 1일 1행. 행이 없는 날 = '미등록'(가짜 가동일 금지 — 0139 계약) */
export interface SemimesWorkCalendarDayDto {
  ymd: string
  workType: '조업' | '휴무'
  note: string | null
  updatedBy: string | null
  /** 그 날짜의 실적 기록 존재(취소 제외) — "기록은 있는데 휴무로 적힌 날" 모순 표식용 */
  hasRecords: boolean
}

export interface SemimesWorkCalendarDto {
  /** YYYY-MM */
  month: string
  days: SemimesWorkCalendarDayDto[]
  /** 월 요약 — 등록 행 기준(미등록 일수는 화면이 달력 길이로 계산) */
  workDays: number
  restDays: number
}

/** #15 성과 지표 표준형 — 지표 1종의 연간 축(월 12칸 고정, 실적 없는 달 = null 정직) */
export interface SemimesPerfIndicatorDto {
  key: 'yieldRate' | 'incomingPpm'
  label: string
  unit: string
  /** 방향 — higher = 높을수록 좋음(양품률) · lower = 낮을수록 좋음(PPM) */
  direction: 'higher' | 'lower'
  /** month = YYYY-MM · value = null(실적 없음 — 가짜 0 금지) */
  months: Array<{ month: string; value: number | null; numer: number; denom: number }>
  /** 연간 누계값(분자·분모 합산으로 재계산 — 월평균 아님) */
  yearValue: number | null
}

export interface SemimesPerfIndicatorsDto {
  year: string
  indicators: SemimesPerfIndicatorDto[]
  /** 조업달력 등록 월수(0 = 전량 프록시 분모 — 화면 정직 표기용) */
  calendarMonths: number
}

/** #12 생산현황 차트 — 기간 내 일별 생산수량(취소 제외). UPH 축 없음(원천 부재 정직) */
export interface SemimesProdChartDto {
  from: string
  to: string
  days: Array<{ ymd: string; ok: number; ng: number; items: number }>
  byItem: Array<{ itemCode: string; itemName: string | null; ok: number; ng: number }>
  /** 조업달력 기준 조업일수(등록분만 — null = 그 기간 달력 미등록) */
  calendarWorkDays: number | null
}

/** #16 추적 공정 흐름 밴드 — 작업지시 1건의 지시수량→공정별 수량 열산 */
export interface SemimesTraceBandDto {
  found: boolean
  orderNo?: string
  itemCode?: string
  itemName?: string | null
  orderQty?: number | null
  status?: string
  /** 라우팅 순서대로 — 실적 없는 공정 = ok/ng 0 + hasRecords false(정직) */
  procs?: Array<{
    seq: number
    procCode: string
    procName: string | null
    ok: number
    ng: number
    hasRecords: boolean
    /** 이 공정 기록들의 LOT 목록(그리드용) */
    lots: Array<{ lotNo: string | null; recordDate: string; ok: number; ng: number; worker: string | null; canceled: boolean }>
  }>
  /** 지시와 무관 공정의 기록(라우팅 밖 공정 — 숨기지 않는다) */
  offRoute?: Array<{ procCode: string; ok: number; ng: number }>
}

// ── 34호 배치⑵ — 기준정보 마스터 DTO ──

export interface SemimesItemMasterRowDto {
  itemCode: string
  itemName: string | null
  itemType: string | null
  spec: string | null
  carType: string | null
  /** 업체LOT 승계(1 = 승계) */
  inlotuse: number
  /** 검사구분 표식 3종 — 표시 전용(의미 확정 전 편집 금지, 대조표 #1 SQ 심기) */
  inspSkip: number | null
  qcGbnO: string | null
  outYn: string | null
  active: number
  source: string | null
}

export interface SemimesItemUpdateInput {
  itemCode: string
  itemName?: string | null
  itemType?: string | null
  spec?: string | null
  carType?: string | null
  inlotuse?: number
  active?: number
  /** 정비 주체 — 세션 강제(STAMP) */
  updatedBy?: string
}

export interface SemimesPartnerRowDto {
  partnerCode: string
  name: string | null
  partnerType: string | null
  bizNo: string | null
  ceo: string | null
  active: number
}

export interface SemimesPartnerUpdateInput {
  partnerCode: string
  name?: string | null
  partnerType?: string | null
  bizNo?: string | null
  ceo?: string | null
  active?: number
  /** 정비 주체 — 세션 강제(STAMP) */
  updatedBy?: string
}

export interface SemimesBomExplodeRowDto {
  level: number
  parentCode: string
  childCode: string
  qty: number | null
  childName: string | null
  childType: string | null
}

export interface SemimesCodeGroupDto {
  key: string
  label: string
  note: string
  codes: Array<{ code: string; name: string | null; active: number }>
}

export interface SemimesHomeKpisDto {
  ymd: string
  prodCnt: number
  okSum: number
  inspCnt: number
  /** 2단 확인 대기(미취소·confirmer 없음) */
  confirmWait: number
  receiptCnt: number
}

// ── 공정 흐름 맵 (2배치 선두 — CP→라우팅 파이프라인 기반, ISIR #14 공정 흐름도 출력) ──

export interface ProcessFlowPartDto {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  stepCount: number
  /** 심사 대상 정본 품번(app_config audit.primaryPartNo) 여부 */
  isPrimary: boolean
}

/** 흐름도 기호 분류(공정흐름도 관례: ▽ 입고/저장 · ○ 가공 · ◇ 검사 · ◆ 출하) — 공정명 휴리스틱 */
export type ProcessFlowSymbol = '입고' | '가공' | '검사' | '출하'

export interface ProcessFlowStepDto {
  seq: number
  procCode: string
  procName: string
  procType: string // 사내 | 외주
  inspFormCode: string | null
  inspFormName: string | null
  outYn: number
  symbol: ProcessFlowSymbol
  /** 해당 공정의 관리계획서 관리항목(제안 근거 표시용) */
  controlItems: { item: string | null; method: string | null; frequency: string | null; equipment: string | null }[]
}

export interface ProcessFlowDto {
  partNo: string
  partName: string | null
  customer: string | null
  model: string | null
  /** SPEC REVISION(화면문법노트 §2-4) — isir_packages rev_code·rev_date */
  revCode: string | null
  revDate: string | null
  qaManager: string | null
  steps: ProcessFlowStepDto[]
}

// ── 이행 매트릭스 (17번 §3-2 — 사람×최근 14일, HRMS 근태 패턴) ────────

/** 셀 상태 계약(17번): done=✓ · overdue=연체(·, n=그 시점 연체일수 — 구간 첫 셀만) ·
 *  due=! 오늘 해야 함 · data=⚡ 데이터 할 일 활성 · na=— 해당 없음 */
export type MatrixCellState = 'done' | 'overdue' | 'due' | 'data' | 'na'

export interface ObligationMatrixCellDto {
  d: string
  s: MatrixCellState
  n?: number
}

export interface ObligationMatrixRowDto {
  key: string
  /** 표시 사람: assignee → owner → '팀 공동'. 데이터 행은 '[데이터]' */
  person: string
  /** 부라벨 = 의무명(또는 데이터 행 설명) */
  label: string
  /** 데이터 트리거 행(시스템 발행) */
  data?: boolean
  cells: ObligationMatrixCellDto[]
}

export interface ObligationMatrixTeamDto {
  teamId: string | null
  label: string
  rows: ObligationMatrixRowDto[]
}

export interface ObligationMatrixDto {
  /** 표시 일자(주말 제외, 오늘 포함) — YYYY-MM-DD */
  days: string[]
  today: string
  teams: ObligationMatrixTeamDto[]
}
