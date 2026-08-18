#!/usr/bin/env node
// ============================================================
// scripts/e2e-clean-install.mjs — 판매판(클린 설치) 게이트 (2026-08-18)
//
// 목적: "지금 이 제품을 타사에 팔 수 있는가"의 상시 지표.
// 근거: 39호(제품/고객사팩 경계 전수조사) §3 검증 신설 — 도장 ①②③⑤(8/18,
//       dailyq-39호도장+M9종결_코워크_260818.md). 코워크 권고에 따라 단언 목록에
//       TPC 계열 7종 식별자 + 실명 5인을 명시.
//
// ⚠ 의도적 RED: 현행 클린 설치는 TPC판이다(마이그레이션·시드에 TPC 문자열·실명 다량).
//    ⑥⑦ 이 GREEN 이 되는 날 = 판매판 성립 — S2([TPC팩 후보] 태그 스킵)·S3(표준팩) 이후.
//
// 단언(8건):
//   ① 마이그레이션 전수 적용 (파일 수 = 적용 수, migrate.ts 계약 동일)
//   ② PRAGMA foreign_key_check 위반 0건 (앱과 동일 FK ON)
//   ③ 시드 소스 파리티 — resources/seed 에 하네스가 모르는 json 이 있으면 FAIL(드리프트 가드)
//   ④ 시드 적용 — 설치 직후 기초 데이터(teams·persons·clauses) 존재
//   ⑤ company_profile 시드 키 완전성 (seed.ts profileDefaults 16키)
//   ⑥ TPC 계열 7종(티피씨·TPC·AM사업부·인발·조관·필라넥·쇼바) 매치 행수 0
//   ⑦ 실명 5인(김권표·서상규·하헌·서규하·장석봉) 매치 행수 0
//   ⑧ companyName 플로우스루 — 스캔 후 테스트값 주입 → GET 조립 경로 재독 일치
//
// 지표 정의: ⑥⑦ 은 "패턴×테이블 매치 행수 합"(39호 §1 의 '발생 수'와 단위가 다름 —
//   첫 실행값이 베이스라인). '하헌'(2자)·'인발'(일반어) 오탐 가능 — 테이블별 상세로 사람 감사.
//
// 안전: 라이브 무접촉 — %TEMP% mkdtemp 전용, DB 경로를 env/argv 에서 받지 않는다
//   (verify-migrations.mjs 모형 — 구조적으로 라이브 접촉 불가). 서버 비접촉·로그인 없음.
//   README-e2e §0 의 IATF_DATA_DIR/E2E_DB 불필요.
//
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\e2e-clean-install.mjs
//   (better-sqlite3 = Electron ABI — 시스템 node 금지 · sql.js 금지(fts5 미탑재, 0038 중단))
// ============================================================
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { mkCheck } from './lib/e2e.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')
const seedDir = join(repo, 'resources', 'seed')

const { check, done } = mkCheck()

const tmp = mkdtempSync(join(tmpdir(), 'iatf-clean-install-'))
const db = new Database(join(tmp, 'clean.db'))
db.pragma('foreign_keys = ON') // connection.ts 와 동일 조건
db.pragma('journal_mode = WAL')

// ── ① 마이그레이션 전수 적용 (verify-migrations.mjs 루프 = migrate.ts 계약) ──
const migFiles = readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort()
let applied = 0
let migFail = ''
for (const f of migFiles) {
  const sql = readFileSync(join(migDir, f), 'utf-8')
  try {
    db.exec('BEGIN')
    db.exec(sql)
    db.exec('COMMIT')
    applied++
  } catch (err) {
    try { db.exec('ROLLBACK') } catch { /* noop */ }
    migFail = `${f}: ${err.message.slice(0, 80)}`
    break
  }
}
check(`① 마이그 전수 적용 (${applied}/${migFiles.length})`, applied === migFiles.length, migFail)

// ── ② FK 무결성 ──
const fkBad = db.pragma('foreign_key_check')
check('② FK 위반 0건', fkBad.length === 0, fkBad.length ? `${fkBad.length}건` : '')

// ── ③ 시드 소스 파리티 (seed.ts 가 읽는 4종 외 파일 발견 = 재구현 드리프트) ──
const KNOWN_SEEDS = ['teams.json', 'persons.json', 'iatf16949-clauses.json', 'regulations.json']
const seedFiles = existsSync(seedDir) ? readdirSync(seedDir).filter((f) => f.endsWith('.json')) : []
const unknownSeeds = seedFiles.filter((f) => !KNOWN_SEEDS.includes(f))
check(
  `③ 시드 소스 파리티 (${seedFiles.length}/4 json)`,
  unknownSeeds.length === 0 && seedFiles.length > 0,
  unknownSeeds.length ? `미지의 시드: ${unknownSeeds.join(', ')}` : ''
)

// ── ④ 시드 적용 — seed.ts(42-167) 순서 재구현: 프로파일 → teams → persons → clauses → regulations ──
// seed.ts 와 동일하게 clauses 가 이미 있으면 본시드는 건너뛴다(마이그가 채운 경우).
const PROFILE_SEED_KEYS = {
  companyName: '', ceoName: '', address: '', phone: '', fax: '', factoryName: '',
  companyNameEn: '', companyNameShort: '', divisionLabel: '', processes: '', products: '', plant: '',
  revisionNumber: 'REV.8',
  revisionDate: new Date().toISOString().split('T')[0],
  defaultAuthor: '',
  auditDate: '2026-12-31'
}
let seedErr = ''
try {
  const insertProfile = db.prepare('INSERT OR IGNORE INTO company_profile (key, value) VALUES (?, ?)')
  for (const [k, v] of Object.entries(PROFILE_SEED_KEYS)) insertProfile.run(k, v)

  const clauseCount = db.prepare('SELECT COUNT(*) AS c FROM clauses').get().c
  if (clauseCount === 0) {
    const teams = JSON.parse(readFileSync(join(seedDir, 'teams.json'), 'utf-8'))
    const insTeam = db.prepare('INSERT INTO teams (id, name, manager_id) VALUES (?, ?, ?)')
    for (const t of teams) insTeam.run(t.id, t.name, t.managerId || null)

    const persons = JSON.parse(readFileSync(join(seedDir, 'persons.json'), 'utf-8'))
    const insPerson = db.prepare(
      'INSERT INTO persons (id, name, team_id, role, email, qualifications) VALUES (?, ?, ?, ?, ?, ?)'
    )
    for (const p of persons) insPerson.run(p.id, p.name, p.teamId, p.role, p.email, p.qualifications)

    const clauses = JSON.parse(readFileSync(join(seedDir, 'iatf16949-clauses.json'), 'utf-8'))
    const insClause = db.prepare(
      'INSERT INTO clauses (id, title, description, parent_id, depth, sort_order, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const insDoc = db.prepare(
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
    if (existsSync(regPath)) {
      const regs = JSON.parse(readFileSync(regPath, 'utf-8'))
      const insReg = db.prepare(
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
const cnt = (t) => {
  try { return db.prepare(`SELECT COUNT(*) AS c FROM "${t}"`).get().c } catch { return -1 }
}
const nTeams = cnt('teams')
const nPersons = cnt('persons')
const nClauses = cnt('clauses')
check(
  `④ 시드 적용 (teams ${nTeams} · persons ${nPersons} · clauses ${nClauses})`,
  !seedErr && nTeams > 0 && nPersons > 0 && nClauses > 0,
  seedErr
)

// ── ⑤ company_profile 시드 키 완전성 ──
const missingKeys = Object.keys(PROFILE_SEED_KEYS).filter(
  (k) => db.prepare('SELECT 1 FROM company_profile WHERE key = ?').get(k) === undefined
)
check(
  `⑤ 프로파일 키 완전성 (${Object.keys(PROFILE_SEED_KEYS).length - missingKeys.length}/${Object.keys(PROFILE_SEED_KEYS).length})`,
  missingKeys.length === 0,
  missingKeys.join(', ')
)

// ── ⑥⑦ 전 테이블 텍스트 스캔 ──
// 제외: sqlite 내부·_migrations(파일명은 데이터 아님)·FTS 가상/그림자(BLOB — kb 본문은 kb_chunks 로 커버).
const TPC_PATTERNS = ['티피씨', 'TPC', 'AM사업부', '인발', '조관', '필라넥', '쇼바']
const NAME_PATTERNS = ['김권표', '서상규', '하헌', '서규하', '장석봉']
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'")
  .all()
  .map((r) => r.name)
  .filter((n) => n !== '_migrations')
  .filter((n) => !/_fts$/.test(n) && !/_fts_(data|idx|docsize|config|content)$/.test(n))

function scanPattern(pattern) {
  let total = 0
  const byTable = []
  for (const t of tables) {
    const cols = db
      .prepare(`PRAGMA table_info("${t}")`)
      .all()
      .filter((c) => !/BLOB/i.test(c.type || ''))
      .map((c) => c.name)
    if (cols.length === 0) continue
    const where = cols.map((c) => `"${c}" LIKE '%' || ? || '%'`).join(' OR ')
    try {
      const n = db.prepare(`SELECT COUNT(*) AS c FROM "${t}" WHERE ${where}`).get(...cols.map(() => pattern)).c
      if (n > 0) {
        total += n
        byTable.push([t, n])
      }
    } catch {
      /* 가상 테이블 등 조회 불가 — 스킵 */
    }
  }
  byTable.sort((a, b) => b[1] - a[1])
  return { total, byTable }
}

function scanGroup(label, patterns) {
  let groupTotal = 0
  const lines = []
  for (const p of patterns) {
    const { total, byTable } = scanPattern(p)
    groupTotal += total
    if (total > 0) {
      const top = byTable.slice(0, 3).map(([t, n]) => `${t}(${n})`).join(', ')
      lines.push(`  · ${p}: ${total}행 — 상위: ${top}`)
    }
  }
  if (lines.length) console.log(`[${label} 상세]\n${lines.join('\n')}`)
  return groupTotal
}

const tpcTotal = scanGroup('TPC 계열', TPC_PATTERNS)
const nameTotal = scanGroup('실명', NAME_PATTERNS)
check('⑥ TPC 계열(티피씨|TPC|AM사업부|인발|조관|필라넥|쇼바) 0건', tpcTotal === 0, tpcTotal ? `실제 ${tpcTotal}행` : '')
check('⑦ 실명(김권표|서상규|하헌|서규하|장석봉) 0건', nameTotal === 0, nameTotal ? `실제 ${nameTotal}행` : '')

// ── ⑧ companyName 플로우스루 (스캔 뒤 — 테스트값이 계수를 오염하지 않게) ──
const TEST_NAME = '주식회사 테스트정밀'
db.prepare("INSERT INTO company_profile (key, value) VALUES ('companyName', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(TEST_NAME)
const readBack = (() => {
  // register.ts COMPANY_PROFILE_GET 과 동형의 조립 경로
  const rows = db.prepare('SELECT key, value FROM company_profile').all()
  const map = new Map(rows.map((r) => [r.key, r.value]))
  return map.get('companyName') || ''
})()
check('⑧ companyName 플로우스루', readBack === TEST_NAME && !/TPC|티피씨/.test(readBack), `읽음: ${readBack}`)

// ── 판정·정리 (done 이 process.exit 하므로 정리를 먼저) ──
const sellable = tpcTotal === 0 && nameTotal === 0
console.log(`\n판매 가능 여부: ${sellable ? 'YES' : `NO — TPC 계열 ${tpcTotal}행 · 실명 ${nameTotal}행`}`)
db.close()
rmSync(tmp, { recursive: true, force: true })
done()
