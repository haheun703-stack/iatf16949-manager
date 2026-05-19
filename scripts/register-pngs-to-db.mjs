#!/usr/bin/env node
/**
 * Scan staged PNGs, look up original filename via mapping.json, classify,
 * and auto-register into the SQLite DB.
 *
 * Layout produced by previous scripts:
 *   <stagingRoot>/
 *     pdf/item_001.pdf, item_002.pdf, ...
 *     png/item_001__page-01.png, item_001__page-02.png, ...
 *     mapping.json   ← slug → {originalPath, originalName, category, ...}
 *
 * What this does:
 *   - For each PNG: parse slug + page no
 *   - Find original info via mapping.json
 *   - Extract process/regulation code from original filename
 *   - For processes (CP-NN, MP-NN, SP-NN):
 *       Copy PNG into userData/process-images/<code>/<code>__page-NN.png
 *       Insert/update row in process_pages
 *
 * Usage:
 *   node register-pngs-to-db.mjs --stagingRoot "C:\\temp\\iatf-conv" --dbPath "<db>" --userDataDir "<userData>"
 */

import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import initSqlJs from 'sql.js'

const args = process.argv.slice(2)
function getArg(name, def = null) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const stagingRoot = getArg('stagingRoot')
const dbPath = getArg('dbPath')
const userDataDir = getArg('userDataDir')

if (!stagingRoot || !dbPath || !userDataDir) {
  console.error('Usage: node register-pngs-to-db.mjs --stagingRoot <dir> --dbPath <path> --userDataDir <path>')
  process.exit(1)
}

const pngRoot = join(stagingRoot, 'png')
const mappingPath = join(stagingRoot, 'mapping.json')

if (!existsSync(pngRoot)) { console.error('PNG root missing:', pngRoot); process.exit(1) }
if (!existsSync(mappingPath)) { console.error('mapping.json missing:', mappingPath); process.exit(1) }
if (!existsSync(dbPath)) { console.error('DB missing:', dbPath); process.exit(1) }

const mappingRaw = readFileSync(mappingPath, 'utf-8').replace(/^﻿/, '')
const mappingList = JSON.parse(mappingRaw)
const mappingBySlug = new Map(mappingList.map((m) => [m.slug, m]))

// ─── classification ────────────────────────────────────────
function classifyOriginal(originalName) {
  // CP-01, MP-02, SP-03  → process
  let m = originalName.match(/^(CP|MP|SP)-?(\d{2})/i)
  if (m) return { kind: 'process', code: `${m[1].toUpperCase()}-${m[2]}` }

  // A-1100 ~ L-9999 → regulation
  m = originalName.match(/^([A-L])-?(\d{4})/i)
  if (m) return { kind: 'regulation', code: `${m[1].toUpperCase()}-${m[2]}` }

  return { kind: 'misc', code: null }
}

// ─── DB setup (sql.js, in-memory) ──────────────────────────
const SQL = await initSqlJs()
const dbBuffer = readFileSync(dbPath)
const db = new SQL.Database(dbBuffer)

const processImagesRoot = join(userDataDir, 'process-images')
if (!existsSync(processImagesRoot)) mkdirSync(processImagesRoot, { recursive: true })

function execAll(sql, params = []) {
  const res = db.exec(sql, params)
  if (res.length === 0) return []
  const { columns, values } = res[0]
  return values.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])))
}
function execRun(sql, params = []) {
  db.run(sql, params)
}

const knownProcesses = new Set(execAll('SELECT code FROM processes').map((r) => r.code))

const findExistingPage = db.prepare(
  'SELECT id FROM process_pages WHERE process_code = $code AND page_no = $page'
)
const updatePageImage = db.prepare(
  'UPDATE process_pages SET image_path = $img, page_label = $label WHERE id = $id'
)
const insertPage = db.prepare(
  `INSERT INTO process_pages (process_code, page_no, page_label, image_path, created_at)
   VALUES ($code, $page, $label, $img, datetime('now'))`
)
const clearOldImages = db.prepare(
  `UPDATE process_pages SET image_path = NULL WHERE process_code = $code`
)

// ─── scan PNGs ─────────────────────────────────────────────
function* walkPngs(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) yield* walkPngs(full)
    else if (st.isFile() && entry.toLowerCase().endsWith('.png')) yield full
  }
}

const pngsBySlug = new Map() // slug → [{ pageNo, path }, ...]
for (const png of walkPngs(pngRoot)) {
  const fn = basename(png)
  const m = fn.match(/^(item_\d+)__page-(\d+)\.png$/i)
  if (!m) continue
  const slug = m[1]
  const pageNo = parseInt(m[2], 10)
  if (!pngsBySlug.has(slug)) pngsBySlug.set(slug, [])
  pngsBySlug.get(slug).push({ pageNo, path: png })
}
// sort each by pageNo
for (const arr of pngsBySlug.values()) arr.sort((a, b) => a.pageNo - b.pageNo)

// ─── register ──────────────────────────────────────────────
const stats = {
  scannedSlugs: 0,
  processesRegistered: 0,
  pagesRegistered: 0,
  pagesByProcess: {},
  regulationsFoundButNotStored: {},
  miscSlugs: []
}

const processedCodes = new Set()

for (const [slug, pages] of pngsBySlug.entries()) {
  stats.scannedSlugs++
  const info = mappingBySlug.get(slug)
  if (!info) continue
  const cls = classifyOriginal(info.originalName)

  if (cls.kind === 'process') {
    if (!knownProcesses.has(cls.code)) continue

    // First time we see this code in this run: clear its previous image_paths
    if (!processedCodes.has(cls.code)) {
      clearOldImages.run({ $code: cls.code })
      processedCodes.add(cls.code)
      stats.processesRegistered++
      stats.pagesByProcess[cls.code] = 0
    }

    const procDir = join(processImagesRoot, cls.code)
    if (!existsSync(procDir)) mkdirSync(procDir, { recursive: true })

    for (const { pageNo, path } of pages) {
      const target = join(procDir, `${cls.code}__page-${String(pageNo).padStart(2, '0')}.png`)
      copyFileSync(path, target)
      const label = `${cls.code} 페이지 ${pageNo}`

      // sql.js prepared statement: bind + step + get
      findExistingPage.bind({ $code: cls.code, $page: pageNo })
      const hasRow = findExistingPage.step()
      const existingId = hasRow ? findExistingPage.get()[0] : null
      findExistingPage.reset()

      if (existingId !== null) {
        updatePageImage.run({ $img: target, $label: label, $id: existingId })
      } else {
        insertPage.run({ $code: cls.code, $page: pageNo, $label: label, $img: target })
      }
      stats.pagesRegistered++
      stats.pagesByProcess[cls.code]++
    }
  } else if (cls.kind === 'regulation') {
    stats.regulationsFoundButNotStored[cls.code] =
      (stats.regulationsFoundButNotStored[cls.code] || 0) + pages.length
  } else {
    if (stats.miscSlugs.length < 10) stats.miscSlugs.push({ slug, name: info.originalName })
  }
}

// Persist changes back to disk
findExistingPage.free()
updatePageImage.free()
insertPage.free()
clearOldImages.free()
const exported = db.export()
writeFileSync(dbPath, Buffer.from(exported))
db.close()
// sql.js may leave WAL files from previous Electron runs; clean them up so
// next Electron startup sees the new state immediately.
for (const ext of ['-wal', '-shm']) {
  const p = dbPath + ext
  if (existsSync(p)) {
    try { writeFileSync(p, '') } catch {}
  }
}

console.log('')
console.log('=== AUTO-REGISTRATION SUMMARY ===')
console.log(`Scanned slugs        : ${stats.scannedSlugs}`)
console.log(`Processes registered : ${stats.processesRegistered}`)
console.log(`Process pages added  : ${stats.pagesRegistered}`)
console.log('')
console.log('Per-process page counts:')
for (const [code, n] of Object.entries(stats.pagesByProcess).sort()) {
  console.log(`  ${code}: ${n} pages`)
}

const regCount = Object.values(stats.regulationsFoundButNotStored).reduce((a, b) => a + b, 0)
if (regCount > 0) {
  console.log('')
  console.log(`Regulations seen (not yet stored — schema pending): ${regCount} pages across ${Object.keys(stats.regulationsFoundButNotStored).length} regs`)
  for (const [code, n] of Object.entries(stats.regulationsFoundButNotStored).sort()) {
    console.log(`  ${code}: ${n} pages`)
  }
}

if (stats.miscSlugs.length > 0) {
  console.log('')
  console.log('Misc files (no code prefix):')
  for (const m of stats.miscSlugs) console.log(`  ${m.slug}: ${m.name}`)
}
