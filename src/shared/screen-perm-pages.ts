/**
 * 화면별 권한 매트릭스 — 화면 화이트리스트 + 서버 강제 화면 (8/13 전수 검수 M-2·Minor 처분)
 *
 * ⚠동기 계약(3곳): ① MesMenuBar MODULES 의 page 항목(별칭·관리·exec 전용 제외)과 1:1 —
 *   메뉴에 화면을 추가하면 여기에도 추가할 것(ScreenPermPage 가 dev 콘솔 경고로 어긋남 감지).
 *   ② SERVER_ENFORCED_ACTS 는 server/index.cjs SCREEN_GUARD 와 **(화면×행위)까지** 1:1 —
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

/** 서버가 403 으로 강제할 수 있는 행위 축(SCREEN_GUARD 의 act — 읽기·프린트·단가는 없음) */
export type EnforcedAct = 'write' | 'edit' | 'delete' | 'excel'

/**
 * N-10(8/14 검수 2차) — 강제는 **(화면 × 행위)** 단위인데 종전 표기는 화면 단위였다.
 * 예: fmea 는 엑셀만 가드(쓰기·수정·삭제 채널은 비가드)인데 배지가 없어 "쓰기·수정·삭제 403"
 * 으로 읽혔다(item-master=수정만·partner-master=수정만·mat-receipts=삭제만도 동일).
 * 여기가 그 **정직 표기의 원천** — `server/index.cjs` 의 `SCREEN_GUARD` 와 1:1 이다.
 * 가드 채널을 늘리면 반드시 같이 갱신할 것(둘이 어긋나면 화면이 거짓말을 한다).
 */
export const SERVER_ENFORCED_ACTS: Record<string, readonly EnforcedAct[]> = {
  // 쓰기 전용
  'work-order': ['write'],           // semimes:workOrderUpsert
  'receipt-inbox': ['write'],        // semimes:captureCreate·captureTag
  'work-calendar': ['write'],        // semimes:workCalendarSave
  'insp-spec': ['write'],            // semimes:specSave
  'equip-master': ['write'],         // semimes:equipSave
  'mold-master': ['write'],          // semimes:moldSave
  'ppm-dash': ['write'],             // semimes:ppmTargetSave
  'kpi-indicators': ['write'],       // kpi:indicatorSave
  // 쓰기 + 취소(삭제 축)
  'prod-entry': ['write', 'delete'], // lotIssue·prodRecordCreate / recordCancel(kind 기본)
  // 쓰기 + 확인(수정 축) + 취소
  'insp-entry': ['write', 'edit', 'delete'], // inspRecordCreate / inspConfirm / recordCancel(insp)
  // 쓰기 + 엑셀
  'kpi-grid': ['write', 'excel'],    // kpi:save·save-batch / kpi:exportXlsx
  // 수정 전용 — 마스터 정비
  'item-master': ['edit'],           // semimes:itemUpdate
  'partner-master': ['edit'],        // semimes:partnerUpdate
  // 삭제 전용 — 입하 취소
  'mat-receipts': ['delete'],        // semimes:recordCancel(kind='receipt')
  // 엑셀 전용
  fmea: ['excel'],                   // fmea:exportXlsx
  'form-builder': ['excel']          // form:exportXlsx
}

/**
 * 서버 SCREEN_GUARD 가 실제 403 으로 강제하는 화면(= 위 맵의 키 — 16화면).
 * 이 목록 밖의 화면은 규칙을 저장해도 서버 강제가 전무하다(메뉴 숨김·표기 보조만).
 * 목록 안이어도 **강제되는 행위는 화면마다 다르다** — 축별 표기는 SERVER_ENFORCED_ACTS 를 볼 것.
 * 프린트 비트는 소비처 0(M-4 — 미배선), 단가는 스키마 CHECK 하드락.
 * (N-10: 종전엔 이 배열이 손으로 쓴 별도 목록이라 맵과 어긋날 수 있었다 → 키에서 파생.)
 */
export const SERVER_ENFORCED_PAGE_IDS = Object.keys(SERVER_ENFORCED_ACTS)

/** 화면이 강제받는 행위 목록(없으면 빈 배열 = 표시 전용) */
export function enforcedActsOf(pageId: string): readonly EnforcedAct[] {
  return SERVER_ENFORCED_ACTS[pageId] ?? []
}

export const ACT_LABELS: Record<EnforcedAct, string> = {
  write: '쓰기',
  edit: '수정',
  delete: '삭제',
  excel: '엑셀'
}
