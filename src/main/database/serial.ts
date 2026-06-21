import type { getSqlite } from './connection'

type DB = ReturnType<typeof getSqlite>

/**
 * 채번 단일 출처 — 양식 발행번호 / 케이스 번호.
 * (단일 사용자 동기 DB라 동시성 충돌 없음. serial은 저장 시 확정.)
 */

/** 양식 발행번호 PREFIX-YYYY-#### (form_submissions.serial_no 최대 시퀀스+1). */
export function nextFormSerial(db: DB, formCode: string, prefix: string, year: number): string {
  const rows = db
    .prepare(`SELECT serial_no FROM form_submissions WHERE form_code = ? AND serial_no LIKE ?`)
    .all(formCode, `${prefix}-${year}-%`) as Array<{ serial_no: string | null }>
  let max = 0
  for (const r of rows) {
    const m = r.serial_no?.match(/(\d+)\s*$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `${prefix}-${year}-${String(max + 1).padStart(4, '0')}`
}

/** 케이스 번호 QC-YYYY-#### (cases.case_no 최대 시퀀스+1). */
export function nextCaseNo(db: DB, year: number): string {
  const rows = db
    .prepare(`SELECT case_no FROM cases WHERE case_no LIKE ?`)
    .all(`QC-${year}-%`) as Array<{ case_no: string | null }>
  let max = 0
  for (const r of rows) {
    const m = r.case_no?.match(/(\d+)\s*$/)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return `QC-${year}-${String(max + 1).padStart(4, '0')}`
}
