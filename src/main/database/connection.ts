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
  // Minor 11(D군, 8/18): 웹 모드에선 이 연결(bridge 번들)과 authDb(server/index.cjs, 4000ms)가
  // 같은 파일을 잡는다 — 잠금 경합 시 대기 없이 SQLITE_BUSY 즉사하던 것을 동일 4000ms 대기로.
  sqlite.pragma('busy_timeout = 4000')

  return sqlite
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
  }
}
