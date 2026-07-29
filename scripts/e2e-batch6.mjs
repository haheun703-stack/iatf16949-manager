// ============================================================
// scripts/e2e-batch6.mjs — 6배치 진행 17종 E2E (2026-07-29 사무실)
//
// 방식 = e2e-batch5.mjs 와 동일(웹서버 :8080·복사본/검증 DB). 실행:
//   node scripts/e2e-batch6.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch6_e2e_<code>.xlsx + 콘솔 셀검증 표
// 주의: fact 필드는 완료 저장 시 서버가 공란을 차단 — 전 케이스 fact 값 포함.
//       작성자(auto)는 클라 주입 동선이라 values 에 로그인 사용자를 직접 넣는다.
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
if (!LOGIN) { console.error('사용법: node scripts/e2e-batch6.mjs <로그인이름> [비번]'); process.exit(1) }

let cookie = ''
async function api(channel, body) {
  const res = await fetch(`${BASE}/api/${channel}`, {
    method: 'POST', headers: { 'content-type': 'application/json', cookie }, body: JSON.stringify(body || {})
  })
  const json = await res.json().catch(() => null)
  if (!res.ok) throw new Error(`${channel} ${res.status}: ${json && json.error}`)
  return json
}

const D = '2026-07-29'
const CASES = [
  {
    code: 'J1100-14',
    values: { 도면번호: 'TPC-DWG-2607', 부품번호: '25450-07870', 부품명: 'PIPE ASSY', PO번호: 'PO-26-071', EO번호: 'EO-5', EO일자: D, 고객사: '삼보모터스', 최종검토결과: '특이사항 없음 — 양산 적용 가능 판정', 명시내용2면: '노트란 열처리 조건 명시 확인', 검토결과2면: '사내 설비 조건 부합', 개선방안2면: '-', 명시내용3면: '-', 작성자: LOGIN },
    expect: [['AM5', 'TPC-DWG-2607'], ['AM7', '25450-07870'], ['AM9', 'PIPE ASSY'], ['AM11', 'PO-26-071'], ['AM15', '2026'], ['AM17', '삼보'], ['A19', '양산 적용'], ['A28', '열처리'], ['A37', '부합'], ['AN2', LOGIN]]
  },
  {
    code: 'J3100-08',
    values: { rows: [
      { 관리번호: '4M-26-10', 발생일: D, 구분4M: 'Man', 변경내용: '교정반 작업자 교체', 발생원: '생산팀', 유형분류: 'C3(사내승인)', 고객통보필요: '불요', 고객통보일: '-', 고객승인일: '-', 초기유동관리: '3LOT 검사강화', 종결일: '-', 담당: '김생산', 비고: '-' },
      { 관리번호: '4M-26-11', 발생일: '2026-07-28', 구분4M: 'Machine', 변경내용: '인발 3호기 대차 수리', 발생원: '설비수리 대장', 유형분류: 'B2(고객통보)', 고객통보필요: '필요', 고객통보일: '07-28', 고객승인일: '-', 초기유동관리: '5LOT 재검증', 종결일: '-', 담당: '이설비', 비고: '-' }
    ]},
    expect: [['A4', '4M-26-10'], ['C4', 'Man'], ['D4', '작업자 교체'], ['L4', '김생산'], ['A5', '4M-26-11'], ['D5', '대차 수리']]
  },
  {
    code: 'A8100-01',
    values: { 부서명: '품질보증팀', 프로세스명: 'SP-03_부적합 및 개선 프로세스', 작성일자: D, rows: [
      { NO: '1', 분야: '순회 점검', 예상리스크: '점검 누락', 영향: '불량 유출', 심각도: '2', 발생원인: '점검 주기 미준수', 발생도: '2', 현재관리: '주간 점검표', 긴급도: '2', 대응방안: '점검 자동알림 도입', 추가조치: '-' }
    ]},
    expect: [['C2', '품질보증팀'], ['G2', 'SP-03'], ['M2', '2026'], ['A5', '1'], ['B5', '순회 점검'], ['C5', '점검 누락'], ['E5', '2'], ['K5', '자동알림']]
  },
  {
    code: 'M4200-01',
    values: { 측정값01: '420', 측정값02: '415', 측정값03: '410', 측정값04: '435', 측정값05: '440', 측정값06: '425', 측정값07: '405', 측정값08: '430', 측정값09: '412', 측정값10: '418', 측정값11: '422', 측정값12: '428', 측정값13: '433', 측정값14: '450', 작성자: LOGIN },
    expect: [['O23', '420'], ['O25', '415'], ['O35', '405'], ['AF23', '430'], ['AF35', '450'], ['Y2', LOGIN]]
  },
  {
    code: 'M4100-01',
    values: { 점검일자: D, 사업부명: '경영관리실', 점검자: '류형석', 작성자: LOGIN, rows: [
      { 점수: '3', 점검결과: '양호 — 불필요 서류 정리됨' },
      { 점수: '2', 점검결과: '개인 서랍 정리 필요' }
    ]},
    expect: [['E4', '2026'], ['E5', '경영관리실'], ['U5', '류형석'], ['Y2', LOGIN], ['T8', '3'], ['V8', '양호'], ['T9', '2'], ['V9', '서랍']]
  },
  {
    code: 'M4100-02',
    values: { 점검일자: D, 사업부명: '정밀인발튜브사업부 인발반', 점검자: '손진식', 작성자: LOGIN, rows: [
      { 점수: '3', 점검결과: '구획선 양호' },
      { 점수: '2', 점검결과: '치공구 보관 개선 필요' }
    ]},
    expect: [['E4', '2026'], ['E5', '인발반'], ['T8', '3'], ['V9', '치공구']]
  },
  {
    code: 'M4100-03',
    values: { 평가일자: D, 작성일자: D, 사업부: 'AM사업부', 점검자: '류덕환', 시정건의1: '불필요 자재 즉시 반출 요망', 비고1: '-', 시정건의2: '위치 표시 보완', 종합의견: '평점 82점 — 정돈 항목 보완 필요', 작성자: LOGIN },
    expect: [['I4', '2026'], ['I5', 'AM사업부'], ['V5', '류덕환'], ['I7', '즉시 반출'], ['I11', '위치 표시'], ['I27', '82점'], ['X2', LOGIN]]
  },
  {
    code: 'M4100-04',
    values: { 평가일자: D, 작성일자: D, 사업부: 'AM사업부', 점검자: '류덕환', 접수번호: '3S-26-07', 접수자: '김만진', 청정요소: '정돈', 지적사항: '치공구 정위치 이탈 3건', 개선전: '작업대 위 혼재', 시정대책: '정위치 표시 및 섀도보드 설치', 개선후: '섀도보드 운영', 시정일자: '2026-07-30', 작성자: LOGIN },
    expect: [['I4', '2026'], ['I6', '3S-26-07'], ['V6', '김만진'], ['G10', '정돈'], ['B11', '정위치 이탈'], ['M10', '혼재'], ['B25', '섀도보드'], ['G24', '2026']]
  },
  {
    code: 'A1100-01',
    values: { 부서명: '품질보증팀', 사업부장: '서상규', 담당자1: '이선구 부장', 주업무1: '품질보증 총괄·SQ 대응', 담당자2: '류덕환 대리', 주업무2: '수입검사·계측기 관리', 작성자: LOGIN },
    expect: [['F13', '품질보증팀'], ['S11', '서상규'], ['B15', '이선구'], ['C16', 'SQ 대응'], ['I15', '류덕환'], ['J16', '수입검사'], ['AG2', LOGIN]]
  },
  {
    code: 'H2100-01',
    values: { rows: [
      { NO: '1', 구분: '양산', 차종: 'NQ5', 품번: '25450-07870', 규격: 'Φ27.2', 단가: '-', Pallet: '2', 발주량: '1,200', LOT: 'L260729-01', 납품1차: '600', 납품2차: '600', 납품3차: '-', 비고: '-' },
      { NO: '2', 구분: '양산', 차종: 'SG2', 품번: '28236-2MAA0', 규격: 'Φ34', 단가: '-', Pallet: '1', 발주량: '800', LOT: 'L260729-02', 납품1차: '800', 납품2차: '-', 납품3차: '-', 비고: '-' }
    ]},
    expect: [['A5', '1'], ['C5', 'NQ5'], ['D5', '25450-07870'], ['I5', 'L260729-01'], ['J5', '600'], ['D6', '28236-2MAA0']]
  },
  {
    code: 'H2100-02',
    values: { 목표금액: '850,000,000', 작성자: LOGIN },
    expect: [['I5', '850,000,000'], ['CV4', LOGIN]]
  },
  {
    code: 'H3100-05',
    values: { 조사일자: '2026-07-15', 작성일자: D, 조사대상: '전 사업부 종업원', 주관부서: '총무팀', 총원: '72', 평가인원: '68', 참여율: '94.4', 작성자: LOGIN },
    expect: [['E7', '2026'], ['L7', '2026'], ['E8', '전 사업부'], ['E10', '총무팀'], ['K23', '72'], ['K24', '68'], ['K25', '94.4'], ['L8', LOGIN]]
  },
  {
    code: 'H3100-06',
    values: { 작성일자: D, 작성자: LOGIN, rows: [
      { 세부추진항목: '하계 휴가비 지원', 추진일정: '8월 1주', 소요비용: '12,000,000' },
      { 세부추진항목: '명절 상여', 추진일정: '9월', 소요비용: '-' }
    ]},
    expect: [['D3', '2026'], ['D5', '휴가비'], ['E5', '8월 1주'], ['F5', '12,000,000'], ['D6', '명절'], ['I23', LOGIN]]
  },
  {
    code: 'H3100-07',
    values: { 작성일자: D, 작성자: LOGIN, rows: [
      { 세부추진항목: '하계 휴가비 지원', 추진결과: '전 인원 지급 완료', 조치계획: '-' }
    ]},
    expect: [['D3', '2026'], ['D5', '휴가비'], ['E5', '지급 완료'], ['I23', LOGIN]]
  },
  {
    code: 'K1100-01',
    values: { 업체명: '포스코스틸리온', 주소: '경북 포항시', 전화: '054-000-0000', 팩스: '054-000-0001', 담당자: '박구매', 작성일자: D, 납기: '2026-08-10' },
    expect: [['D5', '포스코'], ['D6', '포항'], ['D9', '박구매'], ['D10', '2026'], ['D11', '08-10']]
  },
  {
    code: 'B2300-08',
    values: { 작성자: LOGIN, rows: [
      { 결과TSW01: 'O', 결과TSW02: 'O', 결과TSW03: 'X' },
      { 결과TSW01: 'O', 결과TSW02: 'O', 결과TSW03: 'O' },
      { 결과TSW01: 'X', 결과TSW02: 'O', 결과TSW03: 'O' }
    ]},
    expect: [['AB7', 'O'], ['AN7', 'X'], ['AB8', 'O'], ['AB9', 'X'], ['AQ2', LOGIN]]
  },
  {
    code: 'L-4101-01',
    values: { 고객사: '삼보모터스', 공정명: '8축자동용접기', 부품명: 'LX3 XRT FRT', 품번: '004972028005', 측정POINT: 'Hole 단차', 품질특성: '치수', 규격: '3', 공차상한: '0.2', 공차하한: '0.2', 시료수: 'n = 5', 측정기기: 'HEIGHT GAGE', 측정자: '김문정', 측정단위: '0.01', 작성기간: '2026.07~', 작성부서: '품질보증팀', 작성자: LOGIN },
    expect: [['C2', '삼보'], ['C3', '8축'], ['C5', '004972028005'], ['C8', '3'], ['C12', 'HEIGHT'], ['C17', LOGIN]]
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
console.log(`로그인: ${LOGIN} ✓`)

let totalOk = 0, totalChecks = 0
const summary = []
for (const c of CASES) {
  try {
    const created = await api('form:submissionCreate', { formCode: c.code, values: c.values, createdBy: LOGIN })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download) throw new Error(`export 실패: ${JSON.stringify(exp).slice(0, 200)}`)
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const outFile = join(OUT, `batch6_e2e_${c.code}.xlsx`)
    writeFileSync(outFile, buf)
    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(buf)
    const ws = wb.worksheets.find((w) => w.name.includes(c.code)) ?? wb.worksheets.find((w) => w.name === '양식') ?? wb.worksheets[0]
    let ok = 0
    const bad = []
    for (const [addr, want] of c.expect) {
      const got = cellText(ws.getCell(addr).value)
      if (got.includes(want)) ok++
      else bad.push(`${addr}: 기대 "${want}" ↔ 실제 "${got.slice(0, 30)}"`)
    }
    totalOk += ok; totalChecks += c.expect.length
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
