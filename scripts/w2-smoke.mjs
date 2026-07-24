// ============================================================
// scripts/w2-smoke.mjs — W2 1착: 채널 전량 스모크(작동 지도)
//
// 등록된 채널(139)을 빈 payload 로 호출해 채널명·상태·사유 3열 표를 만든다.
// "139개 등록 ≠ 작동" — 이 표가 W2 작업 목록이자 완료 기준표(코워크 지시 2026-07-24).
//
// ⚠️ 안전: 쓰기 채널이 포함되므로 **반드시 DB 복사본**에 물린 서버에 실행할 것.
//    IATF_DATA_DIR=<복사본폴더> 로 서버를 띄운 뒤 이 스크립트를 돌린다.
//
// 사용: node scripts/w2-smoke.mjs [--base http://127.0.0.1:8080] [--out docs/w2-channel-smoke.md]
// ============================================================
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'

const args = process.argv.slice(2)
const getArg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const BASE = getArg('--base', 'http://127.0.0.1:8080')
const OUT = getArg('--out', 'docs/w2-channel-smoke.md')

/** 응답 요약(표에 넣을 짧은 설명) */
function summarize(json) {
  if (json === null || json === undefined) return 'null 반환'
  if (Array.isArray(json)) return `배열 ${json.length}건`
  if (typeof json === 'object') {
    const keys = Object.keys(json)
    return `객체 {${keys.slice(0, 5).join(',')}${keys.length > 5 ? ',…' : ''}}`
  }
  return String(json).slice(0, 40)
}

/** 에러 메시지로 상태 분류 — 호출은 도달했으나 인자가 없어서 난 오류와 진짜 실패를 가른다 */
function classifyError(msg) {
  const m = String(msg || '')
  if (/지원되지 않습니다|shim/i.test(m)) return ['스텁', 'shim 스텁(서버 미지원 — W2 대체 대상)']
  if (/no such (table|column)|SQLITE/i.test(m)) return ['실패', `DB 오류: ${m.slice(0, 70)}`]
  if (/readonly|SQLITE_READONLY/i.test(m)) return ['쓰기', '쓰기 채널(readonly DB 라 차단됨)']
  if (
    /Cannot read|undefined|of null|필요|required|없습니다|not found|Invalid|invalid|must be|NOT NULL|constraint/i.test(m)
  )
    return ['인자필요', `payload 필요: ${m.slice(0, 60)}`]
  return ['실패', m.slice(0, 80)]
}

const res0 = await fetch(`${BASE}/api/__channels`)
if (!res0.ok) {
  console.error(`[smoke] 채널 목록 조회 실패 — 서버가 떠 있는지 확인: ${BASE}`)
  process.exit(1)
}
const { count, channels } = await res0.json()
console.log(`[smoke] 등록 채널 ${count}개 — 스모크 시작 (base=${BASE})`)

const rows = []
for (const ch of channels) {
  const started = Date.now()
  try {
    const r = await fetch(`${BASE}/api/${ch}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    const text = await r.text()
    let json = null
    try {
      json = JSON.parse(text)
    } catch {
      /* 비 JSON */
    }
    const ms = Date.now() - started
    if (r.ok) {
      // 스텁 판정: dialog shim 은 취소를 반환하므로 canceled / 빈 filePaths / 값 없는 filePath 가 신호.
      // (undefined 는 JSON 직렬화에서 사라지므로 키 존재 + falsy 도 함께 본다 — 2026-07-24 정오)
      const stubbed =
        json &&
        typeof json === 'object' &&
        (json.canceled === true ||
          json.filePaths?.length === 0 ||
          ('filePath' in json && !json.filePath) ||
          ('path' in json && !json.path))
      if (stubbed) rows.push({ ch, status: '스텁', note: 'dialog 스텁(취소 반환) — 파일 API 로 대체 필요', ms })
      else rows.push({ ch, status: 'OK', note: summarize(json), ms })
    } else {
      const err = (json && json.error) || text.slice(0, 120)
      const [status, note] = classifyError(err)
      rows.push({ ch, status, note, ms })
    }
  } catch (e) {
    rows.push({ ch, status: '실패', note: `요청 실패: ${String(e.message).slice(0, 70)}`, ms: Date.now() - started })
  }
}

// ── 통계 ──
const by = (s) => rows.filter((r) => r.status === s).length
const stat = {
  OK: by('OK'),
  인자필요: by('인자필요'),
  스텁: by('스텁'),
  쓰기: by('쓰기'),
  실패: by('실패')
}
console.log('[smoke] 결과:', JSON.stringify(stat))

// ── 마크다운 표 ──
const lines = []
lines.push('# W2 채널 스모크 리스트 — 작동 지도')
lines.push('')
lines.push(`> 생성: \`node scripts/w2-smoke.mjs\` · 대상 ${count}채널 · base=${BASE}`)
lines.push('> ⚠️ DB **복사본**(IATF_DATA_DIR)에 물린 서버로 실행 — 쓰기 채널 포함.')
lines.push('> 빈 payload(`{}`) 호출 결과다. "인자필요"는 **핸들러 도달 성공**(payload 만 없음)을 뜻한다.')
lines.push('')
lines.push('## 요약')
lines.push('')
lines.push('| 상태 | 개수 | 의미 |')
lines.push('|---|---:|---|')
lines.push(`| ✅ OK | ${stat.OK} | 빈 payload 로도 정상 응답 — 웹에서 그대로 작동 |`)
lines.push(`| 🟡 인자필요 | ${stat.인자필요} | 핸들러 도달 O, payload 만 필요 — 화면에서 호출 시 정상 예상 |`)
lines.push(`| 🔵 쓰기 | ${stat.쓰기} | 쓰기 경로(스모크는 readonly 라 차단) — W2 2착 대상 |`)
lines.push(`| ⚪ 스텁 | ${stat.스텁} | dialog/shell 스텁 — W2 3착(파일 API) 대상 |`)
lines.push(`| ❌ 실패 | ${stat.실패} | 원인 규명 필요 |`)
lines.push('')
lines.push('## 전체 채널')
lines.push('')
lines.push('| 채널 | 상태 | 사유/응답 |')
lines.push('|---|---|---|')
for (const r of rows) {
  const icon = { OK: '✅', 인자필요: '🟡', 스텁: '⚪', 쓰기: '🔵', 실패: '❌' }[r.status] || ''
  lines.push(`| \`${r.ch}\` | ${icon} ${r.status} | ${String(r.note).replace(/\|/g, '\\|')} |`)
}
lines.push('')

const outPath = resolve(OUT)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n'), 'utf-8')
console.log(`[smoke] 표 저장: ${outPath}`)
