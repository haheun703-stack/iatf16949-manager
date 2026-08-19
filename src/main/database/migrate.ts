import { getSqlite } from './connection'
import { readdirSync, existsSync, mkdirSync, unlinkSync, statSync } from 'fs'
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

    // 보존 정책: 최신 N개만 유지 — 생성시각(mtime) 기준.
    // 파일명(마이그번호) 정렬은 스냅샷 복구 직후 재기동 시 방금 만든 백업(pre-낮은번호_새것)이
    // 오래된 백업(pre-높은번호_옛것)보다 먼저 삭제되는 함정이 있음.
    const olds = readdirSync(backupsDir)
      .filter((f) => f.startsWith('pre-') && f.endsWith('.db'))
      .map((f) => {
        try {
          return { f, t: statSync(join(backupsDir, f)).mtimeMs }
        } catch {
          return { f, t: 0 } // stat 실패 파일은 가장 오래된 것으로 취급
        }
      })
      .sort((a, b) => b.t - a.t)
      .slice(SNAPSHOT_KEEP)
    for (const { f } of olds) {
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

// 러너 정본 = server/migrate-core.cjs (39호 S2, 8/19) — 서버·일렉트론·클린설치 하네스가 같은 코드로 돈다.
// 경로: dev = repo/server/migrate-core.cjs · 패키지 = process.resourcesPath/migrate-core.cjs(electron-builder extraResources).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migrateCore = require(
  !app.isPackaged ? join(__dirname, '../../server/migrate-core.cjs') : join(process.resourcesPath, 'migrate-core.cjs')
) as {
  runAll: (db: Database.Database, opts: Record<string, unknown>) => { mode: string; packs: string[]; applied: string[]; skipped: string[] }
  hasPending: (db: Database.Database, resourcesDir: string) => boolean
  parsePacksEnv: (v: string | undefined) => string[] | null
  listMigrationFiles: (dir: string) => string[]
  ensureMigrationsTable: (db: Database.Database) => void
}

export function resourcesDir(): string {
  return !app.isPackaged ? join(__dirname, '../../resources') : process.resourcesPath
}

export function runMigrations(): void {
  const db = getSqlite()
  const resDir = resourcesDir()
  const migrationsDir = join(resDir, 'migrations')
  if (!existsSync(migrationsDir)) {
    console.warn('Migrations directory not found:', migrationsDir)
    return
  }
  console.log(`[migrate] dir=${migrationsDir}`)

  // 적용 대기분이 있을 때만 스냅샷(매 기동마다 찍지 않음) — 신규 설치(이력 0)는 함수 안에서 스킵
  migrateCore.ensureMigrationsTable(db)
  if (migrateCore.hasPending(db, resDir)) {
    const has = db.prepare('SELECT 1 FROM _migrations WHERE name = ?')
    const first = migrateCore.listMigrationFiles(migrationsDir).find((f) => !has.get(f)) || 'pending'
    snapshotBeforeMigrations(db, first)
  }

  // 데스크톱은 빈 DB 를 스스로 만들므로(connection.ts) 클린 설치를 허용한다.
  // 설치 팩 = IATF_INSTALL_PACKS(csv) → 기존 DB 의 install.packs → 클린 기본 standard / 레거시 기본 standard,tpc.
  try {
    const r = migrateCore.runAll(db, {
      resourcesDir: resDir,
      allowClean: true,
      packs: migrateCore.parsePacksEnv(process.env.IATF_INSTALL_PACKS),
      log: (m: string) => console.log(m)
    })
    console.log(`[migrate] install.packs=${r.packs.join(',')} (${r.mode}) applied=${r.applied.length} skipped=${r.skipped.length}`)
  } catch (err) {
    console.error('[migrate] FAILED:', (err as Error).message)
    throw err
  }
}
