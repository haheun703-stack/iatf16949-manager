/* eslint-disable */
// ============================================================
// scripts/forms-gap-audit.cjs — 양식 완성전 갭 전수 감사 (2026-07-28, 사장님 지시 스트림 A 1단계)
//
// 양식 코드별 [셀맵(form_fields) / 엑셀좌표(form_cell_map) / 원본(template_path) /
// 연결 의무 / 프로세스 / SQ 항목·배점 / 작성 실적]을 한 표로 집계해 우선순위 근거를 만든다.
// 읽기 전용. 재실행 가능(배치 제작 중 진척 추적 도구로 재사용).
//
// 실행(electron-node, better-sqlite3 = Electron ABI):
//   ELECTRON_RUN_AS_NODE=1 node_modules/electron/dist/electron.exe scripts/forms-gap-audit.cjs [db경로]
//   기본 db = %APPDATA%/iatf16949-manager/iatf16949.db (검증은 복사본 권장)
// 출력: 콘솔 요약 + docs/forms-gap/audit_<날짜>.json (전체 행)
// ============================================================
'use strict'
const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')

const dbPath =
  process.argv[2] || path.join(process.env.APPDATA || '', 'iatf16949-manager', 'iatf16949.db')
const db = new Database(dbPath, { readonly: true })

// 심사 핵심 의무 카테고리(IATF 대시보드 DUTY_CATS와 동일 축)
const CORE_DUTY_CATS = new Set(['내부심사', '경영검토', '교정/MSA', '교육/인식', '문서관리', '안전/비상'])

// ── 기초 맵 ──────────────────────────────────────────────
const fieldsCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_fields GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const cellCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_cell_map GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const gridCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_grid_columns GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const subCnt = new Map(
  db.prepare(`SELECT form_code, COUNT(*) c FROM form_submissions GROUP BY form_code`).all().map((r) => [r.form_code, r.c])
)
const obl = new Map()
for (const r of db
  .prepare(`SELECT form_code, id, title, category, active FROM recurring_obligations WHERE form_code IS NOT NULL`)
  .all()) {
  if (!obl.has(r.form_code)) obl.set(r.form_code, [])
  obl.get(r.form_code).push(r)
}
const procs = new Map()
for (const r of db.prepare(`SELECT form_code, process_code FROM process_forms`).all()) {
  if (!procs.has(r.form_code)) procs.set(r.form_code, [])
  procs.get(r.form_code).push(r.process_code)
}
const itemPoints = new Map(db.prepare(`SELECT code, points FROM sq_items`).all().map((r) => [r.code, r.points]))
// reg → SQ items (sq_reg_map)
const regItems = new Map()
for (const r of db.prepare(`SELECT reg_code, item_code FROM sq_reg_map`).all()) {
  if (!regItems.has(r.reg_code)) regItems.set(r.reg_code, new Set())
  regItems.get(r.reg_code).add(r.item_code)
}
// sqtrack (심사 트랙 직접 연결)
const trackForms = new Map()
for (const r of db
  .prepare(`SELECT form_code, sq_item_code FROM sqtrack_items WHERE form_code IS NOT NULL`)
  .all()) {
  if (!trackForms.has(r.form_code)) trackForms.set(r.form_code, new Set())
  if (r.sq_item_code) trackForms.get(r.form_code).add(r.sq_item_code)
}
// SQ 체크포인트 미비 항목(우선순위 가중)
const cpBad = new Map()
for (const r of db
  .prepare(
    `SELECT item_code, SUM(CASE WHEN status='missing' THEN 1 ELSE 0 END) miss,
            SUM(CASE WHEN status='partial' THEN 1 ELSE 0 END) part, COUNT(*) tot
     FROM sq_checkpoints GROUP BY item_code`
  )
  .all())
  cpBad.set(r.item_code, r)

// ── 양식 전수 행 구성 ─────────────────────────────────────
const forms = db
  .prepare(
    `SELECT code, name, reg_code, resp_dept, iatf_clause, sq_item_ids, template_path, scope, deprecated
     FROM forms ORDER BY code`
  )
  .all()

// 신규 설계본(코워크 A-2 조건⑴): 회사 원본 부재로 리포 템플릿이 정본인 양식 — 심사 대체 이력 표시
const isNewDesign = (tp) => !!tp && String(tp).includes('sq_gap_forms')

// 1배치 채택 소스 기록(코워크 지시 7/28 밤4차: L2100 변형 시트 = AM 실사용 기준 실측 확정
// + audit 에 채택 시트명 기록). 실측 = 2026-07-28 사무실, 상세 = 조사서 §0.6 추기.
const ADOPTED_SHEETS = {
  'L2100-01':
    "AM 실사용 'MES 수입검사 엑셀양식(240313-07870)' 양식 시트 → templates/am_forms/L2100-01_수입검사표준_AM.xlsx (마스터 '수입검사표준 (L2100-01-인)' = 5행 스텁이라 기각)",
  'L2100-04':
    "마스터 '초품검사 및 불량폐기내역(L2100-04-조6)' (AM 자체 변형 없음 실측 — 조관공정 전용 정본 유지)",
  'L2100-05':
    "AM 실사용 'MES 공정패트롤 엑셀양식(240313-07870)' 양식 시트 → templates/am_forms/L2100-05_공정순회_패트롤_AM.xlsx (마스터 '조관공정 순회검사일지(L2100-05-조)' = 조관 전용이라 기각)",
  'L2100-11':
    "AM 실물 '조도측정 일지.xlsx'(표면 거칠기 조도) → templates/am_forms/L2100-11_조도측정_기록일지_AM.xlsx (구 신규설계본 = 조명 조도(lux) 도메인 오인 — 실물 출현 시 교정 조건 발동)",
  'L1100-25': "신규 설계본 Rev.1 '양식' 시트(일자-행 전개 재설계) — 05_금형_점검체크시트",
  'L1200-01': "마스터 '치공구 관리대장(L1200-01)'",
  'L1200-04': "마스터 '지그 이력카드(L1200-04)'",
  'L1200-12': "신규 설계본 Rev.1 '양식' 시트(일자-행 전개 재설계) — 04_지그치공구_점검체크시트",
  'L3100-01': "마스터 '계측기 관리대장 (L3100-01)'",
  'M3100-05': "신규 설계본 '02_완성품_출하검사_성적서' 양식 시트",
  'M1200-10':
    "AM 실사용 'MES 자주검사체크시트 엑셀양식(240313-07870)' 양식 시트 → templates/am_forms/M1200-10_공정자주검사_AM.xlsx (실물 출현 교체 — 코워크 승인 7/28 오후, 구 신규설계본 15_공정자주검사 = 참고 보관)",
  // ── 2배치(7/28 저녁, 조건부 출발 — 진행 8·보류 5·제외 상신 1) ──
  'A2200-03': "마스터 '(    )년 경영검토 보고서 (A2200-03)' — 빈 틀 실측(시드 없음), 검토항목 14블록(3행 병합)",
  'F1100-01': "마스터 '년 사내외 교육훈련 계획서 (F1100-01)' — 대장형(월별 12열)",
  'F2100-10': "마스터 '작업자 숙련도 CHECK SHEET (F2100-10)' — 매트릭스 채점형: 최소 매핑(점수·소계=시트 수식 보존)",
  'L1100-01': "마스터 '설비제작 사양서 (L1100-01)' — 문서형 대작(226행): 식별 헤더 3만 매핑",
  'L1100-09': "마스터 '설비 이력카드 (L1100-09)' — 카드+이력 대장",
  'L1100-24': "마스터 '설비능력 지수표 (L1100-24)' — 계산기형(Cmk): 비수식 헤더 10만 매핑(L4102-02 선례)",
  'M1100-02': "마스터 '설비 비가동시간 관리 대장 (M1100-02)' — 3행 병합 블록 grid 6건",
  'M1100-03': "마스터 '설비 비가동시간 이력관리 대장 (M1100-03)' — 비가동 1건 카드형",
  'A5100-03': "[ⓑ 승인 7/28] AM용 빈 틀 신규 설계 예정(문항 구조 마스터 재사용·기록값 클리어, 9월 초 전) — 원본=과거 심사 실데이터 시드(TPC24-0723)",
  'A5100-04': "[ⓑ 승인 7/28] AM용 빈 틀 신규 설계 예정(동일 조건) — 원본=사업부별 실평점 매트릭스 시드",
  'A5200-03': "[ⓑ 승인 7/28] AM용 빈 틀 신규 설계 예정(동일 조건) — 원본=실데이터+사진 24장·인발 서식",
  'A5200-04': "[ⓑ 승인 7/28] AM용 빈 틀 신규 설계 예정(동일 조건) — 원본=실데이터(쌍용산업)·인발 서식",
  'A5200-04-01':
    "마스터 '내부심사(제품) 성적서 A5200-04-01' — 판정2 재분류(7/28): ⓑ 제외, L2100-04 동일 유형 정본 완결(평가 블록 4 매핑, 빈 틀 확인)",
  'M1100-05': "[열람형 전환 승인 7/28] 고정 코드 정의표 — 작성 양식 아님(fields 미정의 유지, form_change_log 기록)"
}

// 문서 열람형(작성 양식 아님 — 코워크 전환 승인): 갭A 집계에서 분리해 정직 표기
const VIEW_ONLY = new Set(['M1100-05'])

const rows = []
for (const f of forms) {
  if (f.deprecated) continue
  const sqItems = new Set()
  if (f.sq_item_ids) {
    for (const s of String(f.sq_item_ids).split(/[,\s]+/)) if (s && itemPoints.has(s)) sqItems.add(s)
  }
  if (f.reg_code && regItems.has(f.reg_code)) for (const it of regItems.get(f.reg_code)) sqItems.add(it)
  if (trackForms.has(f.code)) for (const it of trackForms.get(f.code)) sqItems.add(it)
  const sqPts = [...sqItems].reduce((a, it) => a + (itemPoints.get(it) || 0), 0)
  const sqMissing = [...sqItems].reduce((a, it) => a + (cpBad.get(it)?.miss || 0), 0)
  const o = obl.get(f.code) || []
  const coreDuty = o.some((x) => CORE_DUTY_CATS.has(x.category))
  rows.push({
    code: f.code,
    name: f.name,
    regCode: f.reg_code,
    respDept: f.resp_dept,
    clause: f.iatf_clause,
    fields: fieldsCnt.get(f.code) || 0,
    cells: cellCnt.get(f.code) || 0,
    gridCols: gridCnt.get(f.code) || 0,
    template: f.template_path ? 1 : 0,
    newDesign: isNewDesign(f.template_path),
    submissions: subCnt.get(f.code) || 0,
    obligations: o.map((x) => `#${x.id} ${x.title}${x.active ? '' : '(비활성)'}`),
    coreDuty,
    processes: procs.get(f.code) || [],
    sqItems: [...sqItems],
    sqPoints: sqPts,
    sqMissingCp: sqMissing,
    ...(ADOPTED_SHEETS[f.code] ? { adoptedSheet: ADOPTED_SHEETS[f.code] } : {})
  })
}

// ── 요약 ────────────────────────────────────────────────
const N = rows.length
const withFields = rows.filter((r) => r.fields > 0)
const noFields = rows.filter((r) => r.fields === 0 && !VIEW_ONLY.has(r.code))
const viewOnly = rows.filter((r) => VIEW_ONLY.has(r.code))
const fieldsNoCells = withFields.filter((r) => r.cells === 0 && r.gridCols === 0)
const noTemplate = rows.filter((r) => r.template === 0)
const sum = {
  dbPath,
  ranAt: new Date().toISOString(),
  total: N,
  writable_fields: withFields.length,
  gapA_noFields: noFields.length,
  gapB_fieldsButNoCellmap: fieldsNoCells.length,
  gapC_noTemplate: noTemplate.length,
  linkedObligation: rows.filter((r) => r.obligations.length > 0).length,
  linkedProcess: rows.filter((r) => r.processes.length > 0).length,
  linkedSq: rows.filter((r) => r.sqItems.length > 0).length,
  newDesign: rows.filter((r) => r.newDesign).length,
  viewOnly: viewOnly.map((r) => r.code)
}
console.log('=== 양식 갭 감사 요약 ===')
console.log(JSON.stringify(sum, null, 1))

// 갭A(셀맵 미정의) 우선순위: SQ배점 + 미비CP 가중 + 핵심의무 + 의무연결 + 프로세스
const score = (r) =>
  r.sqPoints * 2 + r.sqMissingCp * 3 + (r.coreDuty ? 60 : 0) + r.obligations.length * 30 + r.processes.length * 5 + Math.min(r.submissions, 5) * 4
const gapA = noFields.map((r) => ({ ...r, prio: score(r) })).sort((a, b) => b.prio - a.prio)
console.log('\n=== 갭A(셀맵 미정의) 상위 40 — 우선순위 점수순 ===')
for (const r of gapA.slice(0, 40))
  console.log(
    `${String(r.prio).padStart(4)} | ${r.code.padEnd(10)} | ${r.name} | 팀=${r.respDept || '—'} | SQ ${r.sqPoints}점(${r.sqItems.join(',') || '—'}) 미비CP ${r.sqMissingCp} | 의무 ${r.obligations.length}${r.coreDuty ? '(핵심)' : ''} | 프로세스 ${r.processes.join(',') || '—'} | 원본 ${r.template ? 'O' : 'X'}`
  )

console.log('\n=== 갭B(fields 有·엑셀 좌표 無) 전체 ===')
for (const r of fieldsNoCells)
  console.log(`${r.code.padEnd(10)} | ${r.name} | fields ${r.fields} | 작성본 ${r.submissions}`)

// 팀별 갭A 분포
const byTeam = {}
for (const r of gapA) byTeam[r.respDept || '(미지정)'] = (byTeam[r.respDept || '(미지정)'] || 0) + 1
console.log('\n=== 갭A 팀별 분포 ===')
console.log(JSON.stringify(byTeam, null, 1))

// 전체 JSON 저장
const outDir = path.join(__dirname, '..', 'docs', 'forms-gap')
fs.mkdirSync(outDir, { recursive: true })
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
const outFile = path.join(outDir, `audit_${stamp}.json`)
fs.writeFileSync(outFile, JSON.stringify({ summary: sum, gapA, gapB: fieldsNoCells, rows }, null, 1), 'utf-8')
console.log('\nJSON 저장:', outFile)
