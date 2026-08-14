/**
 * 화면별 권한 매트릭스 — 화면 화이트리스트 + 서버 강제 화면 (8/13 전수 검수 M-2·Minor 처분)
 *
 * ⚠동기 계약(3곳): ① MesMenuBar MODULES 의 page 항목(별칭·관리·exec 전용 제외)과 1:1 —
 *   메뉴에 화면을 추가하면 여기에도 추가할 것(ScreenPermPage 가 dev 콘솔 경고로 어긋남 감지).
 *   ② SERVER_ENFORCED_PAGE_IDS 는 server/index.cjs SCREEN_GUARD 의 page 값과 1:1 —
 *   가드 채널을 늘리면 여기도 갱신(정직 표기의 원천). ③ perm:save 화이트리스트.
 */

/** 매트릭스가 규칙을 가질 수 있는 화면 전체(그림33 좌측 트리 = 메뉴 page 49 + form-builder) */
export const SCREEN_PERM_PAGE_IDS = [
  // 기준정보
  'item-master', 'partner-master', 'bom-browse', 'item-tree', 'code-master',
  'process-flow', 'parts', 'document-bom', 'process-workbench',
  // 자재관리
  'receipt-inbox', 'mat-receipts', 'mat-stock', 'mes-trace',
  // 생산관리
  'work-order', 'prod-entry', 'prod-history', 'prod-chart', 'daily-report',
  'trace-band', 'work-calendar', 'insp-entry', 'mes-records', 'part-process', 'obligations',
  // 품질관리
  'insp-incoming', 'insp-history', 'insp-spec', 'ppm-dash', 'xbar-r', 'case-work', 'msa', 'fmea',
  // 설비·금형
  'equip-master', 'equip-check', 'mold-master',
  // 경영정보
  'kpi-grid', 'kpi-indicators', 'perf-indicators', 'dashboard', 'team-hub',
  // 심사대응
  'audit-hub', 'today-board', 'sq-audit', 'sq-dashboard', 'sq-assessment',
  'sq-readiness', 'sq-track', 'iatf-dashboard', 'clause-tree',
  // 메뉴 트리 밖이지만 SCREEN_GUARD 엑셀 축이 참조(form:exportXlsx)
  'form-builder'
] as const

/**
 * 서버 SCREEN_GUARD 가 실제 403 으로 강제하는 화면(쓰기·수정·삭제·엑셀 축 — 16화면).
 * 이 목록 밖의 화면은 규칙을 저장해도 서버 강제가 없다(메뉴 숨김·표기 보조만) —
 * 화면에는 "표시 전용" 배지로 정직하게 알린다(M-2). 프린트 비트는 소비처 0(M-4 — 미배선).
 */
export const SERVER_ENFORCED_PAGE_IDS = [
  'work-order', 'prod-entry', 'insp-entry', 'receipt-inbox', 'work-calendar',
  'insp-spec', 'equip-master', 'mold-master', 'ppm-dash', 'kpi-grid',
  'kpi-indicators', 'item-master', 'partner-master', 'mat-receipts', 'fmea', 'form-builder'
] as const
