#!/usr/bin/env node
// ============================================================
// scripts/gen-pack-standard.mjs — 표준팩 시드 생성기 (39호 S3-1, 2026-08-19)
//
// 40호 ④ 도장(8/19) 이행: 전 마이그 체인을 임시 DB 에 적용한 뒤(운영 DB 비접촉 — 복사본의
// 운영 상태가 섞이지 않게) 업종중립 카탈로그를 추출·중립화해 resources/packs/standard/*.sql 로 쓴다.
//
// 산출(5파일):
//   020_sq_backbone.sql        sq_categories 6 · sq_items 42(④-4: 브레이징 4행 업종중립 재작성 — REWRITE_ITEMS)
//                              · sq_reg_map · sq_item_docs · sq_item_form_types(count_in_archive→0 — TPC 보관소 통계 제거)
//   030_sq_guide_layer.sql     sq_guide_items 42("TPC-" 접두 제거·"(보유 N건…)" 제거) · sq_guides 372(④-4: 11행 재작성
//                              — REWRITE_GUIDES) · sq_checkpoints 162(상태 리셋: status='missing'·note/updated_by/at NULL
//                              — 현행 값은 TPC ISIR 실사 상태라 카탈로그가 아님)
//   040_pack_forms.sql         pack_forms 57 (sq-minimal 55 + iatf-gap 2) — 0133·0135 그대로(중립)
//   050_apqp_catalog.sql       apqp_phases 5 · apqp_elements 43(team_id→NULL: 표준 설치는 teams 빈 상태·FK / status 리셋)
//                              ※ ppap/fmea/msa 는 데모 인스턴스라 제외(카탈로그는 앱 코드가 보유)
//   060_kpi_indicators.sql     kpi_indicators 35 (④-6: target→NULL — 이름·단위·방향만)
//   070_recurring_obligations.sql  정기의무(④-3: 역할 기반 — assignee/anchor/last/next→NULL · TPC 전제 6건 제외 EXCLUDE_OBLIGATIONS)
//
// 규칙: INSERT OR IGNORE·컬럼 명시(packs README). AUTOINCREMENT id 는 명시 적재(guide_id 링크 보존).
// 재실행 = 전량 재생성(결정적 — 체인이 결정적이므로 diff 0 이 정상).
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\gen-pack-standard.mjs
// ============================================================
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const core = require('../server/migrate-core.cjs')

const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')
const outDir = join(repo, 'resources', 'packs', 'standard')

// ── ④-4 재작성 맵 ① sq_items — 브레이징(TPC SQ 범위 공정) 4행 → 업종중립. 키 = code ──
const REWRITE_ITEMS = {
  '1_5': {
    title: '주요조건 기준수립 및 현장 관리 상태 비교검증 실시',
    requirement:
      '(특수공정 보유 시 — 열처리·용접·도장·성형 등)\n' +
      '   ▷ 주요조건 : 사양별 조건(온도·시간·속도·전류·전압·유량·투입량 등) 기준 수립\n' +
      '   ▷ 구간별 실측관리 — 자동 기록계(타점·차트) 관리 / 조건 프로파일 정기 측정 관리\n' +
      '   ▷ 보조매체(가스·용재·약품 등) 기준 설정 및 준수상태\n' +
      '(수작업 공정)\n' +
      '   ▷ 작업표준서 현장 게시 (조건·한도견본)\n' +
      '   ▷ 작업자 인증 · 후속 검사로 보증\n' +
      '   ▷ 작업 조건 기준관리\n' +
      '    → 이상 감지장치(경보 등) 설치, 미설치 시 관리방안 수립 및 기준준수·실행상태\n\n' +
      '※ 작업자 착용구(장갑 등)에 의한 제품 오염으로 품질 결함이 발생하지 않도록 점검'
  },
  '2_8': {
    title: '완제품 검사 기준 설정 및 준수상태',
    requirement:
      '- 외관, 치수, 취약부 검사, 상대물 조립성 검증 등 (샘플 실측 요망)\n' +
      '    - 최종 검사 기준설정 및 시행상태, 검사이력 관리 (1회 이상 /3개월)\n' +
      '    → 특수공정 보유 시 : 접합·처리부 파괴 평가(절개 등) 및 외관 결함·기밀(LEAK) 검사 진행'
  },
  '3_4': {
    title: '작업전 설비 일상점검 항목 설정 및 실행상태 확인',
    requirement:
      '- 가공·조립 설비: 공구/소모부 교환 기준. 급유·청소. 케이블. 전류 전압.\n' +
      '    - 처리로(爐)·챔버형 설비 : 내부온도 . 이송 속도 실측 . 유량 . 소모부(메쉬 등)\n' +
      '    - 자동화 설비(로봇 등) 원점관리 : 시작원점 일치 확인. 궤적 확인\n' +
      '     (시업전 원점확인/ 사진 전산관리 or 경보작동 : 원점확인 수치화 어려움)'
  },
  '3_5': {
    title: '특수공정 설비(로 등) 점검 항목 설정상태 및 시행 여부',
    requirement:
      '- 특수공정 설비 내 조건 구간별 실측점검\n    - 조건 프로파일 관리\n    - 이송 장치(콘베어 등) 속도 실측점검'
  }
}

// ── ④-4 재작성 맵 ② sq_guides — 브레이징 예시 11행 → 업종중립. 키 = `${item_code}|${section}|${sort_order}` ──
const REWRITE_GUIDES = {
  '1_3|examples|1':
    '교육기록: `2026-06-10 외국인 작업자A | WS-12 핵심공정 작업표준 교육(모국어 통역 병행) | 숙지확인: 이상 발생 시 정지→호출 절차 문답 OK | 교육자 서명`',
  '1_5|evidence|1':
    '(특수공정 예 — 로(爐)형) 주요조건(온도·시간·속도·유량 등) 기준표 / 사양별 투입·조건 기준 / 구간별 실측기록 + 자동 기록계 차트 / 조건 프로파일 정기 측정 성적서 / 보조매체(가스·용재 등) 기준·점검기록',
  '1_5|evidence|2':
    '(수작업 공정) 작업표준서 현장 게시(조건·한도견본) / 작업자 인증 기록(6_5 연계) / 작업부 관리 기준·점검 / 이상 감지장치(경보 등) or 대체 관리기준',
  '2_8|evidence|3': '특수공정 특화: 접합·처리부 파괴 평가(절개 등) 기록 + 외관 결함·기밀(LEAK) 검사 기록',
  '2_9|examples|1':
    '`RW-0715-03 | 기밀 NG 1EA (LOT B0715-1) | 재작업 후 재검사: 측정값 기준 내 적합 + 외관·처리부 확인 | 판정 합격 | 리워크자/재검사자 서명 상이`',
  '3_1|examples|1':
    '`핵심설비 #1 일상점검 07-15 | 에어압 0.52MPa(0.4~0.6 녹색범위) | 보조매체 유량 기준 내 | 알람 테스트 ○ | KEY-LOCK 시건 ○ | NG마스터 검출 ○ | 점검자 서명 08:00`',
  '3_4|evidence|2': '처리로(爐)·챔버형 설비: 내부온도·이송 속도 실측·유량·소모부(메쉬 등) 점검 기록',
  '3_5|examples|1':
    '`설비 #1 조건 프로파일 (2026-07-01, 측정기 교정有) | 구간별 실측 — 기준곡선 대비 편차 허용범위 내 적합 | 차트 첨부 | 측정자/검토자`',
  '5_1|examples|1':
    '모의 역추적: `완제품 LOT B0710-1 → 핵심공정 07-10 설비#1 (작업일보) → 원자재 LOT P-0708A·부자재 C25-0702 (투입기록) → 수입검사 성적서 #IR-471/468 — 역추적 소요 8분, 실시자 서명`',
  '6_10|examples|1':
    '`리워크 기준표 | 경미 결함: Rework 가능(고객협의 문서번호 기재) — 재작업+재검사 | 구조 결함(크랙 등): 금지 → 폐기 | 치수 NG: 금지 → 폐기`',
  '6_11|how_to_write|1':
    '부자재 대사 예: 주요 부자재 사용량과 완성 수량을 월 대사 — `부자재 소진 10,250EA vs 생산 10,180EA, 차이 70EA(불량 폐기 65+낙하 5) 소명` 식으로 차이 원인까지 기재하면 우수 요소.'
}

// ── ④-3 제외 목록 — TPC 공정·시스템 전제 의무(고객사팩 몫). 키 = title ──
const EXCLUDE_OBLIGATIONS = [
  '브레이징 조건 기록(3회/일) 확인', // 공정 특화
  '스포트 팁 카운터↔교체대장 정합 확인', // 용접 특화
  '완성품 검사일지↔MES 수량 정합 점검', // 사이드카(MES) 전제
  '중금속(MS201-02) 공인성적서 수취 확인', // 고객 CSR(현대차 MS 사양)
  '내식성(MS611-15) 공인성적서 수취 확인', // 고객 CSR
  'MES 일일 기록 다운로드·폴더 적재(4종)' // 사이드카 전제
]

// ── 체인 DB 구축 ──
const tmp = mkdtempSync(join(tmpdir(), 'iatf-pack-standard-'))
const db = new Database(join(tmp, 'chain.db'))
db.pragma('foreign_keys = ON')
for (const f of core.listMigrationFiles(migDir)) {
  try {
    db.exec('BEGIN')
    db.exec(readFileSync(join(migDir, f), 'utf-8'))
    db.exec('COMMIT')
  } catch (err) {
    db.exec('ROLLBACK')
    console.error(`[gen-pack-standard] 체인 실패 ${f}: ${err.message}`)
    process.exit(1)
  }
}

const q = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`)
const TPC_RE = /티피씨|TPC|AM사업부|인발|조관|필라넥|쇼바|김권표|서상규|하헌|서규하|장석봉/
function insertBlock(table, cols, rows) {
  if (!rows.length) return `-- ${table}: 0행\n`
  const vals = rows.map((r) => `  (${cols.map((c) => q(r[c])).join(', ')})`).join(',\n')
  return `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES\n${vals};\n`
}
function header(file, desc) {
  return [
    '-- ============================================================',
    `-- packs/standard/${file} — ${desc}`,
    '-- 자동 생성: scripts/gen-pack-standard.mjs (손편집 금지 — 재작성·제외 목록도 생성기에 있음)',
    '-- 근거: 40호 ④ 도장(2026-08-19) · 39호 S3 · 실명 0·회사식별 0(생성기 게이트)',
    '-- ============================================================',
    ''
  ].join('\n')
}
const written = []
function writePack(file, desc, body) {
  const text = header(file, desc) + body
  const hit = text.match(TPC_RE)
  if (hit) {
    const i = text.search(TPC_RE)
    console.error(`[gen-pack-standard] 게이트 위반 — ${file} 에 회사식별/실명 '${hit[0]}' 잔존. 중단.`)
    console.error(`  문맥: …${text.slice(Math.max(0, i - 90), i + 90).replace(/\r?\n/g, ' ')}…`)
    process.exit(1)
  }
  writeFileSync(join(outDir, file), text, 'utf-8')
  written.push(file)
}

// ── 020 SQ 백본 ──
{
  const cats = db.prepare('SELECT id, name, points, iatf_clause, sort_order FROM sq_categories ORDER BY id').all()
  const items = db
    .prepare('SELECT code, category_id, title, points, requirement, sort_order, fallback_dept FROM sq_items ORDER BY sort_order, code')
    .all()
    .map((r) => (REWRITE_ITEMS[r.code] ? { ...r, title: REWRITE_ITEMS[r.code].title, requirement: REWRITE_ITEMS[r.code].requirement } : r))
  const regMap = db.prepare('SELECT reg_code, item_code FROM sq_reg_map ORDER BY item_code, reg_code').all()
  const itemDocs = db.prepare('SELECT id, item_code, doc_code, doc_name, dept FROM sq_item_docs ORDER BY id').all()
  const formTypes = db
    .prepare('SELECT id, item_code, form_type, count_in_archive FROM sq_item_form_types ORDER BY id')
    .all()
    .map((r) => ({ ...r, count_in_archive: 0 })) // TPC 보관소 통계 제거 — 신규 설치 정직값
  writePack(
    '020_sq_backbone.sql',
    `SQ Ver4 백본 — 카테고리 ${cats.length}·항목 ${items.length}(④-4 재작성 ${Object.keys(REWRITE_ITEMS).length}행)·규정맵 ${regMap.length}·문서 ${itemDocs.length}·양식유형 ${formTypes.length}`,
    insertBlock('sq_categories', ['id', 'name', 'points', 'iatf_clause', 'sort_order'], cats) +
      insertBlock('sq_items', ['code', 'category_id', 'title', 'points', 'requirement', 'sort_order', 'fallback_dept'], items) +
      insertBlock('sq_reg_map', ['reg_code', 'item_code'], regMap) +
      insertBlock('sq_item_docs', ['id', 'item_code', 'doc_code', 'doc_name', 'dept'], itemDocs) +
      insertBlock('sq_item_form_types', ['id', 'item_code', 'form_type', 'count_in_archive'], formTypes)
  )
}

// ── 030 SQ 가이드층 ──
{
  const guideItems = db
    .prepare('SELECT item_code, area, high_value, regulations_text, forms_text, cycle_retention, guide_version FROM sq_guide_items ORDER BY item_code')
    .all()
    .map((r) => ({
      ...r,
      regulations_text: (r.regulations_text || '').replace(/TPC-/g, ''), // ④-1: 코드 채택 — 접두만 제거
      forms_text: (r.forms_text || '').replace(/\s*\(보유 [\d,]+건[^)]*\)/g, '') // TPC 보관소 통계 제거
    }))
  const guides = db
    .prepare('SELECT id, item_code, section, sort_order, content FROM sq_guides ORDER BY id')
    .all()
    .map((r) => {
      const key = `${r.item_code}|${r.section}|${r.sort_order}`
      return REWRITE_GUIDES[key] ? { ...r, content: REWRITE_GUIDES[key] } : r
    })
  const checkpoints = db
    .prepare('SELECT id, item_code, guide_id FROM sq_checkpoints ORDER BY id')
    .all()
    .map((r) => ({ ...r, status: 'missing', evidence_note: null, updated_by: null, updated_at: null })) // 상태 리셋(현행 = TPC ISIR 실사 상태)
  writePack(
    '030_sq_guide_layer.sql',
    `SQ 가이드층 — 항목 ${guideItems.length}(규정 참조 회사 접두 제거)·가이드 ${guides.length}(④-4 재작성 ${Object.keys(REWRITE_GUIDES).length}행)·체크포인트 ${checkpoints.length}(상태 리셋)`,
    insertBlock('sq_guide_items', ['item_code', 'area', 'high_value', 'regulations_text', 'forms_text', 'cycle_retention', 'guide_version'], guideItems) +
      insertBlock('sq_guides', ['id', 'item_code', 'section', 'sort_order', 'content'], guides) +
      insertBlock('sq_checkpoints', ['id', 'item_code', 'guide_id', 'status', 'evidence_note', 'updated_by', 'updated_at'], checkpoints)
  )
}

// ── 040 양식 팩 정션 ──
{
  const packForms = db.prepare('SELECT pack_code, form_code, sq_item_code, required, sort_order, iatf_clause FROM pack_forms ORDER BY pack_code, sort_order').all()
  writePack(
    '040_pack_forms.sql',
    `양식 팩 정션 — ${packForms.length}행 (sq-minimal·iatf-gap, 0133/0135 승계)`,
    insertBlock('pack_forms', ['pack_code', 'form_code', 'sq_item_code', 'required', 'sort_order', 'iatf_clause'], packForms)
  )
}

// ── 050 APQP 카탈로그 ──
{
  const phases = db.prepare('SELECT id, phase_no, title, title_en, description, sort_order FROM apqp_phases ORDER BY sort_order').all()
  const elements = db
    .prepare('SELECT id, phase_id, seq, name, name_en, io, core_tool, clause_id, sort_order FROM apqp_elements ORDER BY phase_id, seq')
    .all()
    .map((r) => ({ ...r, team_id: null, status: 'not_started' })) // 표준 설치 = teams 빈 상태(FK)·진척 리셋
  writePack(
    '050_apqp_catalog.sql',
    `APQP 카탈로그 — 단계 ${phases.length}·산출물 ${elements.length}(team NULL·status 리셋) ※ PPAP/FMEA/MSA 데모 인스턴스는 제외`,
    insertBlock('apqp_phases', ['id', 'phase_no', 'title', 'title_en', 'description', 'sort_order'], phases) +
      insertBlock('apqp_elements', ['id', 'phase_id', 'seq', 'name', 'name_en', 'io', 'core_tool', 'clause_id', 'team_id', 'status', 'sort_order'], elements)
  )
}

// ── 060 KPI ──
{
  const kpi = db
    .prepare('SELECT id, name, unit, direction, cadence, owner_team, sort_order, active, note FROM kpi_indicators ORDER BY id')
    .all()
    .map((r) => ({ ...r, target: null })) // ④-6: 이름만, 목표값 비움
  writePack(
    '060_kpi_indicators.sql',
    `KPI 지표 — ${kpi.length}종 (④-6: target NULL — 설치 후 자사 목표 입력)`,
    insertBlock('kpi_indicators', ['id', 'name', 'unit', 'target', 'direction', 'cadence', 'owner_team', 'sort_order', 'active', 'note'], kpi)
  )
}

// ── 070 정기의무 ──
{
  const all = db
    .prepare('SELECT id, title, cadence, category, clause_ref, owner, lead_days, form_code, active, note, sort_order, trigger_type FROM recurring_obligations ORDER BY sort_order, id')
    .all()
  const excluded = all.filter((r) => EXCLUDE_OBLIGATIONS.includes(r.title))
  if (excluded.length !== EXCLUDE_OBLIGATIONS.length) {
    console.error(`[gen-pack-standard] 제외 목록 불일치 — 기대 ${EXCLUDE_OBLIGATIONS.length}·실제 ${excluded.length} (제목 드리프트?)`)
    process.exit(1)
  }
  const kept = all
    .filter((r) => !EXCLUDE_OBLIGATIONS.includes(r.title))
    .map((r) => ({ ...r, assignee: null, anchor_date: null, last_done_date: null, next_due_date: null })) // ④-3: 역할 기반 — 실명·도래일 리셋
  writePack(
    '070_recurring_obligations.sql',
    `정기의무 — ${kept.length}건(전체 ${all.length} 중 자사 공정·시스템 전제 ${excluded.length}건 제외 — 목록 = 생성기 EXCLUDE_OBLIGATIONS) · assignee/도래일 NULL(역할 기반, 설치 후 일괄 재설정)`,
    insertBlock(
      'recurring_obligations',
      ['id', 'title', 'cadence', 'category', 'clause_ref', 'owner', 'lead_days', 'anchor_date', 'last_done_date', 'next_due_date', 'form_code', 'active', 'note', 'sort_order', 'assignee', 'trigger_type'],
      kept
    )
  )
}

db.close()
rmSync(tmp, { recursive: true, force: true })
console.log(`[gen-pack-standard] wrote ${written.length} files: ${written.join(', ')}`)
