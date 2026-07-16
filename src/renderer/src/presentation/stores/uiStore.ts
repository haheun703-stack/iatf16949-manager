import { create } from 'zustand'
import type { TeamId } from '@shared/team-theme'

export type PageId =
  | 'home'
  | 'team-hub'
  | 'team-detail'
  | 'dashboard'
  | 'sq-readiness'
  | 'parts'
  | 'case-work'
  | 'process-workbench'
  | 'form-builder'
  | 'document-bom'
  | 'schedule'
  | 'obligations'
  | 'ppap'
  | 'fmea'
  | 'msa'
  | 'apqp'
  | 'form-chain'
  | 'clause-tree'
  | 'team'
  | 'about'

interface UIState {
  currentPage: PageId
  setPage: (page: PageId) => void

  /** 글자 크기 배율(0.9~1.4). 전체 UI 확대. localStorage 영속. UI P3. */
  fontScale: number
  setFontScale: (scale: number) => void

  selectedFormCode: string | null
  setSelectedFormCode: (code: string | null) => void

  // form-builder 진입 시 열어야 할 기존 작성본 id (분배된 양식 [열기]용). 1회 소비 후 null.
  pendingSubmissionId: number | null
  setPendingSubmissionId: (id: number | null) => void

  selectedProcessCode: string | null
  setSelectedProcessCode: (code: string | null) => void

  selectedClauseId: string | null
  setSelectedClauseId: (id: string | null) => void

  /** 팀별 허브에서 선택된 팀(팀 상세 진입용) */
  selectedTeam: TeamId | null
  setSelectedTeam: (id: TeamId | null) => void
}

// ── 글자 크기 배율 (UI P3) ────────────────────────────────────────
export const FONT_SCALE_MIN = 0.9
export const FONT_SCALE_MAX = 1.4
export const FONT_SCALE_STEP = 0.1
const FONT_SCALE_KEY = 'ui.fontScale'

const clampScale = (n: number): number =>
  Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, Math.round(n * 100) / 100))

function readFontScale(): number {
  try {
    const raw = localStorage.getItem(FONT_SCALE_KEY)
    const n = raw ? Number(raw) : NaN
    return Number.isFinite(n) ? clampScale(n) : 1
  } catch {
    return 1
  }
}

/** 배율을 실제 UI에 적용 + localStorage 저장. App 부팅 시·설정 변경 시 호출. */
export function applyFontScale(scale: number): void {
  try {
    window.api.setZoomFactor(scale)
  } catch {
    /* preload 미노출 환경 무시 */
  }
  try {
    localStorage.setItem(FONT_SCALE_KEY, String(scale))
  } catch {
    /* 저장 실패 무시 */
  }
}

export const useUIStore = create<UIState>((set) => ({
  currentPage: 'home', // 관제탑(팀별 오늘 할 일)이 첫 화면 (포털 1단계, 7/16)
  setPage: (page) => set({ currentPage: page }),

  fontScale: readFontScale(),
  setFontScale: (scale) => {
    const next = clampScale(scale)
    applyFontScale(next)
    set({ fontScale: next })
  },

  selectedFormCode: null,
  setSelectedFormCode: (code) => set({ selectedFormCode: code }),

  pendingSubmissionId: null,
  setPendingSubmissionId: (id) => set({ pendingSubmissionId: id }),

  selectedProcessCode: null,
  setSelectedProcessCode: (code) => set({ selectedProcessCode: code }),

  selectedClauseId: null,
  setSelectedClauseId: (id) => set({ selectedClauseId: id }),

  selectedTeam: null,
  setSelectedTeam: (id) => set({ selectedTeam: id })
}))
