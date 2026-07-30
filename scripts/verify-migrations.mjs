#!/usr/bin/env node
/**
 * verify-migrations.mjs
 *
 * 빈 DB에 resources/migrations/*.sql 를 순서대로 전부 적용해
 * "클린설치 재현" 결과(forms/process_forms 개수, 무결성)를 검증한다.
 * migrate.ts 와 동일하게 파일명 정렬 순서로, 파일당 트랜잭션으로 exec 한다.
 *
 * ⚠️2026-07-30 검수 반영 — 엔진·조건을 앱과 일치시켰다(종전 결함 2건):
 *   ① sql.js → **better-sqlite3**: sql.js 는 fts5 미탑재라 0038 에서 멈춰 체인 전수 검증이
 *      애초에 성립하지 않았고, 앱과 다른 엔진이라 "클린설치 재현"이라는 이름값도 못 했다.
 *   ② **PRAGMA foreign_keys=ON**: 앱(connection.ts)과 동일 조건. 종전엔 FK OFF 라
 *      완전 신규 DB 에서 앱을 죽이는 FK 위반(0046/0048/0055 = 검수 C-6)을 통과시켰다.
 *
 * better-sqlite3 는 Electron ABI 로 빌드돼 시스템 node 로 열 수 없다 → electron-node 로 실행:
 *   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe scripts/verify-migrations.mjs
 * 옵션: --seed  (teams/persons/clauses 를 먼저 채워 "시드 후 재적용" 경로도 검증)
 */
import { readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')
const WITH_SEED = process.argv.includes('--seed')

const tmp = mkdtempSync(join(tmpdir(), 'iatf-verify-mig-'))
const dbPath = join(tmp, 'verify.db')
const db = new Database(dbPath)
db.pragma('foreign_keys = ON') // 앱과 동일 — FK 위반을 여기서 잡는다
db.pragma('journal_mode = WAL')

const files = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()
console.log(`대상 마이그: ${files.length}개 (${files[0]} … ${files[files.length - 1]})`)
console.log(`FK 집행: ${db.pragma('foreign_keys', { simple: true }) === 1 ? 'ON' : 'OFF'} · 시드 선주입: ${WITH_SEED ? 'YES' : 'NO'}`)
console.log('')

// --seed: 마이그 이전에 부모 테이블을 채우는 경로(현 앱은 마이그 → seedDatabase 순서라 NO 가 실제 경로).
// 스키마가 아직 없으므로 0001 적용 후에 주입한다.
let seeded = false
function seedParents() {
  if (seeded || !WITH_SEED) return
  try {
    db.exec(`
      INSERT OR IGNORE INTO teams (id, name) VALUES
        ('team-mg','경영'),('team-de','개발'),('team-pr','생산'),('team-qc','품질'),('team-sa','영업');
      INSERT OR IGNORE INTO clauses (id, title) VALUES
        ('7.1.5','측정자원'),('7.1.5.1.1','MSA'),('8.2.1','고객소통'),('8.2.3','요구사항검토'),
        ('8.3.2','설계기획'),('8.3.3','설계입력'),('8.3.3.3','특별특성'),('8.3.4','설계관리'),
        ('8.3.4.4','제품승인'),('8.3.5','설계출력'),('8.3.6','설계변경'),('8.5.1','관리계획'),
        ('8.6','제품출시'),('8.6.2','치수검사'),('8.6.3','외관승인'),('9.1.1','모니터링');
    `)
    seeded = true
  } catch (e) {
    console.log(`  (시드 선주입 보류: ${e.message.slice(0, 60)})`)
  }
}

let failed = null
for (const f of files) {
  const sql = readFileSync(join(migDir, f), 'utf-8')
  try {
    db.exec('BEGIN')
    db.exec(sql)
    db.exec('COMMIT')
    if (f.startsWith('0001')) seedParents()
  } catch (err) {
    try { db.exec('ROLLBACK') } catch { /* noop */ }
    console.error(`  FAIL ${f}: ${err.message}`)
    failed = f
    break
  }
}
if (!failed) console.log(`  OK   전 ${files.length}개 적용 성공`)

const one = (sql) => {
  try { return db.prepare(sql).pluck().get() } catch (e) { return `(${e.message.slice(0, 40)})` }
}

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

// FK 무결성 전수(앱 기동 시 죽는 유형을 여기서 최종 확인)
const fkBad = db.pragma('foreign_key_check')
console.log('FK 위반        :', fkBad.length === 0 ? '0건' : `${fkBad.length}건 → ${JSON.stringify(fkBad.slice(0, 3))}`)

db.close()
rmSync(tmp, { recursive: true, force: true })
if (failed || fkBad.length) {
  console.error(`\n❌ 검증 실패 (${failed ? `중단 파일 ${failed}` : 'FK 위반 잔존'})`)
  process.exit(1)
}
console.log('\n✅ 클린설치 재현 통과 (전 마이그 적용 · FK 위반 0)')
