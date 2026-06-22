#!/usr/bin/env node
/**
 * Scan each regulation xlsx, extract form codes from sheet names,
 * insert into forms table, and link to processes via the process<->regulation map.
 *
 * ⚠️ 재현성 주의(2026-06-23):
 *   이 스크립트는 live DB에 직접 INSERT 한다. 현재 218개 양식 상태는
 *   resources/migrations/0014_seed_all_forms.sql 에 시드로 고정돼 있다(클린설치 재현용).
 *   새 xlsx로 양식을 추가했다면, 이 스크립트 실행 후 반드시
 *     node scripts/dump-forms-seed.mjs   (0014 재생성)
 *     node scripts/verify-migrations.mjs (클린설치 재현 검증)
 *   를 돌려 마이그레이션을 갱신할 것. 안 그러면 live DB와 클린설치가 다시 어긋난다.
 *
 * What it does:
 *   1. For each xlsx in mapping.json (category=regulation):
 *      - Open with exceljs, get worksheet names
 *      - Detect form codes (e.g. "B1100-01", "H3100-02")
 *      - For each: insert into `forms` if missing (name = sheet name)
 *   2. Apply process<->regulation hardcoded map to populate `process_forms`
 *
 * Usage:
 *   node auto-link-forms.mjs --stagingRoot "C:\\temp\\iatf-conv" --dbPath "<db>"
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import ExcelJS from 'exceljs'
import initSqlJs from 'sql.js'

const args = process.argv.slice(2)
function getArg(name) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : null
}
const stagingRoot = getArg('stagingRoot')
const dbPath = getArg('dbPath')
if (!stagingRoot || !dbPath) {
  console.error('Usage: node auto-link-forms.mjs --stagingRoot <dir> --dbPath <db>')
  process.exit(1)
}

const mappingPath = join(stagingRoot, 'mapping.json')
if (!existsSync(mappingPath)) { console.error('mapping.json missing'); process.exit(1) }
if (!existsSync(dbPath)) { console.error('DB missing:', dbPath); process.exit(1) }

const mappingRaw = readFileSync(mappingPath, 'utf-8').replace(/^﻿/, '')
const mapping = JSON.parse(mappingRaw)

// ─── Process ↔ Regulation map ────────────────────────────────
// Authoritative grouping (matches TPC's IATF document structure)
const PROCESS_REG_MAP = {
  'CP-01': ['H-1100', 'H-2100', 'H-3100', 'H-3200'],
  'CP-02': ['J-1100', 'J-1101', 'J-1102', 'J-1103', 'J-2100', 'J-3100', 'J-4100', 'J-4200', 'D-1100'],
  'CP-03': ['M-1100', 'M-1200', 'K-2100', 'L-1100', 'L-1200', 'L-2100', 'L-2300', 'L-3100', 'L-3101', 'L-4101', 'L-4102'],
  'MP-01': ['A-1100', 'A-2100', 'A-2200', 'A-3100', 'A-3200', 'A-7100'],
  'MP-02': ['A-8100', 'A-8101'],
  'MP-03': ['F-1100', 'F-1101', 'F-2100'],
  'SP-01': ['K-1100', 'K-1200'],
  'SP-02': ['A-4100', 'A-4101', 'A-4200', 'J-4200'],
  'SP-03': ['A-5100', 'A-5200', 'A-6100', 'A-6200', 'A-6300', 'B-1100', 'B-2100', 'B-2200', 'B-2300']
}

// Reverse: regulation code → list of processes that should claim its forms
const REG_TO_PROCESSES = {}
for (const [proc, regs] of Object.entries(PROCESS_REG_MAP)) {
  for (const reg of regs) {
    if (!REG_TO_PROCESSES[reg]) REG_TO_PROCESSES[reg] = []
    REG_TO_PROCESSES[reg].push(proc)
  }
}

// ─── Helpers ──────────────────────────────────────────────────
// "H1100-01", "H1100-02", "A5100-04" etc.
const FORM_CODE_RE = /\b([A-L])(\d{4})-(\d{1,3})\b/

function extractRegCodeFromFilename(name) {
  // "B-1100 부적합품 관리 규정 (...)_품질보증.xlsx" → "B-1100"
  const m = name.match(/^\s*([A-L])-?(\d{4})/i)
  return m ? `${m[1].toUpperCase()}-${m[2]}` : null
}

function extractFormCodeFromSheet(sheetName) {
  // Try patterns: "H1100-01", "H1100-01 계약검토서", "B1100-01_..."
  const m = sheetName.match(FORM_CODE_RE)
  if (!m) return null
  return `${m[1].toUpperCase()}${m[2]}-${m[3].padStart(2, '0')}`
}

function formCodeToRegCode(formCode) {
  // "B1100-01" → "B-1100"
  const m = formCode.match(/^([A-L])(\d{4})-/)
  return m ? `${m[1]}-${m[2]}` : null
}

function cleanSheetName(sheetName) {
  // "H1100-01_계약검토서" or "H1100-01 계약검토서" → "계약검토서" (form name only)
  return sheetName
    .replace(FORM_CODE_RE, '')
    .replace(/^[\s_\-·]+/, '')
    .replace(/[\s_\-·]+$/, '')
    .trim()
}

// ─── Scan xlsx files for form sheets ──────────────────────────
console.log('Scanning xlsx files for form sheets...')

const discoveredForms = new Map() // formCode → { name, regCode }

for (const item of mapping) {
  if (item.category !== 'regulation') continue
  if (item.status !== 'ok') continue

  const regCodeFromFile = extractRegCodeFromFilename(item.originalName)
  if (!regCodeFromFile) continue

  const wb = new ExcelJS.Workbook()
  try {
    await wb.xlsx.readFile(item.stagedXlsx)
  } catch (err) {
    console.warn(`  ${item.originalName}: read failed (${err.message})`)
    continue
  }

  for (const ws of wb.worksheets) {
    const code = extractFormCodeFromSheet(ws.name)
    if (!code) continue

    // Sanity check: form code's regulation prefix should match file's regulation
    const regFromForm = formCodeToRegCode(code)
    if (regFromForm !== regCodeFromFile) {
      // mismatch — still record but log
      console.warn(`  [${item.originalName}] sheet "${ws.name}" → ${code} (reg ${regFromForm}) but file says ${regCodeFromFile}`)
    }

    if (!discoveredForms.has(code)) {
      const cleanName = cleanSheetName(ws.name)
      discoveredForms.set(code, {
        name: cleanName || code,
        regCode: regFromForm || regCodeFromFile
      })
    }
  }
}

console.log(`Discovered ${discoveredForms.size} unique form codes`)

// ─── Update DB ────────────────────────────────────────────────
const SQL = await initSqlJs()
const dbBuf = readFileSync(dbPath)
const db = new SQL.Database(dbBuf)

function execAll(sql, params = []) {
  const res = db.exec(sql, params)
  if (res.length === 0) return []
  const { columns, values } = res[0]
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}

const knownProcesses = new Set(execAll('SELECT code FROM processes').map((r) => r.code))
const knownForms = new Set(execAll('SELECT code FROM forms').map((r) => r.code))

const insertForm = db.prepare(
  `INSERT INTO forms (code, name, reg_code, description, approvals_json, next_form_code, next_form_label, prev_form_code)
   VALUES ($code, $name, $reg, $desc, $approvals, NULL, NULL, NULL)`
)
const linkProcessForm = db.prepare(
  `INSERT OR IGNORE INTO process_forms (process_code, form_code, sort_order)
   VALUES ($proc, $form, $order)`
)

let newForms = 0
let newLinks = 0
const linksByProcess = {}

for (const [code, info] of discoveredForms.entries()) {
  if (!knownForms.has(code)) {
    insertForm.run({
      $code: code,
      $name: info.name,
      $reg: info.regCode,
      $desc: '엑셀 시트에서 자동 추출됨 (필드 미정의)',
      $approvals: JSON.stringify(['담당', '팀장', '사업부장'])
    })
    knownForms.add(code)
    newForms++
  }

  // Link to processes per the map
  const processes = REG_TO_PROCESSES[info.regCode] || []
  for (const procCode of processes) {
    if (!knownProcesses.has(procCode)) continue
    linkProcessForm.run({ $proc: procCode, $form: code, $order: 0 })
    // Note: INSERT OR IGNORE — can't easily count actual inserts here
    if (!linksByProcess[procCode]) linksByProcess[procCode] = 0
    linksByProcess[procCode]++
    newLinks++
  }
}

insertForm.free()
linkProcessForm.free()

// Recompute final per-process counts (after dedup by UNIQUE constraint)
const finalCounts = execAll(`
  SELECT p.code, COUNT(pf.form_code) AS n
  FROM processes p
  LEFT JOIN process_forms pf ON pf.process_code = p.code
  GROUP BY p.code
  ORDER BY p.sort_order
`)

writeFileSync(dbPath, Buffer.from(db.export()))
db.close()

// Clear WAL/SHM
for (const ext of ['-wal', '-shm']) {
  const p = dbPath + ext
  if (existsSync(p)) { try { writeFileSync(p, '') } catch {} }
}

// ─── Report ───────────────────────────────────────────────────
console.log('')
console.log('=== FORM LINKING SUMMARY ===')
console.log(`New forms inserted    : ${newForms}`)
console.log(`Link attempts (dedup) : ${newLinks}`)
console.log('')
console.log('Final forms per process:')
for (const r of finalCounts) {
  console.log(`  ${r.code}: ${r.n} forms`)
}

const orphanRegs = []
for (const [reg, procs] of Object.entries(REG_TO_PROCESSES)) {
  // List regs declared in our map but with no forms discovered
  const formsFromThisReg = [...discoveredForms.values()].filter((f) => f.regCode === reg).length
  if (formsFromThisReg === 0) orphanRegs.push(reg)
}
if (orphanRegs.length > 0) {
  console.log('')
  console.log('Regulations in map but no forms discovered (file missing or no form sheets):')
  console.log('  ' + orphanRegs.join(', '))
}
