// ============================================================
// scripts/e2e-batch7.mjs — 7차 트랙(레거시 셀맵 교정) E2E (2026-07-30 사무실)
//
// 방식 = e2e-batch6.mjs 와 동일(웹서버·복사본 DB). 라이브 서버(:8080)와 병행을 위해
// BASE 를 env E2E_BASE 로 가변화(기본 8080 — 검증 복사본 서버는 8081 권장).
// 실행: E2E_BASE=http://127.0.0.1:8081 node scripts/e2e-batch7.mjs <로그인이름> [비번]
// 케이스는 교정 진행분만큼 누적한다. 1호 = K2100-06(0115).
// ============================================================
import ExcelJS from 'exceljs'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'captures')
mkdirSync(OUT, { recursive: true })

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080'
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN) { console.error('사용법: node scripts/e2e-batch7.mjs <로그인이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

// F1100-01: 24행(정정 후 상한) — 첫 행과 말행(30행)만 채워 경계 검증
const f1100Rows = Array.from({ length: 24 }, () => ({}))
f1100Rows[0] = { 구분: '사내', 과정명: 'IATF16949 내부심사원 양성', 내용: '심사 기법·체크리스트', 시간: '8', 대상: '품질팀', 기관: '사내', 월7: '○', 비용: '0', 비고: '-' }
f1100Rows[23] = { 구분: '사외', 과정명: 'SQ 인증 대비 실무', 비용: '300000' }
// L2100-02: 12블록(2행 병합) — 첫 블록(9행)과 말블록(31행)
const l2102Rows = Array.from({ length: 12 }, () => ({}))
l2102Rows[0] = { 입고일자: '2026-07-30', 검사일자: '2026-07-31', lot: 'C260731-01', 강종: 'SPHC', 두께: '2.3', 폭: '182', 조수: '4,500', 측정두께1: '2.31', 측정두께2: '2.30', 측정두께3: '2.29', 측정폭1: '182.1', 측정폭2: '182.0', 측정폭3: '182.2', 판정: 'O', 비고: '-' }
l2102Rows[11] = { lot: 'C260731-12', 판정: 'O' }
// L2100-07: 30행(정정 후 상한) — 첫 행(5행)과 말행(34행)
const l2107Rows = Array.from({ length: 30 }, () => ({}))
l2107Rows[0] = { no: '1', 품명: 'STKM11A 코일', 품번규격: 'Φ60.5×2.3', 입고lot: 'L260731-01', 입고수량: '5,000', 공급사: '현대제철', 출하성적서접수: 'A-1023', 성적서lot일치: 'Y', 검사성적서no: 'IQC-0731', 판정: '합격', 합격식별: '녹색 라벨', 검사자: LOGIN, 비고: '-' }
l2107Rows[29] = { no: '30', 품명: '말행 검증' }

const CASES = [
  {
    // 0115 교정(260730): 기준 grid(3행 병합 2블록) + 도식화 textarea + 작성자 AN2
    code: 'K2100-06',
    values: {
      rows: [
        { 순: '1', 시기: '입고 시', 장소: '자재 창고', 관리기준: '입고일자 순 적치 — 선입고분 전면 배치', 담당부서: '구매팀' },
        { 순: '2', 시기: '출고 시', 장소: '자재 창고', 관리기준: '식별표 입고일자 확인 후 선입고분부터 불출', 담당부서: '구매팀' }
      ],
      도식화: '입고(후열 적치) → 보관(입고일자 표기) → 출고(전열부터 불출)',
      작성자: LOGIN
    },
    expect: [['A16', '1'], ['C16', '입고 시'], ['I16', '자재 창고'], ['O16', '선입고분'], ['AQ16', '구매팀'],
      ['A19', '2'], ['C19', '출고 시'], ['O19', '불출'], ['C22', '전열부터'], ['AN2', LOGIN]]
  },
  {
    // 0116 ①: dims 6→4 — 4행(28/30/32/34 앵커) 기입 + 합계 수식(AD36) 보존
    code: 'A5200-04',
    values: {
      거래처: '삼보모터스', 평가대상: '조관-절단', 고객사명: '삼보', 제품규격: 'Φ60.5', 품명: '토크로드 파이프',
      생산일자: '2026-07-31', 납품수량: '1200', 포장수량: '600',
      dims: [
        { 설비명: '조관기 #1', 고객사: '삼보', 규격: 'Φ60.5×2.3', 특이사항: '없음', 평가점수: '55' },
        { 설비명: '절단기 #1', 고객사: '삼보', 규격: 'L=1,250', 특이사항: '-', 평가점수: '56' },
        { 설비명: '포밍기 #2', 고객사: '삼보', 규격: 'R12', 특이사항: '-', 평가점수: '57' },
        { 설비명: '검사대 #1', 고객사: '삼보', 규격: '전수', 특이사항: '말행 검증', 평가점수: '58' }
      ]
    },
    expect: [['G4', '삼보모터스'], ['W4', '조관'], ['M6', '삼보'], ['G28', '조관기'], ['AD28', '55'],
      ['G34', '검사대'], ['T34', '말행 검증'], ['AD34', '58']],
    expectFormula: [['AD36', 'SUM(AD14:AH35)']]
  },
  {
    // 0116 ②: rows 25→24 — 말행(30행) 기입 + 합계 수식(S31) 보존
    code: 'F1100-01',
    values: { 작성일자: '2026-07-31', 작성자: LOGIN, rows: f1100Rows },
    expect: [['E3', LOGIN], ['A7', '사내'], ['B7', 'IATF16949'], ['M7', '○'], ['S7', '0'],
      ['A30', '사외'], ['B30', 'SQ 인증'], ['S30', '300000']],
    expectFormula: [['S31', 'SUM(S7:S30)']]
  },
  {
    // 0116 ③: start 4→5·max 34→30 — 예시행(4행) 보존 + 월말대사 수식(36행) 보존
    code: 'L2100-07',
    values: { rows: l2107Rows },
    expect: [['A5', '1'], ['C5', 'STKM11A'], ['G5', '현대제철'], ['L5', '합격'], ['N5', LOGIN],
      ['A34', '30'], ['C34', '말행']],
    expectEmpty: ['A4', 'C4', 'G4'],
    expectFormula: [['B36', 'COUNTA(B5:B34)'], ['E36', 'COUNTA(J5:J34)'], ['H36', 'B36-E36']]
  },
  {
    // 0117: A5100-02 재설계 — 갑지 헤더 6매핑 + 점수표 grid 2종(sys 9~19·proc 20~26),
    // 소계(BB)·배점(BI)·을지 미러(E33) 수식 보존
    code: 'A5100-02',
    values: {
      a1: 'TPC-Q-260731', a2: '정기', a3: ['품질 시스템', '제조공정', '제품'],
      a4: '전 부서', a5: '박주돈 상무', a6: '2026-07-22 ~ 07-23',
      a7: '리스크·KPI 달성도·프로세스 중대성·CSR 종합 점수 기반 우선순위 설정(E2E 검증)',
      sys: [
        { 세부항목: '영업관리P', 리스크: '중', 성과경향: '달성', 중대성: '중', 우선순위: '6', csr: '有', 심사등급: 'C' },
        {}, {}, {}, {}, {}, {}, {}, {}, {},
        { 세부항목: '환경', 리스크: '중', 성과경향: '달성', 중대성: '중', 우선순위: '7', csr: '無', 심사등급: 'C' }
      ],
      proc: [
        { 공정: '인발', 리스크: '상', 성과경향: '달성', 중대성: '상', 우선순위: '1', csr: '없음', 심사등급: 'A' },
        {}, {}, {}, {}, {},
        { 공정: '용접(3공장)', 리스크: '상', 성과경향: '달성', 중대성: '상', 우선순위: '1', csr: '없음', 심사등급: 'A' }
      ]
    },
    expect: [['E4', 'TPC-Q-260731'], ['Y4', '정기'], ['E5', '품질'], ['E7', '전 부서'], ['X7', '박주돈'],
      ['E6', 'E2E 검증'], ['E9', '영업관리P'], ['AA9', 'C'], ['E19', '환경'], ['U19', '7'],
      ['E20', '인발'], ['AA20', 'A'], ['E26', '용접(3공장)'], ['AA26', 'A']],
    expectFormula: [['BB11', 'BB10'], ['BB9', 'SUM(AJ9:BA9)'], ['BI12', 'BI11'], ['E33', 'E4']]
  },
  {
    // 0118 ①: L2100-02 조관 정본 완결 — 2행 병합 12블록 grid + 작성자 AA4, 각주(33행) 보존
    code: 'L2100-02',
    values: { rows: l2102Rows, 작성자: LOGIN },
    expect: [['F9', 'C260731-01'], ['I9', 'SPHC'], ['R9', '2.31'], ['S9', '2.30'], ['T9', '2.29'],
      ['U9', '182.1'], ['X9', 'O'], ['F31', 'C260731-12'], ['X31', 'O'], ['AA4', LOGIN], ['B33', '코일 인수']]
  },
  {
    // 0118 ②: L2100-03 조관 정본 완결 — 헤더+겉모양 4셀+치수 grid(13~16)+Mill Sheet(AG17 대형 병합)
    code: 'L2100-03',
    values: {
      품명: 'STKM11A 코일', 로트번호: 'C260731-01', 입고일자: '2026-07-30', 검사일자: '2026-07-31',
      검사원: '김검사', 규격두께1: '2.3', 규격폭1: '182', 조수1: '3', 중량1: '4,500',
      total: 'TOTAL : 4,500 ㎏', 겉모양x1: '양호', 겉모양x2: '양호', 겉모양x3: '양호', 겉모양판정: 'O',
      치수: [
        { 기준치: '±0.15', x1: '2.31', x2: '2.30', x3: '2.29', 판정: 'O' },
        { 기준치: '±0.5', x1: '182.1', x2: '182.0', x3: '182.2', 판정: 'O' },
        { x1: '2.30', 판정: 'O' },
        { x1: '182.0', 판정: 'O' }
      ],
      밀시트: 'Mill Sheet 첨부 — 항복점 245 N/㎟ · 인장강도 340 N/㎟ · 연신율 41% · C 0.04',
      종합판정: '적합', 비고: '-', 작성자: LOGIN
    },
    expect: [['G4', 'STKM11A'], ['AO7', 'C260731-01'], ['AO4', '김검사'], ['G6', '2.3'], ['N6', '182'],
      ['G8', 'TOTAL : 4,500'], ['AG11', '양호'], ['AV11', 'O'], ['Q13', '±0.15'], ['AG13', '2.31'],
      ['AV13', 'O'], ['AG16', '182.0'], ['AG17', 'Mill Sheet'], ['AS29', '적합'], ['AS2', LOGIN]]
  },
  {
    // 0119 ①: K2100-05 재설계 — 점수 grid(2행 병합 10블록×4열)+하단 grid, 소계 수식(28행) 보존
    code: 'K2100-05',
    values: {
      평가일자: '2026-07-31', 평가팀: '구매팀', 평가자: '김점검',
      품명1: '토크로드 파이프', 품번1: '25410-2R000', 품명2: 'HOSE', 품번2: '25410-2R030',
      scores: [
        { 품목1: '10', 품목2: '8' }, {}, {}, {}, {}, {}, {}, {}, {},
        { 품목1: '10', 품목2: '10' }
      ],
      전월점수1: '92', 전월점수2: '88', 판정: '합격', 평가자의견: '이상 없음',
      bottom: [
        { 품번: '25410-2R000', 재고일치: '적합', 식별상태: '적합', 유해결함: '없음' },
        {}, {},
        { 품번: '25410-2R030', 재고일치: '적합' }
      ]
    },
    expect: [['AB2', '구매팀'], ['AB3', '김점검'], ['N6', '토크로드'], ['N7', '25410-2R000'],
      ['N8', '10'], ['S8', '8'], ['N26', '10'], ['S26', '10'], ['N29', '92'],
      ['D35', '25410-2R000'], ['J35', '적합'], ['D38', '25410-2R030'], ['M42', '이상 없음']],
    expectFormula: [['N28', 'SUM(N8:R27)'], ['AC28', 'SUM(AC8:AG27)']]
  },
  {
    // 0119 ②: L3100-02 재설계 — 로그 grid 2종, VLOOKUP 헤더(조회 셀) 보존·관리번호/계측기명 unmapped
    code: 'L3100-02',
    values: {
      관리번호: 'MI-001', 계측기명: '버니어캘리퍼스',
      usage: [
        { 일자: '2026-07-31', 부서명: '품질보증팀', 용도: '수입검사', 비고: '-' },
        {},
        { 부서명: '생산팀' }
      ],
      calib: [
        { 일자: '2026-07-31', 이력사항: '정기 교정', 검교정결과: '합격', 검교정기관: 'KTC', 차기교정일: '2027-07-31', 담당확인: '김검사', 비고: '-' },
        {}, {}, {}, {}, {},
        { 이력사항: '말행 검증' }
      ]
    },
    expect: [['B25', '품질보증팀'], ['C25', '수입검사'], ['B27', '생산팀'],
      ['B30', '정기 교정'], ['D30', '합격'], ['E30', 'KTC'], ['G30', '김검사'], ['B36', '말행 검증']],
    expectFormula: [['B4', 'VLOOKUP'], ['F5', 'VLOOKUP']]
  },
  {
    // 0119 ③: A2200-01 재설계 — 갑지 헤더+참석자 grid(좌/우 2열)+회의내용, 을지 미러(H37) 보존
    code: 'A2200-01',
    values: {
      회의일자: '2026-07-31', 회의장소: '본사 회의실', 회의구분: '정기', 주관부서: '총무팀',
      작성자: LOGIN, 회의안건: '7월 품질회의(E2E)',
      회의내용: '1. CP/CPK 관리 현황 점검\n2. SQ 심사 대비 진행 상황',
      참석자: [
        { 소속1: '품질보증팀', 직급1: '차장', 성명1: '김기범', 소속2: '생산팀', 직급2: '부장', 성명2: '손진식' },
        {}, {}, {},
        { 소속1: '총무팀', 성명1: '말행검증' }
      ]
    },
    expect: [['R4', '본사 회의실'], ['AD4', '정기'], ['E5', '총무팀'], ['R5', LOGIN],
      ['H12', '7월 품질회의'], ['A13', 'CP/CPK'], ['C7', '품질보증팀'], ['L7', '김기범'],
      ['T7', '생산팀'], ['AC7', '손진식'], ['C11', '총무팀'], ['L11', '말행검증']],
    expectFormula: [['H37', 'H12']]
  },
  {
    // 0116 ④: 미러 수식 6셀 → 원 입력 셀(B13~B18·C17) 재매핑 + 미러·파생 수식 보존
    code: 'L1100-24',
    values: {
      업체명: '(주)태평양', model: 'TPC-2026', 공정명: '조관', 품명: '토크로드 파이프',
      usl: '7.5', lsl: '7.3', 측정자: '김검사', 측정일: '2026-07-31', 단위: 'mm', 계측기: '버니어캘리퍼스'
    },
    expect: [['B7', '태평양'], ['B8', 'TPC-2026'], ['B9', '조관'], ['B10', '토크로드'],
      ['B13', '7.5'], ['B14', '7.3'], ['B15', '김검사'], ['C17', 'mm'], ['B18', '버니어']],
    expectFormula: [['J8', 'ISBLANK($B13)'], ['J9', 'ISBLANK(B14)'], ['J10', 'ABS'], ['J11', '(J8+J9)/2'],
      ['M8', '$B15'], ['M10', '$B17'], ['M11', '$B18'], ['N10', '$C17']]
  }
]

function cellText(v) {
  if (v == null) return ''
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((r) => r.text).join('')
    if (v.result !== undefined) return String(v.result)
    if (v.text) return String(v.text)
    if (v instanceof Date) return v.toISOString()
    return JSON.stringify(v)
  }
  return String(v)
}

const loginRes = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
if (!loginRes.ok) { console.error('로그인 실패:', await loginRes.text()); process.exit(1) }
cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0]
console.log(`로그인: ${LOGIN} ✓ (${BASE})`)

let totalOk = 0, totalChecks = 0, passForms = 0
for (const c of CASES) {
  try {
    const created = await api('form:submissionCreate', { formCode: c.code, values: c.values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download) throw new Error(`export 실패: ${JSON.stringify(exp).slice(0, 200)}`)
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const outFile = join(OUT, `batch7_e2e_${c.code}.xlsx`)
    writeFileSync(outFile, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(c.code)) ?? wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    let ok = 0
    const bad = []
    // 검사 3종: cell(값 포함) · formula(수식 보존) · empty(비어 있음 — 예시행 보존)
    const checks = [
      ...c.expect.map(([a, w]) => ['cell', a, w]),
      ...(c.expectFormula || []).map(([a, w]) => ['formula', a, w]),
      ...(c.expectEmpty || []).map((a) => ['empty', a, ''])
    ]
    for (const [kind, addr, want] of checks) {
      const v = ws.getCell(addr).value
      if (kind === 'formula') {
        const f = v && typeof v === 'object' ? String(v.formula || v.sharedFormula || '') : ''
        if (f.includes(want)) ok++
        else bad.push(`${addr}: 수식 기대 "${want}" ↔ 실제 "${(f || cellText(v)).slice(0, 40)}"`)
      } else if (kind === 'empty') {
        const got = cellText(v)
        if (got.trim() === '') ok++
        else bad.push(`${addr}: 빈 셀 기대 ↔ 실제 "${got.slice(0, 30)}"`)
      } else {
        const got = cellText(v)
        if (got.includes(want)) ok++
        else bad.push(`${addr}: 기대 "${want}" ↔ 실제 "${got.slice(0, 30)}"`)
      }
    }
    totalOk += ok; totalChecks += checks.length
    if (bad.length === 0) passForms++
    const v = exp.verify || {}
    const verify = exp.verify
      ? ` engine=${v.values}${v.grid ? ` grid=${v.grid}` : ''} media:${v.mediaOk ? 'OK' : 'NG'} merges:${v.mergesOk ? 'OK' : 'NG'}` +
        ` 수식:${v.formulaSafe === false ? '차단됨' : 'OK'}`
      : ''
    // 엔진 가드 신호(0730 C-7·C-8): 수식 차단은 셀맵 결함, 병합 리다이렉트·덮어씀은 트리아지 자료
    const g = exp.guard
    if (g) {
      for (const h of g.skippedFormula) console.log(`   ⚠️수식 차단 ${h.cell} [${h.ctx}] ${h.detail}`)
      if (g.mergeRedirects.length) console.log(`   · 병합 앵커 리다이렉트 ${g.mergeRedirects.length}건`)
      if (g.overwrites.length) console.log(`   · 기존 텍스트 덮어씀 ${g.overwrites.length}건`)
    }
    console.log(`${bad.length === 0 ? '✓' : '✗'} ${c.code} [시트 "${ws.name}"] 셀 ${ok}/${checks.length}${verify} → ${outFile}`)
    if (exp.unmapped && exp.unmapped.length) console.log(`   unmapped: ${exp.unmapped.join(', ')}`)
    for (const b of bad) console.log(`   ✗ ${b}`)
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${passForms}/${CASES.length} 통과`)
