#!/usr/bin/env node
/**
 * dump-forms-seed.mjs
 *
 * live DB(%APPDATA%/iatf16949-manager/iatf16949.db)의 `forms`·`process_forms`를
 * 재현 가능한 마이그레이션 SQL(resources/migrations/0014_seed_all_forms.sql)로 덤프한다.
 *
 * 배경: 기존엔 scripts/auto-link-forms.mjs 가 218개 양식을 live DB에 직접 INSERT 해서
 *       클린설치 시 0004의 4건만 복원됐다. 이 스크립트로 현재 상태를 시드 SQL로 고정해
 *       재현성을 확보한다. (INSERT OR IGNORE → 0004/0005가 먼저 넣은 행과 충돌 없음)
 *
 * 사용:
 *   node scripts/dump-forms-seed.mjs            # 0014 파일 생성
 *   node scripts/dump-forms-seed.mjs --dbPath <db> --out <file>
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import initSqlJs from 'sql.js'

const args = process.argv.slice(2)
const getArg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null }

const dbPath = getArg('dbPath') || join(process.env.APPDATA || '', 'iatf16949-manager', 'iatf16949.db')
const outPath = getArg('out') || join(process.cwd(), 'resources', 'migrations', '0014_seed_all_forms.sql')

if (!existsSync(dbPath)) { console.error('DB missing:', dbPath); process.exit(1) }

const SQL = await initSqlJs()
const db = new SQL.Database(readFileSync(dbPath))

function rows(sql) {
  const res = db.exec(sql)
  if (!res.length) return []
  const { columns, values } = res[0]
  return values.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])))
}

// SQL 리터럴: NULL/숫자/문자열(작은따옴표 이스케이프)
const lit = (v) => {
  if (v === null || v === undefined) return 'NULL'
  if (typeof v === 'number') return String(v)
  return `'${String(v).replace(/'/g, "''")}'`
}

const FORM_COLS = ['code', 'name', 'reg_code', 'description', 'approvals_json', 'next_form_code', 'next_form_label', 'prev_form_code', 'layout_json']
const PF_COLS = ['process_code', 'form_code', 'sort_order']

const forms = rows(`SELECT ${FORM_COLS.join(',')} FROM forms ORDER BY code`)
const pf = rows(`SELECT ${PF_COLS.join(',')} FROM process_forms ORDER BY process_code, sort_order, form_code`)

const formRowSql = (f) => '  (' + FORM_COLS.map((c) => lit(f[c])).join(', ') + ')'
const pfRowSql = (p) => '  (' + PF_COLS.map((c) => lit(p[c])).join(', ') + ')'

const out = []
out.push('-- ============================================================')
out.push('-- Migration 0014: 전체 양식 시드 (재현성 확보)')
out.push('--')
out.push('-- 자동 생성: scripts/dump-forms-seed.mjs (live DB 덤프)')
out.push('-- 기존 auto-link-forms.mjs 가 live DB에 직접 INSERT 하던 218개 양식과')
out.push('-- process_forms 매핑을 마이그레이션으로 고정한다. INSERT OR IGNORE 이므로')
out.push('-- 0004(4개 양식)/0005(4개 매핑)가 먼저 넣은 행은 그대로 보존된다.')
out.push(`-- forms: ${forms.length}건, process_forms: ${pf.length}건`)
out.push('-- ============================================================')
out.push('')
out.push(`INSERT OR IGNORE INTO forms (${FORM_COLS.join(', ')}) VALUES`)
out.push(forms.map(formRowSql).join(',\n') + ';')
out.push('')
out.push(`INSERT OR IGNORE INTO process_forms (${PF_COLS.join(', ')}) VALUES`)
out.push(pf.map(pfRowSql).join(',\n') + ';')
out.push('')

writeFileSync(outPath, out.join('\n'), 'utf-8')
db.close()

console.log('=== DUMP COMPLETE ===')
console.log(`DB   : ${dbPath}`)
console.log(`OUT  : ${outPath}`)
console.log(`forms: ${forms.length}`)
console.log(`process_forms: ${pf.length}`)
const withLayout = forms.filter((f) => f.layout_json).length
console.log(`forms with layout_json: ${withLayout}`)
const regs = [...new Set(forms.map((f) => f.reg_code))].sort()
console.log(`distinct reg_codes: ${regs.length}`)