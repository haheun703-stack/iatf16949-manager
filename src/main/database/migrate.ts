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

  const checkStmt = db.prepare('SELECT id FROM _migrations WHERE name = ?')
  const insertStmt = db.prepare('INSERT INTO _migrations (name) VALUES (?)')

  for (const file of files) {
    // Check if already applied
    const applied = checkStmt.get(file)
    if (applied) continue

    // Execute migration
    const sqlContent = readFileSync(join(migrationsDir, file), 'utf-8')
    db.exec(sqlContent)

    // Record migration
    insertStmt.run(file)
    console.log(`Migration applied: ${file}`)
  }
}
