// ============================================================
// server/auth.cjs — 웹전환 W3: 로그인·세션·권한 (로컬 한정)
//
// - 로그인: app_users.name(실명) + 비밀번호(bcrypt). password_hash NULL = **로그인 불가**(N-8) —
//   비번 발급은 관리팀 몫이다(일괄 scripts/setup-passwords.cjs · 개별 appUser:resetPassword).
//   종전의 "최초 로그인 시 자가 설정"은 계정 선점 창구라 8/14 검수 2차에서 폐지.
// - 세션: httponly 쿠키(sid) + 서버 메모리 Map. 유휴 4시간 만료. 프레임워크 신설 없이 경량 구현.
// - 권한: role(member/manager/executive). 채널별 가드는 server/index.cjs 의 PROTECTED 맵.
//
// ⚠️ 바인딩은 127.0.0.1 고정(W3 전 해제금지) — 세션 탈취 위험이 낮은 로컬에서 개발/검증.
//    사내망 오픈은 사장님 결정 후. 서버 재시작 시 세션 소실(로컬 개발 허용, W4 에서 영속 고려).
// ============================================================
const bcrypt = require('bcryptjs')
const crypto = require('crypto')

const IDLE_MS = 4 * 60 * 60 * 1000 // 유휴 4시간
const sessions = new Map() // sid → { userId, name, role, teamDept, lastSeen }

function parseCookies(req) {
  const raw = req.headers.cookie || ''
  const out = {}
  for (const part of raw.split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function newSid() {
  return crypto.randomBytes(24).toString('base64url')
}

/** 로그인: 실명+비번 검증 → 세션 생성 → sid 반환. 실패 시 null. */
function login(db, name, password) {
  const u = db
    .prepare('SELECT id, name, role, team_dept, password_hash, must_change_pw, active FROM app_users WHERE name = ?')
    .get(name)
  if (!u || !u.active) return { error: '존재하지 않거나 비활성 사용자입니다.' }

  // N-8(8/14 검수 2차): 종전엔 password_hash NULL 이면 "최초 로그인"으로 보고 **요청자가 보낸
  // 비번을 그대로 설정**했다 → 신설 계정을 아무나 선점해 그 실명으로 STAMP 활동이 가능(계정 선점).
  // 관리형 비번 체계(사장님 7/25 — 관리팀이 4자리 비번 지정·대장 보관)가 정본이 된 뒤로 자가 설정
  // 창구는 불필요하다. 발급 경로: 일괄 = scripts/setup-passwords.cjs, 개별 = appUser:resetPassword.
  if (!u.password_hash) {
    return { error: '초기 비밀번호가 발급되지 않은 계정입니다. 관리팀에 발급을 요청하세요.' }
  }
  if (!bcrypt.compareSync(password || '', u.password_hash)) {
    return { error: '비밀번호가 일치하지 않습니다.' }
  }

  const sid = newSid()
  sessions.set(sid, {
    userId: u.id,
    name: u.name,
    role: u.role,
    teamDept: u.team_dept,
    lastSeen: Date.now()
  })
  return { sid, user: { id: u.id, name: u.name, role: u.role, teamDept: u.team_dept, mustChangePw: !!u.must_change_pw } }
}

function logout(sid) {
  if (sid) sessions.delete(sid)
}

/** 요청의 세션(유효+유휴 미초과) 반환. 없으면 null. lastSeen 갱신. */
function sessionOf(req) {
  const sid = parseCookies(req).sid
  if (!sid) return null
  const s = sessions.get(sid)
  if (!s) return null
  if (Date.now() - s.lastSeen > IDLE_MS) {
    sessions.delete(sid)
    return null
  }
  s.lastSeen = Date.now()
  return { sid, ...s }
}

/** M-6(D군, 8/18): 대상 사용자의 활성 세션 전부 무효화 — role 은 로그인 시점 스냅샷이라(위 Map)
 *  app_users 의 role/active/비번이 바뀌어도 기존 세션에 반영될 길이 없었다(B′ N-7 의 남은 절반).
 *  호출처 = index.cjs 디스패처(appUser:upsert 의 role/active 실변경 · delete · resetPassword). */
function invalidateUserSessions(userId) {
  let n = 0
  for (const [sid, s] of sessions) {
    if (s.userId === userId) {
      sessions.delete(sid)
      n++
    }
  }
  return n
}

/** 비밀번호 변경(로그인 상태) — must_change_pw 해제 */
function changePassword(db, userId, newPassword) {
  if (!newPassword || newPassword.length < 4) return { error: '새 비밀번호는 4자 이상이어야 합니다.' }
  const hash = bcrypt.hashSync(newPassword, 10)
  db.prepare('UPDATE app_users SET password_hash = ?, must_change_pw = 0 WHERE id = ?').run(hash, userId)
  return { success: true }
}

// httponly 세션 쿠키 문자열
function sessionCookie(sid) {
  // Secure 는 사내망 http 라 생략(§1.5). SameSite=Lax 로 CSRF 완화.
  return `sid=${sid}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${Math.floor(IDLE_MS / 1000)}`
}
function clearCookie() {
  return 'sid=; HttpOnly; Path=/; Max-Age=0'
}

module.exports = {
  login,
  logout,
  sessionOf,
  invalidateUserSessions,
  changePassword,
  sessionCookie,
  clearCookie,
  parseCookies,
  IDLE_MS
}
