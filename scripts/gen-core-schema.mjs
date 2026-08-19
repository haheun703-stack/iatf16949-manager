#!/usr/bin/env node
// ============================================================
// scripts/gen-core-schema.mjs — 코어 스키마 스냅샷 생성 (39호 S2, 2026-08-19)
//
// packs.json 의 snapshot 이하 마이그레이션 전부를 임시 DB 에 적용한 뒤 sqlite_master 에서
// 스키마(테이블·가상테이블·인덱스·뷰·트리거)만 뽑아 resources/core/schema.sql 로 쓴다.
// 데이터(INSERT)는 한 줄도 담기지 않는다 — 클린 설치가 이 파일 1개로 스키마를 얻고, 데이터는
// resources/packs/<pack>/ 에서 받는다(0058 이전 혼합 마이그를 파일 단위로 못 가르는 문제의 처분).
//
// 결정성: 헤더에 날짜를 넣지 않는다(재생성 시 diff 0 이 정상). 스냅샷 지점을 옮길 때만 재생성한다.
// 검증: scripts/e2e-clean-install.mjs ⑨ 가 "전체 체인 DB ↔ 스냅샷 DB" sqlite_master 동치를 매번 단언.
//
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\gen-core-schema.mjs [--check]
//   --check : 파일을 쓰지 않고 현재 resources/core/schema.sql 과 동일한지만 판정(exit 1 = 드리프트)
// ============================================================
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const core = require('../server/migrate-core.cjs')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const resourcesDir = join(repo, 'resources')
const migDir = join(resourcesDir, 'migrations')
const outPath = join(resourcesDir, 'core', 'schema.sql')
const checkOnly = process.argv.includes('--check')

const manifest = core.readManifest(migDir)
const problems = core.auditManifest(migDir, manifest)
if (problems.length) {
  console.error('[gen-core-schema] packs.json 감사 실패:\n  ' + problems.join('\n  '))
  process.exit(1)
}

const tmp = mkdtempSync(join(tmpdir(), 'iatf-core-schema-'))
const db = new Database(join(tmp, 'chain.db'))
db.pragma('foreign_keys = ON')
const files = core.listMigrationFiles(migDir).filter((f) => f <= manifest.snapshot)
for (const f of files) {
  const sql = readFileSync(join(migDir, f), 'utf-8')
  db.exec('BEGIN')
  try {
    db.exec(sql)
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    console.error(`[gen-core-schema] 체인 적용 실패 ${f}: ${err.message}`)
    process.exit(1)
  }
}

export function dumpSchema(database) {
  // 가상 테이블의 그림자 테이블(x_data·x_idx·x_docsize·x_config·x_content)은 CREATE VIRTUAL 이 자동 생성 — 제외
  const rows = database
    .prepare("SELECT type, name, tbl_name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY rowid")
    .all()
  const virtual = new Set(rows.filter((r) => /^CREATE VIRTUAL TABLE/i.test(r.sql)).map((r) => r.name))
  const isShadow = (name) => [...virtual].some((v) => name.startsWith(v + '_'))
  const keep = rows.filter(
    (r) => r.name !== '_migrations' && r.name !== 'sqlite_sequence' && !r.name.startsWith('sqlite_') && !isShadow(r.name)
  )
  const order = { table: 0, index: 1, view: 2, trigger: 3 }
  keep.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9)) // 안정 정렬 → 같은 type 은 rowid 순 유지
  return keep
}

const objs = dumpSchema(db)
const counts = objs.reduce((m, r) => ((m[r.type] = (m[r.type] || 0) + 1), m), {})
const header = [
  '-- ============================================================',
  '-- resources/core/schema.sql — 코어 스키마 스냅샷 (자동 생성 · 손편집 금지)',
  `-- 생성기: scripts/gen-core-schema.mjs · 스냅샷 지점: ${manifest.snapshot} (마이그 ${files.length}개 적용 결과)`,
  `-- 내용: ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')} — 데이터 0행(팩이 공급)`,
  '-- 클린 설치 전용: server/migrate-core.cjs 가 빈 DB 에서 1회 실행하고 스냅샷 이하 마이그를 status=snapshot 으로 기록한다.',
  '-- ============================================================',
  ''
].join('\n')
const body = objs.map((r) => r.sql.trim().replace(/;?$/, ';')).join('\n\n') + '\n'
const text = header + body

db.close()
rmSync(tmp, { recursive: true, force: true })

if (checkOnly) {
  const cur = existsSync(outPath) ? readFileSync(outPath, 'utf-8') : ''
  if (cur === text) {
    console.log(`[gen-core-schema] OK — 드리프트 없음 (${objs.length} objects)`)
    process.exit(0)
  }
  console.error('[gen-core-schema] 드리프트 — resources/core/schema.sql 재생성 필요')
  process.exit(1)
}
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, text, 'utf-8')
console.log(`[gen-core-schema] wrote ${outPath} — ${objs.length} objects (${JSON.stringify(counts)})`)
