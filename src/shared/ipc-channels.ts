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
  KPI_MONTH: 'kpi:month',
  KPI_SAVE_BATCH: 'kpi:save-batch',
  // PB2 ⓔ-2 — KPI 연간 그리드 엑셀 내보내기(4차 노트 §3 "기록을 밖으로")
  KPI_EXPORT_XLSX: 'kpi:exportXlsx',
  // P2 — 공용 PC 사용자 전환 (app_users 명단 CRUD, 0085). 활성 사용자는 로컬 상태(회사 DB 미혼입).
  APP_USER_LIST: 'appUser:list',
  APP_USER_UPSERT: 'appUser:upsert',
  APP_USER_DELETE: 'appUser:delete',
  // 관리형 비번 체계(W4, 사장님 7/25): 관리팀이 4자리 비번을 지정·재설정 — 대장 기반 통제
  APP_USER_RESET_PASSWORD: 'appUser:resetPassword',
  // W4-B(37호 — 34호 #19): 화면별 권한 매트릭스(0142 screen_permission — 그림33 골격).
  // list = 관리자 화면 조회 · save = 규칙 일괄 저장(manager+ 가드·STAMP) ·
  // effective = 현 세션 사용자의 병합 규칙(개인>팀) — 렌더러 화면 숨김(보조)용.
  PERM_LIST: 'perm:list',
  PERM_SAVE: 'perm:save',
  PERM_EFFECTIVE: 'perm:effective',
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
  // 회사 로고(2026-08-24 도장) — 양식 xlsx·표지의 로고 자리. 데스크톱/웹 공통이라
  // 네이티브 다이얼로그가 아닌 **브라우저 업로드(dataUrl)** 로 받는다.
  COMPANY_LOGO_GET: 'company:logoGet',
  COMPANY_LOGO_SET: 'company:logoSet',
  COMPANY_LOGO_CLEAR: 'company:logoClear',

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
  // 양식별 모범 예시(form_examples, 0085) — 좌측 정답 패널(P5)
  FORM_EXAMPLES_GET: 'form:examplesGet',
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
  // 데이터 트리거 이슈 완료(M3, 15번 §3-2) — ✓는 사람만
  OBLIGATION_TRIGGER_COMPLETE: 'obligation:triggerComplete',
  // 이행 매트릭스(17번 §3-2, 조회 전용 — 사람×14일 칩. 신규 테이블 금지)
  OBLIGATION_MATRIX: 'obligation:matrix',
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
  MES_RECORDS_PROCESS_LIVE: 'mesRecords:processLive',
  MES_RECORDS_PART_PROCESS: 'mesRecords:partProcess',
  // PB2 ⓒ SQ 심사 뷰 (29번 §11 — SQ 항목 × 공정 ●◐× 매트릭스, 30번 v2 하단부)
  SQ_AUDIT_MATRIX: 'sq:auditMatrix',

  // 반(半)-MES 코어 (15번 M0 — 마스터 6종·BOM 트리·라우팅. 0101 스키마)
  SEMIMES_SUMMARY: 'semimes:summary',
  SEMIMES_TREE: 'semimes:tree',
  SEMIMES_ITEM: 'semimes:item',
  // G1 수집함 (29번 §8-⑥ · M1 견적 — 입고·출하 전표 사진 1:N 태깅, 마이그 0136)
  SEMIMES_CAPTURE_LIST: 'semimes:captureList',
  SEMIMES_CAPTURE_CREATE: 'semimes:captureCreate',
  SEMIMES_CAPTURE_IMAGE: 'semimes:captureImage',
  SEMIMES_CAPTURE_TAG: 'semimes:captureTag',
  SEMIMES_ITEM_SEARCH: 'semimes:itemSearch',
  // PC 기록 쓰기 (29번 §4 — semimes-write-handlers. append-only·실측값 강제·STAMP·recordSource)
  SEMIMES_SCAN_RESOLVE: 'semimes:scanResolve',
  SEMIMES_LOT_ISSUE: 'semimes:lotIssue',
  SEMIMES_PROD_CREATE: 'semimes:prodRecordCreate',
  SEMIMES_INSP_CREATE: 'semimes:inspRecordCreate',
  SEMIMES_WORK_ORDER_UPSERT: 'semimes:workOrderUpsert',
  SEMIMES_WORK_ORDER_LIST: 'semimes:workOrderList',
  SEMIMES_TODAY_RECORDS: 'semimes:todayRecords',
  SEMIMES_RECORD_CANCEL: 'semimes:recordCancel',
  SEMIMES_INSP_CONFIRM: 'semimes:inspConfirm',
  // 32호 1차분 — MES 조회 화면 5종 원천 (읽기 전용 · semimes-query-handlers)
  SEMIMES_PROD_LIST: 'semimes:prodList',
  SEMIMES_INSP_LIST: 'semimes:inspList',
  SEMIMES_INSP_VALUES: 'semimes:inspValues',
  SEMIMES_MAT_STOCK: 'semimes:matStock',
  SEMIMES_HOME_KPIS: 'semimes:homeKpis',
  // 34호 2차분 2-1 — 자재입하/입고내역조회(수집함 태깅 결과 = mat_receipt 원천)
  SEMIMES_RECEIPT_LIST: 'semimes:receiptList',
  // 34호 배치⑴ — #7 검사기준(SPEC)등록(개정=신규 행 · §10-1) · #14 부적합 PPM 대시보드
  SEMIMES_SPEC_LIST: 'semimes:specList',
  SEMIMES_SPEC_SAVE: 'semimes:specSave',
  SEMIMES_PPM_DASH: 'semimes:ppmDash',
  SEMIMES_PPM_TARGET_SAVE: 'semimes:ppmTargetSave',
  // 34호 배치⑵ — 기준정보(#1 품목·#2 거래처·#3 BOM조회·#4 코드 골격)
  SEMIMES_ITEM_LIST: 'semimes:itemList',
  SEMIMES_ITEM_UPDATE: 'semimes:itemUpdate',
  SEMIMES_PARTNER_LIST: 'semimes:partnerList',
  SEMIMES_PARTNER_UPDATE: 'semimes:partnerUpdate',
  SEMIMES_BOM_EXPLODE: 'semimes:bomExplode',
  SEMIMES_CODE_GROUPS: 'semimes:codeGroups',
  // 34호 배치⑶ — 지표·달력·추적(#18 조업달력·#15 성과 지표·#12 생산현황 차트·#16 추적 밴드)
  SEMIMES_WORK_CALENDAR: 'semimes:workCalendar',
  SEMIMES_WORK_CALENDAR_SAVE: 'semimes:workCalendarSave',
  SEMIMES_PERF_INDICATORS: 'semimes:perfIndicators',
  SEMIMES_PROD_CHART: 'semimes:prodChart',
  SEMIMES_TRACE_BAND: 'semimes:traceBand',
  // 34호 배치⑷ — 설비·금형·리포트(#9 설비등록·#10 일상점검내역·#11 금형 2종·#8 XBAR-R)
  SEMIMES_EQUIP_LIST: 'semimes:equipList',
  SEMIMES_EQUIP_SAVE: 'semimes:equipSave',
  SEMIMES_EQUIP_CHECK_LIST: 'semimes:equipCheckList',
  SEMIMES_MOLD_LIST: 'semimes:moldList',
  SEMIMES_MOLD_SAVE: 'semimes:moldSave',
  SEMIMES_XBAR_R: 'semimes:xbarR',
  // 34호 배치⑷ — #13 KPI 기준정보관리(kpi_indicators 편집)
  KPI_INDICATOR_SAVE: 'kpi:indicatorSave',
  // 35호 — 생산현황 전광판(TV현황판, 그림65 · 32호 §7-3 재상신 도장분). 읽기 전용 — 60초 폴링 1왕복
  SEMIMES_TV_BOARD: 'semimes:tvBoard',

  // 공정 흐름 맵 (2배치 선두 — CP→라우팅 파이프라인 기반, ISIR #14 공정 흐름도 출력물)
  PROCESS_FLOW_LIST: 'processFlow:list',
  PROCESS_FLOW_GET: 'processFlow:get',

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
