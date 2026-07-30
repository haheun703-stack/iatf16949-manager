// ============================================================
// scripts/e2e-batch4.mjs — 4배치 진행 13종 E2E (2026-07-29)
//
// 방식 = e2e-batch1.mjs 와 동일(웹서버 :8080·복사본/검증 DB): 로그인 → 제출 → export →
// 다운로드 → ExcelJS 재판독 → 기대 셀값 검증. 선행·실행법은 e2e-batch1.mjs 머리주석 참조.
// 실행: node scripts/e2e-batch4.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch4_e2e_<code>.xlsx + 콘솔 셀검증 표
// ============================================================
import ExcelJS from 'exceljs'
import { writeFileSync, mkdirSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'captures')
mkdirSync(OUT, { recursive: true })

const BASE = process.env.E2E_BASE || 'http://127.0.0.1:8080' // 검수 M: 라이브(8080) 오염 방지 — 검증은 E2E_BASE=…:8081
const LOGIN = process.argv[2]
const PW = process.argv[3] || 'qms1234'
if (!LOGIN) {
  console.error('사용법: node scripts/e2e-batch4.mjs <로그인이름> [비번]')
  process.exit(1)
}

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const D = '2026-07-29'
const CASES = [
  {
    code: 'L1200-07',
    values: {
      rows: [
        { 마운트: '○', 블록볼트: '○', 고정핀: '○', 외관: '○', 비고: 'E2E' },
        { 마운트: '○', 블록볼트: '△', 고정핀: '○', 외관: '○', 비고: '' }
      ],
      details: [{ 특이사항: '1분기 이상 없음' }, { 특이사항: '블록 고정 볼트 1개소 재체결' }]
    },
    expect: [
      ['B8', '○'], ['C8', '○'], ['D8', '○'], ['E8', '○'], ['F8', 'E2E'], ['B9', '이상 없음'],
      ['C10', '△'], ['B11', '재체결']
    ]
  },
  {
    code: 'L1200-10',
    values: {
      rows: [
        {
          no: '1', 담당: '정은제', 업체명: 'SW테크', 활용여부: 'A', 차종: 'NX4', 자산관리no: 'AM-JG-001',
          assy품번: '25450-07870', 단품품번: '25450-07871', eo_no: 'EO-2607', 품명: 'PIPE ASSY',
          설비명: '리크검사기 지그', 공정명: '리크검사', set수: '1', 재질: 'S45C', 중량: '12.5',
          size: '300x200x150', 시행일: '2024-03-13', 제작처: '자작', 현보관처: '자작', 이전보관처: '-', 비고: 'E2E'
        },
        { no: '2', 담당: '정은제', 업체명: 'SW테크', 활용여부: 'B', 차종: 'NX4', 자산관리no: 'AM-JG-002', 품명: '용접 지그' }
      ]
    },
    expect: [
      ['A6', '1'], ['C6', 'SW테크'], ['D6', 'A'], ['F6', 'AM-JG-001'], ['G6', '25450-07870'],
      ['K6', '리크검사기 지그'], ['O6', '12.5'], ['Q6', '2024-03-13'], ['U6', 'E2E'],
      ['A7', '2'], ['D7', 'B'], ['J7', '용접 지그']
    ]
  },
  {
    code: 'J1102-02',
    values: {
      rows: [
        { no: '1', 근거: '용접부 기밀 유지(리크 안전)', 시방: '리크량 0.5cc/min 이하', 분류: 'SC', 공정제품: '제품' },
        { no: '2', 근거: '브레이징 용입 깊이', 시방: '용입율 80% 이상', 분류: 'CC', 공정제품: '공정' }
      ]
    },
    expect: [
      ['A12', '1'], ['B12', '기밀 유지'], ['E12', '0.5cc/min'], ['G12', 'SC'], ['H12', '제품'],
      ['A13', '2'], ['B13', '용입 깊이'], ['G13', 'CC']
    ]
  },
  {
    code: 'J1102-03',
    values: {
      부품번호: '25450-07870', 개정수준: 'Rev.3',
      rows: [
        { 예: '○', 코멘트: '', 책임자: '', 기한: '' },
        { 예: '○' },
        { 아니오: '○', 코멘트: '공정흐름도 개정분 반영 필요', 책임자: '김문정', 기한: '08/15' }
      ],
      개정일자: D, 작성자: LOGIN
    },
    expect: [
      ['E8', '25450-07870'], ['S8', 'Rev.3'],
      ['N11', '○'], ['N12', '○'], ['O13', '○'], ['Q13', '공정흐름도'], ['R13', '김문정'], ['S13', '08/15'],
      ['R34', '2026'], ['R37', LOGIN]
    ]
  },
  {
    code: 'K1200-04-01',
    values: {
      평가사업부: '정밀인발튜브 사업부', 대상기간: '2026 상반기', 평가일자: D, 평가자: '노성현',
      납기준수: '9', 수량착오: '10', 수입검사결과: '9', 부적합건수: '8', claim건수: '10',
      환경인증: '5', 안전보호구: '3', 작업장환경: '2', 리스크평가: '34', 총평점: '90',
      평가자의견: '납기·품질 안정. 부적합 1건(6월) 재발 방지 대책 확인 완료.', 비고: 'E2E',
      작성자: LOGIN
    },
    expect: [
      ['B5', '정밀인발튜브'], ['G5', '2026 상반기'], ['B6', '2026'], ['G6', '노성현'],
      ['K8', '9'], ['K9', '10'], ['K12', '10'], ['K16', '34'], ['K20', '90'],
      ['B23', '재발 방지'], ['B28', 'E2E'], ['G2', LOGIN]
    ]
  },
  {
    code: 'H3200-01',
    values: {
      rows: [
        {
          no: '1', 대응자: '이백범', 접수일자: '07/28', 접수유형: '전화', 고객사명: '삼보모토스',
          고객담당자: '박담당', 불만내용: '외관 찍힘 혼입', 대응일자: '07/28', 대응지: '고객사',
          귀책처지원: '무', 투입인원: '2', 시작시각: '09', 종료시각: '13', 선별수량: '1,200',
          귀책처: '당사', 귀책공정: '포장', 귀책작업자: '-', 불량lot: '2607250A', 불량원인: '용기 완충재 미사용',
          고객요청: '재발 방지 대책서 제출', 귀책통보: '유', 개선방안: '완충재 사용 기준 작업표준 추가',
          차량유지비: '5'
        },
        { no: '2', 대응자: '김문정', 접수일자: '07/29', 접수유형: '메일', 고객사명: '삼보모토스', 불만내용: '식별표 오기', 선별수량: '400' }
      ],
      details: [{ 불량수량: '3', 기타경비: '2' }, { 불량수량: '0' }]
    },
    expect: [
      ['A5', '1'], ['B5', '이백범'], ['C5', '07/28'], ['E5', '삼보모토스'], ['G5', '찍힘'],
      ['L5', '09'], ['O5', '13'], ['R5', '1,200'], ['R6', '3'], ['U5', '당사'], ['Y5', '완충재'],
      ['AA5', '대책서'], ['AD5', '작업표준'], ['AF5', '5'], ['AF6', '2'],
      ['A7', '2'], ['G7', '식별표 오기'], ['R7', '400'], ['R8', '0']
    ]
  },
  {
    code: 'F2100-05-01',
    values: { 공정명: '리크검사', 작업자명: '박작업', 평가자: '김상수', 평가일자: D, 점수: '95' },
    expect: [['F4', '리크검사'], ['F5', '박작업'], ['F6', '김상수'], ['V5', '2026'], ['V6', '95']]
  },
  {
    code: 'F2100-05-02',
    values: { 평가일자: D, 소속: '생산팀', 성명: '박작업' },
    expect: [['F6', '2026'], ['P6', '생산팀'], ['Z6', '박작업']]
  },
  {
    code: 'B2100-04',
    values: {
      rows: [
        {
          등록일: '07/29', 업체구분: '당사', 차종: 'NX4', 품명품번: 'PIPE ASSY(25450-07870)',
          발생날짜: '07/15', 문제유형: '리크/리크검사', 담당자: '이백범',
          문제내용: '리크 불량률 월 0.3% 지속 — 브레이징 조건 산포', 대책내용: '조건관리 기준 재설정(8D 진행)',
          review: '7월 3주차 리뷰 — 조건 A안 적용 중', 목표일: '09/30', 완료일: '', 추진담당: '김상수'
        },
        { 등록일: '07/29', 업체구분: '외주', 차종: 'NX4', 품명품번: 'BRKT(25450-07201)', 발생날짜: '07/20', 문제내용: '도금 두께 하한 근접', 목표일: '08/31' }
      ]
    },
    expect: [
      ['B12', '07/29'], ['C12', '당사'], ['F12', '25450-07870'], ['J12', '이백범'],
      ['K12', '브레이징 조건 산포'], ['L12', '8D'], ['N12', '09/30'], ['P12', '김상수'],
      ['B16', '07/29'], ['C16', '외주'], ['K16', '도금 두께'], ['N16', '08/31']
    ]
  },
  {
    code: 'B2100-05',
    values: {
      rows: [
        {
          등록일: '07/29', 업체구분: '당사', 차종: 'NX4', 품번: '25450-07870', 발생날짜: '07/29',
          문제유형: '외관/포장', 담당자: '김문정', 문제내용: '식별표 부착 위치 산포',
          대책내용: '부착 지그 제작', 공장장지시: '금주 내 완료', review: '지그 발주 완료',
          선별결과: '양품 확인', 완료일: '', 추진담당: '박포장'
        },
        { 등록일: '07/29', 업체구분: '당사', 품번: '25450-07201', 문제내용: '용기 라벨 탈락', 추진담당: '박포장' }
      ]
    },
    expect: [
      ['B10', '07/29'], ['C10', '당사'], ['F10', '25450-07870'], ['J10', '김문정'],
      ['K10', '식별표 부착'], ['M10', '금주 내'], ['O10', '양품 확인'], ['R10', '박포장'],
      ['B14', '07/29'], ['K14', '라벨 탈락'], ['R14', '박포장']
    ]
  },
  {
    code: 'F1100-04',
    values: {
      rows: [
        {
          프로세스: '생산관리', 표준번호: '-', 개정일: '2024.03', 문서명: '브레이징 조건 기술 자료집',
          출처: '당 사 (티피씨)', 입수유형: 'PDF', 매체: '전산 파일', 사업부명: 'AM사업부',
          부서명: '품질보증팀', 등록일자: '26.07.29', 사용팀: '생산팀'
        },
        { 프로세스: '품질관리', 문서명: 'SQ 평가 기준 해설(2026)', 출처: '현대차그룹', 입수유형: 'PDF', 매체: '전산 파일', 등록일자: '26.07.29', 사용팀: '전부서' }
      ]
    },
    expect: [
      ['A6', '생산관리'], ['D6', '2024.03'], ['E6', '브레이징 조건'], ['F6', '티피씨'],
      ['I6', 'AM사업부'], ['K6', '26.07.29'], ['L6', '생산팀'],
      ['A7', '품질관리'], ['E7', 'SQ 평가 기준'], ['L7', '전부서']
    ]
  },
  {
    code: 'B1100-12',
    values: {
      rows: [
        {
          no: '1', 발생일: '07-29', 품번: '25450-07870', lot: 'B0729-1', 발생공정: '리크검사',
          불량내용: '리크 0.7cc/min(기준 0.5↓)', 발생수량: '1', 가능여부: '가능(기준표 QM-25-112)',
          리워크방법: '재브레이징', 리워크자: '박작업', 재검사일: '07-29', 재검결과: '리크 0.2cc/min 적합',
          재검사자: '김검사', 판정: '복귀', 폐기수량: '0', 리워크lot: 'B0729-1R', 비고: '작업자≠재검사자'
        },
        { no: '2', 발생일: '07-29', 품번: '25450-07201', lot: 'B0729-2', 발생공정: '수몰리크', 불량내용: '기포 발생', 발생수량: '2', 판정: '폐기', 폐기수량: '2' }
      ]
    },
    expect: [
      ['A4', '1'], ['B4', '07-29'], ['C4', '25450-07870'], ['F4', '0.7cc/min'], ['H4', 'QM-25-112'],
      ['L4', '0.2cc/min'], ['N4', '복귀'], ['P4', 'B0729-1R'], ['Q4', '재검사자'],
      ['A5', '2'], ['E5', '수몰리크'], ['N5', '폐기'], ['O5', '2']
    ]
  },
  {
    code: 'B1100-13',
    values: {
      rows: [
        {
          no: 'NC-0729-01', 발생일: '07-29', 발생공정: '리크검사', 품번: '25450-07870', lot: 'B0729-1',
          불량내용: '리크 NG', 발생수량: '3', 격리확인: '○', 재검사: '07-29/김검사',
          재검결과: '2EA 재현NG, 1EA 오판정', 폐기수량: '2', 리워크수량: '0', 복귀수량: '1',
          처리완료일: '07-29', 담당: '김문정', 비고: 'E2E'
        },
        { no: 'NC-0729-02', 발생일: '07-29', 발생공정: '포장', 품번: '25450-07201', 불량내용: '외관 찍힘', 발생수량: '1', 격리확인: '○', 폐기수량: '1', 리워크수량: '0', 복귀수량: '0' }
      ]
    },
    expect: [
      ['A4', 'NC-0729-01'], ['C4', '리크검사'], ['G4', '3'], ['H4', '○'], ['J4', '오판정'],
      ['K4', '2'], ['M4', '1'], ['O4', '07-29'], ['P4', '김문정'],
      ['A5', 'NC-0729-02'], ['F5', '외관 찍힘'], ['K5', '1']
    ]
  }
]

function cellText(v) {
  if (v == null) return ''
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map((t) => t.text).join('')
    if (v.result !== undefined) return String(v.result)
    if (v.text) return String(v.text)
    if (v instanceof Date) return v.toISOString()
    return JSON.stringify(v)
  }
  return String(v)
}

const loginRes = await fetch(`${BASE}/api/auth:login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ name: LOGIN, password: PW })
})
if (!loginRes.ok) {
  console.error('로그인 실패:', await loginRes.text())
  process.exit(1)
}
cookie = (loginRes.headers.get('set-cookie') || '').split(';')[0]
console.log(`로그인: ${LOGIN} ✓`)

let totalOk = 0
let totalChecks = 0
const summary = []
for (const c of CASES) {
  try {
    const created = await api('form:submissionCreate', { formCode: c.code, values: c.values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download)
      throw new Error(`export 실패: ${JSON.stringify(exp).slice(0, 200)}`)
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const outFile = join(OUT, `batch4_e2e_${c.code}.xlsx`)
    writeFileSync(outFile, buf)

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws =
      wb.worksheets.find((w) => w.name.includes(c.code)) ??
      wb.worksheets.find((w) => w.name === '양식') ??
      wb.worksheets[0]
    let ok = 0
    const bad = []
    for (const [addr, want] of c.expect) {
      const got = cellText(ws.getCell(addr).value)
      if (got.includes(want)) ok++
      else bad.push(`${addr}: 기대 "${want}" ↔ 실제 "${got.slice(0, 30)}"`)
    }
    totalOk += ok
    totalChecks += c.expect.length
    const verify = exp.verify ? ` engine=${exp.verify.values} media:${exp.verify.mediaOk ? 'OK' : 'NG'} merges:${exp.verify.mergesOk ? 'OK' : 'NG'}` : ''
    console.log(`${bad.length === 0 ? '✓' : '✗'} ${c.code} [시트 "${ws.name}"] 셀 ${ok}/${c.expect.length}${verify} → ${outFile}`)
    if (exp.unmapped && exp.unmapped.length) console.log(`   unmapped: ${exp.unmapped.join(', ')}`)
    for (const b of bad) console.log(`   ✗ ${b}`)
    summary.push({ code: c.code, ok, total: c.expect.length })
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
    summary.push({ code: c.code, error: e.message })
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${summary.filter((s) => !s.error && s.ok === s.total).length}/${CASES.length} 통과`)
