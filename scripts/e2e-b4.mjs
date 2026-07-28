// ============================================================
// scripts/e2e-b4.mjs — ⓑ 4종(내부심사 AM용 빈 틀) E2E (2026-07-28 밤)
//
// 방식 = e2e-batch1.mjs 와 동일(웹서버 :8080·복사본 DB). 실행법은 그쪽 머리주석 참조.
// 실행: node scripts/e2e-b4.mjs <로그인이름> [비번=qms1234]
// ============================================================
import ExcelJS from 'exceljs'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'captures')
mkdirSync(OUT, { recursive: true })
const BASE = 'http://127.0.0.1:8080'
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN) { console.error('사용법: node scripts/e2e-b4.mjs <이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const D = '2026-07-28'
const CASES = [
  {
    code: 'A5100-03',
    values: {
      발행번호: 'TPC26-0728', 작성일자: D, 감사대상부서: 'A/M사업부', 심사일자: '2026-07-28 ~ 07-29',
      부적합no: '품질 1건', 긍정적측면: '1) 공정 표준류 게시·준수 상태 양호(E2E)',
      부적합내역: '1) 자주검사 체크시트 일부 기록 누락 — 시정조치 요구(E2E)',
      공정감사지적_am: '▷포밍기 주변 자재 정리정돈 개선 필요(E2E)',
      제품심사결과: '1) A/M 사업부 (25450-07870 평가) — 육안·치수검사 적합(E2E)'
    },
    expect: [
      ['G4', 'TPC26-0728'], ['S4', '2026-07-28'], ['G5', 'A/M사업부'], ['S5', '~ 07-29'],
      ['S6', '품질 1건'], ['C17', '표준류 게시'], ['C27', '기록 누락'], ['F58', '포밍기'], ['A64', '25450-07870']
    ]
  },
  {
    code: 'A5100-04',
    values: {
      심사원: '심사 A팀', 심사일자: D,
      am영업평점: '94.0 점', am생산평점: '92.5 점',
      am영업지적: '관리 상태 양호(E2E)', am생산지적: '1.공정 내 표준류 이탈 1건 개선 요(E2E)',
      지원부서지적1: '총무·구매 — 교육 이수 기록 관리 양호(E2E)', 지원부서지적2: '품질 — 검교정 이력 관리 양호'
    },
    expect: [
      ['E54', '심사 A팀'], ['E72', '2026-07-28'], ['I19', '94.0'], ['U19', '92.5'],
      ['I20', '관리 상태 양호'], ['U20', '표준류 이탈'], ['I30', '교육 이수'], ['U30', '검교정']
    ]
  },
  {
    code: 'A5200-03',
    values: {
      평가대상명: 'A/M사업부', 평가일: D, 평가팀: '심사 C팀', 평가자: '임하수',
      품명: 'PIPE ASSY 공정', 제품규격: '25450-07870 외',
      평가요약: '1.전체적 공정 관리 상태 양호, 일부 정리정돈 개선 필요(E2E)',
      지적1: '1.인발 표준 대비 작업조건 일치 확인(E2E)', 지적2: '1.교정 대상 계측기 식별 양호',
      지적3: '1.출하 대기품 관리 양호', 지적4: '1.기타 특이사항 없음'
    },
    expect: [
      ['F4', 'A/M사업부'], ['Q4', '2026-07-28'], ['F5', '심사 C팀'], ['Q5', '임하수'],
      ['F6', 'PIPE ASSY'], ['Q6', '25450-07870'], ['A8', '전체적 공정 관리'],
      ['AA15', '작업조건 일치'], ['AA21', '특이사항 없음']
    ]
  },
  {
    code: 'A5200-04',
    values: {
      거래처: '삼보모터스 외', 평가대상: 'CNC밴딩·로브레이징', 고객사명: '삼보모터스',
      제품규격: 'Φ8.0 외', 품명: 'PIPE ASSY', 생산일자: D, 납품수량: '1,200개', 포장수량: '120개/BOX',
      dims: [
        { 설비명: 'CNC밴딩 M/C 2호', 고객사: '삼보', 규격: 'Φ8.0', 특이사항: '측정 POINT 3개소 만족(E2E)', 평가점수: '20' },
        { 설비명: '로브레이징 M/C 1호', 고객사: '삼보', 규격: 'Φ8.0', 특이사항: '용입 상태 양호', 평가점수: '20' }
      ]
    },
    expect: [
      ['G4', '삼보모터스 외'], ['W4', 'CNC밴딩'], ['M6', '삼보모터스'], ['M9', '2026-07-28'],
      ['M10', '1,200개'], ['G28', 'CNC밴딩 M/C 2호'], ['T28', '측정 POINT'], ['AD28', '20'],
      ['G30', '로브레이징'], ['AD30', '20']
    ]
  }
]

function cellText(v) {
  if (v == null) return ''
  if (v instanceof Date) return v.toISOString().slice(0, 10)
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if (v.result !== undefined) return String(v.result)
    if (v.text) return String(v.text)
    return JSON.stringify(v)
  }
  return String(v)
}

const lr = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
if (!lr.ok) { console.error('로그인 실패:', await lr.text()); process.exit(1) }
cookie = (lr.headers.get('set-cookie') || '').split(';')[0]
console.log(`로그인: ${LOGIN} ✓`)

let totalOk = 0, totalChecks = 0, pass = 0
for (const c of CASES) {
  try {
    const created = await api('form:submissionCreate', { formCode: c.code, values: c.values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download) throw new Error('export 실패: ' + JSON.stringify(exp).slice(0, 150))
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    writeFileSync(join(OUT, `b4_e2e_${c.code}.xlsx`), buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(c.code)) ?? wb.worksheets[0]
    let ok = 0
    const bad = []
    for (const [addr, want] of c.expect) {
      const got = cellText(ws.getCell(addr).value)
      if (got.includes(want)) ok++
      else bad.push(`${addr}: 기대 "${want}" ↔ "${got.slice(0, 30)}"`)
    }
    totalOk += ok; totalChecks += c.expect.length
    if (!bad.length) pass++
    const verify = exp.verify ? ` engine=${exp.verify.values} media:${exp.verify.mediaOk ? 'OK' : 'NG'} merges:${exp.verify.mergesOk ? 'OK' : 'NG'}` : ''
    console.log(`${bad.length ? '✗' : '✓'} ${c.code} [시트 "${ws.name}"] 셀 ${ok}/${c.expect.length}${verify}`)
    if (exp.unmapped && exp.unmapped.length) console.log(`   unmapped: ${exp.unmapped.join(', ')}`)
    bad.forEach((b) => console.log('   ✗ ' + b))
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${pass}/${CASES.length} 통과`)
