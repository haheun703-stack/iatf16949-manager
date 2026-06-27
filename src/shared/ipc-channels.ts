export const IPC_CHANNELS = {
  // Clause operations
  CLAUSE_GET_TREE: 'clause:getTree',
  CLAUSE_GET_BY_ID: 'clause:getById',
  CLAUSE_SEARCH: 'clause:search',

  // Document operations
  DOCUMENT_LIST_BY_CLAUSE: 'document:listByClause',
  DOCUMENT_GET_BY_ID: 'document:getById',

  // Task operations
  TASK_CREATE: 'task:create',
  TASK_UPDATE: 'task:update',
  TASK_DELETE: 'task:delete',
  TASK_LIST: 'task:list',
  TASK_GET_BY_ID: 'task:getById',
  TASK_UPDATE_STATUS: 'task:updateStatus',
  TASK_GET_HISTORY: 'task:getHistory',

  // Team operations
  TEAM_LIST: 'team:list',
  TEAM_GET_MEMBERS: 'team:getMembers',

  // Bulk operations
  TASK_BULK_CREATE: 'task:bulkCreate',
  REGULATION_LIST: 'regulation:list',

  // Dashboard
  DASHBOARD_STATS: 'dashboard:stats',
  DASHBOARD_FULL: 'dashboard:full',
  DASHBOARD_V5: 'dashboard:v5',

  // Company Profile
  COMPANY_PROFILE_GET: 'company:profileGet',
  COMPANY_PROFILE_SAVE: 'company:profileSave',

  // Document Generation
  DOCGEN_GENERATE: 'docgen:generate',
  DOCGEN_SAVE_DIALOG: 'docgen:saveDialog',

  // Database
  DB_STATUS: 'db:status',

  // Form operations (v5)
  FORM_LIST: 'form:list',
  FORM_GET_DEFINITION: 'form:getDefinition',
  FORM_SET_SCOPE: 'form:setScope',
  REGULATION_GET_SECTIONS: 'regulation:getSections',
  FORM_SUBMISSION_CREATE: 'form:submissionCreate',
  FORM_SUBMISSION_UPDATE: 'form:submissionUpdate',
  FORM_SUBMISSION_LIST: 'form:submissionList',
  FORM_SUBMISSION_GET: 'form:submissionGet',
  FORM_SUBMISSION_DELETE: 'form:submissionDelete',
  FORM_DRAFT_DEFAULTS: 'form:draftDefaults',
  FORM_EXPORT_XLSX: 'form:exportXlsx',
  FORM_REVISION_SAVE: 'form:revisionSave',
  FORM_REVISION_LIST: 'form:revisionList',
  FORM_REVISION_GET: 'form:revisionGet',
  PRINT_TO_PDF: 'print:toPdf',

  // AI (Claude API)
  AI_GENERATE: 'ai:generate',

  // AI 레이어 (Phase C) — 그라운디드 코파일럿(read-only)
  AI_COPILOT_ASK: 'ai:copilotAsk',
  // AI 레이어 (Phase C2) — 매일 브리핑(규칙엔진 사실 + AI 요약)
  AI_BRIEFING_FACTS: 'ai:briefingFacts',
  AI_BRIEFING_SUMMARIZE: 'ai:briefingSummarize',
  // AI 레이어 (Phase D) — 캡처→초안→결재
  AI_STRUCTURE_CAPTURE: 'ai:structureCapture',
  AI_DRAFT_LIST: 'ai:draftList',
  AI_DRAFT_APPROVE: 'ai:draftApprove',
  AI_DRAFT_REJECT: 'ai:draftReject',
  // AI 레이어 (Phase E1) — SQ 준비도 예측
  AI_READINESS_PREDICT: 'ai:readinessPredict',
  AI_READINESS_EXPLAIN: 'ai:readinessExplain',
  // AI 레이어 (Phase F1) — 부재 감지(expected-set)
  AI_ABSENCE_CHECK: 'ai:absenceCheck',
  AI_ABSENCE_EXPLAIN: 'ai:absenceExplain',

  // AI 작성가이드 + 채점 (v5 Stage 2)
  AI_GENERATE_GUIDE: 'ai:generateGuide',
  FORM_GUIDE_GET: 'form:guideGet',
  AI_SCORE_FORM: 'ai:scoreForm',
  FORM_SCORE_LATEST: 'form:scoreLatest',
  FORM_SCORE_LIST: 'form:scoreList',

  // Process (v5 - 기본서)
  PROCESS_LIST: 'process:list',
  PROCESS_GET_DETAIL: 'process:getDetail',
  PROCESS_PAGE_UPLOAD: 'process:pageUpload',
  PROCESS_PAGE_DELETE_IMAGE: 'process:pageDeleteImage',
  PROCESS_PAGE_ADD: 'process:pageAdd',
  PROCESS_PAGE_READ_IMAGE: 'process:pageReadImage',
  PROCESS_PAGES_BULK_UPLOAD: 'process:pagesBulkUpload',
  PROCESS_PAGE_AI_EXTRACT: 'process:pageAiExtract',
  PROCESS_DOC_GET: 'process:docGet',
  PROCESS_DOC_SAVE: 'process:docSave',

  // Document BOM (105 docs + 405 form refs, 동료 작성본 기반)
  BOM_STATS: 'bom:stats',
  BOM_LIST_DOCS: 'bom:listDocs',
  BOM_GET_DOC_DETAIL: 'bom:getDocDetail',
  BOM_FORM_USAGE: 'bom:formUsage',

  // 일정표 (v5 Stage 4 - 노션형 스케줄)
  SCHEDULE_LIST: 'schedule:list',
  SCHEDULE_CREATE: 'schedule:create',
  SCHEDULE_UPDATE: 'schedule:update',
  SCHEDULE_DELETE: 'schedule:delete',

  // 리포트 내보내기 (v5 Stage 5)
  REPORT_EXPORT_SCORES: 'report:exportScores',

  // SQ 준비도 (SQ 평가 백본: 6대·42항목 신호등)
  SQ_READINESS: 'sq:readiness',
  SQ_ITEM_DETAIL: 'sq:itemDetail',

  // 사건중심 8D 워크플로우 (고객 불량 케이스)
  CASE_LIST: 'case:list',
  CASE_GET: 'case:get',
  CASE_CREATE: 'case:create',
  CASE_UPDATE: 'case:update',
  CASE_STEP_UPDATE: 'case:stepUpdate',
  CASE_SCREENING_SAVE: 'case:screeningSave',
  CASE_FACT_SAVE: 'case:factSave',
  CASE_DISTRIBUTE: 'case:distribute'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
