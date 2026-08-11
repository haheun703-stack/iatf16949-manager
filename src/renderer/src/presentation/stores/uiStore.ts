import { create } from 'zustand'
import type { TeamId } from '@shared/team-theme'

export type PageId =
  | 'home'
  | 'team-hub'
  | 'team-detail'
  | 'dashboard'
  | 'sq-dashboard'
  | 'sq-assessment'
  | 'sq-readiness'
  | 'sq-track'
  | 'iatf-dashboard'
  | 'doc-browse'
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
  | 'clause-tree'
  | 'about'
  | 'integrity'
  | 'mes-trace'
  | 'mes-records'
  | 'item-tree'
  | 'process-flow'
  | 'receipt-inbox'
  | 'sq-audit'
  | 'kpi-grid'
  | 'part-process'
  | 'today-board'
  | 'insp-entry'
  | 'prod-entry'
  | 'work-order'
  | 'audit-hub'
  | 'prod-history'
  | 'insp-incoming'
  | 'insp-history'
  | 'mat-stock'
  | 'mat-receipts'
  | 'insp-spec'
  | 'ppm-dash'

// P11 뒤로가기: 페이지 라벨(← 버튼에 직전 화면명 표시). 실제 GNB/화면 제목과 맞춤.
export const PAGE_LABELS: Record<PageId, string> = {
  home: 'MES 홈',
  'team-hub': '팀 허브',
  'team-detail': '팀 상세',
  dashboard: '대시보드',
  'sq-dashboard': 'SQ 대시보드',
  'sq-assessment': 'SQ 자체평가',
  'sq-readiness': 'SQ 준비도',
  'sq-track': 'SQ 심사 트랙',
  'iatf-dashboard': 'IATF 대시보드',
  'doc-browse': '문서 작성',
  parts: '품번 관리',
  'case-work': '부적합/8D',
  'process-workbench': '공정 워크벤치',
  'form-builder': '양식 작성',
  'document-bom': '문서 BOM',
  schedule: '일정표',
  obligations: '정기 의무',
  ppap: 'PPAP',
  fmea: 'FMEA',
  msa: 'MSA',
  apqp: 'APQP',
  'clause-tree': '조항 트리',
  about: '제품 정보',
  integrity: '무결성',
  'mes-trace': 'MES 역추적',
  'mes-records': 'MES 기록',
  'item-tree': '품번 트리',
  'process-flow': '공정 흐름 맵',
  'receipt-inbox': '수집함 (전표 사진)',
  'sq-audit': 'SQ 심사 뷰',
  'kpi-grid': 'KPI 실적 그리드',
  'part-process': '품번×공정 실황',
  'today-board': '오늘 할 일 보드',
  'insp-entry': '검사 등록',
  'prod-entry': '생산실적 등록',
  'work-order': '작업지시관리',
  'audit-hub': '심사대응 (관제탑)',
  'prod-history': '생산실적',
  'insp-incoming': '수입검사내역 조회',
  'insp-history': '품질검사내역',
  'mat-stock': '재고현황 (자재)',
  'mat-receipts': '자재입하 / 입고내역',
  'insp-spec': '검사기준(SPEC) 등록',
  'ppm-dash': '부적합 PPM 대시보드'
}

// P11 뒤로가기 히스토리 스냅샷: 페이지 + 그 화면의 선택 컨텍스트(복원용).
// 웹 전환(14) 시 URL 히스토리로 자연 대체되도록 페이지+파라미터 형태로 설계.
export interface NavSnapshot {
  page: PageId
  formCode: string | null
  processCode: string | null
  clauseId: string | null
  team: TeamId | null
  submissionId: number | null
}

const NAV_HISTORY_MAX = 20

/**
 * 최근 연 양식(P12). 양식 간 이동은 페이지가 'form-builder' 그대로라 nav 히스토리에 안 쌓인다
 * — 302종 목록에서 오가면 매번 다시 찾아 들어가야 했다. 방문 순서를 따로 남겨 상단 줄에
 * 칩으로 띄우고, 클릭하면 그 양식으로 바로 복귀한다. 재방문은 맨 앞으로 끌어올린다(LRU).
 */
export interface RecentForm {
  code: string
  name: string
}
const RECENT_FORMS_MAX = 12
const RECENT_FORMS_KEY = 'ui.recentForms'

function readRecentForms(): RecentForm[] {
  try {
    const raw = localStorage.getItem(RECENT_FORMS_KEY)
    const arr = raw ? (JSON.parse(raw) as unknown) : null
    if (!Array.isArray(arr)) return []
    return arr
      .filter(
        (x): x is RecentForm =>
          !!x && typeof (x as RecentForm).code === 'string' && typeof (x as RecentForm).name === 'string'
      )
      .slice(0, RECENT_FORMS_MAX)
  } catch {
    return []
  }
}

/**
 * [뒤로]로 되돌아가는 중임을 pushRecentForm 에 알리는 1회성 플래그.
 * 스토어 상태로 두면 이 값 변경이 구독자 리렌더를 유발하므로 모듈 지역에 둔다.
 */
const popGuard = { active: false }

function saveRecentForms(list: RecentForm[]): void {
  try {
    localStorage.setItem(RECENT_FORMS_KEY, JSON.stringify(list))
  } catch {
    /* 저장 실패는 무시 — 기능은 메모리 상태로 계속 동작 */
  }
}

interface UIState {
  currentPage: PageId
  setPage: (page: PageId) => void

  /** 뒤로가기 히스토리 스택(P11). setPage 시 직전 화면+컨텍스트를 push(상한 20). */
  history: NavSnapshot[]
  /** 직전 화면으로 복귀(컨텍스트 복원). 스택 비면 false. */
  goBack: () => boolean

  /** 글자 크기 배율(0.9~1.4). 전체 UI 확대. localStorage 영속. UI P3. */
  fontScale: number
  setFontScale: (scale: number) => void

  selectedFormCode: string | null
  setSelectedFormCode: (code: string | null) => void

  /** 최근 연 양식(P12) — 상단 칩 줄. 최신이 앞, 상한 12, localStorage 영속. */
  recentForms: RecentForm[]
  pushRecentForm: (form: RecentForm) => void
  removeRecentForm: (code: string) => void
  clearRecentForms: () => void

  /**
   * 양식 단위 뒤로 스택(P12). 페이지 히스토리는 form-builder 안에서의 양식 이동을 못 잡아
   * "양식 A→B 로 옮기면 A 로 돌아갈 방법이 없다"는 문제가 있었다. 방문 순서를 따로 쌓아
   * [뒤로]가 직전 양식으로 먼저 가고, 더 없을 때만 페이지 뒤로로 넘어가게 한다.
   */
  formHistory: string[]
  /** 직전 양식 코드를 꺼낸다(없으면 null). 꺼낸 뒤의 재진입은 스택에 다시 쌓지 않는다. */
  popFormHistory: () => string | null

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

export const useUIStore = create<UIState>((set, get) => ({
  currentPage: 'home', // 관제탑(팀별 오늘 할 일)이 첫 화면 (포털 1단계, 7/16)
  setPage: (page) =>
    set((s) => {
      // 같은 화면 재설정은 히스토리를 쌓지 않는다(중복 방지).
      if (page === s.currentPage) return {}
      // 떠나는 화면 + 그 컨텍스트를 스냅샷(뒤로가기로 복원). 상한 20.
      const snap: NavSnapshot = {
        page: s.currentPage,
        formCode: s.selectedFormCode,
        processCode: s.selectedProcessCode,
        clauseId: s.selectedClauseId,
        team: s.selectedTeam,
        submissionId: s.pendingSubmissionId
      }
      return { history: [...s.history, snap].slice(-NAV_HISTORY_MAX), currentPage: page }
    }),

  history: [],
  goBack: () => {
    const s = get()
    if (s.history.length === 0) return false
    const prev = s.history[s.history.length - 1]
    set({
      history: s.history.slice(0, -1),
      currentPage: prev.page,
      selectedFormCode: prev.formCode,
      selectedProcessCode: prev.processCode,
      selectedClauseId: prev.clauseId,
      selectedTeam: prev.team,
      pendingSubmissionId: prev.submissionId
    })
    return true
  },

  fontScale: readFontScale(),
  setFontScale: (scale) => {
    const next = clampScale(scale)
    applyFontScale(next)
    set({ fontScale: next })
  },

  selectedFormCode: null,
  setSelectedFormCode: (code) => set({ selectedFormCode: code }),

  recentForms: readRecentForms(),
  pushRecentForm: (form) =>
    set((s) => {
      if (!form.code) return {}
      const head = s.recentForms[0]
      if (head && head.code === form.code && head.name === form.name) return {} // 같은 양식 재렌더 — 무변경
      const next = [form, ...s.recentForms.filter((f) => f.code !== form.code)].slice(
        0,
        RECENT_FORMS_MAX
      )
      saveRecentForms(next)
      // 떠나는 양식을 뒤로 스택에 쌓는다. 단 [뒤로]로 되돌아온 경우는 제외 —
      // 안 그러면 A↔B 를 오갈 때 스택이 무한히 자라 뒤로가 제자리를 맴돈다.
      const skip = popGuard.active
      popGuard.active = false
      const hist =
        !skip && head && head.code !== form.code
          ? [...s.formHistory, head.code].slice(-NAV_HISTORY_MAX)
          : s.formHistory
      return { recentForms: next, formHistory: hist }
    }),
  removeRecentForm: (code) =>
    set((s) => {
      const next = s.recentForms.filter((f) => f.code !== code)
      saveRecentForms(next)
      return { recentForms: next }
    }),
  clearRecentForms: () =>
    set(() => {
      saveRecentForms([])
      return { recentForms: [], formHistory: [] }
    }),

  formHistory: [],
  popFormHistory: () => {
    const s = get()
    const code = s.formHistory[s.formHistory.length - 1]
    if (!code) return null
    popGuard.active = true // 이어질 pushRecentForm 이 스택에 되쌓지 않도록
    set({ formHistory: s.formHistory.slice(0, -1) })
    return code
  },

  pendingSubmissionId: null,
  setPendingSubmissionId: (id) => set({ pendingSubmissionId: id }),

  selectedProcessCode: null,
  setSelectedProcessCode: (code) => set({ selectedProcessCode: code }),

  selectedClauseId: null,
  setSelectedClauseId: (id) => set({ selectedClauseId: id }),

  selectedTeam: null,
  setSelectedTeam: (id) => set({ selectedTeam: id })
}))
