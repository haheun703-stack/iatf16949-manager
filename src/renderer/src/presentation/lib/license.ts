// M2 라이선스 언락(2026-08-23) — 32/33호 상품 구조: 기본판 = 미니MES + SQ 내장 · IATF 16949 = 애드온 1키.
// 잠금 대상 = 33호 §60 "IATF 뷰·문서BOM·조항" + 40호 §3 표준팩-IATF(프로세스 틀). 나머지 화면은 전부 기본.
// 판정 근거 = 서버 세션(auth:me.license) 하나. 데스크톱/구서버(license 없음) = 잠금 없음(현행 유지).
import type { PageId } from '../stores/uiStore'
import type { SessionUser } from '../stores/activeUserStore'

export const IATF_ADDON_PAGES: ReadonlySet<PageId> = new Set<PageId>(['iatf-dashboard', 'clause-tree', 'document-bom', 'process-workbench'])

/** 이 화면이 IATF 애드온 잠금 대상인가 */
export function isAddonPage(page: PageId): boolean {
  return IATF_ADDON_PAGES.has(page)
}

/** 세션 기준 잠김 여부 — license 정보가 없으면(데스크톱·구서버) 잠그지 않는다 */
export function isAddonLocked(page: PageId, session: SessionUser | null): boolean {
  if (!isAddonPage(page)) return false
  if (!session || !session.license) return false
  return !session.license.iatfAddon
}
