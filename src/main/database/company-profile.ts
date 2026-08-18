// ─────────────────────────────────────────────────────────────────────────────
// 회사 프로파일 공용 읽기 — 39호 S1(제품/고객사팩 경계): 하드코딩 외부화.
//  값의 정본 = company_profile 테이블(0003). TPC 값은 0144([TPC팩 후보])가 공급하고
//  시드(seed.ts)는 중립값만 백필한다 — 코드에는 회사 문자열을 두지 않는다.
//  공백 정책: 값이 비면 구절/줄 자체를 생략(빈 괄호·빈 대시 금지) — 호출부 공통 규칙.
// ─────────────────────────────────────────────────────────────────────────────
import type Database from 'better-sqlite3'

/** 단일 키 조회. 테이블 부재/오류 시 null (form-handlers 원본 시그니처 그대로 이동). */
export function getProfileValue(db: Database.Database, key: string): string | null {
  try {
    const r = db.prepare('SELECT value FROM company_profile WHERE key = ?').get(key) as
      | { value: string }
      | undefined
    return r?.value ?? null
  } catch {
    return null
  }
}

/** 여러 키 1쿼리 조회. 없는 키/오류 시 '' — 호출부의 공백 생략 규칙과 짝. */
export function getProfileMap(db: Database.Database, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of keys) out[k] = ''
  try {
    const placeholders = keys.map(() => '?').join(',')
    const rows = db
      .prepare(`SELECT key, value FROM company_profile WHERE key IN (${placeholders})`)
      .all(...keys) as Array<{ key: string; value: string }>
    for (const r of rows) out[r.key] = r.value ?? ''
  } catch {
    /* company_profile 없으면 전부 '' */
  }
  return out
}

/** 회사 축약 표기: 영문 약칭 → 한글 약칭 → 정식 명칭 순 폴백. 전부 비면 ''. */
export function companyShort(db: Database.Database): string {
  const m = getProfileMap(db, ['companyNameEn', 'companyNameShort', 'companyName'])
  return m.companyNameEn || m.companyNameShort || m.companyName || ''
}

/** 채점/양식가이드 프롬프트 공용 회사 컨텍스트(최대 2줄). 전부 비면 '' — 호출부에서 삽입 생략. */
export function buildCompanyContext(db: Database.Database): string {
  const m = getProfileMap(db, [
    'companyNameEn',
    'companyNameShort',
    'companyName',
    'factoryName',
    'processes',
    'products'
  ])
  const short = m.companyNameEn || m.companyNameShort || m.companyName
  const lines: string[] = []
  const head = [short, m.factoryName].filter(Boolean).join(' ')
  if (head) lines.push(`회사: ${head}${m.processes ? ` (${m.processes})` : ''}`)
  if (m.products) lines.push(`주요 공정/제품: ${m.products}`)
  return lines.join('\n')
}
