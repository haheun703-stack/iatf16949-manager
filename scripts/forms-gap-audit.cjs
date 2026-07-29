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
  'A5100-03':
    "ⓑ 이행 완료(0109): AM용 빈 틀 17_내부심사_갑을_보고서 — 구조=정본 재사용·기록값 45셀 클리어(원본=실데이터 시드 TPC24-0723)",
  'A5100-04':
    "ⓑ 이행 완료(0109): AM용 빈 틀 18_내부심사_시스템_체크리스트 — 문항 구조 재사용·기록값 61셀 클리어(원본=실평점 매트릭스 시드)",
  'A5200-03':
    "ⓑ 이행 완료(0109): AM용 빈 틀 19_내부심사_제조_체크리스트 — 공정 항목 구조 재사용·기록값 216셀+심사 사진 24장 클리어",
  'A5200-04':
    "ⓑ 이행 완료(0109): AM용 빈 틀 20_내부심사_제품_체크리스트 — 문항·배점 구조 재사용·기록값 348셀+심사 사진 24장 클리어",
  'A5200-04-01':
    "마스터 '내부심사(제품) 성적서 A5200-04-01' — 판정2 재분류(7/28): ⓑ 제외, L2100-04 동일 유형 정본 완결(평가 블록 4 매핑, 빈 틀 확인)",
  'M1100-05': "[열람형 전환 승인 7/28] 고정 코드 정의표 — 작성 양식 아님(fields 미정의 유지, form_change_log 기록)",
  // ── 3배치(7/29 — 공정·물류·식별 19종: 진행 13·열람형 6) ──
  'M3100-01': "마스터 '출하관리대장 (M3100-01)' — 대장형 grid(출하 점검 4항목 ○/×)",
  'M1200-03': "마스터 '주,야 인수인계 일지(M1200-03)' — 주/야 대칭 이슈 5구분 문서형",
  'M1200-04': "마스터 '공정,납입용기 관리기준 및 수리이력(M1200-04)' — 하단 수리이력 grid(stride 4 × 6블록). 상단 관리기준표(사진 4)는 고정 기준 미매핑",
  'M1200-06': "마스터 '낙하품 처리 관리대장 (M1200-06)' — 2행 병합 grid(본행 stride 2 + 조치상세행 별도 grid)",
  'M1200-01':
    "마스터 '작업지시서(M1200-01-인)' — 인발사업부 전용(AM 실물 부재 실측: AM 작업지시 = MES 소관). A5200-04-01 유형 정본 완결(호기 프리셋 유지·전 열 grid)",
  'M1200-02':
    "마스터 '열처리작업일보(M1200-02-인)' — 인발사업부 전용(AM 열처리 공정 없음 — AM 은 브레이징 M1200-11). 정본 완결: 순서 블록1(5행)만 최소 매핑",
  'M2100-01': "마스터 'LOT관리 기준서(M2100-01)' — 규칙표 작성형(시기·장소·기록방법·담당 10행 grid). 반-MES lot_registry 접점",
  'K2100-01': "마스터 '장기재고관리 현황 (K2100-01)' — 대장형 grid(중량 G열 = 시트 수식 보존, L4102-02 선례)",
  'K1200-06': "마스터 '협력사 월별 모니터링 (K1200-06)' — 매트릭스 최소 매핑(F2100-10 선례: 연도·업체명 3, 지표×월 실적값·수식은 시트 몫)",
  'M2100-10': "신규 설계본 '06_LOT추적성_대장' 양식 시트(예시행 클리어 260729)",
  'K2100-10': "신규 설계본 '07_자재보관장_점검표' 월간점검 시트(예시행 클리어 — Lay-Out 등록표 시트는 시트 몫)",
  'M3100-06': "신규 설계본 '08_용기적재_표준화기준표' 양식 시트(예시행 클리어 260729)",
  'M1200-09':
    "신규 설계본 '13_공정이동전표_부자재대사' 공정이동 전표 시트(예시행 클리어·내부 양식번호 M1200-05→M1200-09 정정 — 부자재 대사 시트는 시트 몫)",
  'M1200-05': "[열람형 전환 7/29 — M1100-05 선례 재적용] 낙하품 처리 절차 본문+PROCESS FLOW 도해 — 작성 양식 아님(기록은 M1200-06)",
  'M1200-07': "[열람형 전환 7/29] 셋업품 처리 절차 본문+현장 사진 4 — 작성 양식 아님",
  'M2100-02': "[열람형 전환 7/29] 선입선출(FIFO) 규칙 완성문(순서도·식별표 해석 포함) — 작성 양식 아님(점검은 K2100-10)",
  'M2100-03-01': "[열람형 전환 7/29] 필라네크 전용 LOT 추적성 이미지 문서(도해 19장) — 작성 양식 아님+타사업부 전용",
  'M2100-03-02': "[열람형 전환 7/29] 쇼바용접 전용 LOT 추적성 이미지 문서(도해 15장) — 작성 양식 아님+타사업부 전용",
  'K2100-07': "[열람형 전환 7/29] 장기 재고 관리 기준 본문+기준표 — 작성 양식 아님(현황 기록은 K2100-01)",
  // ── 4배치(7/29, 0111 — 마스터 워크북 직접 스캔: 시트 실존 15 + 0065 설계본 2, 신규 창작 0) ──
  'L1200-07': "마스터 'CF 점검 시트(L1200-07)' — 분기 점검(본행+특이사항행 stride 2×4)",
  'L1200-10': "마스터 '대여자산 관리대장(L1200-10)' — 대장형(21열)",
  'J1102-02': "마스터 '관리계획서 특별특성 (J1102-02)' — 빈 틀 실측, 특성 목록 grid(승인 블록은 병합 구조 부재로 시트 수기)",
  'J1102-03': "마스터 '관리계획서 체크리스트 (J1102-03)' — AIAG 21문항(예/아니오/N.A grid)",
  'K1200-04-01': "마스터 '타사업부 실적,체제 평가 계획서 (K1200-04-01)' — 평가 블록(평점 9+총평점, A5200-04-01 유형)",
  'H3200-01': "마스터 '고객불만 접수 대응 현황 보고서 (H3200-01)' — 2행 병합 grid(수식 8열 보존 미매핑)",
  'F2100-05-01': "마스터 '공정면허 이론평가서 1안 (F2100-05-01)' — 최소 매핑 5(문항 10·답안은 시트 몫)",
  'F2100-05-02': "마스터 '공정면허 이론평가서 2안 (F2100-05-02)' — 최소 매핑 3(문항·정답열은 시트 몫)",
  'B2100-04':
    "마스터 장기테마 시트(19년~ 실기록 보유) → templates/batch4/B2100-04_장기테마_추출.xlsx (헤더+빈 블록 10개 추출·기록 클리어 — 1배치 AM 추출 선례)",
  'B2100-05':
    "마스터 즉실천항목 시트(실기록 4,443행 보유) → templates/batch4/B2100-05_즉실천항목_추출.xlsx (동일 추출)",
  'F1100-04':
    "마스터 지식 관리표 시트(기록 144행 보유) → templates/batch4/F1100-04_지식관리표_추출.xlsx (동일 추출 — 연번 수식 클리어·수기 한계)",
  'B1100-12': "신규 설계본 '03_리크리워크_이력대장' 양식 시트(예시행 클리어·내부 양식번호 B1100-10→12 정정)",
  'B1100-13': "신규 설계본 '10_부적합품_처리대장' 양식 시트(예시행 클리어·양식번호 B1100-11→13 정정 — N열 수량대사 수식 보존)",
  'L1200-08': "[열람형 전환 7/29 4배치] 검사구·물품납입 계약서 조문 전문 — 작성 양식 아님(체결=서면·인감 동선)",
  'L1200-09': "[열람형 전환 7/29 4배치] 지그 사용대차 계약서 조문 전문 — 작성 양식 아님(대여 기록은 L1200-10)",
  'B1100-07': "[열람형 전환 7/29 4배치] 신속 대응 계통도 이미지 3+실명 연락망 기정의 — 작성 양식 아님",
  'B1100-08': "[열람형 전환 7/29 4배치] 부적합품 처리 기준 전면 이미지 도해(가로/세로 2시트) — 작성 양식 아님(기록은 B1100-13)",
  // ── 5배치(7/29, 0112 — B2300 시트명 한 자리 코드 실측 → 시트명 정정 추출) ──
  'B2300-02': "마스터 '정성품질 취합 대장(B2300-2)' → templates/batch5/B2300-02_취합대장.xlsx (시트명 한 자리 코드 = resolveSheet 매칭 불가 실측 — 2자리 정정 추출, 마스터 무변경)",
  'B2300-03': "마스터 '정성품질 점검 체크시트(B2300-3)' → templates/batch5/B2300-03_점검체크시트.xlsx (동일. ⚠️마스터에 '정성품질 순회 점검 시트(B2300-3)' 코드 중복 별개 양식 실측 — forms 미등록, 처리 보류)",
  'B2300-04': "마스터 '문제점 및 개선 제안서(B2300-4)' → templates/batch5/B2300-04_개선제안서.xlsx (동일)",
  'B2300-05': "마스터 '정성품질 개선 타당성 검토(B2300-5)' → templates/batch5/B2300-05_타당성검토.xlsx (동일 — 검토 YES/NO 체크는 시트 수기)",
  'B2300-06': "마스터 '유효성 평가 보고서(B2300-6)' → templates/batch5/B2300-06_유효성평가.xlsx (동일 — 추이도·사진 시트 몫)",
  'B2300-07': "마스터 '인라인 공정불량 사례 시트(B2300-7)' → templates/batch5/B2300-07_공정불량사례.xlsx (동일 — 병합 블록 1건 서술형 실측)",
  'L2300-04': "마스터 'OK_NG MASTER 관리대장(L2300-04)' — 대장형(사진 열 시트 수기)",
  'L4101-01': "마스터 'Xbar-R 관리도 (L4101-01)' — 계산기형 최소 매핑 9(L4102-02 선례, 수식·측정 매트릭스 시트 몫). ⚠️L-4101-01 'SPC 평가표'는 독립 .xls 별개 실체 실측 — 이중 등록 아님(4배치 §2-⑤ 의심 해소)",
  'B2200-05': "신규 설계본 '11_품질실적_월보' 양식 시트(예시행 클리어·(제안) 정정 — PPM 수식 보존)",
  'F1101-03': "신규 설계본 '21_온보딩체크_오퍼레이터' — 원본 부재 실측(F-1101 은 01/02 뿐). 항목 콘텐츠 = 관리팀 몫(창작 0)",
  'F1101-04': "신규 설계본 '22_온보딩체크_관리자' — 동일",
  'B2300-01': "[열람형 전환 7/29 5배치] CFT 업무 분장 — 사업부×역할 실명 조직표 기정의, 작성 양식 아님"
}

// 문서 열람형(작성 양식 아님 — 코워크 전환 승인/선례 재적용): 갭A 집계에서 분리해 정직 표기
const VIEW_ONLY = new Set([
  'M1100-05',
  // 3배치(0110, M1100-05 선례 재적용 — 검수요청 명기, 이의 시 반전)
  'M1200-05', 'M1200-07', 'M2100-02', 'M2100-03-01', 'M2100-03-02', 'K2100-07',
  // 4배치(0111, 동일 선례 — 계약서 2·계통도 1·이미지 기준표 1)
  'L1200-08', 'L1200-09', 'B1100-07', 'B1100-08',
  // 5배치(0112 — CFT 실명 분장표)
  'B2300-01'
])

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
