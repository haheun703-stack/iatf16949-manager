// ============================================================
// scripts/w2-screens.mjs — W2 4착: 전 화면 브라우저 작동 O/X 표
//
// 각 PageId 화면이 "마운트 시 호출하는 대표 채널"(전부 읽기)을 서버에 호출해, 브라우저에서
// 그 화면의 데이터가 관통하는지 O/X 로 매긴다. 화면→채널 매핑은 Explore 조사(AppShell 라우팅 →
// 각 컴포넌트/store useEffect → ipc-channels wire 값)로 확정. 이 표가 W2 종합 검수 기준.
//
// 대표 채널은 전부 조회(list/status/dashboard)라 라이브에 붙여도 무손상 — 다만 payload 필요한
// 상세 진입(선택 컨텍스트)은 여기서 검사하지 않는다(빈 payload로 부르면 안 되는 화면).
//
// 사용: node scripts/w2-screens.mjs [--base http://127.0.0.1:8080] [--out docs/w2-screens-YYYY-MM-DD.md]
// ============================================================
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'

const args = process.argv.slice(2)
const getArg = (k, d) => {
  const i = args.indexOf(k)
  return i >= 0 ? args[i + 1] : d
}
const BASE = getArg('--base', 'http://127.0.0.1:8080')
const OUT = getArg('--out', 'docs/w2-screens-2026-07-24.md')

// PageId → { comp, ch(대표 마운트 채널, 읽기), note }
const SCREENS = [
  ['home', 'PortalHome', 'team:todayBoard', ''],
  ['team-hub', 'TeamHubView', 'team:summary', ''],
  ['team-detail', 'TeamDetailView', 'team:summary', '유의미 진입엔 selectedTeam 필요(team:regs)'],
  ['dashboard', 'Dashboard', 'dashboard:v5', ''],
  ['sq-dashboard', 'SqDashboardView', 'sq:dashboard', ''],
  ['sq-assessment', 'SelfAssessmentPage', 'sq:assessGet', '빈 {} 허용(최신 세션)'],
  ['sq-readiness', 'SqReadinessPage', 'sq:readiness', ''],
  ['sq-track', 'SqTrackPage', 'sqtrack:overview', ''],
  ['iatf-dashboard', 'IatfDashboardView', 'iatf:dashboard', ''],
  ['doc-browse', 'DocBrowseView', 'form:list', ''],
  ['parts', 'PartsView', 'parts:list', '첫 품번 자동선택→parts:detail'],
  ['case-work', 'CaseWorkPage', 'case:list', '상세는 case:get {id}'],
  ['process-workbench', 'ProcessWorkbenchPage', 'process:list', ''],
  ['form-builder', 'FormBuilderPage', 'form:list', '작성엔 selectedFormCode 필요'],
  ['document-bom', 'DocumentBomPage', 'bom:stats', ''],
  ['schedule', 'SchedulePage', 'schedule:list', ''],
  ['obligations', 'ObligationPage', 'obligation:list', ''],
  ['ppap', 'PpapView', 'ppap:submissionList', '첫 제출 자동선택→ppap:board'],
  ['fmea', 'FmeaView', 'fmea:docList', '첫 문서 자동선택→fmea:board'],
  ['msa', 'MsaView', 'msa:list', ''],
  ['apqp', 'ApqpView', 'apqp:board', ''],
  ['clause-tree', 'ClauseCoverageView', 'clause:coverage', ''],
  ['about', 'AboutView', 'app:info', ''],
  ['integrity', 'IntegrityView', 'integrity:check', ''],
  ['mes-trace', 'MesTraceView', 'mesTrace:status', ''],
  ['mes-records', 'MesRecordsView', 'mesRecords:status', ''],
  ['form-chain', '(없음)', null, 'AppShell 미매핑 = 데드 라우트'],
  ['team', '(없음)', null, 'AppShell 미매핑 = 데드 라우트']
]

const post = async (ch, body) => {
  const r = await fetch(`${BASE}/api/${ch}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
  let j = null
  try {
    j = await r.json()
  } catch {
    /* 비 JSON */
  }
  return { status: r.status, j }
}

const summarize = (j) => {
  if (j === null || j === undefined) return 'null'
  if (Array.isArray(j)) return `배열 ${j.length}`
  if (typeof j === 'object') return `{${Object.keys(j).slice(0, 4).join(',')}}`
  return String(j).slice(0, 30)
}

const rows = []
for (const [page, comp, ch, note] of SCREENS) {
  if (!ch) {
    rows.push({ page, comp, ch: '—', ox: '➖', detail: note })
    continue
  }
  try {
    const { status, j } = await post(ch)
    if (status === 200) rows.push({ page, comp, ch, ox: '✅ O', detail: summarize(j) + (note ? ` · ${note}` : '') })
    else rows.push({ page, comp, ch, ox: '❌ X', detail: `HTTP ${status}: ${(j && j.error) || ''}`.slice(0, 60) })
  } catch (e) {
    rows.push({ page, comp, ch, ox: '❌ X', detail: `요청 실패: ${String(e.message).slice(0, 50)}` })
  }
}

const o = rows.filter((r) => r.ox === '✅ O').length
const x = rows.filter((r) => r.ox === '❌ X').length
const dead = rows.filter((r) => r.ox === '➖').length
console.log(`[screens] O ${o} · X ${x} · 데드 ${dead}`)

const lines = []
lines.push('# W2 4착 — 전 화면 브라우저 작동 O/X 표 (W2 종합 검수 기준)')
lines.push('')
lines.push(`> \`node scripts/w2-screens.mjs\` · base=${BASE} · 각 화면 마운트 대표 채널(읽기) 관통 여부.`)
lines.push('> 화면→채널 매핑 = AppShell 라우팅 → 컴포넌트/store useEffect → ipc-channels wire 값(Explore 조사).')
lines.push('> 상세 진입(선택 payload 필요)은 별도 — 이 표는 "화면이 브라우저에서 열려 데이터가 뜨는가".')
lines.push('')
lines.push(`**결과: 렌더 화면 O ${o} · X ${x} · 데드 라우트 ${dead}** (총 ${rows.length} PageId)`)
lines.push('')
lines.push('| PageId | 컴포넌트 | 마운트 채널 | O/X | 응답/비고 |')
lines.push('|---|---|---|---|---|')
for (const r of rows) {
  lines.push(`| \`${r.page}\` | ${r.comp} | \`${r.ch}\` | ${r.ox} | ${String(r.detail).replace(/\|/g, '\\|')} |`)
}
lines.push('')
lines.push('## 비고')
lines.push('- **데드 라우트 2종**(`form-chain`·`team`): PageId 유니온엔 있으나 AppShell 스위치에 케이스 없음 → 빈 화면. 웹 전환과 무관(설치판도 동일). 정리 대상.')
lines.push('- 상세 뷰(payload 필요)는 목록 화면 진입 후 사용자 선택으로 열림 — parts/ppap/fmea 는 첫 항목 자동선택으로 상세 채널까지 자동 관통.')

const outPath = resolve(OUT)
mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, lines.join('\n'), 'utf-8')
console.log(`[screens] 표 저장: ${outPath}`)
