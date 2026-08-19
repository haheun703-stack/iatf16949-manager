#!/usr/bin/env node
// ============================================================
// scripts/gen-forms-before-after.mjs — S3-2 양식 카탈로그 중립화 before/after 대조본 생성 (2026-08-19)
//
// before = 마이그 체인 원문(레거시 = :8081 과 동일) · after = scripts/lib/neutralize-forms.mjs 규칙 적용 결과
// (= resources/packs/standard/080_forms_catalog.sql·081 에 적재되는 값 — 같은 모듈을 쓰므로 문서=팩 보장).
// 산출: docs/mes-foundation/dailyq-S3-2_forms_before_after_260819.md (인자로 경로 지정 가능)
// 사용: ELECTRON_RUN_AS_NODE=1 node_modules\electron\dist\electron.exe scripts\gen-forms-before-after.mjs [out.md]
// ============================================================
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { EXCLUDE_FORMS, PROMOTE_TO_COMMON, RENAME_FORMS, REWRITE_DESC, REWRITE_FIELDS, cleanName, cleanDescription } from './lib/neutralize-forms.mjs'

const require = createRequire(import.meta.url)
const Database = require('better-sqlite3')
const core = require('../server/migrate-core.cjs')
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const migDir = join(repo, 'resources', 'migrations')
const out = process.argv[2] || join(repo, 'docs', 'mes-foundation', 'dailyq-S3-2_forms_before_after_260819.md')

const tmp = mkdtempSync(join(tmpdir(), 'iatf-forms-ba-'))
const db = new Database(join(tmp, 'chain.db'))
for (const f of core.listMigrationFiles(migDir)) {
  db.exec('BEGIN')
  db.exec(readFileSync(join(migDir, f), 'utf-8'))
  db.exec('COMMIT')
}
const forms = db.prepare('SELECT code, name, scope, reg_code, description FROM forms ORDER BY code').all()
const fieldRows = [
  ...db.prepare('SELECT form_code, field_key, label, options_json, ai_prompt_hint FROM form_fields').all().map((r) => ({ ...r, t: 'form_fields' })),
  ...db.prepare('SELECT form_code, field_key, label FROM form_cell_map').all().map((r) => ({ ...r, t: 'form_cell_map' }))
]
db.close()
rmSync(tmp, { recursive: true, force: true })

const esc = (s) => (s === null || s === undefined ? '*(NULL)*' : String(s).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ⏎ '))
const L = []
L.push('# S3-2 양식 카탈로그 중립판 — before/after 전문 (2026-08-19 저녁, 봇 · 기계 생성)')
L.push('')
L.push('- before = 마이그 체인 원문(레거시 = :8081 과 동일) · after = `scripts/lib/neutralize-forms.mjs` 규칙 적용 결과 = `packs/standard/080·081` 적재값(같은 모듈 → 문서=팩). 생성기: `scripts/gen-forms-before-after.mjs`.')
L.push('- 코워크 품질 기준(④-4 회신 §3 준용): ①용도 요지 보존 ②회사·사업부·공정 고유성 제거 ③가짜 중립화 금지.')
L.push('- ★description 정책(검수요청 §3 판단 요청): 원문 302행 중 상품 문장 3행뿐. 플레이스홀더 91행→NULL, 개발 이력 메모 208행→**기계 정리**(배치·트랙·선례·실측 참조 제거, 구조 요지 유지) — "시트 몫"·grid 같은 앱 어휘는 남음. 상품 문장 재집필은 S3-2b.')
L.push('')

// A. 제외
L.push(`## A. 표준팩 제외 ${Object.keys(EXCLUDE_FORMS).length}종 (사업부 scope 9 중 6 + 타사업부 전용 열람형 2)`)
L.push('')
L.push('| code | 원제 | scope | 사유 |')
L.push('|---|---|---|---|')
for (const code of Object.keys(EXCLUDE_FORMS)) {
  const r = forms.find((f) => f.code === code)
  L.push(`| ${code} | ${esc(r?.name)} | ${esc(r?.scope)} | ${esc(EXCLUDE_FORMS[code].split(' — ')[1] || EXCLUDE_FORMS[code])} |`)
}
L.push('')
L.push(`## B. 사업부 scope → 공통 편입 ${PROMOTE_TO_COMMON.length}종 (★편차 신고 — SQ 미니멀 팩 정션 pack_forms 가 참조)`)
L.push('')
L.push('| code | before(이름·scope) | after(이름·scope) |')
L.push('|---|---|---|')
for (const code of PROMOTE_TO_COMMON) {
  const r = forms.find((f) => f.code === code)
  L.push(`| ${code} | ${esc(r.name)} · ${r.scope} | ${esc(cleanName(code, r.name))} · 공통 |`)
}
L.push('')

// C. 이름 변경
const kept = forms.filter((f) => !EXCLUDE_FORMS[f.code])
const nameChanged = kept.filter((f) => cleanName(f.code, f.name) !== f.name)
L.push(`## C. 양식명 정리 ${nameChanged.length}행 (기계 규칙 ${nameChanged.length - Object.keys(RENAME_FORMS).filter((c) => kept.some((k) => k.code === c)).length} + 명시 맵 RENAME_FORMS ${Object.keys(RENAME_FORMS).length})`)
L.push('')
L.push('규칙: 선두 `( )사업부`/`( )년` 자리표 제거 · `년 ` → `연간 ` · 꼬리 `()`/`()_팀명` 제거(`()_갑지`→`(갑지)`) · `(-AM)`/`(-조6)`/`(-01)` 접미 제거 · 공백 정리.')
L.push('')
L.push('| code | before | after | 비고 |')
L.push('|---|---|---|---|')
for (const f of nameChanged) L.push(`| ${f.code} | ${esc(f.name)} | ${esc(cleanName(f.code, f.name))} | ${RENAME_FORMS[f.code] ? '명시 맵' : ''} |`)
L.push('')

// D. 설명
const descNull = kept.filter((f) => cleanDescription(f.code, f.description) === null)
const descExplicit = kept.filter((f) => REWRITE_DESC[f.code])
const descMech = kept.filter((f) => !REWRITE_DESC[f.code] && cleanDescription(f.code, f.description) !== null && cleanDescription(f.code, f.description) !== f.description)
const descSame = kept.filter((f) => cleanDescription(f.code, f.description) === f.description)
L.push(`## D. 설명(description) — NULL ${descNull.length} · 명시 재작성 ${descExplicit.length} · 기계 정리 ${descMech.length} · 무변경 ${descSame.length}`)
L.push('')
L.push(`### D-1. NULL 처리 ${descNull.length}행 (플레이스홀더 "엑셀 시트에서 자동 추출됨 (필드 미정의)"·"양식시트 등록(필드 미정의)"·정리 후 잔여 0)`)
L.push('')
L.push(descNull.map((f) => `\`${f.code}\``).join(' · '))
L.push('')
L.push(`### D-2. 명시 재작성 ${descExplicit.length}행 (REWRITE_DESC — TPC·사업부·AM·브레이징 언급 행)`)
L.push('')
for (const f of descExplicit) {
  L.push(`#### ${f.code} · ${cleanName(f.code, f.name)}`)
  L.push(`- before: ${esc(f.description)}`)
  L.push(`- after : ${esc(cleanDescription(f.code, f.description))}`)
  L.push('')
}
L.push(`### D-3. 기계 정리 ${descMech.length}행 (머리말·배치/트랙 참조·선례·실측·마스터 시트 이력 문장 제거)`)
L.push('')
for (const f of descMech) {
  L.push(`#### ${f.code} · ${cleanName(f.code, f.name)}`)
  L.push(`- before: ${esc(f.description)}`)
  L.push(`- after : ${esc(cleanDescription(f.code, f.description))}`)
  L.push('')
}
L.push(`### D-4. 무변경 ${descSame.length}행`)
L.push('')
for (const f of descSame) L.push(`- ${f.code} · ${esc(f.description)}`)
L.push('')

// E. 필드
L.push(`## E. 필드 라벨·키·옵션 중립화 ${Object.keys(REWRITE_FIELDS).length}건 (form_fields + form_cell_map 동시 적용)`)
L.push('')
L.push('| form | field_key(before→after) | label(before→after) | 기타 |')
L.push('|---|---|---|---|')
for (const [k, rw] of Object.entries(REWRITE_FIELDS)) {
  const [fc, fk] = k.split('|')
  const r = fieldRows.find((x) => x.form_code === fc && x.field_key === fk)
  const etc = []
  if (rw.options_json) etc.push(`options ${esc(r?.options_json)} → ${esc(rw.options_json)}`)
  if (rw.ai_prompt_hint) etc.push(`ai_hint ${esc(r?.ai_prompt_hint)} → ${esc(rw.ai_prompt_hint)}`)
  L.push(`| ${fc} | ${fk}${rw.field_key ? ` → ${rw.field_key}` : ''} | ${esc(r?.label)}${rw.label ? ` → ${rw.label}` : ''} | ${etc.join(' / ')} |`)
}
L.push('')
L.push(`## F. 집계 — 체인 ${forms.length} → 표준팩 ${kept.length} (제외 ${Object.keys(EXCLUDE_FORMS).length}) · scope 전량 '공통'`)
writeFileSync(out, L.join('\n'), 'utf-8')
console.log(`[gen-forms-before-after] wrote ${out} (${L.length} lines)`)
