// ============================================================
// scripts/e2e-batch5.mjs — 5배치 진행 11종 E2E (2026-07-29)
//
// 방식 = e2e-batch1.mjs 와 동일(웹서버 :8080·복사본/검증 DB). 실행:
//   node scripts/e2e-batch5.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch5_e2e_<code>.xlsx + 콘솔 셀검증 표
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
if (!LOGIN) { console.error('사용법: node scripts/e2e-batch5.mjs <로그인이름> [비번]'); process.exit(1) }

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
    code: 'B2300-02',
    values: { rows: [
      { 점검일자: '07/28', 점검의견: '검사대 조명 저하 — 교체 필요', 점검장소: 'TSW01 검사대', 문제점: '조도 기준 미달', 개선담당: '김상수' },
      { 점검일자: '07/29', 점검의견: '표준서 게시 최신본 확인', 점검장소: '로봇스폿 1호', 문제점: '-', 개선담당: '-' }
    ]},
    expect: [['C5','07/28'], ['H5','조명 저하'], ['O5','TSW01'], ['T5','조도 기준'], ['AU5','김상수'], ['C6','07/29'], ['H6','표준서 게시']]
  },
  {
    code: 'B2300-03',
    values: { 사업부명: 'AM사업부', 품목: 'PIPE ASSY', 점검일자: D, 점검자: '이백범', 점검품목: '25450-07870', 점검대응자: '김상수', 특이사항: '인라인 불량 현황 7월분 반영' },
    expect: [['G7','AM사업부'], ['R7','PIPE ASSY'], ['AC7','2026'], ['AN7','이백범'], ['G8','25450-07870'], ['AN8','김상수'], ['G9','7월분']]
  },
  {
    code: 'B2300-04',
    values: { 제안일자: D, 제안부서: '생산팀', 제안자: '박작업', 문제점내용: '검사대 위 잔여 부자재가 혼입 위험을 만든다', 개선내용: '검사대 정위치 트레이 설치 및 종료 시 클리어 규칙' },
    expect: [['F4','2026'], ['W4','생산팀'], ['AN4','박작업'], ['D9','혼입 위험'], ['AB9','트레이 설치']]
  },
  {
    code: 'B2300-05',
    values: { 작성일자: D, 작성자: '이백범', 회의일시: '07/29 14:00', 회의장소: '품질회의실', 제안부서: '생산팀', 제안자: '박작업', 개선내용: '검사대 정위치 트레이 설치안 타당성 검토' },
    expect: [['F4','2026'], ['AE4','이백범'], ['F5','14:00'], ['AE5','품질회의실'], ['F6','생산팀'], ['AE6','박작업'], ['A8','트레이 설치안']]
  },
  {
    code: 'B2300-06',
    values: { 품번: '25450-07870', 품명: 'PIPE ASSY', 문제확인일자: D, 개선일자: '07/20', 평가일자: '07/29', 문제내용: '식별표 부착 위치 산포로 오식별 우려', 문제점설명: '수작업 부착 기준 부재', 생산일자: '07/25', 생산수량: '1,200', 불량수량: '0' },
    expect: [['A5','25450-07870'], ['I5','PIPE ASSY'], ['Q5','2026'], ['Y5','07/20'], ['AG5','07/29'], ['A7','오식별'], ['A15','기준 부재'], ['AN20','07/25'], ['AR20','1,200'], ['AV20','0']]
  },
  {
    code: 'B2300-07',
    values: { 발생원인: '설비/지그 셋팅 미흡', 원인유형: '관리부실', 개선전: '셋팅값 구두 전달 — 조별 산포 발생', 개선후: '셋팅 기준표 게시 + 체인지 포인트 기록 의무화', 비고: '7월 사례' },
    expect: [['C6','셋팅 미흡'], ['G6','관리부실'], ['K6','구두 전달'], ['AB6','기준표 게시'], ['AS6','7월 사례']]
  },
  {
    code: 'L2300-04',
    values: { rows: [
      { 등록번호: 'MS-26-01', ok: '○', ng: '', 내용: '리크 한도', 검출내용: '미세 리크 식별', 라인: 'TSW01', 공정: '리크검사', 제작일자: '26.07.01', 유효기간: '27.06.30', 차기제작: '27.06', 비고: 'E2E' },
      { 등록번호: 'MS-26-02', ok: '', ng: '○', 내용: '외관 NG 한도', 검출내용: '찍힘 한도', 라인: 'TSW02', 공정: '외관검사', 제작일자: '26.07.15', 유효기간: '27.07.14', 차기제작: '27.07', 비고: '' }
    ]},
    expect: [['B6','MS-26-01'], ['C6','○'], ['F6','리크 한도'], ['G6','미세 리크'], ['H6','TSW01'], ['J6','26.07.01'], ['K6','27.06.30'], ['M6','E2E'], ['B7','MS-26-02'], ['D7','○'], ['G7','찍힘 한도']]
  },
  {
    code: 'L4101-01',
    values: { 장비명: 'TSW-01', 관리항목: '외경', 측정기: '버니어캘리퍼스', 공정명: '자동용접', 시료수: '5개', 기간: '7월1일~7월31일', 스펙하한: '0.5', 스펙상한: '1.5', 측정자: '김상수' },
    expect: [['E4','TSW-01'], ['M4','외경'], ['U4','버니어캘리퍼스'], ['E5','자동용접'], ['M5','5개'], ['U5','7월1일'], ['AK4','0.5'], ['AL4','1.5'], ['AK5','김상수']]
  },
  {
    code: 'B2200-05',
    values: {
      대상연도: '2026', 공정목표: '1000', 고객목표: '50', 외주목표: '500',
      rows: [
        { 공정생산: '82000', 공정불량: '95', 납품수량: '80000', 고객불량: '2', 외주입고: '41000', 외주불량: '15', 워스트: '리크불량(5Why 첨부)', 대책no: 'CA-26-07', 경영보고: '○ 07-31' }
      ]
    },
    expect: [['B3','2026'], ['G3','1000'], ['H3','50'], ['I3','500'], ['B5','82000'], ['C5','95'], ['E5','80000'], ['F5','2'], ['H5','41000'], ['I5','15'], ['L5','리크불량'], ['M5','CA-26-07'], ['N5','07-31']]
  },
  {
    code: 'F1101-03',
    values: {
      성명: '신입일', 입사일: D, 배치부서: '생산팀', 멘토: '박작업',
      rows: [
        { no: '1', 구분: '안전', 항목: '(관리팀 표준 목록 확정 전 — E2E 검증행)', 확인일: '07/29', 확인자: '박작업', 비고: '' },
        { no: '2', 구분: '품질', 항목: '(동일)', 확인일: '', 확인자: '', 비고: '' }
      ]
    },
    expect: [['B3','신입일'], ['D3','2026'], ['F3','생산팀'], ['B4','박작업'], ['A6','1'], ['B6','안전'], ['C6','E2E 검증행'], ['D6','07/29'], ['E6','박작업'], ['A7','2'], ['B7','품질']]
  },
  {
    code: 'F1101-04',
    values: {
      성명: '신입관', 입사일: D, 배치부서: '품질보증팀', 멘토: '이백범',
      rows: [{ no: '1', 구분: '시스템', 항목: '(관리팀 표준 목록 확정 전 — E2E 검증행)', 확인일: '07/29', 확인자: '이백범', 비고: '' }]
    },
    expect: [['B3','신입관'], ['F3','품질보증팀'], ['B4','이백범'], ['A6','1'], ['B6','시스템'], ['E6','이백범']]
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
    const outFile = join(OUT, `batch5_e2e_${c.code}.xlsx`)
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
