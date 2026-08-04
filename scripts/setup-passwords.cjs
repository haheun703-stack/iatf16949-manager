/* eslint-disable */
// W4 관리형 비번 체계 — 일괄 세팅 스크립트 (사장님 정책 7/25, 15번 §0.5-3)
//
// 정책: 4자리 숫자를 관리팀이 사람별 배정(서상규 0000·하헌 1111·서규하 2222·이후 관리팀 지정).
//       must_change_pw = 0 (강제 변경 없음 — 관리팀 비번 대장이 정본, 퇴사·변경 통제).
//
// 2단계 사용:
//   1) 대장 생성:  ELECTRON_RUN_AS_NODE=1 electron.exe scripts/setup-passwords.cjs --init --db <iatf16949.db>
//      → 활성 사용자 전원의 제안 대장 CSV 를 만든다(고정 3명 + 나머지 순번 자동).
//      기본 출력: <프로젝트 루트>\관리팀_비밀번호대장.csv (repo 밖 — git 미포함, 드라이브 문자 무관)
//      관리팀이 파일을 열어 원하는 비번으로 수정·보관한다.
//   2) 적용:      ... setup-passwords.cjs --apply --db <iatf16949.db> [--ledger <csv>]
//      → 대장의 (이름,비번) 을 bcrypt 해시로 적용 + must_change_pw=0. 멱등(재실행 = 동일 결과).
//
// ⚠️ 대장 CSV 는 평문 비번 — 관리팀 보관 파일이며 절대 repo 에 넣지 않는다.
'use strict'
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const args = process.argv.slice(2)
const arg = (n, d) => {
  const i = args.indexOf(n)
  return i >= 0 ? args[i + 1] : d
}
const MODE = args.includes('--init') ? 'init' : args.includes('--apply') ? 'apply' : null
const DB_PATH = arg('--db', null)
const LEDGER = arg('--ledger', path.join(__dirname, '..', '..', '관리팀_비밀번호대장.csv'))
if (!MODE || !DB_PATH) {
  console.error('usage: setup-passwords.cjs (--init|--apply) --db <iatf16949.db> [--ledger <csv>]')
  process.exit(1)
}

// 사장님 지정 고정 3명 — 이후 인원은 관리팀이 대장에서 지정(초안은 순번 자동)
const FIXED = new Map([
  ['서상규', '0000'],
  ['하헌', '1111'],
  ['서규하', '2222']
])

const db = new Database(DB_PATH)
db.pragma('busy_timeout = 5000')

if (MODE === 'init') {
  const users = db
    .prepare('SELECT id, name, team_dept, role FROM app_users WHERE active=1 ORDER BY sort_order, id')
    .all()
  // 고정 3명 외 초안 = 순차 자동(3003, 3114, 3225 …) — 관리팀이 대장에서 자유 수정
  const used = new Set(FIXED.values())
  let idx = 0
  const lines = ['이름,부서,권한,비밀번호(4자리),비고']
  for (const u of users) {
    let pin
    if (FIXED.has(u.name)) pin = FIXED.get(u.name)
    else {
      do {
        pin = String(3000 + idx * 111 + 3).slice(-4).padStart(4, '0')
        idx++
      } while (used.has(pin))
      used.add(pin)
    }
    lines.push(`${u.name},${u.team_dept ?? ''},${u.role},${pin},`)
  }
  fs.writeFileSync(LEDGER, '\ufeff' + lines.join('\r\n'), 'utf-8')
  console.log(`[init] 활성 사용자 ${users.length}명 → 대장 초안 생성: ${LEDGER}`)
  console.log('[init] 관리팀이 파일을 열어 비번을 확정·보관한 뒤 --apply 를 실행하세요.')
} else {
  if (!fs.existsSync(LEDGER)) {
    console.error(`[apply] 대장 없음: ${LEDGER} — 먼저 --init 으로 생성하세요.`)
    process.exit(1)
  }
  let text = fs.readFileSync(LEDGER, 'utf-8')
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  const rows = text.split(/\r?\n/).slice(1).filter((l) => l.trim())
  const upd = db.prepare('UPDATE app_users SET password_hash=?, must_change_pw=0 WHERE name=? AND active=1')
  let ok = 0
  const fails = []
  db.transaction(() => {
    for (const line of rows) {
      const [name, , , pin] = line.split(',').map((s) => (s ?? '').trim())
      if (!name) continue
      if (!/^\d{4}$/.test(pin ?? '')) {
        fails.push(`${name}: 비번 형식 오류('${pin}')`)
        continue
      }
      const res = upd.run(bcrypt.hashSync(pin, 10), name)
      if (res.changes > 0) ok++
      else fails.push(`${name}: 활성 사용자 없음`)
    }
  })()
  console.log(`[apply] 적용 ${ok}명 · 실패 ${fails.length}건 (must_change_pw=0)`)
  for (const f of fails) console.log('  - ' + f)
}
db.close()
