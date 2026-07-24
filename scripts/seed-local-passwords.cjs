// ============================================================
// scripts/seed-local-passwords.cjs — W3 로컬 검증용 임시 비밀번호 시드 (배포 미포함)
//
// ⚠️ 로컬 개발/검증 전용. 실제 초기 비번 일괄 발급(사번+생일 등)은 사장님 정책 결정 후 별도.
//    이 스크립트는 **복사본 DB**에만 돌릴 것(라이브에 임시 비번을 심지 말 것).
//
// 실행(electron-node, better-sqlite3 = Electron ABI):
//   IATF_DATA_DIR=<복사본폴더> ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe \
//     scripts/seed-local-passwords.cjs [비번(기본 qms1234)]
//
// - app_users 에 password_hash·must_change_pw 없으면 추가(마이그 0100 미적용 복사본 대비).
// - 활성 사용자 전원에 임시 비번(bcrypt) 세팅. role 은 이미 시드됨(member/manager/executive).
// ============================================================
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const path = require('path')

const dir = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || '', 'iatf16949-manager')
const dbPath = path.join(dir, 'iatf16949.db')
const db = new Database(dbPath)

const cols = db
  .prepare('PRAGMA table_info(app_users)')
  .all()
  .map((c) => c.name)
if (!cols.includes('password_hash')) db.exec('ALTER TABLE app_users ADD COLUMN password_hash TEXT')
if (!cols.includes('must_change_pw')) db.exec('ALTER TABLE app_users ADD COLUMN must_change_pw INTEGER NOT NULL DEFAULT 1')

const pw = process.argv[2] || 'qms1234'
const hash = bcrypt.hashSync(pw, 10)
const r = db.prepare('UPDATE app_users SET password_hash = ? WHERE active = 1').run(hash)
console.log(`[seed-pw] DB=${dbPath}`)
console.log(`[seed-pw] 활성 사용자 ${r.changes}명에 임시 비번 세팅 (비번="${pw}")`)
console.log('[seed-pw] role 분포:')
for (const row of db.prepare('SELECT role, COUNT(*) c FROM app_users WHERE active=1 GROUP BY role').all()) {
  console.log(`   ${row.role}: ${row.c}명`)
}
// 검증용 대표 계정(각 role 1명) 안내
for (const role of ['member', 'manager', 'executive']) {
  const u = db.prepare('SELECT name FROM app_users WHERE role=? AND active=1 LIMIT 1').get(role)
  if (u) console.log(`   [${role}] 예: ${u.name}`)
}
db.close()
