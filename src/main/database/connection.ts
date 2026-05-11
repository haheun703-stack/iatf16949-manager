import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let sqlite: Database.Database | null = null

export function getSqlite(): Database.Database {
  if (sqlite) return sqlite

  const dbPath = join(app.getPath('userData'), 'iatf16949.db')
  sqlite = new Database(dbPath)

  // Enable WAL mode for better read performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
  }
}
