#!/usr/bin/env node
/**
 * Convert all PDFs in a directory tree to PNG images.
 *
 * Usage:
 *   node pdf-to-png.mjs --input "C:\\path\\to\\pdfs" --output "C:\\path\\to\\pngs" [--scale 2]
 *
 * Mirrors the input directory structure under output.
 * Each PDF page becomes a single PNG: <stem>__page-<N>.png
 */

import { readdirSync, statSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative, dirname, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from 'canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

// Some pages contain image objects that pdfjs-dist + node-canvas cannot decode.
// Swallow those so one bad page does not kill the whole batch.
process.on('unhandledRejection', (reason) => {
  const msg = reason && (reason.message || String(reason))
  console.error(`  [unhandled] ${msg}`)
})

// ─── arg parse ─────────────────────────────────────────────
const args = process.argv.slice(2)
function getArg(name, def = null) {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] ? args[i + 1] : def
}
const inputDir = getArg('input')
const outputDir = getArg('output')
const scale = parseFloat(getArg('scale', '2'))

if (!inputDir || !outputDir) {
  console.error('Usage: node pdf-to-png.mjs --input <dir> --output <dir> [--scale 2]')
  process.exit(1)
}
if (!existsSync(inputDir)) {
  console.error('Input dir not found:', inputDir)
  process.exit(1)
}
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true })

// ─── recursive walk for .pdf files ──────────────────────────
function* walkPdfs(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      yield* walkPdfs(full)
    } else if (st.isFile() && entry.toLowerCase().endsWith('.pdf')) {
      yield full
    }
  }
}

// ─── convert ────────────────────────────────────────────────
async function convertOne(pdfPath) {
  const rel = relative(inputDir, pdfPath)
  const outSubDir = join(outputDir, dirname(rel))
  if (!existsSync(outSubDir)) mkdirSync(outSubDir, { recursive: true })
  const stem = basename(pdfPath, extname(pdfPath))

  const data = new Uint8Array(readFileSync(pdfPath))
  let doc
  try {
    doc = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise
  } catch (err) {
    return { pdf: pdfPath, status: 'load_failed', error: String(err?.message || err), pages: 0 }
  }

  const numPages = doc.numPages
  let written = 0
  for (let p = 1; p <= numPages; p++) {
    try {
      const page = await doc.getPage(p)
      const viewport = page.getViewport({ scale })
      const canvas = createCanvas(viewport.width, viewport.height)
      const ctx = canvas.getContext('2d')

      const pngName = `${stem}__page-${String(p).padStart(2, '0')}.png`
      const renderTask = page.render({ canvasContext: ctx, viewport, canvas })

      // Wrap promise to swallow errors here too (some throw asynchronously)
      const ok = await renderTask.promise.then(() => true).catch((err) => {
        console.error(`  page ${p} render failed: ${err?.message || err}`)
        return false
      })

      if (ok) {
        try {
          const buf = canvas.toBuffer('image/png')
          writeFileSync(join(outSubDir, pngName), buf)
          written++
        } catch (err) {
          console.error(`  page ${p} write failed: ${err.message}`)
        }
      }
    } catch (err) {
      console.error(`  page ${p} setup failed:`, err.message)
    }
  }
  try { await doc.destroy() } catch {}
  return { pdf: pdfPath, status: 'ok', pages: numPages, written }
}

// ─── main ───────────────────────────────────────────────────
console.log(`Input : ${inputDir}`)
console.log(`Output: ${outputDir}`)
console.log(`Scale : ${scale}`)
console.log('')

const pdfs = [...walkPdfs(inputDir)]
console.log(`Found ${pdfs.length} PDF files\n`)

const results = []
for (const pdf of pdfs) {
  process.stdout.write(`[${basename(pdf)}] ... `)
  const r = await convertOne(pdf)
  results.push(r)
  if (r.status === 'ok') {
    console.log(`OK ${r.written}/${r.pages} pages`)
  } else {
    console.log(`FAILED: ${r.error}`)
  }
}

console.log('')
console.log('=== SUMMARY ===')
const ok = results.filter((r) => r.status === 'ok').length
const totalPages = results.reduce((s, r) => s + (r.written || 0), 0)
console.log(`PDFs converted: ${ok} / ${results.length}`)
console.log(`PNGs written  : ${totalPages}`)
