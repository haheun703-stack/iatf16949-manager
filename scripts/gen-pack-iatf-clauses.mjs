#!/usr/bin/env node
// scripts/gen-pack-iatf-clauses.mjs — IATF 16949 조항 카탈로그 → 표준팩 SQL (39호 S2, 2026-08-19)
// resources/seed/iatf16949-clauses.json(172조항·양식명 282) 을 packs/standard/010_iatf_clauses.sql 로 변환.
// seed.ts 의 clauses/documents 적재와 동형(id 규칙 doc-<clause>-NN 동일) — 웹 서버 클린 설치 경로는
// seed.ts 를 타지 않으므로 팩이 공급한다. 일렉트론은 clauses>0 이면 seed.ts 가 건너뛴다(중복 0).
// 실행: node scripts/gen-pack-iatf-clauses.mjs  (순수 JSON→텍스트, 네이티브 불필요)
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const repo = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(repo, 'resources', 'seed', 'iatf16949-clauses.json')
const out = join(repo, 'resources', 'packs', 'standard', '010_iatf_clauses.sql')
const q = (v) => (v === null || v === undefined ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`)
const clauses = JSON.parse(readFileSync(src, 'utf-8'))
const lines = [
  '-- ============================================================',
  '-- packs/standard/010_iatf_clauses.sql — IATF 16949 조항 카탈로그 (자동 생성: scripts/gen-pack-iatf-clauses.mjs · 손편집 금지)',
  `-- 원본 resources/seed/iatf16949-clauses.json · 조항 ${clauses.length} · 양식명 ${clauses.reduce((n, c) => n + (c.forms ? c.forms.length : 0), 0)} — 업종중립 표준(40호 2-A)`,
  '-- ============================================================',
  'INSERT OR IGNORE INTO clauses (id, title, description, parent_id, depth, sort_order, category) VALUES'
]
lines.push(clauses.map((c) => `  (${q(c.id)}, ${q(c.title)}, ${q(c.description)}, ${q(c.parentId)}, ${c.depth | 0}, ${c.sortOrder | 0}, ${q(c.category)})`).join(',\n') + ';')
const docs = []
for (const c of clauses) {
  if (!c.forms) continue
  c.forms.forEach((name, i) => docs.push(`  (${q(`doc-${c.id}-${String(i + 1).padStart(2, '0')}`)}, ${q(c.id)}, ${q(name)}, 'form', '1.0', 1095)`))
}
lines.push('', 'INSERT OR IGNORE INTO documents (id, clause_id, name, type, current_version, retention_days) VALUES')
lines.push(docs.join(',\n') + ';', '')
writeFileSync(out, lines.join('\n'), 'utf-8')
console.log(`[gen-pack-iatf-clauses] wrote ${out} — clauses ${clauses.length} · documents ${docs.length}`)
