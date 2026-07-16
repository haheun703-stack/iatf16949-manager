// ─────────────────────────────────────────────────────────────────────────────
// 팀 테마 — 7팀 고유 색 토큰 + respDept 정규화 (팀별 허브 재편 7/6)
//
//  팀 = forms.resp_dept 실값과 1:1 (정본 0.7 매트릭스 책임부서).
//  원칙: 색 = 팀 고유 식별자. 빨강(#E24B4A)은 부적합/미작성/경고 전용으로 예약.
//  shared 에 둔 이유: 메인(TEAM_SUMMARY 집계)과 렌더러(카드/배지) 공용.
// ─────────────────────────────────────────────────────────────────────────────

export type TeamId =
  | 'chongmu'    // 총무팀
  | 'yeongup'    // 영업팀
  | 'gumae'      // 구매팀
  | 'saengsan'   // 생산팀
  | 'saengki'    // 생산기술팀
  | 'pumjil'     // 품질경영·보증팀
  | 'gaebal'     // 개발팀

export interface TeamTheme {
  id: TeamId
  /** 화면 표시명 */
  label: string
  /** DB forms.resp_dept 매칭값(정규화 후) */
  deptKeys: string[]
  /** 팀 설명(허브 카드 부제) */
  desc: string
  /** 팀 고유색 */
  border: string
  tintBg: string
  darkText: string
}

/** 사장님 확정 순서(2026-07-06): 총무→영업→구매→생산→생산기술→품질→개발 */
export const TEAMS: TeamTheme[] = [
  {
    id: 'chongmu', label: '총무팀', deptKeys: ['총무팀', '관리팀'],
    desc: '교육·인사, 안전보건환경, 경영기획',
    border: '#7F77DD', tintBg: '#EEEDFE', darkText: '#3C3489'
  },
  {
    id: 'yeongup', label: '영업팀', deptKeys: ['영업팀'],
    desc: '수주·계약, 고객만족, 완성품 출하',
    border: '#D85A30', tintBg: '#FAECE7', darkText: '#712B13'
  },
  {
    // 수입검사는 구매 아님 — L-2100 수입검사표준·기준서 책임부서=품질보증팀(BOM, 7/7 사장님 지적)
    id: 'gumae', label: '구매팀', deptKeys: ['구매팀'],
    desc: '발주·협력업체, 자재 입출고',
    border: '#EF9F27', tintBg: '#FAEEDA', darkText: '#633806'
  },
  {
    id: 'saengsan', label: '생산팀', deptKeys: ['생산팀'],
    desc: '작업표준·공정관리, 식별·추적, 3정5S',
    border: '#639922', tintBg: '#EAF3DE', darkText: '#27500A'
  },
  {
    id: 'saengki', label: '생산기술팀', deptKeys: ['생산기술팀'],
    desc: '설비·치공구 관리, 금형',
    border: '#2A9D8F', tintBg: '#E3F2F0', darkText: '#0F4C46'
  },
  {
    id: 'pumjil', label: '품질경영·보증팀', deptKeys: ['품질보증팀', '품질경영팀', '품질팀', '품질개발팀'],
    desc: '검사·시험, 계측기, 부적합·개선, SQ',
    border: '#378ADD', tintBg: '#E6F1FB', darkText: '#0C447C'
  },
  {
    id: 'gaebal', label: '개발팀', deptKeys: ['개발팀', '설계팀'],
    desc: 'APQP·ISIR·PPAP, FMEA, 도면·4M',
    border: '#3F3D9E', tintBg: '#EAEAFA', darkText: '#26215C'
  }
]

/** 경고/부적합 전용(팀색 아님) */
export const ALERT_RED = { border: '#E24B4A', tintBg: '#FCEBEB', darkText: '#A32D2D' }

const norm = (s: string): string => s.replace(/[\s　]/g, '')

const DEPT_LUT: Map<string, TeamId> = (() => {
  const m = new Map<string, TeamId>()
  for (const t of TEAMS) for (const k of t.deptKeys) m.set(norm(k), t.id)
  return m
})()

/** respDept 문자열(공백·표기 편차 허용) → TeamId. 미매핑은 null. */
export function normalizeTeam(respDept: string | null | undefined): TeamId | null {
  if (!respDept) return null
  return DEPT_LUT.get(norm(respDept)) ?? null
}

// ── 정기 의무 owner(자유 텍스트) → 팀 (관제탑 홈, 포털 1단계) ──
// owner 는 '품질팀' 외에 '영업/품질'·'경영지원'·'경영진'·'품질개발' 같은
// 자유 표기가 섞여 있어 deptKeys 직매칭이 실패함. 토큰 분해 후
// ①deptKeys 직매칭 ②'팀' 접미사 보정 ③힌트 순으로 첫 매칭 팀 1개를 배정.
const OWNER_HINTS: Record<string, TeamId> = {
  경영지원: 'chongmu', // 총무팀 관할(경영기획)
  경영진: 'chongmu',
  경영자: 'chongmu',
  자재: 'gumae' // 자재 입출고 = 구매팀 관할(수입"검사"는 품질 — forms.resp_dept 가 우선)
}

/** 정기 의무 owner → TeamId. 복수 표기('영업/품질')는 첫 매칭 팀. 미매핑은 null(정직 노출). */
export function normalizeOwnerTeam(owner: string | null | undefined): TeamId | null {
  if (!owner) return null
  for (const token of owner.split(/[/,·+&]/)) {
    const t = norm(token)
    if (!t) continue
    const team = DEPT_LUT.get(t) ?? DEPT_LUT.get(`${t}팀`) ?? OWNER_HINTS[t]
    if (team) return team
  }
  return null
}

export function teamTheme(id: TeamId): TeamTheme {
  return TEAMS.find((t) => t.id === id)!
}
