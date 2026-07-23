// scripts/start-server.mjs — 웹 전환 서버 구동(W1)
//
// better-sqlite3 native 가 Electron ABI(125)로 빌드돼 시스템 node(127)에서 못 연다(§0.5 실증).
// → electron 바이너리를 ELECTRON_RUN_AS_NODE 로 "Node 처럼" 구동해 그대로 사용한다.
// 사용: npm run start:server   (환경변수: PORT·HOST·IATF_DATA_DIR)
import { spawn } from 'child_process'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const require = createRequire(import.meta.url)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const electronPath = require('electron') // electron 모듈은 바이너리 경로 문자열을 export

const env = { ...process.env, ELECTRON_RUN_AS_NODE: '1' }
const child = spawn(electronPath, [join(root, 'server', 'index.cjs')], { stdio: 'inherit', env })
child.on('exit', (code) => process.exit(code ?? 0))
