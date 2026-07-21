export const IPC_CHANNELS = {
  // Dashboard (v5)
  DASHBOARD_V5: 'dashboard:v5',

  // IATF 조항 커버리지 (0.7 매트릭스)
  CLAUSE_COVERAGE: 'clause:coverage',

  // APQP (사전 제품 품질 계획) — 5단계 여정
  APQP_BOARD: 'apqp:board',
  APQP_ELEMENT_UPDATE: 'apqp:elementUpdate',

  // 오늘 할 일 (매일 관리 보드)
  DAILY_BOARD: 'dashboard:dailyBoard',

  // 팀별 허브 (홈)
  TEAM_SUMMARY: 'team:summary',
  TEAM_REGS: 'team:regs',
  // 관제탑 홈 (포털 1단계) — 팀별 오늘 할 일·이행률
  TEAM_TODAY_BOARD: 'team:todayBoard',
  // 관제탑 홈 KPI 지수 (0066) — 지표+최근 측정값 / 월별 실적 입력
  KPI_HOME: 'kpi:home',
  KPI_SAVE: 'kpi:save',
  // P2 — 공용 PC 사용자 전환 (app_users 명단 CRUD, 0085). 활성 사용자는 로컬 상태(회사 DB 미혼입).
  APP_USER_LIST: 'appUser:list',
  APP_USER_UPSERT: 'appUser:upsert',
  APP_USER_DELETE: 'appUser:delete',
  // IATF 대시보드 — 인증 심사 준비 한 장 (조항·핵심 의무·문서화)
  IATF_DASHBOARD: 'iatf:dashboard',
  // 규정·양식 찾아보기 (포털 2단계) — 규정 카드 그리드 + 상세(하위 양식)
  REG_BROWSE: 'reg:browse',
  REG_FORMS: 'reg:forms',

  // 양식 캔버스 (엑셀형 작성 화면)
  FORM_RENDER_MODEL: 'form:renderModel',

  // Company Profile
  COMPANY_PROFILE_GET: 'company:profileGet',
  COMPANY_PROFILE_SAVE: 'company:profileSave',
  COMPANY_PICK_MASTERS_DIR: 'company:pickMastersDir',

  // Document Generation
  DOCGEN_GENERATE: 'docgen:generate',
  DOCGEN_SAVE_DIALOG: 'docgen:saveDialog',

  // 제품(앱) 정보 — 버전·런타임 (UI P3 제품 정보 화면)
  APP_INFO: 'app:info',

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
  AI_DRAFT_STATS: 'ai:draftStats',
  // AI 레이어 (Phase E1) — SQ 준비도 예측
  AI_READINESS_PREDICT: 'ai:readinessPredict',
  AI_READINESS_EXPLAIN: 'ai:readinessExplain',
  // AI 레이어 (Phase F1) — 부재 감지(expected-set)
  AI_ABSENCE_CHECK: 'ai:absenceCheck',
  AI_ABSENCE_EXPLAIN: 'ai:absenceExplain',
  // AI 레이어 (Phase E3) — 모의 심사
  AI_MOCK_AUDIT: 'ai:mockAudit',
  // AI 레이어 (Phase E2) — 유사 케이스 + 8D 초안
  AI_SIMILAR_CASES: 'ai:similarCases',

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

  // 정기 의무 캘린더 (반복 의무: 일/주/월/분기/년)
  OBLIGATION_LIST: 'obligation:list',
  OBLIGATION_CREATE: 'obligation:create',
  OBLIGATION_UPDATE: 'obligation:update',
  OBLIGATION_DELETE: 'obligation:delete',
  OBLIGATION_COMPLETE: 'obligation:complete',
  // 도래일 일괄 재설정(실사용 개시) — executive/manager만. 실행 이력 obligation_reset_log(0086)
  OBLIGATION_RESET_DUE: 'obligation:resetDue',

  // PPAP (양산부품승인) — Core Tool #1
  PPAP_SUBMISSION_LIST: 'ppap:submissionList',
  PPAP_BOARD: 'ppap:board',
  PPAP_ELEMENT_UPDATE: 'ppap:elementUpdate',
  PPAP_SUBMISSION_CREATE: 'ppap:submissionCreate',
  PPAP_SUBMISSION_UPDATE: 'ppap:submissionUpdate',

  // 공정 FMEA (신판 AIAG-VDA) — Core Tool #2
  FMEA_DOC_LIST: 'fmea:docList',
  FMEA_BOARD: 'fmea:board',
  FMEA_DOC_CREATE: 'fmea:docCreate',
  FMEA_DOC_UPDATE: 'fmea:docUpdate',
  FMEA_ROW_CREATE: 'fmea:rowCreate',
  FMEA_ROW_UPDATE: 'fmea:rowUpdate',
  FMEA_ROW_DELETE: 'fmea:rowDelete',
  FMEA_EXPORT_XLSX: 'fmea:exportXlsx',

  // MSA (측정시스템분석) — Core Tool #3
  MSA_LIST: 'msa:list',
  MSA_CREATE: 'msa:create',
  MSA_UPDATE: 'msa:update',
  MSA_DELETE: 'msa:delete',

  // 리포트 내보내기 (v5 Stage 5)
  REPORT_EXPORT_SCORES: 'report:exportScores',

  // SQ 준비도 (SQ 평가 백본: 6대·42항목 신호등)
  SQ_READINESS: 'sq:readiness',
  SQ_ITEM_DETAIL: 'sq:itemDetail',
  // SQ 작성 가이드층 (0064, 코워크 07/08) — 가이드 열람 + 체크포인트 이행상태
  SQ_GUIDE_GET: 'sq:guideGet',
  SQ_CHECKPOINT_UPDATE: 'sq:checkpointUpdate',
  // SQ 대시보드 (09 목업 실구현) — 제안 기준 환산점수·등급·팀별 손실
  SQ_DASHBOARD: 'sq:dashboard',
  // SQ 자체평가 (코워크 07 Phase B) — 실행→확정→점수·등급→리포트 출력
  SQ_ASSESS_RUN: 'sq:assessRun',
  SQ_ASSESS_LIST: 'sq:assessList',
  SQ_ASSESS_GET: 'sq:assessGet',
  SQ_ASSESS_CONFIRM: 'sq:assessConfirm',
  SQ_ASSESS_META: 'sq:assessMeta',
  SQ_ASSESS_FINALIZE: 'sq:assessFinalize',
  SQ_ASSESS_EXPORT: 'sq:assessExport',
  // SQ 심사 아이템 트랙 (0068/0069, 10월 LEVEL-UP — 품번 4종 × 4단계 체크리스트)
  SQTRACK_OVERVIEW: 'sqtrack:overview',
  SQTRACK_PART_DETAIL: 'sqtrack:partDetail',
  SQTRACK_ITEM_UPDATE: 'sqtrack:itemUpdate',
  SQTRACK_SET_AUDIT_DATE: 'sqtrack:setAuditDate',

  // 정합성 점검 (팀 체인 결정론 검사 — 7/19 검수 체계 1층)
  INTEGRITY_CHECK: 'integrity:check',

  // LOT 계보 조회 (MES POP_TRACE 사이드카 mes_trace.db — 정·역추적, 7/19 Scan-to-Trace)
  MES_TRACE_STATUS: 'mesTrace:status',
  MES_TRACE_SEARCH: 'mesTrace:search',
  MES_TRACE_EXPAND: 'mesTrace:expand',

  // MES 기록 현황 (QMS_SQC+MAC_DESC 사이드카 mes_records.db — 커버리지 판정, 7/20)
  MES_RECORDS_STATUS: 'mesRecords:status',
  MES_RECORDS_COVERAGE: 'mesRecords:coverage',
  MES_RECORDS_DETAIL: 'mesRecords:detail',

  // 품번/ISIR 척추 (관리계획서·검사협정 = 부품 단위 통제)
  PARTS_LIST: 'parts:list',
  PART_DETAIL: 'parts:detail',
  PARTS_IMPORT_ISIR: 'parts:importIsir', // 런타임 ISIR xlsx 임포트(파일선택→파싱→적재)
  // ISIR 완비도(F1 ISIR판) — 결정론 점검 + AI 진단
  AI_ISIR_COMPLETENESS: 'ai:isirCompleteness',
  AI_ISIR_EXPLAIN: 'ai:isirExplain',

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
