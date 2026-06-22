#!/usr/bin/env node
/**
 * verify-migrations.mjs
 *
 * 빈 DB에 resources/migrations/*.sql 를 순서대로 전부 적용해
 * "클린설치 재현" 결과(forms/process_forms 개수, 무결성)를 검증한다.
 * migrate.ts 와 동일하게 파일명 정렬 순서로 exec 한다.
 *
 * 사용: node scripts/verify-migrations.mjs
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import initSqlJs from 'sql.js'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')

const SQL = await initSqlJs()
const db = new SQL.Database()

const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()
console.log('적용 순서:', files.join(', '))
console.log('')

for (const f of files) {
  const sql = readFileSync(join(migDir, f), 'utf-8')
  try {
    db.exec('BEGIN')
    db.exec(sql)
    db.exec('COMMIT')
    console.log(`  OK   ${f}`)
  } catch (err) {
    try { db.exec('ROLLBACK') } catch {}
    console.error(`  FAIL ${f}: ${err.message}`)
    process.exit(1)
  }
}

const one = (sql) => { const r = db.exec(sql); return r.length ? r[0].values[0][0] : null }

console.log('')
console.log('=== 클린설치 재현 결과 ===')
console.log('forms          :', one('SELECT COUNT(*) FROM forms'))
console.log('process_forms  :', one('SELECT COUNT(*) FROM process_forms'))
console.log('form_fields    :', one('SELECT COUNT(*) FROM form_fields'))
console.log('forms w/layout :', one('SELECT COUNT(*) FROM forms WHERE layout_json IS NOT NULL'))
console.log('processes      :', one('SELECT COUNT(*) FROM processes'))
console.log('reg sections   :', one('SELECT COUNT(*) FROM regulation_sections'))
console.log('distinct regs  :', one('SELECT COUNT(DISTINCT reg_code) FROM forms'))
console.log('orphan pf->form:', one('SELECT COUNT(*) FROM process_forms pf LEFT JOIN forms f ON f.code=pf.form_code WHERE f.code IS NULL'))
db.close()
