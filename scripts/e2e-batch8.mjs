// ============================================================
// scripts/e2e-batch8.mjs — 레거시 2차 배치 E2E (2026-07-31 사무실)
//
// 방식 = e2e-batch7.mjs 동일(웹서버·복사본 DB·BASE env 가변). 케이스는 2차 배치
// 진행분만큼 누적. 1일차 = 설비군 9종(0122).
// 실행: E2E_BASE=http://127.0.0.1:8081 node scripts/e2e-batch8.mjs <로그인이름> [비번]
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
if (!LOGIN) { console.error('사용법: node scripts/e2e-batch8.mjs <로그인이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const CASES = [
  {
    // 0122: L1100-13 갑지 — 월테마 12칸 + 주차 grid(5행)
    code: 'L1100-13',
    values: {
      제목: '2026년 테마별 월 중점 점검 계획서', 작성부서: '작성자 : 생산기술팀', 작성일자: '작성일자 : 2026년 07월 31일',
      테마1: '유압', 테마6: '유압', 테마7: '조작판넬', 테마12: '조작판넬',
      weeks: [
        { 부서내역: '조관반, 절단반 점검', 테마: '유압', 테마내역: '배관 누유·작동유 정량 확인' },
        {}, {}, {},
        { 부서내역: '말행 — 미결업무 재점검', 테마: '공압', 테마내역: '에어라인 점검' }
      ],
      비고: '-'
    },
    expect: [['B1', '2026년'], ['A3', '생산기술팀'], ['O3', '07월 31일'], ['A6', '유압'], ['F6', '유압'],
      ['H6', '조작판넬'], ['P6', '조작판넬'], ['B9', '조관반'], ['I9', '유압'], ['K9', '배관 누유'],
      ['B13', '말행'], ['B14', '-']]
  },
  {
    // 0122: L1100-16 — 파트 대장 20행 + 업체 2행 블록 10개(main/sub)
    code: 'L1100-16',
    values: {
      제목: '2026년 8월 SPARE PARTS 관리대장',
      parts: (() => { const r = Array.from({ length: 20 }, () => ({})); r[0] = { 부품명: '베어링 6204', 규격: '20×47×14', 적정재고: '10', 재고1주: '12', 메이커: 'NSK', 구매처: '부산베어링', 소요시간: '2일', 보관위치: 'A-3', 비고: '-' }; r[19] = { 부품명: '말행 부품' }; return r })(),
      vendors: (() => { const r = Array.from({ length: 10 }, () => ({})); r[0] = { 업체명: '부산베어링', 취급품목: '베어링류', 대표담당: '홍길동 / 김담당', 전화: '051-111-2222', 홈페이지: 'busanbrg.co.kr', 비고: '-' }; r[9] = { 업체명: '말행상사' }; return r })(),
      vendors2: [{ 연락처: '010-1234-5678', 메일: 'kim@busanbrg.co.kr' }]
    },
    expect: [['A1', '2026년 8월'], ['B4', '베어링 6204'], ['C4', '20×47×14'], ['E4', '12'], ['I4', 'NSK'],
      ['B23', '말행 부품'], ['B27', '부산베어링'], ['D27', '홍길동 / 김담당'], ['I27', '051-111'], ['K27', 'busanbrg'],
      ['I28', '010-1234'], ['K28', 'kim@busanbrg'], ['B45', '말행상사']]
  },
  {
    // 0122: L1100-17 — 자산 grid 4행 + 사유/첨부/내용 + 식별 3
    code: 'L1100-17',
    values: {
      작성일자: '작성일자 : 2026년 07월 31일', 작성자: '작성자:생산기술팀',
      assets: [
        { 입고일자: '2015-03', 제조회사: '태성기공', 자산명: '수동 절단기', 형식: 'MC-90', 설비번호: 'CT-09', 단위: '대', 수량: '1', 처리방법: '매각', 잔존가: '0', 비고: '-' },
        {}, {},
        { 자산명: '말행 자산' }
      ],
      사유: '노후 및 대체 설비(자동 절단기) 도입으로 사용 중단', 첨부: '※ 첨부 : 자산대장 사본 1부',
      폐기내용: '기계장치 1식 매각 처분', 설비명: '수동 절단기', 설비번호: 'CT-09', 부서공정: '3공장 절단'
    },
    expect: [['A3', '07월 31일'], ['N3', '생산기술팀'], ['B6', '2015-03'], ['E6', '수동 절단기'],
      ['J6', '매각'], ['O6', '-'], ['E9', '말행 자산'], ['A11', '노후'], ['A14', '자산대장'],
      ['A16', '매각 처분'], ['E38', '수동 절단기'], ['E39', 'CT-09'], ['E40', '3공장']]
  },
  {
    // 0122: L1100-18 — 현황 15행 + 점검일지(2행 블록 5)
    code: 'L1100-18',
    values: {
      작성부서: '작성자 : 생산기술팀',
      list: (() => { const r = Array.from({ length: 15 }, () => ({})); r[0] = { 라인명: '확관 1라인', 설비번호: 'EX-01', 설비명: '다단확관기', 측정항목: '냉각수 온도', 비고: '-' }; r[14] = { 설비명: '말행 설비' }; return r })(),
      점검년월: '2026년 8월', 설비명: '다단확관기',
      checks: [{ 작동여부: '○', 비고: '-' }, {}, {}, {}, { 작동여부: '○', 비고: '말행' }]
    },
    expect: [['A3', '생산기술팀'], ['B5', '확관 1라인'], ['C5', 'EX-01'], ['E5', '다단확관기'],
      ['K5', '-'], ['E19', '말행 설비'], ['A20', '2026년 8월'], ['H23', '다단확관기'],
      ['H27', '○'], ['H35', '○'], ['I35', '말행']]
  },
  {
    // 0122: L1100-19 — 헤더 8(작성자 auto) + 참석자 좌/우 + 교육내용
    code: 'L1100-19',
    values: {
      소속: '생산기술팀', 직위: '차장', 작성자: LOGIN, 교육장소: '2공장 회의실', 교육일자: '2026-07-31',
      강사명: '태성기공 김강사', 교육목적: '신규 설비 이관에 따른 운전·보전 교육', 교육명: '자동 절단기 운전 교육',
      참석자: [
        { 소속1: '생산팀', 직위1: '반장', 성명1: '박작업', 소속2: '생산기술팀', 직위2: '사원', 성명2: '이보전' },
        {}, {},
        { 소속1: '품질보증팀', 성명1: '말행' }
      ],
      교육내용: '1. 설비 개요 및 안전수칙\n2. 운전 조건 설정\n3. 일상점검 항목'
    },
    expect: [['D4', '생산기술팀'], ['L4', '차장'], ['T4', LOGIN], ['D5', '2공장'], ['T5', '김강사'],
      ['D6', '이관'], ['D7', '자동 절단기'], ['D9', '생산팀'], ['K9', '박작업'], ['N9', '생산기술팀'],
      ['U9', '이보전'], ['D12', '품질보증팀'], ['A14', '안전수칙']]
  },
  {
    // 0122: L1100-20 — 점검 grid(5항목×좌우 회차)
    code: 'L1100-20',
    values: {
      제목: '8월 F/PROOF이상발생 점검 체크시트', 점검일1: '점검일 : 8/7', 점검일2: '점검일 : 8/14',
      checks: [
        { 조건1: '12V로 하향', 작동1: '○', 조건2: '25V로 상향', 작동2: '○' },
        {}, {}, {},
        { 조건1: '250개로 하향', 작동1: '○' }
      ]
    },
    expect: [['E1', '8월'], ['G27', '8/7'], ['U27', '8/14'], ['G29', '12V'], ['N29', '○'],
      ['U29', '25V'], ['AC29', '○'], ['G33', '250개'], ['N33', '○']]
  },
  {
    // 0122: L1100-21 — 빽업 내역 grid(좌/우 6열)
    code: 'L1100-21',
    values: {
      rows: (() => { const r = Array.from({ length: 12 }, () => ({})); r[0] = { 구분1: 'A-1', 설비명1: '다단확관기', 빽업항목1: 'PLC 래더·터치판넬 화면', 구분2: 'A-7', 설비명2: '리크테스터', 빽업항목2: '검사 조건 파라미터' }; r[11] = { 설비명1: '말행 설비' }; return r })()
    },
    expect: [['A23', 'A-1'], ['C23', '다단확관기'], ['H23', 'PLC 래더'], ['P23', 'A-7'],
      ['R23', '리크테스터'], ['W23', '검사 조건'], ['C34', '말행 설비']]
  },
  {
    // 0122: L1100-22 — 행렬 전치형 개별 31칸
    code: 'L1100-22',
    values: {
      제목: '2026년 설비 데이터 빽업 관리대장',
      일자a1: '12월 15일', 자a1: '이보전', 특이상: '이상 없음', 차기a1: '2027년 6월',
      일자a7: '12월 16일', 자a11: '이보전', 특이하: '-'
    },
    expect: [['D1', '2026년'], ['F6', '12월 15일'], ['F7', '이보전'], ['F8', '이상 없음'],
      ['F11', '2027년 6월'], ['F13', '12월 16일'], ['V14', '이보전'], ['F15', '-']]
  },
  {
    // 0122: L1100-23 — 식별 3 + 점검 grid(2행 병합 10블록) + 재개정 grid
    code: 'L1100-23',
    values: {
      설비명: '다단확관기', 설비등급: 'A', 설비업체: '태성기공',
      items: (() => { const r = Array.from({ length: 10 }, () => ({})); r[0] = { 점검항목: '유압 유닛', 규격: '작동압 140bar', 점검방법: '게이지 육안' }; r[9] = { 점검항목: '말행 항목' }; return r })(),
      revs: [{ 개정일자: '2026-07-31', 개정사유: '제정', 작성: '하헌', 검토: '김기범', 승인: '서상규' }]
    },
    expect: [['V3', '다단확관기'], ['AA3', 'A'], ['AD3', '태성기공'], ['T5', '유압 유닛'],
      ['Z5', '140bar'], ['AH5', '게이지'], ['T23', '말행 항목'], ['V26', '2026-07-31'],
      ['AA26', '제정'], ['AN26', '하헌']]
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
    const outFile = join(OUT, `batch8_e2e_${c.code}.xlsx`)
    writeFileSync(outFile, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(c.code)) ?? wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    let ok = 0
    const bad = []
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
      ? ` engine=${v.values}${v.grid ? ` grid=${v.grid}` : ''} media:${v.mediaOk ? 'OK' : 'NG'} merges:${v.mergesOk ? 'OK' : 'NG'} 수식:${v.formulaSafe === false ? '차단됨' : 'OK'}`
      : ''
    const g = exp.guard
    if (g) {
      for (const h of g.skippedFormula) console.log(`   ⚠️수식 차단 ${h.cell} [${h.ctx}] ${h.detail}`)
      if (g.mergeRedirects.length) console.log(`   · 병합 앵커 리다이렉트 ${g.mergeRedirects.length}건`)
    }
    console.log(`${bad.length === 0 ? '✓' : '✗'} ${c.code} [시트 "${ws.name}"] 셀 ${ok}/${checks.length}${verify} → ${outFile}`)
    if (exp.unmapped && exp.unmapped.length) console.log(`   unmapped: ${exp.unmapped.join(', ')}`)
    for (const b of bad) console.log(`   ✗ ${b}`)
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${passForms}/${CASES.length} 통과`)
