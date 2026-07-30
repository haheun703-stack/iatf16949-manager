// ============================================================
// scripts/e2e-batch3.mjs — 3배치 진행 13종 E2E (2026-07-29)
//
// 방식 = e2e-batch1.mjs 와 동일(웹서버 :8080·복사본 DB): 로그인 → 제출 → export →
// 다운로드 → ExcelJS 재판독 → 기대 셀값 검증. 선행·실행법은 e2e-batch1.mjs 머리주석 참조.
// 실행: node scripts/e2e-batch3.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch3_e2e_<code>.xlsx + 콘솔 셀검증 표
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
  console.error('사용법: node scripts/e2e-batch3.mjs <로그인이름> [비번]')
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
    code: 'M3100-01',
    values: {
      작성자: LOGIN,
      rows: [
        {
          no: '1', 차종: 'NX4 HEV', 사양: 'HEV', 구분: '양산', 품번: '25450-07870',
          출하수량: '1,200', lot_no: '2607290A', 출하일자: '07/29',
          용기상태: '○', 장입수량: '○', 식별표: '○', 출하검사: '○', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['A6', '1'], ['B6', 'NX4 HEV'], ['H6', '양산'], ['L6', '25450-07870'],
      ['S6', '1,200'], ['V6', '2607290A'], ['Y6', '07/29'], ['AB6', '○'],
      ['AN6', '○'], ['AR6', 'E2E'], ['AP2', LOGIN]
    ]
  },
  {
    code: 'M1200-03',
    values: {
      작성일자_주간: D, 작성자_주간: '김주간', 설비공정_주간: 'CNC밴딩 1라인', 품번품명_주간: '25450-07870 PIPE ASSY',
      설비이슈_주간: '2호기 클램프 실린더 누유 — 씰 교체 완료, 야간 재확인 요',
      품질이슈_주간: '외관 찍힘 2건 발생 — 낙하품 대장 기록 완료',
      안전이슈_주간: '없음', 자재이슈_주간: '동링 재고 2일분 — 발주 진행 중', 기타이슈_주간: '없음',
      작성일자_야간: D, 작성자_야간: '박야간', 설비공정_야간: 'CNC밴딩 1라인', 품번품명_야간: '25450-07870 PIPE ASSY',
      설비이슈_야간: '2호기 재확인 — 누유 재발 없음', 품질이슈_야간: '이상 없음',
      안전이슈_야간: '없음', 자재이슈_야간: '동링 입고 확인', 기타이슈_야간: '없음',
      작성자: LOGIN
    },
    expect: [
      ['J4', '2026'], ['U4', '김주간'], ['J5', 'CNC밴딩 1라인'], ['U5', '25450-07870'],
      ['F7', '클램프 실린더 누유'], ['F8', '낙하품 대장'], ['F10', '동링 재고'],
      ['AE4', '2026'], ['AP4', '박야간'], ['AA7', '재발 없음'], ['AA10', '동링 입고'], ['AM2', LOGIN]
    ]
  },
  {
    code: 'M1200-04',
    values: {
      repairs: [
        { 용기명: '회색 11호 PALLET', 용기규격: '1100×1100', 조치상세: '파손 — 측판 교체 후 재사용(조치항목: 파손)', 조치금액: '35,000', 조치자: '김생산', 조치일자: '07-29' }
      ]
    },
    expect: [
      ['C27', '회색 11호'], ['G27', '1100×1100'], ['S27', '측판 교체'],
      ['AG27', '35,000'], ['AK27', '김생산'], ['AO27', '07-29']
    ]
  },
  {
    code: 'M1200-06',
    values: {
      rows: [
        {
          no: '1', 발생일자: '07-29', 차종: 'NX4 HEV', 품번: '25450-07870', 발생공정: 'CNC밴딩',
          작업자: '박작업', 발생수량: '2', 현상: '이송 중 낙하 — 외관 찍힘', 확인: '김반장', 비고: 'E2E'
        }
      ],
      details: [{ 조치상세: '폐기 — 낙하품 처리 절차서에 따라 즉시 폐기 처리' }]
    },
    expect: [
      ['A5', '1'], ['C5', '07-29'], ['G5', 'NX4 HEV'], ['J5', '25450-07870'],
      ['P5', 'CNC밴딩'], ['S5', '박작업'], ['V5', '2'], ['Y5', '이송 중 낙하'],
      ['AP5', '김반장'], ['AT5', 'E2E'], ['AH6', '즉시 폐기']
    ]
  },
  {
    code: 'M1200-01',
    values: {
      작성일: D,
      rows: [
        {
          od: 'Φ25.4', id: 'Φ22.0', 소재규격: 'Φ28.6×1.2t', 본수: '500본',
          공차외경: '±0.05', 공차내경: '±0.05', 작업방법: 'E', 생산본수: '498',
          납품처: '삼보모터스', 납기일: '08-05', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['I5', '2026'], ['B8', 'Φ25.4'], ['C8', 'Φ22.0'], ['D8', 'Φ28.6×1.2t'],
      ['E8', '500본'], ['F8', '±0.05'], ['H8', 'E'], ['I8', '498'],
      ['J8', '삼보모터스'], ['K8', '08-05'], ['L8', 'E2E']
    ]
  },
  {
    code: 'M1200-02',
    values: {
      작업일: D, 작업자: '이열처', 선단부확인: 'O', 입고lot: 'SJ260729-1',
      투입시각: '09:30', 투입수량: '350본',
      측정_비드부: '25.35', 측정_3시: '25.42', 측정_6시: '25.40', 측정_9시: '25.41', 측정_편차: '0.07'
    },
    expect: [
      ['E3', '2026'], ['R3', '이열처'], ['B9', 'O'], ['C9', 'SJ260729-1'],
      ['D9', '09:30'], ['L9', '350본'], ['I9', '25.35'], ['I10', '25.42'],
      ['I11', '25.40'], ['I12', '25.41'], ['I13', '0.07']
    ]
  },
  {
    code: 'M2100-01',
    values: {
      작성일: D, 작성자: LOGIN,
      rules: [
        { 시기: '원소재 입고 시', 장소: '자재 창고', 기록방법: '입고 LOT 라벨 부착(SJ+년월일+차수)', 담당부서: '구매팀' },
        { 시기: '공정 투입 시', 장소: '생산 라인', 기록방법: '작업일보 기록 + MES 스캔(SCAN2)', 담당부서: '생산팀' },
        { 시기: '완제품 출하 시', 장소: '완제품 창고', 기록방법: '출하관리대장 LOT NO(각인NO) 기록', 담당부서: '영업팀' }
      ]
    },
    expect: [
      ['E4', '2026'], ['U4', LOGIN],
      ['C19', '원소재 입고 시'], ['H19', '자재 창고'], ['M19', 'LOT 라벨'], ['AQ19', '구매팀'],
      ['C20', '공정 투입 시'], ['M20', 'MES 스캔'], ['C21', '완제품 출하 시'], ['AQ21', '영업팀']
    ]
  },
  {
    code: 'K2100-01',
    values: {
      관리자: LOGIN,
      rows: [
        {
          강종: 'STKM11A', 재질: 'SPCC', od: 'Φ28.6', 두께: '1.2', 길이: '4,000',
          수량: '120', 구매용도: 'NX4 파이프', 관리방안: '방청유 재도포 후 우선 투입', 관리상태: '양호'
        }
      ]
    },
    expect: [
      ['J4', LOGIN], ['A7', 'STKM11A'], ['B7', 'SPCC'], ['C7', 'Φ28.6'],
      ['D7', '1.2'], ['E7', '4,000'], ['F7', '120'], ['H7', 'NX4 파이프'],
      ['I7', '방청유 재도포'], ['J7', '양호']
    ]
  },
  {
    code: 'K1200-06',
    values: {
      연도표기: '2026년 협력사 월별 모니터링',
      업체명1: '(주)삼보모터스', 업체명2: '동성테크', 업체명3: '한일튜브'
    },
    expect: [
      ['A1', '2026년 협력사 월별 모니터링'], ['B5', '삼보모터스'],
      ['B13', '동성테크'], ['B21', '한일튜브']
    ]
  },
  {
    code: 'M2100-10',
    values: {
      rows: [
        {
          no: '1', 생산일: '07-29', 완제품품번: '25450-07870', 완제품lot: 'B0729-1',
          공정설비: '브레이징 로#1', 작업자: '박작업', 원자재1: '파이프 Φ8 / P-0725A',
          원자재2: '브라켓 / BR-0721B', 부자재: '동링 CR-2.0 / C26-0715', 성적서no: 'IR-512',
          생산수량: '1,180', 출하일: '07-31', 출하처: '삼보모터스', 선입선출: '○', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['A4', '1'], ['B4', '07-29'], ['C4', '25450-07870'], ['D4', 'B0729-1'],
      ['E4', '브레이징 로#1'], ['F4', '박작업'], ['G4', 'P-0725A'], ['I4', '동링 CR-2.0'],
      ['J4', 'IR-512'], ['K4', '1,180'], ['L4', '07-31'], ['M4', '삼보모터스'],
      ['N4', '○'], ['O4', 'E2E']
    ]
  },
  {
    code: 'K2100-10',
    values: {
      rows: [
        {
          점검일: '07-29', 구역: 'A-1', 발청손상: '○', 이물오염: '○', 식별상태: '○',
          선입선출: '○', 장기재고: '1건 → 처리품의 진행', 항온항습: '해당없음',
          지적조치: '장기재고 1건 처리 품의 상신', 조치완료일: '08-05', 점검자: '최자재'
        }
      ]
    },
    expect: [
      ['A4', '07-29'], ['B4', 'A-1'], ['C4', '○'], ['E4', '○'],
      ['G4', '처리품의'], ['H4', '해당없음'], ['I4', '처리 품의 상신'],
      ['J4', '08-05'], ['K4', '최자재']
    ]
  },
  {
    code: 'M3100-06',
    values: {
      rows: [
        {
          no: '1', 품번: '25450-07870', 품명: 'PIPE ASSY', 공정: '브레이징',
          용기종류: '전용 T-BOX', 장입수: '50', 최대단수: '3',
          식별: '열처리 前 청색표 / 後 백색표', 청정도: '커버 적용', 라벨: '○ (50EA/3단)',
          제정일: '2026-07-29', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['A4', '1'], ['B4', '25450-07870'], ['C4', 'PIPE ASSY'], ['D4', '브레이징'],
      ['E4', 'T-BOX'], ['F4', '50'], ['G4', '3'], ['H4', '청색표'],
      ['I4', '커버 적용'], ['J4', '50EA'], ['K4', '2026-07-29'], ['L4', 'E2E']
    ]
  },
  {
    code: 'M1200-09',
    values: {
      품번: '25450-07870', 품명: 'PIPE ASSY', lot_no: '2607290A', 수량: '1,200',
      moves: [
        {
          공정명: '가용접', 완료일시: '07-29 09:40', 작업자확인: '박작업',
          검사확인: '초품 ○', 양품수량: '1,198', 불량수량: '2', 비고: 'E2E'
        }
      ]
    },
    expect: [
      ['B3', '25450-07870'], ['D3', 'PIPE ASSY'], ['F3', '2607290A'], ['H3', '1,200'],
      ['B5', '가용접'], ['C5', '07-29 09:40'], ['D5', '박작업'], ['E5', '초품 ○'],
      ['F5', '1,198'], ['G5', '2'], ['H5', 'E2E']
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
    const outFile = join(OUT, `batch3_e2e_${c.code}.xlsx`)
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
