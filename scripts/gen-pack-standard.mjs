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
//   ── S3-2(8/19 저녁~) ──  규칙·명시 맵 = scripts/lib/neutralize-forms.mjs (before/after 문서와 공유)
//   080_forms_catalog.sql      forms 294(302 − 제외 8: 사업부 전용 6 + 타사업부 열람형 2 · 사업부 scope 3은 SQ 미니멀 정션 참조라 공통 편입)
//                              ④-1 코드 채택 · name 접미 정리 · description 중립화(플레이스홀더→NULL·개발 메모 기계 정리·TPC/AM 행 재작성) · scope→'공통'
//   081_form_layout.sql        form_fields·form_cell_map·form_grid_spec·form_grid_columns·form_option_cells — 보유 양식분만 + 라벨/키 중립화(REWRITE_FIELDS)
//                              ※ form_examples(④-7 ⓐ 제외)·form_change_log(운영 이력)·process_forms(TPC 프로세스 FK)는 싣지 않음
//   090_doc_bom_skeleton.sql   bom_documents 105 — 목록 뼈대(④-5 ⓑ): rev/일자 NULL·status '파일없음(작성/수집필요)'·forms_count = 표준팩 양식 수 재계산
//   091_regulation_skeleton.sql regulation_sections — 규정별 목차 뼈대 + 안내문(신규 집필·TPC 0) + 관련 양식 목록(080 에서 자동) + IATF/SQ 연계 포인터
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
import { EXCLUDE_FORMS, PROMOTE_TO_COMMON, REWRITE_FIELDS, cleanName, cleanDescription, RESIDUE_RE } from './lib/neutralize-forms.mjs'

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
// 레거시 무해 보강: 대상 테이블이 **비어 있을 때만**(= 클린 설치) 적재. 레거시 DB 는 id 가 이어져 있어 OR IGNORE 만으로는
// 초과 id 행이 끼어들 수 있는 테이블(regulation_sections — TPC 622행 뒤에 623~855 가 들어감)에 쓴다. 기존 본문 보유 = no-op.
function insertBlockIfEmpty(table, cols, rows) {
  if (!rows.length) return `-- ${table}: 0행\n`
  const vals = rows.map((r) => `  (${cols.map((c) => q(r[c])).join(', ')})`).join(',\n')
  const sel = cols.map((_, i) => `column${i + 1}`).join(', ')
  return `INSERT OR IGNORE INTO ${table} (${cols.join(', ')})\nSELECT ${sel} FROM (VALUES\n${vals}\n) WHERE NOT EXISTS (SELECT 1 FROM ${table} LIMIT 1);\n`
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

// ══════════════════════════ S3-2 — 양식 카탈로그·레이아웃·문서 뼈대 ══════════════════════════
// ── 080 양식 카탈로그 ──
const keptForms = []
{
  const all = db
    .prepare(
      'SELECT code, name, reg_code, description, approvals_json, next_form_code, next_form_label, prev_form_code, layout_json, scope, deprecated, deprecated_note, replacement_page, resp_dept, iatf_clause, sq_item_ids, template_path FROM forms ORDER BY code'
    )
    .all()
  const excluded = all.filter((r) => EXCLUDE_FORMS[r.code])
  if (excluded.length !== Object.keys(EXCLUDE_FORMS).length) {
    console.error(`[gen-pack-standard] forms 제외 목록 불일치 — 기대 ${Object.keys(EXCLUDE_FORMS).length}·실제 ${excluded.length}`)
    process.exit(1)
  }
  const divisionLeft = all.filter((r) => !EXCLUDE_FORMS[r.code] && !['common', '공통'].includes(r.scope) && !PROMOTE_TO_COMMON.includes(r.code))
  if (divisionLeft.length) {
    console.error(`[gen-pack-standard] 사업부 scope 잔존(제외도 편입도 아님): ${divisionLeft.map((r) => r.code).join(', ')}`)
    process.exit(1)
  }
  for (const r of all) {
    if (EXCLUDE_FORMS[r.code]) continue
    keptForms.push({
      ...r,
      name: cleanName(r.code, r.name),
      description: cleanDescription(r.code, r.description),
      scope: '공통', // 'common'(스키마 기본값 잔재)·'공통' 혼용 → 렌더러 FormScope 정본 '공통' 으로 통일
      next_form_code: r.next_form_code && EXCLUDE_FORMS[r.next_form_code] ? null : r.next_form_code,
      prev_form_code: r.prev_form_code && EXCLUDE_FORMS[r.prev_form_code] ? null : r.prev_form_code
    })
  }
  const names = new Map()
  for (const r of keptForms) {
    if (names.has(r.name)) {
      console.error(`[gen-pack-standard] 양식명 중복 — '${r.name}': ${names.get(r.name)} / ${r.code}`)
      process.exit(1)
    }
    names.set(r.name, r.code)
  }
  const residue = keptForms.filter((r) => RESIDUE_RE.test(r.name) || (r.description && RESIDUE_RE.test(r.description)))
  if (residue.length) {
    console.error(`[gen-pack-standard] 080 잔재 게이트 위반 ${residue.length}행: ${residue.map((r) => r.code).join(', ')}`)
    process.exit(1)
  }
  const descNull = keptForms.filter((r) => r.description === null).length
  writePack(
    '080_forms_catalog.sql',
    `양식 카탈로그 — ${keptForms.length}종(체인 ${all.length} − 제외 ${excluded.length}: 사업부 전용·타사업부 열람형 / 사업부 scope ${PROMOTE_TO_COMMON.length}종은 SQ 미니멀 정션 참조라 공통 편입) · ④-1 코드 체계 채택 · 이름 접미 정리 · 설명 중립화(NULL ${descNull}) · scope '공통' 통일`,
    insertBlock(
      'forms',
      ['code', 'name', 'reg_code', 'description', 'approvals_json', 'next_form_code', 'next_form_label', 'prev_form_code', 'layout_json', 'scope', 'deprecated', 'deprecated_note', 'replacement_page', 'resp_dept', 'iatf_clause', 'sq_item_ids', 'template_path'],
      keptForms
    )
  )
}
const keptCodes = new Set(keptForms.map((r) => r.code))
const inKept = (r) => keptCodes.has(r.form_code)

// ── 081 양식 레이아웃(필드·셀맵·그리드) ──
{
  const applyField = (r) => {
    const rw = REWRITE_FIELDS[`${r.form_code}|${r.field_key}`]
    return rw ? { ...r, ...rw } : r
  }
  const fields = db
    .prepare('SELECT id, form_code, field_key, label, type, section, placeholder, options_json, unit, ai_enabled, ai_prompt_hint, sort_order, field_class FROM form_fields ORDER BY id')
    .all()
    .filter(inKept)
    .map(applyField)
  const cellMap = db.prepare('SELECT id, form_code, field_key, label, cell, type, sort_order FROM form_cell_map ORDER BY id').all().filter(inKept).map(applyField)
  const gridSpec = db.prepare('SELECT form_code, grid_key, data_start_row, stride, max_rows FROM form_grid_spec ORDER BY form_code, grid_key').all().filter(inKept)
  const gridCols = db
    .prepare('SELECT form_code, grid_key, col_key, label, sheet_col, type, sort_order FROM form_grid_columns ORDER BY form_code, grid_key, sort_order')
    .all()
    .filter(inKept)
  const optCells = db.prepare('SELECT form_code, field_key, option, cell, sort_order FROM form_option_cells ORDER BY form_code, field_key, sort_order').all().filter(inKept)
  // 재작성 맵 키가 실제 행에 전부 닿았는지(드리프트 가드)
  const touched = new Set()
  for (const r of [...db.prepare('SELECT form_code, field_key FROM form_fields').all(), ...db.prepare('SELECT form_code, field_key FROM form_cell_map').all()]) touched.add(`${r.form_code}|${r.field_key}`)
  const miss = Object.keys(REWRITE_FIELDS).filter((k) => !touched.has(k))
  if (miss.length) {
    console.error(`[gen-pack-standard] REWRITE_FIELDS 키 미존재(드리프트): ${miss.join(', ')}`)
    process.exit(1)
  }
  writePack(
    '081_form_layout.sql',
    `양식 레이아웃 — 필드 ${fields.length}·셀맵 ${cellMap.length}·그리드 ${gridSpec.length}/${gridCols.length}·옵션셀 ${optCells.length} (표준팩 양식 ${keptCodes.size}종분 · 라벨/키 중립화 ${Object.keys(REWRITE_FIELDS).length}건) ※ form_examples(④-7)·form_change_log·process_forms 제외`,
    insertBlock('form_fields', ['id', 'form_code', 'field_key', 'label', 'type', 'section', 'placeholder', 'options_json', 'unit', 'ai_enabled', 'ai_prompt_hint', 'sort_order', 'field_class'], fields) +
      insertBlock('form_cell_map', ['id', 'form_code', 'field_key', 'label', 'cell', 'type', 'sort_order'], cellMap) +
      insertBlock('form_grid_spec', ['form_code', 'grid_key', 'data_start_row', 'stride', 'max_rows'], gridSpec) +
      insertBlock('form_grid_columns', ['form_code', 'grid_key', 'col_key', 'label', 'sheet_col', 'type', 'sort_order'], gridCols) +
      insertBlock('form_option_cells', ['form_code', 'field_key', 'option', 'cell', 'sort_order'], optCells)
  )
}

// ── 090 문서 BOM 목록 뼈대 (④-5 ⓑ) ──
const bomDocs = db
  .prepare('SELECT doc_no_norm, doc_no_raw, category, category_label, name, owner_dept, sort_order FROM bom_documents ORDER BY sort_order')
  .all()
  .map((r) => ({
    ...r,
    owner_dept: r.owner_dept ? r.owner_dept.replace(/\s+/g, '') : r.owner_dept, // "총 무 팀" → "총무팀"(원본 엑셀 정렬 공백)
    list_rev: null,
    list_date: null,
    file_rev: null,
    file_date: null,
    status: '파일없음(작성/수집필요)', // 신규 설치 정직값 — 문서 파일은 고객사가 채움
    forms_count: keptForms.filter((f) => f.reg_code === r.doc_no_raw).length
  }))
writePack(
  '090_doc_bom_skeleton.sql',
  `문서 BOM 목록 뼈대 — ${bomDocs.length}건(매뉴얼·프로세스·품질규정·안전환경 제목 목록) · rev/일자 NULL · status '파일없음' · forms_count = 표준팩 양식 수`,
  insertBlock('bom_documents', ['doc_no_norm', 'doc_no_raw', 'category', 'category_label', 'name', 'owner_dept', 'list_rev', 'list_date', 'file_rev', 'file_date', 'status', 'forms_count', 'sort_order'], bomDocs)
)

// ── 091 규정 뼈대 템플릿 (④-5 ⓑ — 목차 + 안내문 신규 집필 + 관련 양식 자동) ──
{
  // 규정 우주 = 문서 BOM 의 규정·지침(품질 56 + 안전환경 39) ∪ 양식이 참조하는 reg_code(누락 시 제목은 코드로)
  const regs = new Map()
  for (const d of bomDocs) if (d.category === 'quality' || d.category === 'safety_env') regs.set(d.doc_no_raw, { code: d.doc_no_raw, name: d.name, category: d.category })
  for (const f of keptForms) if (!regs.has(f.reg_code)) regs.set(f.reg_code, { code: f.reg_code, name: `${f.reg_code} 규정`, category: 'quality', untitled: true })
  const sqMap = new Map()
  for (const r of db.prepare('SELECT reg_code, item_code FROM sq_reg_map ORDER BY item_code').all()) {
    if (!sqMap.has(r.reg_code)) sqMap.set(r.reg_code, [])
    sqMap.get(r.reg_code).push(r.item_code)
  }
  const rows = []
  let id = 1
  const push = (reg_code, section_title, section_body, sort_order) => rows.push({ id: id++, reg_code, section_title, section_body, sort_order })
  const sortedRegs = [...regs.values()].sort((a, b) => a.code.localeCompare(b.code))
  for (const reg of sortedRegs) {
    const forms = keptForms.filter((f) => f.reg_code === reg.code)
    const clauses = [...new Set(forms.map((f) => f.iatf_clause).filter(Boolean))].sort()
    const sq = sqMap.get(reg.code) || []
    const cat = reg.category === 'safety_env' ? '안전보건환경(ISO 45001/14001)' : '품질(IATF 16949)'
    push(reg.code, '(서두)',
      `${reg.name} · 문서번호 ${reg.code} · 개정 REV.0 · 제정일 (    ) — ※ 뼈대 템플릿: 목차와 각 절의 안내문만 들어 있습니다. 자사 실무에 맞게 본문을 채우고 개정이력을 기록하세요.\n` +
      `개정이력 | 개정번호 | 재·개정일(시행일자) | 재·개정 사유 및 내용\n0 | (    ) | 제정`, 0)
    push(reg.code, '1. 적용범위',
      `이 규정은 당사에서 수행하는 ${reg.name.replace(/\s*(규정|지침)$/, '')} 업무에 적용한다.\n[안내] 적용 조직(전사/사업장/부서)·대상 업무·대상 제품/공정의 경계를 한 문장으로 정한다. 예외(적용 제외)가 있으면 함께 적는다.`, 1)
    push(reg.code, '2. 목적',
      `[안내] 이 규정을 운영하는 이유를 ${cat} 요구사항과 연결해 기술한다. "무엇을 관리하여 어떤 결과(고객 요구 충족·부적합 예방·추적성 확보 등)를 얻는가"를 적는다.${clauses.length ? ` 관련 IATF 16949 조항: §${clauses.join(', §')}.` : ''}`, 2)
    push(reg.code, '3. 용어의 정의',
      `[안내] 이 규정에서 쓰는 용어 중 해석 차이가 날 수 있는 것만 정의한다(예: 승인/검토/작성, 특채, 4M 변경, 특별특성). 표준 용어는 IATF 16949·ISO 9000 정의를 따른다고 적고 생략해도 된다.`, 3)
    push(reg.code, '4. 책임과 권한',
      `[안내] 대표이사·주관 부서장·관련 부서·담당자 순으로 "누가 무엇을 승인/검토/작성/실행하는지"를 역할 기준으로 적는다(실명 금지 — 직위·팀명으로). 위임전결이 있으면 기준을 명시한다.`, 4)
    push(reg.code, '5. 업무 절차 및 방법',
      `[안내] 업무 흐름을 순서대로(접수→검토→실행→확인→기록) 번호 붙여 기술한다. 각 단계에서 사용하는 양식(7항)과 판정 기준·주기·이상 시 조치를 함께 적는다. 심사에서는 "절차대로 했다는 기록"이 증거이므로 기록 시점과 보관 위치를 빠뜨리지 않는다.`, 5)
    push(reg.code, '6. 기록 관리',
      `이 규정에 따라 발생하는 기록은 "기록관리 규정"에 따라 식별·보관·보존·폐기한다.\n[안내] 기록별 보존기간·보관 부서·매체(전자/지면)를 표로 정리하면 좋다.`, 6)
    push(reg.code, '7. 관련 양식',
      forms.length
        ? forms.map((f, i) => `(${i + 1}) ${f.name} (${f.code})`).join('\n')
        : `(해당 양식 없음 — 양식을 제정하면 양식등록대장에 등록하고 이 절에 추가한다)`, 7)
    push(reg.code, '8. 관련 문서·참조',
      `[안내] 상위 문서(품질·환경 매뉴얼, 관련 프로세스)와 참조 표준·고객 요구사항(CSR)을 적는다.${sq.length ? `\nSQ 평가 연계 항목: ${sq.join(', ')} — 심사대응 SQ 화면의 해당 항목 가이드·체크포인트를 참조.` : ''}${reg.untitled ? '\n※ 이 규정 코드는 양식 카탈로그에서만 참조됨 — 문서 BOM 목록표에 제목을 등록하세요.' : ''}`, 8)
  }
  writePack(
    '091_regulation_skeleton.sql',
    `규정 뼈대 템플릿 — 규정 ${sortedRegs.length}종 × 9절 = ${rows.length}행(④-5 ⓑ: 목차 + 안내문 신규 집필 · 관련 양식은 080 에서 자동 · IATF/SQ 연계 포인터) · 본문 없음(고객사 집필)`,
    insertBlockIfEmpty('regulation_sections', ['id', 'reg_code', 'section_title', 'section_body', 'sort_order'], rows) // 레거시(TPC 본문 622행 보유) = no-op
  )
}

db.close()
rmSync(tmp, { recursive: true, force: true })
console.log(`[gen-pack-standard] wrote ${written.length} files: ${written.join(', ')}`)
