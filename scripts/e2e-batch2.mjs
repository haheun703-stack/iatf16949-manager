// ============================================================
// scripts/e2e-batch2.mjs — 2배치 진행 8종 E2E (2026-07-28 저녁, 조건부 출발)
//
// 방식 = e2e-batch1.mjs 와 동일(웹서버 :8080·복사본 DB): 로그인 → 제출 → export →
// 다운로드 → ExcelJS 재판독 → 기대 셀값 검증. 선행·실행법은 e2e-batch1.mjs 머리주석 참조.
// 실행: node scripts/e2e-batch2.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch2_e2e_<code>.xlsx + 콘솔 셀검증 표
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
if (!LOGIN) {
  console.error('사용법: node scripts/e2e-batch2.mjs <로그인이름> [비번]')
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

const D = '2026-07-28'
const CASES = [
  {
    code: 'A2200-03',
    values: {
      작성일: D, 수신처: '각 사업부장·팀장', 검토일시: '2026-07-28 14:00',
      참석대상: '대표이사, 부사장, 각 사업부 사업부장',
      items: [
        { 항목: '품질목표(KPI) 달성도', 지적사항: '월별 실적 2건 미달 — 개선계획 수립 지시', 비고: '8월 재검토' },
        { 항목: '내부심사 결과', 지적사항: '지적 3건 시정조치 완료 확인', 비고: '' }
      ],
      검토내용: '2026년 상반기 QMS 운영 실적 검토 — 전반 적합, KPI 2건 개선 지시',
      특기사항: '없음', 작성자: LOGIN
    },
    expect: [
      ['P4', '2026-07-28'], ['F5', '각 사업부장'], ['P5', '14:00'], ['F6', '대표이사'],
      ['C8', 'KPI'], ['M8', '개선계획'], ['AA8', '8월'], ['C11', '내부심사 결과'],
      ['F698', '상반기 QMS'], ['F706', '없음'], ['W2', LOGIN]
    ]
  },
  {
    code: 'F1100-01',
    values: {
      작성일자: D, 작성자: LOGIN,
      rows: [
        {
          구분: '사내', 과정명: 'IATF 16949 내부심사원 양성', 내용: '심사 기법·체크리스트 실습',
          시간: '8H', 대상: '품질팀', 기관: '사내', 월7: '○', 월10: '○', 비용: '-', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['B3', '2026-07-28'], ['E3', LOGIN],
      ['A7', '사내'], ['B7', 'IATF 16949'], ['M7', '○'], ['P7', '○'], ['S7', '-'], ['T7', 'E2E']
    ]
  },
  {
    code: 'F2100-10',
    values: { 이름1: '장석봉', 이름2: '예지용', 이름3: '', 특이사항: '신규 배치자 2명 평가(E2E)', 작성자: LOGIN },
    expect: [['L7', '장석봉'], ['M7', '예지용'], ['V8', '신규 배치자'], ['W2', LOGIN]]
  },
  {
    code: 'L1100-01',
    values: { 품명: 'CNC밴딩 M/C 3호 증설', 차종: 'NX4 HEV', 목적: '증산 대응 밴딩 설비 신규 제작' },
    expect: [['H5', 'CNC밴딩'], ['H7', 'NX4 HEV'], ['H9', '증산 대응']]
  },
  {
    code: 'L1100-09',
    values: {
      설비번호: 'TC-021', 설비명: 'CNC밴딩 M/C 2호',
      rows: [{ no: '1', 일자: D, 구분: 'BM', 원인: '클램프 실린더 누유', 수리내용: '실린더 씰 교체', 소요부품: '씰 키트', 수량: '1', 단가: '-', 비고: 'E2E' }]
    },
    expect: [
      ['E2', 'TC-021'], ['A3', 'CNC밴딩 M/C 2호'],
      ['A5', '1'], ['B5', '2026'], ['C5', 'BM'], ['E5', '실린더 씰 교체'], ['I5', 'E2E']
    ]
  },
  {
    code: 'L1100-24',
    values: {
      업체명: '티피씨 AM사업부', model: 'NX4', 공정명: 'CNC밴딩', 품명: '25450-07870',
      usl: '25.6', lsl: '25.2', 측정자: LOGIN, 측정일: D, 단위: '0.01', 계측기: 'V/C'
    },
    expect: [
      ['B7', '티피씨 AM사업부'], ['B8', 'NX4'], ['B9', 'CNC밴딩'], ['B10', '25450-07870'],
      ['J8', '25.6'], ['J9', '25.2'], ['M8', LOGIN], ['M9', '2026'], ['M11', 'V/C']
    ]
  },
  {
    code: 'M1100-02',
    values: {
      작성자: LOGIN,
      rows: [
        { no: '1', 일자: D, 라인명: 'CNC밴딩 1라인', 비가동시간: '40분', 사유: '클램프 실린더 누유', 조치이력: '씰 교체 후 재가동', 전판정: '합격', 후판정: '합격', 비고: 'E2E' }
      ]
    },
    expect: [
      ['A6', '1'], ['C6', '2026'], ['G6', 'CNC밴딩 1라인'], ['K6', '40분'],
      ['O6', '클램프'], ['W6', '씰 교체'], ['AE6', '합격'], ['AL6', '합격'], ['AS6', 'E2E'], ['AN2', LOGIN]
    ]
  },
  {
    // 판정2 재분류(0108): 조건② 보류 → 정본 완결(L2100-04 동일 유형)
    code: 'A5200-04-01',
    values: {
      주간조평가: '주간조 생산품 평가 — 외관·포장·식별 적합(E2E)',
      야간조평가: '야간조 미생산',
      인발평가: '해당 없음(AM)',
      강관평가: '해당 없음(AM)'
    },
    expect: [
      ['A7', '주간조 생산품 평가 — 외관'], ['Y7', '야간조 미생산'],
      ['A45', '해당 없음(AM)'], ['Y45', '해당 없음(AM)']
    ]
  },
  {
    code: 'M1100-03',
    values: {
      품명: 'PIPE ASSY', 품번: '25450-07870', 차종: 'NX4 HEV',
      전lot: '2607250B', 후lot: '2607280A', 일자: D,
      정지시간: '13시 20분', 가동시간: '14시 00분', 비가동시간: '40분',
      중단코드: 'E-105', 작성자: LOGIN
    },
    expect: [
      ['F4', 'PIPE ASSY'], ['R4', '25450-07870'], ['AD4', 'NX4 HEV'],
      ['F5', '2607250B'], ['AD5', '2607280A'], ['A8', '2026'],
      ['K8', '13시 20분'], ['K10', '40분'], ['K11', 'E-105'], ['R8', LOGIN]
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
    const outFile = join(OUT, `batch2_e2e_${c.code}.xlsx`)
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
