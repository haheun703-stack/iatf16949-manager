/**
 * 문서 BOM 전처리 스크립트
 *
 * 입력: ../IATF_문서BOM_bot.csv (동료가 작성한 105건 문서 마스터)
 * 출력: resources/migrations/0006_documents_bom.sql (자동 생성된 시드 SQL)
 *
 * 정규화 룰 (04 검증 리포트 §4):
 *  1) 목록표Rev sentinel 문자열 → NULL
 *  2) 양식번호 변종 → form_no_normalized 슬러그 + form_type 분류
 *  3) 4가지 카테고리: form / variant / appendix / external_ref
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectRoot = join(__dirname, '..')
const csvPath = join(projectRoot, '..', 'IATF_문서BOM_bot.csv')
const outSqlPath = join(projectRoot, 'resources', 'migrations', '0006_documents_bom.sql')

// ───── CSV 파서 (따옴표 안의 콤마 처리) ─────
function parseCsv(text) {
  const rows = []
  let row = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++ }
      else if (c === '"') inQuotes = false
      else cur += c
    } else {
      if (c === '"') inQuotes = true
      else if (c === ',') { row.push(cur); cur = '' }
      else if (c === '\r') { /* skip */ }
      else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = '' }
      else cur += c
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row) }
  return rows
}

// ───── 정규화 유틸 ─────
const SENTINEL_LIST = ['(목록표미등록)', '(파일없음)', '']

function normRev(s) {
  if (!s || SENTINEL_LIST.includes(s.trim())) return null
  const m = s.match(/Rev\.?\s*(\d+)/i)
  return m ? parseInt(m[1], 10) : null
}

function normDate(s) {
  if (!s || SENTINEL_LIST.includes(s.trim())) return null
  // 23.05.01 → 2023-05-01, 2025.06.27 → 2025-06-27
  const m = s.match(/(\d{2,4})[.\-/](\d{1,2})[.\-/](\d{1,2})/)
  if (!m) return null
  let [, y, mo, d] = m
  if (y.length === 2) y = '20' + y
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function normalizeDocNo(s) {
  return (s || '').replace(/[^A-Z0-9]/gi, '').toUpperCase()
}

// 양식 토큰 분류
const FORM_REGEX_STRICT = /\(([A-Z]\d{4}-\d{2}(?:-\d{2})?)\)/   // A1100-01, M2100-03-01
const FORM_REGEX_LOOSE  = /\(?([A-Z]?\d{4,5}-\d{1,2}(?:-\d{1,2})?)\)?/  // B2300-1, 65200-03
const BUPYO_REGEX = /^부표\s*\d*\s*[:：]/

function classifyForm(token) {
  const trimmed = token.trim()
  if (!trimmed) return null

  // 1) 부표
  if (BUPYO_REGEX.test(trimmed)) {
    return { type: 'appendix', formNoRaw: null, formNoNorm: null, label: trimmed }
  }

  // 2) 정규 양식번호
  const strict = trimmed.match(FORM_REGEX_STRICT)
  if (strict) {
    return { type: 'form', formNoRaw: strict[1], formNoNorm: strict[1].replace(/[^A-Z0-9]/g, ''), label: trimmed }
  }

  // 3) 외부 참조 / URL / 전산
  if (/https?:\/\/|전산|시스템|올바로|고객\s*양식|고객사\s*양식/.test(trimmed)) {
    return { type: 'external_ref', formNoRaw: null, formNoNorm: null, label: trimmed }
  }

  // 4) 변종 양식번호 (B2300-1, 65200-03 등)
  const loose = trimmed.match(FORM_REGEX_LOOSE)
  if (loose) {
    const raw = loose[1]
    // dash 뒤 한 자리 → 두 자리로 패딩
    const parts = raw.split('-')
    const padded = parts.map((p, i) => i === 0 ? p : p.padStart(2, '0')).join('')
    return { type: 'variant', formNoRaw: raw, formNoNorm: padded, label: trimmed }
  }

  // 5) 미분류 (참고자료성 텍스트)
  return { type: 'external_ref', formNoRaw: null, formNoNorm: null, label: trimmed }
}

// 카테고리(대항목) 정규화
function normCategory(s) {
  if (s.startsWith('1.')) return 'manual'
  if (s.startsWith('2.')) return 'process'
  if (s.startsWith('3.')) return 'quality'
  if (s.startsWith('4.')) return 'safety_env'
  return 'other'
}

function sqlEscape(s) {
  if (s === null || s === undefined) return 'NULL'
  return `'${String(s).replace(/'/g, "''")}'`
}

// ───── 메인 ─────
const csvText = readFileSync(csvPath, 'utf-8').replace(/^﻿/, '')
const rows = parseCsv(csvText).filter(r => r.length > 1 && r[0].trim() !== '')

const header = rows[0]
const dataRows = rows.slice(1)

const documents = []
const formRefs = []
const stats = { form: 0, variant: 0, appendix: 0, external_ref: 0, totalTokens: 0 }

for (const r of dataRows) {
  const [category, docNoRaw, name, ownerDept, listRevRaw, listDateRaw,
         fileRevRaw, fileDateRaw, status, formsCountRaw, formsBlob] = r

  const docNoNorm = normalizeDocNo(docNoRaw) || normalizeDocNo(name).slice(0, 12)
  const doc = {
    docNoRaw: docNoRaw || '-',
    docNoNorm,
    category: normCategory(category),
    categoryLabel: category,
    name,
    ownerDept,
    listRev: normRev(listRevRaw),
    listDate: normDate(listDateRaw),
    fileRev: normRev(fileRevRaw),
    fileDate: normDate(fileDateRaw),
    status,
    formsCount: parseInt(formsCountRaw || '0', 10)
  }
  documents.push(doc)

  if (formsBlob && formsBlob.trim()) {
    let sort = 0
    for (const token of formsBlob.split('|')) {
      const cls = classifyForm(token)
      if (!cls) continue
      stats.totalTokens++
      stats[cls.type]++
      formRefs.push({
        docNoNorm,
        sortOrder: sort++,
        ...cls
      })
    }
  }
}

// ───── SQL 생성 ─────
const lines = []
lines.push('-- ============================================================')
lines.push('-- Migration 0006: Document BOM (105 documents, 405 form refs)')
lines.push('--')
lines.push('-- AUTO-GENERATED by scripts/preprocess-bom.mjs from IATF_문서BOM_bot.csv')
lines.push('-- Source: 동료가 작성한 IATF 16949 / ISO45001 시스템 문서 BOM (2026-06-08)')
lines.push('--')
lines.push('-- Idempotent: 재실행해도 안전하도록 DROP 먼저.')
lines.push('-- ============================================================')
lines.push('')
lines.push('DROP TABLE IF EXISTS bom_form_refs;')
lines.push('DROP TABLE IF EXISTS bom_documents;')
lines.push('')
lines.push('CREATE TABLE IF NOT EXISTS bom_documents (')
lines.push('  doc_no_norm    TEXT PRIMARY KEY,')
lines.push('  doc_no_raw     TEXT NOT NULL,')
lines.push('  category       TEXT NOT NULL,')
lines.push('  category_label TEXT NOT NULL,')
lines.push('  name           TEXT NOT NULL,')
lines.push('  owner_dept     TEXT,')
lines.push('  list_rev       INTEGER,')
lines.push('  list_date      TEXT,')
lines.push('  file_rev       INTEGER,')
lines.push('  file_date      TEXT,')
lines.push('  status         TEXT NOT NULL,')
lines.push('  forms_count    INTEGER NOT NULL DEFAULT 0,')
lines.push('  sort_order     INTEGER NOT NULL DEFAULT 0')
lines.push(');')
lines.push('CREATE INDEX IF NOT EXISTS idx_bomdoc_cat ON bom_documents(category, sort_order);')
lines.push('CREATE INDEX IF NOT EXISTS idx_bomdoc_status ON bom_documents(status);')
lines.push('')
lines.push('CREATE TABLE IF NOT EXISTS bom_form_refs (')
lines.push('  id             INTEGER PRIMARY KEY AUTOINCREMENT,')
lines.push('  doc_no_norm    TEXT NOT NULL,')
lines.push('  form_type      TEXT NOT NULL,        -- form | variant | appendix | external_ref')
lines.push('  form_no_raw    TEXT,                 -- A1100-01, B2300-1, 65200-03')
lines.push('  form_no_norm   TEXT,                 -- 정규화: A110001, B230001, 6520003')
lines.push('  label          TEXT NOT NULL,        -- 원문 양식명/부표명')
lines.push('  sort_order     INTEGER NOT NULL DEFAULT 0,')
lines.push('  FOREIGN KEY (doc_no_norm) REFERENCES bom_documents(doc_no_norm)')
lines.push(');')
lines.push('CREATE INDEX IF NOT EXISTS idx_bomref_doc ON bom_form_refs(doc_no_norm, sort_order);')
lines.push('CREATE INDEX IF NOT EXISTS idx_bomref_formno ON bom_form_refs(form_no_norm);')
lines.push('')
lines.push('-- ───── SEED: 105 Documents ─────')

documents.forEach((d, i) => {
  lines.push(
    `INSERT INTO bom_documents (doc_no_norm, doc_no_raw, category, category_label, name, owner_dept, ` +
    `list_rev, list_date, file_rev, file_date, status, forms_count, sort_order) VALUES (` +
    `${sqlEscape(d.docNoNorm)}, ${sqlEscape(d.docNoRaw)}, ${sqlEscape(d.category)}, ` +
    `${sqlEscape(d.categoryLabel)}, ${sqlEscape(d.name)}, ${sqlEscape(d.ownerDept)}, ` +
    `${d.listRev === null ? 'NULL' : d.listRev}, ${sqlEscape(d.listDate)}, ` +
    `${d.fileRev === null ? 'NULL' : d.fileRev}, ${sqlEscape(d.fileDate)}, ` +
    `${sqlEscape(d.status)}, ${d.formsCount}, ${i});`
  )
})

lines.push('')
lines.push(`-- ───── SEED: ${formRefs.length} Form Refs (form=${stats.form} / variant=${stats.variant} / appendix=${stats.appendix} / external_ref=${stats.external_ref}) ─────`)
formRefs.forEach((f) => {
  lines.push(
    `INSERT INTO bom_form_refs (doc_no_norm, form_type, form_no_raw, form_no_norm, label, sort_order) VALUES (` +
    `${sqlEscape(f.docNoNorm)}, ${sqlEscape(f.type)}, ${sqlEscape(f.formNoRaw)}, ` +
    `${sqlEscape(f.formNoNorm)}, ${sqlEscape(f.label)}, ${f.sortOrder});`
  )
})

writeFileSync(outSqlPath, lines.join('\n'), 'utf-8')

console.log(`✓ 0006 마이그레이션 생성 완료: ${outSqlPath}`)
console.log(`  - 문서: ${documents.length}건`)
console.log(`  - 양식 ref: ${formRefs.length}건`)
console.log(`    · form         : ${stats.form}`)
console.log(`    · variant      : ${stats.variant}`)
console.log(`    · appendix     : ${stats.appendix}`)
console.log(`    · external_ref : ${stats.external_ref}`)
