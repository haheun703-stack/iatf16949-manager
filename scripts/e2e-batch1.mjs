// ============================================================
// scripts/e2e-batch1.mjs — 1배치 본체 10종 E2E (2026-07-28)
//
// 웹서버(:8080, 복사본 DB) 상대로: 로그인 → 제출 생성 → 엑셀 export → 다운로드 →
// ExcelJS 재판독 → 기대 셀값 검증. 갭B E2E(7/28)와 같은 방식, 이번엔 스크립트를 리포에 남긴다.
//
// 선행:
//   1) 복사본 준비 + 비번 시드: IATF_DATA_DIR=<복사본> ELECTRON_RUN_AS_NODE=1
//      node_modules/electron/dist/electron.exe scripts/seed-local-passwords.cjs
//   2) 서버: IATF_DATA_DIR=<복사본> PORT=8080 ELECTRON_RUN_AS_NODE=1
//      node_modules/electron/dist/electron.exe server/index.cjs
// 실행: node scripts/e2e-batch1.mjs <로그인이름> [비번=qms1234]
// 출력: captures/batch1_e2e_<code>.xlsx + 콘솔 셀검증 표
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
  console.error('사용법: node scripts/e2e-batch1.mjs <로그인이름> [비번]')
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

// ── 10종 시나리오: values + 기대 셀 [addr, 기대값(부분일치)] ──
const D = '2026-07-28'
const CASES = [
  {
    code: 'L2100-01',
    values: {
      차종: 'NX4 HEV', 품번: '25450-07870', 품명: 'PIPE ASSY', 공정명: 'CNC밴딩 1번',
      설비명: 'CNC밴딩 M/C 2호', 원소재lot: 'SJ240601-3', 적입용기: '회색 11호', box수량: '120개',
      items_l: [
        { no: '1', 검사부위: '밴딩부', 검사항목: '스크래치·찍힘 없을 것' },
        { no: '2', 검사부위: '포밍부', 검사항목: '변형 없을 것' },
        { no: '3', 검사부위: '전장', 검사항목: '게이지 통과할 것' }
      ],
      items_r: [
        { no: '4', 검사부위: '표면', 검사항목: '녹·이물 없을 것' },
        { no: '5', 검사부위: '식별', 검사항목: '라벨 LOT 일치할 것' }
      ],
      비고: '1배치 E2E 검증 작성', 작성자: LOGIN
    },
    expect: [
      ['C2', 'NX4 HEV'], ['F2', '25450-07870'], ['I2', 'CNC밴딩 M/C 2호'], ['C4', 'CNC밴딩 1번'],
      ['F4', 'PIPE ASSY'], ['I4', 'SJ240601-3'], ['K3', '회색 11호'], ['K5', '120개'],
      ['D8', '밴딩부'], ['E8', '스크래치'], ['D11', '포밍부'], ['D14', '전장'],
      ['G8', '표면'], ['H8', '녹·이물'], ['G11', '식별'],
      ['G14', '1배치 E2E'], ['N3', LOGIN]
    ]
  },
  {
    code: 'L2100-04',
    values: {
      작성일: D, 작성자: LOGIN,
      choum: [{
        시간: '09:10', 외경: '25.42', 두께: '1.21', 길이: '351',
        폐기본수: '1본폐기', 확관시험: '3번째 이상 없음', 압착시험: '이상 없음',
        양품시작: '4번째 양품', 판정: '합격'
      }],
      특기사항_초품: '조관기 재가동 후 초품 확인 완료',
      scrap: [{
        재질: 'STKM11A', lot_no: 'SK2607-15', 외경: '25.4', 두께: '1.2', 길이: '350',
        스크라치_외경: '1', 스크라치_내경: '0', 코일연결부: '1', 초품폐기: '1', 기타: '0', 합계: '3'
      }],
      특기사항_폐기: '해당 없음'
    },
    expect: [
      ['J5', '2026-07-28'], ['K3', LOGIN],
      ['B9', '09:10'], ['C9', '25.42'], ['F9', '1본폐기'], ['P9', '합격'],
      ['B19', '조관기 재가동'],
      ['B27', 'STKM11A'], ['C27', 'SK2607-15'], ['O27', '3'], ['B37', '해당 없음']
    ]
  },
  {
    code: 'L2100-05',
    values: {
      차종: 'NX4 HEV', 품번: '25450-07870', 품명: 'PIPE ASSY', 공정명: '로브레이징',
      설비명: '로브레이징 M/C 1호', 원소재lot: 'SJ240601-3', 적입용기: '회색 11호', box수량: '120개',
      items_l: [
        { no: '1', 검사부위: '브레이징부', 검사항목: '용입 상태 양호할 것' },
        { no: '2', 검사부위: 'LOT 라벨', 검사항목: '라벨-실물 일치할 것' },
        { no: '3', 검사부위: '작업조건', 검사항목: '조건표와 일치할 것' }
      ],
      items_r: [
        { no: '4', 검사부위: '치공구', 검사항목: '마모·유격 없을 것' },
        { no: '5', 검사부위: '적재', 검사항목: '적입 기준 준수할 것' }
      ],
      비고: '순회 1회차(E2E)', 작성자: LOGIN
    },
    expect: [
      ['C2', 'NX4 HEV'], ['F2', '25450-07870'], ['C4', '로브레이징'],
      ['D8', '브레이징부'], ['D11', 'LOT 라벨'], ['G8', '치공구'],
      ['G14', '순회 1회차'], ['N3', LOGIN]
    ]
  },
  {
    code: 'L2100-11',
    values: {
      rows: [
        {
          no: '1', 일자: D, 프로젝트명: '양산', 품번: '25450-07870',
          측정포인트: 'P1 도금면', 조도값기준: 'Ra 1.6', 실측값1: '1.2', 실측값2: '1.3', 실측값3: '1.1',
          측정자: LOGIN
        }
      ],
      작성자: LOGIN
    },
    expect: [
      ['B7', '1'], ['C7', '2026'], ['D7', '양산'], ['E7', '25450-07870'],
      ['F7', 'P1 도금면'], ['G7', 'Ra 1.6'], ['H7', '1.2'], ['K7', LOGIN], ['I3', LOGIN]
    ]
  },
  {
    code: 'L1100-25',
    values: {
      금형번호: 'M-07870-01', 등급: 'A', 년월: '2026-07',
      rows: [{
        일자: D, 이물질: '○', 손상크랙: '○', 볼트풀림: '○', 도금상태: '○',
        마모상태: '○', 핀유격: '○', 스크랩취출: '○', 점검자: LOGIN, 비고: 'E2E'
      }]
    },
    expect: [
      ['B3', 'M-07870-01'], ['E3', 'A'], ['G3', '2026-07'],
      ['A5', '2026'], ['B5', '○'], ['H5', '○'], ['I5', LOGIN], ['J5', 'E2E']
    ]
  },
  {
    code: 'L1200-01',
    values: {
      작성일: D, 작성부서: '생산기술팀', 작성자: LOGIN,
      rows: [{
        no: '1', 모델명: '25450-07870', 공정명: 'CNC밴딩', 규격: 'Φ25.4', 재질: 'S45C',
        금형구분: '치공구', 사용장비: '밴딩 M/C 2호', 제작처: '자체', 제작일자: '2024-03-11',
        대여공증일: '-', 비고: 'E2E'
      }]
    },
    expect: [
      ['K1', '2026-07-28'], ['K2', '생산기술팀'], ['K3', LOGIN],
      ['A5', '1'], ['B5', '25450-07870'], ['E5', 'S45C'], ['I5', '2024'], ['K5', 'E2E']
    ]
  },
  {
    code: 'L1200-04',
    values: {
      자산관리번호: 'JG-2024-011', 차종: 'NX4', assy부품번호: '25450-07870',
      단품부품번호: '25451-07870-1', eo_no: '-', 부품명: 'PIPE 1', 치형구종류: 'JIG',
      공정명: 'CNC밴딩', 재질: 'S45C', 중량: '3.2kg', 규격: '300×200×150',
      사용기계: '밴딩 M/C 2호', 제작처: '자체', 현보유장소: '2공장 치공구실',
      대여공증일: '2024-03-15', 특기사항: '해당 없음',
      history: [
        { 일자: '2024-03-15', 내용: '신규 제작 등록' },
        { 일자: D, 내용: '기준핀 교체' }
      ]
    },
    expect: [
      ['B3', 'JG-2024-011'], ['B4', 'NX4'], ['B5', '25450-07870'], ['B9', 'JIG'],
      ['B13', '300×200×150'], ['B16', '2공장 치공구실'],
      ['C5', '2024'], ['D5', '신규 제작 등록'], ['C6', '2026'], ['D6', '기준핀 교체']
    ]
  },
  {
    code: 'L1200-12',
    values: {
      지그번호: 'JG-2024-011', 년월: '2026-07',
      rows: [{
        일자: D, 안착센서: '○', 기준핀: '○', 스패터: '○', 클램프: '○',
        센서류: '○', 에어누기: '○', 배선피복: '○', 점검자: LOGIN, 비고: 'E2E'
      }]
    },
    expect: [
      ['B3', 'JG-2024-011'], ['E3', '2026-07'],
      ['A5', '2026'], ['B5', '○'], ['H5', '○'], ['I5', LOGIN], ['J5', 'E2E']
    ]
  },
  {
    code: 'L3100-01',
    values: {
      rows: [{
        계측기명: '버니어캘리퍼스[0-150mm]', 관리번호: 'MG-001', 제조사: 'Mitutoyo',
        모델명: 'CD-15APX', 관리사업부: 'AM', 관리부서: '품질보증팀', 관리자: LOGIN,
        보관장소: '검사실', 검교정주기: '12개월', 전회검교정일: '2025-06-10',
        금회검교정일: '2026-06-12', 차기검교정일: '2027-06-11', 검교정기관: 'KTC',
        검교정관리자: LOGIN, 구입일자: '2020-01-15', 합부판정: '합격', 비고: 'E2E'
      }]
    },
    expect: [
      ['A4', '버니어캘리퍼스'], ['C4', 'MG-001'], ['D4', 'Mitutoyo'],
      ['K4', '2025'], ['L4', '2026'], ['M4', '2027'], ['AI4', '합격'], ['AK4', 'E2E']
    ]
  },
  {
    code: 'M3100-05',
    values: {
      품명: 'PIPE ASSY', 품번: '25450-07870', lot_no: '2607290A',
      생산일: '2026-07-28', 검사일: D, 검사수량: '5', 작성자: LOGIN,
      rows: [{
        no: '1', 검사항목: '용접부 리크', 규격: '0.5cc/min 이하', 측정기기: 'LK-01',
        시료1: '0.2', 시료2: '0.2', 시료3: '0.3', 시료4: '0.2', 시료5: '0.25',
        판정: '적합', 검사자: LOGIN, 비고: ''
      }]
    },
    expect: [
      ['B3', 'PIPE ASSY'], ['D3', '25450-07870'], ['F3', '2607290A'],
      ['H3', '2026-07-28'], ['J3', '2026-07-28'], ['L3', '5'],
      ['B5', '용접부 리크'], ['E5', '0.2'], ['J5', '적합'], ['G23', LOGIN]
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

// ── 실행 ──
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
    const created = await api('form:submissionCreate', {
      formCode: c.code,
      values: c.values,
      createdBy: LOGIN
    })
    const exp = await api('form:exportXlsx', { submissionId: created.id })
    if (!exp || exp.success === false || !exp.download)
      throw new Error(`export 실패: ${JSON.stringify(exp).slice(0, 200)}`)
    const dl = await fetch(`${BASE}${exp.download}`, { headers: { cookie } })
    if (!dl.ok) throw new Error(`다운로드 ${dl.status}`)
    const buf = Buffer.from(await dl.arrayBuffer())
    const outFile = join(OUT, `batch1_e2e_${c.code}.xlsx`)
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
    summary.push({ code: c.code, sheet: ws.name, ok, total: c.expect.length, unmapped: exp.unmapped || [] })
  } catch (e) {
    console.log(`✗ ${c.code} 실패: ${e.message}`)
    summary.push({ code: c.code, error: e.message })
  }
}
console.log(`\n합계: 셀검증 ${totalOk}/${totalChecks} · 폼 ${summary.filter((s) => !s.error && s.ok === s.total).length}/10 통과`)
