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
  },
  {
    // 0123: D1100-03 — 문서형(헤더 5 + 대형 textarea 4)
    code: 'D1100-03',
    values: {
      훈련일자: '2026-07-31', 주관부서: '품질보증팀', 참석인원: '12명', 참석대상: '전 팀장·생산 반장',
      훈련구분: '정기', 목적: '제품 안전(PSCR) 인식 제고', 내용: 'PSCR 항목·안전 특성 관리 교육',
      훈련결과: '이해도 평가 평균 92점', 참석자: '별첨 명단 참조'
    },
    expect: [['V4', '품질보증팀'], ['F5', '12명'], ['F6', '전 팀장'], ['F7', '정기'],
      ['F8', 'PSCR'], ['F13', '안전 특성'], ['F27', '92점'], ['F32', '별첨 명단']]
  },
  {
    // 0123: K2100-04 — 재고 grid 27행 + 합계 SUM 보존
    code: 'K2100-04',
    values: {
      작성기준일: '2026-07-31', 부서명: '구매팀', 작성자: LOGIN,
      rows: (() => { const r = Array.from({ length: 27 }, () => ({})); r[0] = { 구분: '제품', 강종: 'STKM11A', od: '60.5', t: '2.3', 길이: '1250', 재고: '120', 중량: '4,300', 단가: '1,200', 금액: '5,160,000', 보관장소: '2공장' }; r[26] = { 구분: '말행' }; return r })(),
      실사중량: '07/31 실사중량'
    },
    expect: [['F4', '구매팀'], ['I4', LOGIN], ['B7', '제품'], ['C7', 'STKM11A'], ['G7', '120'],
      ['K7', '2공장'], ['B33', '말행'], ['J35', '07/31']],
    expectFormula: [['G34', 'SUM(G7:G33)'], ['J34', 'SUM(J7:J33)']]
  },
  {
    // 0123: F2100-07 — 평가 grid(4항목×월 12 병합 칸)
    code: 'F2100-07',
    values: {
      연도: '2026',
      rows: [
        { 평가항목: '작업표준', 주기: '1회/12개월', 월4: '○', 달성율: '100%' },
        {}, {},
        { 평가항목: '말행 항목', 월12: '○' }
      ]
    },
    expect: [['F1', '2026'], ['C6', '작업표준'], ['R6', '1회/12개월'], ['AB6', '○'], ['AT6', '100%'],
      ['C9', '말행 항목'], ['AR9', '○']]
  },
  {
    // 0123: K2100-09 — 소모품 grid 4행
    code: 'K2100-09',
    values: {
      rows: [
        { 구분: '알곤', 사양: '순도 99.99%', 공급사: '대성가스 051-222-3333', 소요일: '2일', 비고: '-' },
        {}, {},
        { 구분: '말행' }
      ]
    },
    expect: [['B5', '알곤'], ['P5', '99.99%'], ['Y5', '대성가스'], ['AH5', '2일'], ['AQ5', '-'], ['B8', '말행']]
  },
  {
    // 0123: L3101-01 — 계획/실시 2행 블록 12개(NO 수식 보존)
    code: 'L3101-01',
    values: {
      부서명: '품질보증팀', 작성일자: '2026-07-31', 연도: '( 2026 ) 년',
      plan: (() => { const r = Array.from({ length: 12 }, () => ({})); r[0] = { 차종: '2R000', 품번: '25410-2R000', 품명: '토크로드', 계측기: '버니어캘리퍼스', 대상자: '김검사', 항목: '외경', 규격: 'Φ60.5±0.5', 월3: '○' }; r[11] = { 차종: '말행' }; return r })(),
      actual: [{ 월3: '●' }]
    },
    expect: [['D3', '품질보증팀'], ['J4', '( 2026 ) 년'], ['C6', '2R000'], ['D6', '25410-2R000'],
      ['F6', '버니어'], ['G6', '김검사'], ['L6', '○'], ['C28', '말행'], ['L7', '●']],
    expectFormula: [['A6', 'B6']]
  },
  {
    // 0123: L3100-03 — 자동조회 계열(관리번호 키 입력·B~G VLOOKUP #REF! 보존)
    code: 'L3100-03',
    values: {
      제목: '(2026)년 계측기 검교정 계획서', 작성일자: '2026-07-31', 작성자: LOGIN,
      rows: (() => { const r = Array.from({ length: 23 }, () => ({})); r[0] = { 관리번호: 'MI-001', 월2: '○', 비고: '-' }; r[22] = { 관리번호: '말행', 월12: '○' }; return r })()
    },
    expect: [['C1', '2026'], ['F4', LOGIN], ['A7', 'MI-001'], ['I7', '○'], ['T7', '-'],
      ['A29', '말행'], ['S29', '○']],
    expectFormula: [['B7', 'VLOOKUP'], ['G13', 'VLOOKUP']]
  },
  {
    // 0123: A5100-01 — 3개년×분기 매트릭스(공정 12칸 + 시스템 2행 블록 9)
    code: 'A5100-01',
    values: {
      작성일: '작 성 일 : 2026.07.31', 연도1: '2026년', 연도2: '2027년', 연도3: '2028년',
      공정q1: '●', 공정q12: '○',
      sys: (() => { const r = Array.from({ length: 9 }, () => ({})); r[0] = { q1: '●', 부서: '총무팀' }; r[8] = { q12: '○', 부서: '구매팀' }; return r })()
    },
    expect: [['A6', '2026.07.31'], ['O8', '2026년'], ['W8', '2027년'], ['AE8', '2028년'],
      ['O12', '●'], ['AK12', '○'], ['O17', '●'], ['AM17', '총무팀'], ['AK33', '○'], ['AM33', '구매팀']]
  },
  {
    // 0123: A8101-02 — 좌측 빈 틀 14칸(우측 작성례 보존)
    code: 'A8101-02',
    values: {
      제목: '화재 비상사태 대비 훈련결과보고서', 목적: '화재 발생 시 초동 대응력 확보', 목표: '전원 5분 내 대피',
      훈련형태: '■ 실전훈련', 실시일자: '2026-07-31', 주관팀: '총무팀', 장소: '2공장', 동원장비: '소화기 6대',
      참석인원: '총 15명', 참관감독: '-', 상황전파: 'ㆍ상황전파 : 비상벨 및 방송',
      시나리오: '조관장 배전반 화재 발생 가정', 훈련내용: '초기 진화·대피·인원 점검', 참석자명단: '별첨'
    },
    expect: [['B1', '화재'], ['B3', '초동 대응력'], ['B4', '5분'], ['B5', '실전훈련'], ['E6', '총무팀'],
      ['G6', '2공장'], ['C7', '소화기'], ['C8', '15명'], ['C9', '-'], ['B10', '비상벨'],
      ['B11', '배전반'], ['B16', '초기 진화'], ['B18', '별첨']]
  },
  {
    // 0123: A8101-04 — 헤더 4 + 참석자 좌/우 + 회의명·내용
    code: 'A8101-04',
    values: {
      문서번호: 'TPC-A-2026-07', 작성일자: '2026-07-31', 주관부서: '총무팀', 작성자: LOGIN,
      참석자: [
        { 소속1: '총무팀', 직급1: '팀장', 성명1: '김총무', 소속2: '생산팀', 직급2: '부장', 성명2: '손진식' },
        {}, {},
        { 소속1: '품질보증팀', 성명1: '말행' }
      ],
      회의명: '1.회   의  명 : 2026 상반기 비상계획 검토', 회의내용: '비상 연락체계 현행화·훈련 결과 반영'
    },
    expect: [['E4', 'TPC-A-2026-07'], ['E5', '총무팀'], ['P5', LOGIN], ['D7', '총무팀'], ['L7', '김총무'],
      ['S7', '생산팀'], ['AA7', '손진식'], ['D10', '품질보증팀'], ['A11', '비상계획 검토'], ['A13', '연락체계']]
  },
  {
    // 0123: K1200-05 — 평가자 grid + 득점 grid(19행) + 의견 3
    code: 'K1200-05',
    values: {
      평가업체명: '(주)대성정밀', 평가일자: '2026-07-31',
      평가자: [{ 소속: '품질보증팀', 직위: '차장', 성명: '김기범' }, {}, { 소속: '구매팀', 성명: '박구매' }],
      scores: (() => { const r = Array.from({ length: 19 }, () => ({})); r[0] = { 득점: '5' }; r[18] = { 득점: '3' }; return r })(),
      의견품질: '품질 시스템 양호', 의견개발: '기술 대응력 보통', 의견구매: '납기 준수 우수'
    },
    expect: [['E5', '대성정밀'], ['E7', '품질보증팀'], ['L7', '차장'], ['S7', '김기범'], ['E9', '구매팀'],
      ['AF13', '5'], ['AF31', '3'], ['E34', '품질 시스템'], ['E37', '기술 대응력'], ['E40', '납기 준수']]
  },
  {
    // 0123: J1102-01 — 관리계획서 갑지 표지 12칸
    code: 'J1102-01',
    values: {
      업체명: '(주)태평양', 차종: '2R000', 부품명: '토크로드 파이프', 부번: '25410-2R000',
      팀원: '김기범·손진식·하헌', 업체코드: 'TPC-01', 제정일자: ' 제정일자 : 2026-07-31',
      개정일자: '2026-07-31', 개정사유: '제정', 개정작성: '하헌', 개정검토: '김기범', 개정승인: '서상규'
    },
    expect: [['D2', '태평양'], ['G3', '2R000'], ['G5', '토크로드'], ['G7', '25410-2R000'],
      ['G9', '김기범'], ['D11', 'TPC-01'], ['T3', '2026-07-31'], ['L4', '2026-07-31'],
      ['M4', '제정'], ['O4', '하헌'], ['P4', '김기범'], ['Q4', '서상규']]
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
