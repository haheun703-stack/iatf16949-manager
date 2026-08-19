// ============================================================
// server/migrate-core.cjs — 마이그레이션 러너 정본 (39호 S2, 2026-08-19)
//
// 한 곳에서 세 소비자를 먹인다: server/index.cjs(웹 서버) · src/main/database/migrate.ts(일렉트론)
// · scripts/e2e-clean-install.mjs(판매판 게이트). 순수 CJS — electron/better-sqlite3 import 없음
// (db 인스턴스는 호출자가 넘긴다).
//
// 두 경로:
//  ① 레거시(적용 이력 있음 = 라이브·복사본·기존 설치): 종전과 동일 — 미적용 파일을 번호순 적용.
//     단 packs.json 의 kind 로 tpc/standard 데이터 마이그를 설치 팩에 따라 적용/스킵.
//  ② 클린 설치(적용 이력 0 + 빈 스키마): resources/core/schema.sql(스키마 스냅샷) 1회 실행 →
//     snapshot 이하 파일 전부를 status='snapshot' 으로 기록 → snapshot 초과 파일 팩 필터 적용
//     → resources/packs/<pack>/*.sql 팩 데이터 적용. 39호 "과거 마이그 무변경 + 신규 설치 경로 분기".
//
// 설치 정체성 = app_config 'install.packs' (CSV: standard·tpc·iatf …). 없으면
//   레거시 = 'standard,tpc'(기존 DB 는 전부 TPC 설치 — 0145 가 영속화), 클린 = 호출자 지정(기본 standard).
//
// fail-closed(M-7): packs.json 미등재 파일·snapshot 초과 mixed·스냅샷 파일 부재·빈 DB 에 allowClean 미지정
//   = 예외 → 호출자가 기동 중단한다. 조용한 fail-open 금지.
// ============================================================
'use strict'
const fs = require('fs')
const path = require('path')

const LEGACY_DEFAULT_PACKS = ['standard', 'tpc']
const CLEAN_DEFAULT_PACKS = ['standard']
const KINDS = new Set(['core', 'standard', 'tpc', 'mixed', 'iatf'])

function readManifest(migrationsDir) {
  const p = path.join(migrationsDir, 'packs.json')
  if (!fs.existsSync(p)) throw new Error(`packs.json 없음: ${p}`)
  const m = JSON.parse(fs.readFileSync(p, 'utf-8'))
  if (!m || typeof m.snapshot !== 'string' || !m.files) throw new Error('packs.json 형식 오류(snapshot/files)')
  return m
}

function listMigrationFiles(migrationsDir) {
  return fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
}

// 매니페스트 감사 — 하네스·러너 공용. 위반 목록을 돌려준다(빈 배열 = 정상).
function auditManifest(migrationsDir, manifest) {
  const files = listMigrationFiles(migrationsDir)
  const problems = []
  for (const f of files) {
    const k = manifest.files[f]
    if (!k) problems.push(`미등재: ${f}`)
    else if (!KINDS.has(k)) problems.push(`알 수 없는 kind(${k}): ${f}`)
    else if (k === 'mixed' && f > manifest.snapshot) problems.push(`snapshot 초과 mixed 금지: ${f}`)
  }
  for (const f of Object.keys(manifest.files)) {
    if (!files.includes(f)) problems.push(`실체 없는 등재: ${f}`)
  }
  if (!files.includes(manifest.snapshot)) problems.push(`snapshot 파일 부재: ${manifest.snapshot}`)
  return problems
}

function ensureMigrationsTable(db) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS _migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, applied_at TEXT DEFAULT (datetime('now')))"
  )
  const cols = db.prepare('PRAGMA table_info(_migrations)').all().map((c) => c.name)
  if (!cols.includes('status')) {
    // applied(실행) · snapshot(스냅샷으로 대체) · skipped(설치 팩 밖이라 건너뜀)
    db.exec("ALTER TABLE _migrations ADD COLUMN status TEXT NOT NULL DEFAULT 'applied'")
  }
}

function isEmptySchema(db) {
  const n = db
    .prepare(
      "SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name NOT IN ('_migrations','sqlite_sequence')"
    )
    .get().c
  return n === 0
}

function hasAppConfig(db) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='app_config'").get()
}

function readInstallPacks(db) {
  if (!hasAppConfig(db)) return null
  const row = db.prepare("SELECT value FROM app_config WHERE key='install.packs'").get()
  if (!row || !row.value) return null
  return String(row.value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function writeInstallPacks(db, packs) {
  if (!hasAppConfig(db)) throw new Error('app_config 테이블 없음 — 스키마 스냅샷이 불완전')
  db.prepare('INSERT OR REPLACE INTO app_config (key, value) VALUES (?, ?)').run('install.packs', packs.join(','))
}

function parsePacksEnv(v) {
  if (!v) return null
  const a = String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return a.length ? a : null
}

// 파일 kind 와 설치 팩으로 적용 여부 결정
function shouldApply(kind, packs) {
  if (kind === 'core' || kind === 'mixed') return true
  return packs.includes(kind)
}

/**
 * runAll(db, opts)
 *  db            better-sqlite3 인스턴스(R/W)
 *  resourcesDir  migrations/·core/·packs/ 를 담은 폴더(dev = repo/resources, 패키지 = process.resourcesPath)
 *  allowClean    빈 DB 를 만나면 클린 설치를 수행(false 면 예외 — 실수로 빈 DB 를 만든 경우 보호)
 *  packs         설치 팩 지정(문자열 배열). 미지정 = DB 의 install.packs → 없으면 경로별 기본값
 *  log           로그 함수(기본 console.log)
 * 반환: { mode: 'legacy'|'clean', packs, applied: [..], skipped: [..], snapshot: n, packFiles: [..] }
 */
function runAll(db, opts) {
  const { resourcesDir, allowClean = false, log = console.log } = opts || {}
  if (!resourcesDir) throw new Error('resourcesDir 필요')
  const migrationsDir = path.join(resourcesDir, 'migrations')
  if (!fs.existsSync(migrationsDir)) throw new Error(`migrations 폴더 없음: ${migrationsDir}`)

  const manifest = readManifest(migrationsDir)
  const problems = auditManifest(migrationsDir, manifest)
  if (problems.length) throw new Error(`packs.json 감사 실패: ${problems.slice(0, 5).join(' · ')}`)

  ensureMigrationsTable(db)
  const appliedCount = db.prepare('SELECT COUNT(*) AS c FROM _migrations').get().c
  const files = listMigrationFiles(migrationsDir)
  const has = db.prepare('SELECT 1 FROM _migrations WHERE name = ?')
  const ins = db.prepare('INSERT INTO _migrations (name, status) VALUES (?, ?)')

  const result = { mode: 'legacy', packs: [], applied: [], skipped: [], snapshot: 0, packFiles: [] }

  // ── 클린 설치 분기 ──
  if (appliedCount === 0 && isEmptySchema(db)) {
    if (!allowClean) {
      throw new Error('빈 DB(적용 이력 0·테이블 0) — 클린 설치가 허용되지 않았습니다(IATF_INIT_DB=1 로 명시).')
    }
    result.mode = 'clean'
    const schemaPath = path.join(resourcesDir, 'core', 'schema.sql')
    if (!fs.existsSync(schemaPath)) throw new Error(`스키마 스냅샷 없음: ${schemaPath} (scripts/gen-core-schema.mjs)`)
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
    // 코어 부트스트랩 데이터(회사 프로파일 빈 키 등 — 전 설치 공통·실명 0). 없으면 스키마만.
    const bootstrapPath = path.join(resourcesDir, 'core', 'bootstrap.sql')
    const bootstrapSql = fs.existsSync(bootstrapPath) ? fs.readFileSync(bootstrapPath, 'utf-8') : ''
    const packs = (opts && opts.packs) || CLEAN_DEFAULT_PACKS
    const tx = db.transaction(() => {
      db.exec(schemaSql)
      if (bootstrapSql) db.exec(bootstrapSql)
      for (const f of files) {
        if (f <= manifest.snapshot) {
          ins.run(f, 'snapshot')
          result.snapshot++
        }
      }
      writeInstallPacks(db, packs)
    })
    tx()
    result.packs = packs
    log(`[migrate] 클린 설치: 스키마 스냅샷 적용(${path.basename(schemaPath)}${bootstrapSql ? '+bootstrap.sql' : ''}) · 스냅샷 대체 ${result.snapshot}건 · packs=${packs.join(',')}`)
  } else {
    const fromDb = readInstallPacks(db)
    result.packs = (opts && opts.packs) || fromDb || LEGACY_DEFAULT_PACKS
  }
  const packs = result.packs

  // ── 마이그 파일 순차 적용(팩 필터) ──
  for (const f of files) {
    if (has.get(f)) continue
    const kind = manifest.files[f]
    if (!shouldApply(kind, packs)) {
      ins.run(f, 'skipped')
      result.skipped.push(f)
      log(`[migrate] skip (pack ${kind} ∉ ${packs.join(',')}): ${f}`)
      continue
    }
    const sqlText = fs.readFileSync(path.join(migrationsDir, f), 'utf-8')
    const tx = db.transaction(() => {
      db.exec(sqlText)
      ins.run(f, 'applied')
    })
    tx()
    result.applied.push(f)
    log(`[migrate] applied: ${f}`)
  }

  // ── 팩 데이터(resources/packs/<pack>/*.sql) — 스키마 완성 뒤, 팩 지정 순서대로 ──
  const packsDir = path.join(resourcesDir, 'packs')
  for (const pack of packs) {
    const dir = path.join(packsDir, pack)
    if (!fs.existsSync(dir)) continue
    const pfiles = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort()
    for (const pf of pfiles) {
      const name = `packs/${pack}/${pf}`
      if (has.get(name)) continue
      const sqlText = fs.readFileSync(path.join(dir, pf), 'utf-8')
      const tx = db.transaction(() => {
        db.exec(sqlText)
        ins.run(name, 'applied')
      })
      tx()
      result.packFiles.push(name)
      log(`[migrate] pack applied: ${name}`)
    }
  }

  return result
}

// 적용 대기 파일 존재 여부(스냅샷 백업 판단용 — 일렉트론 migrate.ts)
function hasPending(db, resourcesDir) {
  const migrationsDir = path.join(resourcesDir, 'migrations')
  if (!fs.existsSync(migrationsDir)) return false
  ensureMigrationsTable(db)
  const has = db.prepare('SELECT 1 FROM _migrations WHERE name = ?')
  return listMigrationFiles(migrationsDir).some((f) => !has.get(f))
}

module.exports = {
  LEGACY_DEFAULT_PACKS,
  CLEAN_DEFAULT_PACKS,
  readManifest,
  auditManifest,
  listMigrationFiles,
  ensureMigrationsTable,
  isEmptySchema,
  readInstallPacks,
  writeInstallPacks,
  parsePacksEnv,
  shouldApply,
  hasPending,
  runAll
}
