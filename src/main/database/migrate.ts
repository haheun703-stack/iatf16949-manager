import { getSqlite } from './connection'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

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
