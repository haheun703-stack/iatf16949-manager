// scripts/gen-tls-cert.mjs — 사내 HTTPS 인증서 발급 (M3 폰 카메라 전제, 도장 2026-08-24)
//
// 왜 CA 방식인가: 폰(안드로이드/iOS) 브라우저는 "자체 서명 leaf" 를 신뢰 목록에 넣지 못한다.
// 신뢰는 CA 단위이므로 ①사내 루트 CA 를 1회 만들어 폰에 설치하고 ②그 CA 로 서버 인증서를
// 서명한다. 서버 IP 가 바뀌면 leaf 만 재발급하면 되고, 폰은 다시 손댈 필요가 없다.
//
// 산출물( DATA_DIR/certs, repo 밖 — 개인키가 git 에 절대 들어가지 않게 ):
//   ca.key / ca.crt      루트 CA (ca.crt = 폰에 설치할 파일)
//   server.key / server.crt  서버 인증서 (SAN: localhost·127.0.0.1·호스트명·사내 IP)
//
// 구동: ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe scripts/gen-tls-cert.mjs
//   옵션: --ip 192.168.4.25  (여러 번 지정 가능) --days 825 --force
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DATA_DIR = process.env.IATF_DATA_DIR || path.join(process.env.APPDATA || os.homedir(), 'iatf16949-manager')
const CERT_DIR = path.join(DATA_DIR, 'certs')
const DAYS = Number(argOf('--days')) || 825          // 브라우저 신뢰 상한(825일) 기준
const FORCE = process.argv.includes('--force')

function argOf(flag) {
  const i = process.argv.indexOf(flag)
  return i >= 0 ? process.argv[i + 1] : null
}
function argsOf(flag) {
  const out = []
  process.argv.forEach((a, i) => { if (a === flag && process.argv[i + 1]) out.push(process.argv[i + 1]) })
  return out
}

// ── openssl 찾기: PATH → Git for Windows 동봉본 (사내 PC 에 별도 설치 없이 돌게) ──
function findOpenssl() {
  const cands = [
    'openssl',
    'C:/Program Files/Git/usr/bin/openssl.exe',
    'C:/Program Files (x86)/Git/usr/bin/openssl.exe',
    'C:/Program Files/Git/mingw64/bin/openssl.exe'
  ]
  for (const c of cands) {
    try { execFileSync(c, ['version'], { stdio: 'pipe' }); return c } catch { /* 다음 후보 */ }
  }
  throw new Error('openssl 을 찾지 못했습니다. Git for Windows 가 설치되어 있어야 합니다.')
}
const SSL = findOpenssl()
const ssl = (args, opts = {}) => execFileSync(SSL, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts })

// ── 이 PC 의 사내망 IPv4 수집 (127.x·169.254.x 제외) ──
function lanIps() {
  const out = []
  for (const list of Object.values(os.networkInterfaces())) {
    for (const n of list || []) {
      if (n.family !== 'IPv4' || n.internal) continue
      if (n.address.startsWith('169.254.')) continue
      out.push(n.address)
    }
  }
  return out
}

const host = os.hostname()
const ips = [...new Set(['127.0.0.1', ...lanIps(), ...argsOf('--ip')])]
const dns = [...new Set(['localhost', host, host.toLowerCase()])]

fs.mkdirSync(CERT_DIR, { recursive: true })
const p = (f) => path.join(CERT_DIR, f)

// ── ① 루트 CA — 이미 있으면 재사용(재발급하면 폰에 다시 설치해야 하므로) ──
if (!fs.existsSync(p('ca.crt')) || FORCE) {
  ssl(['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-sha256',
    '-days', '3650',
    '-keyout', p('ca.key'), '-out', p('ca.crt'),
    '-subj', '/CN=IATF QMS Internal CA/O=IATF QMS'])
  console.log('[CA ] 새로 발급 —', p('ca.crt'))
} else {
  console.log('[CA ] 기존 것 재사용 (폰 재설치 불필요) —', p('ca.crt'))
}

// ── ② 서버 인증서 — SAN 에 사내 IP·호스트명을 모두 넣는다 ──
const san = [...dns.map((d) => `DNS:${d}`), ...ips.map((i) => `IP:${i}`)].join(',')
const extPath = p('_san.cnf')
fs.writeFileSync(extPath,
  'basicConstraints=CA:FALSE\n' +
  'keyUsage=digitalSignature,keyEncipherment\n' +
  'extendedKeyUsage=serverAuth\n' +
  `subjectAltName=${san}\n`)

ssl(['req', '-newkey', 'rsa:2048', '-nodes', '-sha256',
  '-keyout', p('server.key'), '-out', p('_server.csr'),
  '-subj', `/CN=${host}/O=IATF QMS`])
ssl(['x509', '-req', '-in', p('_server.csr'),
  '-CA', p('ca.crt'), '-CAkey', p('ca.key'), '-CAcreateserial',
  '-out', p('server.crt'), '-days', String(DAYS), '-sha256',
  '-extfile', extPath])

fs.rmSync(p('_server.csr'), { force: true })
fs.rmSync(extPath, { force: true })

console.log('[서버] 발급 완료 —', p('server.crt'))
console.log('       SAN =', san)
console.log('       유효기간 =', DAYS, '일')
console.log('')
console.log('폰에 설치할 파일:', p('ca.crt'))
console.log('서버 기동 시 지정:  IATF_TLS_CERT / IATF_TLS_KEY')
