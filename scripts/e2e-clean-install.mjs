#!/usr/bin/env node
// ============================================================
// scripts/e2e-clean-install.mjs — 판매판(클린 설치) 게이트 (2026-08-18 · S2 개정 2026-08-19)
//
// 목적: "지금 이 제품을 타사에 팔 수 있는가"의 상시 지표.
// 근거: 39호 §3 검증 신설 · 도장 ①②③⑤(8/18) · 40호 ④ 도장 7건(8/19) · 41호 M1(클린 설치 GREEN 8/27).
//
// S2 개정: 두 경로를 같은 실행에서 만든다.
//   A 레거시 경로 = 마이그 전 파일 체인 실행(라이브·복사본이 걸어온 길) — TPC 계열·실명 계수를 **관찰**(베이스라인)
//   B 판매 경로  = server/migrate-core.cjs runAll(allowClean, packs=['standard']) — 스키마 스냅샷 + 표준팩
//   단언은 B 에 건다. A 는 스키마 동치(⑨)의 기준이자 TPC 경로 무변경의 관찰치.
//
// 단언(11건):
//   ① 러너: packs.json 감사 0건 · mode=clean · 스냅샷 대체 = snapshot 이하 파일 수 · 초과분 적용/스킵 합 = 나머지
//   ② PRAGMA foreign_key_check 위반 0건 (B)
//   ③ 시드 소스 파리티 — resources/seed 에 하네스가 모르는 json 이 있으면 FAIL(드리프트 가드)
//   ④ 시드 적용(표준 설치) — clauses > 0(packs/standard/010 이 공급, seed.ts 는 건너뜀) · persons = 0 · teams = 0
//   ⑤ company_profile 시드 키 완전성 (seed.ts profileDefaults 16키)
//   ⑥ TPC 계열 7종(티피씨·TPC·AM사업부·인발·조관·필라넥·쇼바) 매치 행수 0 (B)
//   ⑦ 실명 5인(김권표·서상규·하헌·서규하·장석봉) 매치 행수 0 (B)
//   ⑧ companyName 플로우스루 — 스캔 후 테스트값 주입 → GET 조립 경로 재독 일치
//   ⑨ 스키마 동치 — A(전 체인) ↔ B(스냅샷) sqlite_master 정규화 집합 동일 (스냅샷 드리프트 가드)
//   ⑩ 표준팩 SQ층(S3-1, 8/19 GREEN) — 백본 42·가이드 300+·체크포인트(상태 리셋 0)·팩 정션·APQP·KPI(목표 0)·의무(실명 0)
//   ⑪ 양식 카탈로그·규정 뼈대(S3-2) — ⚠ 의도적 RED: forms 중립판 + ④-5 뼈대 템플릿 전.
//      코워크 소견(8/19) "뼈대 안내문 TPC 0" 은 ⑥ 전 테이블 스캔이 자동 커버(안내문도 행이므로).
//
// 안전: 라이브 무접촉 — %TEMP% mkdtemp 전용, DB 경로를 env/argv 에서 받지 않는다. 서버 비접촉·로그인 없음.
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-clean-install.mjs
// ============================================================
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mkCheck } from './lib/e2e.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const core = require('../server/migrate-core.cjs')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const resourcesDir = join(repo, 'resources')
const migDir = join(resourcesDir, 'migrations')
const seedDir = join(resourcesDir, 'seed')

const { check, done } = mkCheck()
const tmp = mkdtempSync(join(tmpdir(), 'iatf-clean-install-'))

// ── A 레거시 경로: 전 파일 체인 (라이브가 걸어온 길 — 관찰용) ──
const dbA = new Database(join(tmp, 'legacy.db'))
dbA.pragma('foreign_keys = ON')
const migFiles = core.listMigrationFiles(migDir)
let aApplied = 0
let aFail = ''
for (const f of migFiles) {
  const sql = readFileSync(join(migDir, f), 'utf-8')
  try {
    dbA.exec('BEGIN')
    dbA.exec(sql)
    dbA.exec('COMMIT')
    aApplied++
  } catch (err) {
    try { dbA.exec('ROLLBACK') } catch { /* noop */ }
    aFail = `${f}: ${err.message.slice(0, 80)}`
    break
  }
}
if (aFail) console.log(`[A 레거시] 체인 실패 ${aFail}`)

// ── B 판매 경로: 러너 정본으로 클린 설치 ──
const dbB = new Database(join(tmp, 'clean.db'))
dbB.pragma('foreign_keys = ON')
dbB.pragma('journal_mode = WAL')
const manifest = core.readManifest(migDir)
const audit = core.auditManifest(migDir, manifest)
let run = null
let runErr = ''
try {
  run = core.runAll(dbB, { resourcesDir, allowClean: true, packs: ['standard'], log: () => {} })
} catch (err) {
  runErr = err.message.slice(0, 120)
}
const belowSnap = migFiles.filter((f) => f <= manifest.snapshot).length
const aboveSnap = migFiles.length - belowSnap
check(
  `① 러너 클린 설치 (감사 ${audit.length}건 · 스냅샷 대체 ${run ? run.snapshot : '-'}/${belowSnap} · 초과분 적용 ${run ? run.applied.length : '-'}+스킵 ${run ? run.skipped.length : '-'}/${aboveSnap} · 팩 ${run ? run.packFiles.length : '-'}건)`,
  !runErr && audit.length === 0 && run.mode === 'clean' && run.snapshot === belowSnap && run.applied.length + run.skipped.length === aboveSnap,
  runErr || audit.slice(0, 3).join(' · ')
)

// ── ② FK 무결성 (B) ──
const fkBad = dbB.pragma('foreign_key_check')
check('② FK 위반 0건', fkBad.length === 0, fkBad.length ? `${fkBad.length}건` : '')

// ── ③ 시드 소스 파리티 ──
const KNOWN_SEEDS = ['teams.json', 'persons.json', 'iatf16949-clauses.json', 'regulations.json']
const seedFiles = existsSync(seedDir) ? readdirSync(seedDir).filter((f) => f.endsWith('.json')) : []
const unknownSeeds = seedFiles.filter((f) => !KNOWN_SEEDS.includes(f))
check(
  `③ 시드 소스 파리티 (${seedFiles.length}/4 json)`,
  unknownSeeds.length === 0 && seedFiles.length > 0,
  unknownSeeds.length ? `미지의 시드: ${unknownSeeds.join(', ')}` : ''
)

// ── ④ 시드 적용 — seed.ts 재구현(팩 분기 동형): 프로파일 → (tpc 팩일 때만 teams·persons·regulations) → clauses ──
const PROFILE_SEED_KEYS = {
  companyName: '', ceoName: '', address: '', phone: '', fax: '', factoryName: '',
  companyNameEn: '', companyNameShort: '', divisionLabel: '', processes: '', products: '', plant: '',
  revisionNumber: 'REV.8',
  revisionDate: new Date().toISOString().split('T')[0],
  defaultAuthor: '',
  auditDate: '2026-12-31'
}
const packs = core.readInstallPacks(dbB) || []
const tpcPack = packs.includes('tpc')
let seedErr = ''
try {
  const insertProfile = dbB.prepare('INSERT OR IGNORE INTO company_profile (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(PROFILE_SEED_KEYS)) insertProfile.run(k, v)

  const clauseCount = dbB.prepare('SELECT COUNT(*) AS c FROM clauses').get().c
  if (clauseCount === 0) {
    if (tpcPack) {
      const teams = JSON.parse(readFileSync(join(seedDir, 'teams.json'), 'utf-8'))
      const insTeam = dbB.prepare('INSERT INTO teams (id, name, manager_id) VALUES (?, ?, ?)')
      for (const t of teams) insTeam.run(t.id, t.name, t.managerId || null)
      const persons = JSON.parse(readFileSync(join(seedDir, 'persons.json'), 'utf-8'))
      const insPerson = dbB.prepare(
        'INSERT INTO persons (id, name, team_id, role, email, qualifications) VALUES (?, ?, ?, ?, ?, ?)'
      )
      for (const p of persons) insPerson.run(p.id, p.name, p.teamId, p.role, p.email, p.qualifications)
    }
    const clauses = JSON.parse(readFileSync(join(seedDir, 'iatf16949-clauses.json'), 'utf-8'))
    const insClause = dbB.prepare(
      'INSERT INTO clauses (id, title, description, parent_id, depth, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const insDoc = dbB.prepare(
      'INSERT INTO documents (id, clause_id, name, type, current_version, retention_days) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const c of clauses) {
      insClause.run(c.id, c.title, c.description, c.parentId, c.depth, c.sortOrder, c.category)
      if (c.forms) {
        for (let i = 0; i < c.forms.length; i++) {
          insDoc.run(`doc-${c.id}-${String(i + 1).padStart(2, '0')}`, c.id, c.forms[i], 'form', '1.0', 1095)
        }
      }
    }
    const regPath = join(seedDir, 'regulations.json')
    if (tpcPack && existsSync(regPath)) {
      const regs = JSON.parse(readFileSync(regPath, 'utf-8'))
      const insReg = dbB.prepare(
        'INSERT INTO documents (id, clause_id, name, type, current_version, retention_days, team_id, doc_code, revision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      )
      for (const r of regs) {
        insReg.run(`reg-${r.docCode.toLowerCase()}`, r.clauseId, r.name, r.type, r.revision, 1095, r.teamId, r.docCode, r.revision)
      }
    }
  }
} catch (err) {
  seedErr = err.message.slice(0, 100)
}
const cntB = (t) => {
  try { return dbB.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c } catch { return -1 }
}
const nTeams = cntB('teams')
const nPersons = cntB('persons')
const nClauses = cntB('clauses')
check(
  `④ 시드 적용·표준 설치 (packs=${packs.join(',') || '-'} · clauses ${nClauses} · persons ${nPersons} · teams ${nTeams})`,
  !seedErr && nClauses > 0 && !tpcPack && nPersons === 0 && nTeams === 0,
  seedErr
)

// ── ⑤ company_profile 시드 키 완전성 ──
const missingKeys = Object.keys(PROFILE_SEED_KEYS).filter(
  (k) => dbB.prepare('SELECT 1 FROM company_profile WHERE key = ?').get(k) === undefined
)
check(
  `⑤ 프로파일 키 완전성 (${Object.keys(PROFILE_SEED_KEYS).length - missingKeys.length}/${Object.keys(PROFILE_SEED_KEYS).length})`,
  missingKeys.length === 0,
  missingKeys.join(', ')
)

// ── ⑥⑦ 전 테이블 텍스트 스캔 (B 단언 · A 관찰) ──
const TPC_PATTERNS = ['티피씨', 'TPC', 'AM사업부', '인발', '조관', '필라넥', '쇼바']
const NAME_PATTERNS = ['김권표', '서상규', '하헌', '서규하', '장석봉']
function userTables(db) {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'")
    .all()
    .map((r) => r.name)
    .filter((n) => n !== '_migrations')
    .filter((n) => !/_fts$/.test(n) && !/_fts_(data|idx|docsize|config|content)$/.test(n))
}
function scanPattern(db, pattern) {
  let total = 0
  const byTable = []
  for (const t of userTables(db)) {
    const cols = db.prepare(`PRAGMA table_info("${t}")`).all().filter((c) => !/BLOB/i.test(c.type || '')).map((c) => c.name)
    if (cols.length === 0) continue
    const where = cols.map((c) => `"${c}" LIKE '%' || ? || '%'`).join(' OR ')
    try {
      const n = db.prepare(`SELECT COUNT(*) AS c FROM "${t}" WHERE ${where}`).get(...cols.map(() => pattern)).c
      if (n > 0) { total += n; byTable.push([t, n]) }
    } catch { /* 가상 테이블 등 */ }
  }
  byTable.sort((a, b) => b[1] - a[1])
  return { total, byTable }
}
function scanGroup(db, label, patterns, verbose) {
  let groupTotal = 0
  const lines = []
  for (const p of patterns) {
    const { total, byTable } = scanPattern(db, p)
    groupTotal += total
    if (total > 0) lines.push(`  · ${p}: ${total}행 — 상위: ${byTable.slice(0, 3).map(([t, n]) => `${t}(${n})`).join(', ')}`)
  }
  if (verbose && lines.length) console.log(`[${label} 상세]\n${lines.join('\n')}`)
  return groupTotal
}
const aTpc = aFail ? -1 : scanGroup(dbA, 'A·TPC', TPC_PATTERNS, false)
const aName = aFail ? -1 : scanGroup(dbA, 'A·실명', NAME_PATTERNS, false)
console.log(`[A 레거시 경로 관찰] 체인 ${aApplied}/${migFiles.length} · TPC 계열 ${aTpc}행 · 실명 ${aName}행 (8/18 베이스라인 478·124 — TPC 경로 무변경 확인용)`)
const tpcTotal = scanGroup(dbB, 'B·TPC 계열', TPC_PATTERNS, true)
const nameTotal = scanGroup(dbB, 'B·실명', NAME_PATTERNS, true)
check('⑥ TPC 계열(티피씨|TPC|AM사업부|인발|조관|필라넥|쇼바) 0건 [판매 경로]', tpcTotal === 0, tpcTotal ? `실제 ${tpcTotal}행` : '')
check('⑦ 실명(김권표|서상규|하헌|서규하|장석봉) 0건 [판매 경로]', nameTotal === 0, nameTotal ? `실제 ${nameTotal}행` : '')

// ── ⑧ companyName 플로우스루 ──
const TEST_NAME = '주식회사 테스트정밀'
dbB.prepare("INSERT INTO company_profile (key, value) VALUES ('companyName', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(TEST_NAME)
const readBack = (() => {
  const rows = dbB.prepare('SELECT key, value FROM company_profile').all()
  return new Map(rows.map((r) => [r.key, r.value])).get('companyName') || ''
})()
check('⑧ companyName 플로우스루', readBack === TEST_NAME && !/TPC|티피씨/.test(readBack), `읽음: ${readBack}`)

// ── ⑨ 스키마 동치 A ↔ B (스냅샷 드리프트 가드) ──
function schemaSet(db) {
  const rows = db.prepare("SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL").all()
  const virtual = new Set(rows.filter((r) => /^CREATE VIRTUAL TABLE/i.test(r.sql)).map((r) => r.name))
  return new Set(
    rows
      .filter((r) => r.name !== '_migrations' && r.name !== 'sqlite_sequence' && !r.name.startsWith('sqlite_'))
      .filter((r) => ![...virtual].some((v) => r.name.startsWith(v + '_')))
      .map((r) => `${r.type}|${r.name}|${r.sql.replace(/\s+/g, ' ').trim()}`)
  )
}
let onlyA = [], onlyB = []
if (!aFail && run) {
  const sa = schemaSet(dbA)
  const sb = schemaSet(dbB)
  onlyA = [...sa].filter((x) => !sb.has(x))
  onlyB = [...sb].filter((x) => !sa.has(x))
}
check(
  `⑨ 스키마 동치 A↔B (A ${aFail ? '-' : schemaSet(dbA).size} · B ${run ? schemaSet(dbB).size : '-'} objects)`,
  !aFail && !!run && onlyA.length === 0 && onlyB.length === 0,
  onlyA.length + onlyB.length ? `A만 ${onlyA.length}·B만 ${onlyB.length}: ${[...onlyA, ...onlyB].slice(0, 2).map((s) => s.split('|').slice(0, 2).join(':')).join(', ')}` : ''
)

// ── ⑩ 표준팩 SQ층 (S3-1, 8/19 GREEN) — 백본·가이드층·팩 정션·APQP·KPI·의무 + 상태 리셋 계약 ──
const std = {
  sq_items: cntB('sq_items'), sq_guides: cntB('sq_guides'), sq_checkpoints: cntB('sq_checkpoints'),
  pack_forms: cntB('pack_forms'), apqp_elements: cntB('apqp_elements'),
  kpi_indicators: cntB('kpi_indicators'), recurring_obligations: cntB('recurring_obligations')
}
const oblAssignee = (() => { try { return dbB.prepare('SELECT COUNT(*) AS c FROM recurring_obligations WHERE assignee IS NOT NULL').get().c } catch { return -1 } })()
const cpState = (() => { try { return dbB.prepare("SELECT COUNT(*) AS c FROM sq_checkpoints WHERE evidence_note IS NOT NULL OR updated_by IS NOT NULL OR status <> 'missing'").get().c } catch { return -1 } })()
const kpiTargets = (() => { try { return dbB.prepare('SELECT COUNT(*) AS c FROM kpi_indicators WHERE target IS NOT NULL').get().c } catch { return -1 } })()
const sqLayerOk =
  std.sq_items >= 42 && std.sq_guides >= 300 && std.sq_checkpoints >= 100 && cpState === 0 &&
  std.pack_forms > 0 && std.apqp_elements >= 40 && std.kpi_indicators >= 30 && kpiTargets === 0 &&
  std.recurring_obligations >= 40 && oblAssignee === 0
check(
  `⑩ 표준팩 SQ층 (sq_items ${std.sq_items} · guides ${std.sq_guides} · cp ${std.sq_checkpoints}/상태 ${cpState} · pack_forms ${std.pack_forms} · apqp ${std.apqp_elements} · kpi ${std.kpi_indicators}/목표 ${kpiTargets} · 의무 ${std.recurring_obligations}/실명 ${oblAssignee})`,
  sqLayerOk,
  sqLayerOk ? '' : 'S3-1(gen-pack-standard.mjs) 미실행 또는 상태 리셋 계약 위반'
)

// ── ⑪ 양식 카탈로그·규정 뼈대 (S3-2 = 의도적 RED) — ④-1 코드 채택·④-2 xlsx 42종·④-5 뼈대 템플릿 ──
const nForms = cntB('forms')
const nRegSk = cntB('regulation_sections')
check(
  `⑪ 양식 카탈로그·규정 뼈대 (forms ${nForms} · reg_sections ${nRegSk})`,
  nForms > 250 && nRegSk > 0,
  nForms > 250 && nRegSk > 0 ? '' : 'S3-2 전(양식 카탈로그 중립판 + ④-5 뼈대 템플릿 — 안내문도 ⑥ 전 테이블 스캔에 자동 포함)'
)

// ── 판정·정리 ──
const sqOk = std.sq_items >= 42 && std.pack_forms > 0 && std.kpi_indicators >= 30 && std.recurring_obligations >= 40
const sellable = tpcTotal === 0 && nameTotal === 0 && sqOk && nForms > 250 && nRegSk > 0
console.log(`\n판매 가능 여부: ${sellable ? 'YES' : `NO — TPC ${tpcTotal}행 · 실명 ${nameTotal}행 · SQ층 ${sqOk ? 'GREEN' : 'RED(S3-1)'} · 양식/뼈대 ${nForms > 250 && nRegSk > 0 ? 'GREEN' : 'RED(S3-2)'}`}`)
dbA.close()
dbB.close()
rmSync(tmp, { recursive: true, force: true })
done()
