import { getSqlite } from './connection'
import { readFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type Database from 'better-sqlite3'

// 마이그레이션 직전 DB 스냅샷(2차 방어선).
// 1차 방어 = runMigrations 의 per-마이그레이션 트랜잭션(실패 시 그 마이그만 자동 롤백).
// 스냅샷이 지키는 것 = 트랜잭션이 못 지키는 영역: "성공적으로 커밋됐지만 내용이 잘못된"
// 마이그레이션(예: 잘못된 UPDATE/DELETE 시드), 파일 손상. 복구는 자동이 아니라 수동:
// 앱 종료 → userData/backups/ 의 스냅샷을 iatf16949.db 로 교체(-wal/-shm 파일 삭제).
const SNAPSHOT_KEEP = 5

function snapshotBeforeMigrations(db: Database.Database, firstPending: string): void {
  try {
    // 신규 설치(적용 이력 0 = 빈 DB)는 지킬 데이터가 없으므로 스킵
    const applied = (db.prepare('SELECT COUNT(*) AS c FROM _migrations').get() as { c: number }).c
    if (applied === 0) return

    const backupsDir = join(app.getPath('userData'), 'backups')
    mkdirSync(backupsDir, { recursive: true })
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    const dest = join(backupsDir, `pre-${firstPending.replace(/\.sql$/, '')}_${stamp}.db`)
    // VACUUM INTO = WAL 미반영분까지 포함한 일관 스냅샷을 단일 파일로 생성(온라인, 원본 무변경)
    db.prepare('VACUUM INTO ?').run(dest)
    console.log(`[migrate] DB 스냅샷 생성: ${dest}`)

    // 보존 정책: 최신 N개만 유지(마이그 번호가 시간순 증가라 파일명 정렬 = 시간순)
    const olds = readdirSync(backupsDir)
      .filter((f) => f.startsWith('pre-') && f.endsWith('.db'))
      .sort()
      .reverse()
      .slice(SNAPSHOT_KEEP)
    for (const f of olds) {
      try {
        unlinkSync(join(backupsDir, f))
      } catch {
        /* 잠긴 파일 등은 다음 기회에 */
      }
    }
  } catch (err) {
    // 스냅샷 실패가 앱 기동을 막으면 안 됨 — 트랜잭션 롤백(1차 방어)은 여전히 유효
    console.warn('[migrate] 스냅샷 실패(마이그레이션은 계속 진행):', (err as Error).message)
  }
}

export function runMigrations(): void {
  const db = getSqlite()

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Resolve migrations directory
  const migrationsDir = !app.isPackaged
    ? join(__dirname, '../../resources/migrations')
    : join(process.resourcesPath, 'migrations')

  if (!existsSync(migrationsDir)) {
    console.warn('Migrations directory not found:', migrationsDir)
    return
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  console.log(`[migrate] dir=${migrationsDir}`)
  console.log(`[migrate] files=${files.join(', ')}`)

  const checkStmt = db.prepare('SELECT id FROM _migrations WHERE name = ?')
  const insertStmt = db.prepare('INSERT INTO _migrations (name) VALUES (?)')

  // 적용 대기분이 있을 때만 스냅샷(매 기동마다 찍지 않음)
  const pending = files.filter((f) => !checkStmt.get(f))
  if (pending.length > 0) snapshotBeforeMigrations(db, pending[0])

  for (const file of files) {
    // Check if already applied
    const applied = checkStmt.get(file)
    if (applied) {
      console.log(`[migrate] skip (already applied): ${file}`)
      continue
    }

    // Execute migration — exec와 _migrations 기록을 한 트랜잭션으로 묶어 원자화.
    // 부분실패(예: ALTER ADD COLUMN 직후 크래시) 시 컬럼 추가까지 롤백되어 재실행이 안전.
    // (SQLite DDL은 트랜잭션 가능. 미적용 시 비멱등 ALTER가 재실행돼 duplicate column으로 영구 부팅불가 위험)
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf-8')
    try {
      const applyMigration = db.transaction(() => {
        db.exec(sqlContent)
        insertStmt.run(file)
      })
      applyMigration()
    } catch (err) {
      console.error(`[migrate] FAILED on ${file}:`, (err as Error).message)
      throw err
    }
    console.log(`Migration applied: ${file}`)
  }
}
