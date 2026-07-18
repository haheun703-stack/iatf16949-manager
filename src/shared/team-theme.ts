// ─────────────────────────────────────────────────────────────────────────────
// 팀 테마 — 5팀 고유 색 토큰 + respDept 정규화
//
//  ★5팀 재편(2026-07-19 사장님 확정, v4 통합뼈대): 실제 조직 = 개발·자재/출하·
//  생산·품질·관리 5팀. 레거시 7팀 표기(총무·영업·구매·생산기술·품질경영보증)는
//  deptKeys 로 흡수 — DB의 기존 resp_dept/owner 텍스트는 무수정 호환.
//  분해 규칙: 영업팀 → 자재/출하팀(납입지시·출하 축. 수주·견적은 개발팀 소관이나
//  레거시 '영업팀' 문자열은 자재/출하로 일괄 배정 — 신규 시드부터 정팀 기입).
//  총무팀 → 관리팀 · 구매팀 → 자재/출하팀 · 생산기술팀 → 생산팀(설비·금형).
//
//  원칙: 색 = 팀 고유 식별자. 빨강(#E24B4A)은 부적합/미작성/경고 전용으로 예약.
//  shared 에 둔 이유: 메인(TEAM_SUMMARY 집계)과 렌더러(카드/배지) 공용.
// ─────────────────────────────────────────────────────────────────────────────

export type TeamId =
  | 'gaebal'     // 개발팀 (수주·견적·원가 + APQP·ECN·양산이관)
  | 'jajae'      // 자재/출하팀 (납입지시·조달·출하 — 구 구매팀+영업팀)
  | 'saengsan'   // 생산팀 (공정 + 설비·금형 — 구 생산기술팀 흡수)
  | 'pumjil'     // 품질팀
  | 'gwanli'     // 관리팀 (구 총무팀)

export interface TeamTheme {
  id: TeamId
  /** 화면 표시명 */
  label: string
  /** DB forms.resp_dept 매칭값(정규화 후) — 레거시 팀명 포함 */
  deptKeys: string[]
  /** 팀 설명(허브 카드 부제) — v4 뼈대 미션 요약 */
  desc: string
  /** 팀 고유색 */
  border: string
  tintBg: string
  darkText: string
}

/** v4 뼈대 순서(2026-07-19): 개발→자재/출하→생산→품질→관리 */
export const TEAMS: TeamTheme[] = [
  {
    id: 'gaebal', label: '개발팀', deptKeys: ['개발팀', '설계팀', '개발영업팀'],
    desc: '수주·견적·원가, APQP·ISIR·PPAP, ECN·양산이관',
    border: '#3F3D9E', tintBg: '#EAEAFA', darkText: '#26215C'
  },
  {
    // 표시명 '영업/자재팀' = 7/19 사장님 확정(v4 문서의 '자재/출하'에서 현장 명칭으로 변경)
    id: 'jajae', label: '영업/자재팀', deptKeys: ['영업/자재팀', '영업자재팀', '자재/출하팀', '자재출하팀', '자재팀', '출하팀', '구매팀', '영업팀'],
    desc: '납입지시·조달·출하, 식별·추적·FIFO, 외주관리',
    border: '#EF9F27', tintBg: '#FAEEDA', darkText: '#633806'
  },
  {
    id: 'saengsan', label: '생산팀', deptKeys: ['생산팀', '생산기술팀'],
    desc: '작업표준·공정관리, 설비·금형, 4M·초중종물',
    border: '#639922', tintBg: '#EAF3DE', darkText: '#27500A'
  },
  {
    // 수입검사는 구매 아님 — L-2100 수입검사표준·기준서 책임부서=품질보증팀(BOM, 7/7 사장님 지적)
    id: 'pumjil', label: '품질팀', deptKeys: ['품질팀', '품질보증팀', '품질경영팀', '품질개발팀', '품질경영·보증팀'],
    desc: '검사·시험, 계측기, 부적합·CAPA, SQ·추적성 검증',
    border: '#378ADD', tintBg: '#E6F1FB', darkText: '#0C447C'
  },
  {
    id: 'gwanli', label: '관리팀', deptKeys: ['관리팀', '총무팀', '경영지원팀'],
    desc: '자금·결산, 인사·교육·온보딩, 법정신고',
    border: '#7F77DD', tintBg: '#EEEDFE', darkText: '#3C3489'
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
  경영지원: 'gwanli',
  경영진: 'gwanli',
  경영자: 'gwanli',
  총무: 'gwanli',
  자재: 'jajae',
  출하: 'jajae',
  구매: 'jajae',
  영업: 'jajae', // 레거시 — 납입지시·출하 축(수주·견적 신규 시드는 개발팀으로 기입)
  생산기술: 'saengsan',
  생산관리: 'saengsan'
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
