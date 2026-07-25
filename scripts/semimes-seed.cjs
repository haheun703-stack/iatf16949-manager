/* eslint-disable */
// 반(半)-MES 코어스키마 시드 로더 + POP_BOM 갱신 파이프라인 (15번 M0)
//
// 시드는 마이그에 인라인 금지(15번 §5) → 이 스크립트가 TPC팩 시드의 정본 적재기.
// 멱등: 전 시드 INSERT OR IGNORE / 파이프라인은 upsert+deactivate (재실행 안전).
//
// 사용 (electron-node, better-sqlite3 ABI):
//   set ELECTRON_RUN_AS_NODE=1
//   node_modules\electron\dist\electron.exe scripts\semimes-seed.cjs --db <iatf16949.db> [--report <out.md>]
//
// 원천(리포지토리 내 TPC팩): docs/mes-foundation/p0a/
//   process_master_2021.csv · items_2021.csv · bom_edges_2021.csv · routing_2021.csv
//   POP_CUST_전량.csv · POP_BOM_전량.csv  (+ 메인 DB mes_codes ROUTEBAD → defect_type)
'use strict'
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const args = process.argv.slice(2)
function arg(name, def) {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : def
}
const ROOT = path.join(__dirname, '..')
const P0A = arg('--p0a', path.join(ROOT, 'docs', 'mes-foundation', 'p0a'))
const DB_PATH = arg('--db', null)
const REPORT = arg('--report', null)
if (!DB_PATH) {
  console.error('usage: semimes-seed.cjs --db <iatf16949.db> [--p0a <dir>] [--report <out.md>]')
  process.exit(1)
}

// ── 최소 RFC4180 CSV 파서 (따옴표·쉼표·개행 처리, BOM 제거) ──
function parseCsv(text) {
  const rows = []
  let row = [], field = '', inQ = false
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++ } else inQ = false
      } else field += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { row.push(field); field = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else field += ch
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row) }
  return rows
}
function readCsv(file) {
  const rows = parseCsv(fs.readFileSync(path.join(P0A, file), 'utf-8'))
  const header = rows.shift()
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? '').trim()])))
}

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('busy_timeout = 5000')

// ── 0101 마이그 보장 (migrate.ts 와 동일 장부·트랜잭션, 스냅샷은 앱 몫) ──
const MIG = '0101_semimes_core_schema.sql'
db.exec(`CREATE TABLE IF NOT EXISTS _migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE,
  applied_at TEXT DEFAULT (datetime('now')))`)
const migApplied = db.prepare('SELECT 1 FROM _migrations WHERE name=?').get(MIG)
if (!migApplied) {
  const sql = fs.readFileSync(path.join(ROOT, 'resources', 'migrations', MIG), 'utf-8')
  db.transaction(() => {
    db.exec(sql)
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(MIG)
  })()
  console.log('[semimes] migration applied: ' + MIG)
} else {
  console.log('[semimes] migration already applied: ' + MIG)
}

const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
const stats = {}
const S = (k) => (stats[k] = stats[k] || { src: 0, inserted: 0, skipped: 0 })

// ── 시드 1: 공정 마스터 (2021) ──
// 동일 공정코드 복수행(예: P10=포밍·축관)은 코드 하나 유지 + 공정명 '/' 병기 (코워크 판단 7/25:
// 접미사 체계가 -P1 하나이므로 공정도 하나 — 새 코드 발급 금지, 정보 손실만 방지).
{
  const st = S('process_master')
  const rows = readCsv('process_master_2021.csv')
  const byCode = new Map()
  for (const r of rows) {
    st.src++
    if (!r.proc_code) { st.skipped++; continue }
    const names = byCode.get(r.proc_code) ?? []
    if (r.proc_name && !names.includes(r.proc_name)) names.push(r.proc_name)
    byCode.set(r.proc_code, names)
  }
  const up = db.prepare(`INSERT INTO process_master (proc_code, proc_name, source) VALUES (?, ?, '2021')
                         ON CONFLICT(proc_code) DO UPDATE SET proc_name = excluded.proc_name`)
  db.transaction(() => {
    for (const [code, names] of byCode) {
      const before = db.prepare('SELECT proc_name FROM process_master WHERE proc_code=?').get(code)
      up.run(code, names.join('/'))
      if (!before) st.inserted++
      else st.skipped++
    }
  })()
}

// ── 시드 2: 품목 마스터 (2021 유도분) ──
{
  const st = S('item_master')
  const rows = readCsv('items_2021.csv')
  const ins = db.prepare(`INSERT OR IGNORE INTO item_master (item_code, item_type, source) VALUES (?, ?, '2021')`)
  db.transaction(() => {
    for (const r of rows) {
      st.src++
      ins.run(r.item, r.type).changes ? st.inserted++ : st.skipped++
    }
  })()
}

// ── 시드 3: BOM 간선 (2021 설계) ──
{
  const st = S('bom_edge(2021)')
  const rows = readCsv('bom_edges_2021.csv')
  const ins = db.prepare(`INSERT OR IGNORE INTO bom_edge (parent_code, child_code, qty, source, first_seen_at, last_seen_at)
                          VALUES (?, ?, ?, '2021', ?, ?)`)
  db.transaction(() => {
    for (const r of rows) {
      st.src++
      const q = parseFloat(r.qty) || 1
      ins.run(r.parent, r.child, q, now, now).changes ? st.inserted++ : st.skipped++
    }
  })()
}

// ── 시드 4: 라우팅 (2021) ──
{
  const st = S('routing_step')
  const rows = readCsv('routing_2021.csv')
  const ins = db.prepare(`INSERT OR IGNORE INTO routing_step (item_code, seq, proc_code, out_yn, source)
                          VALUES (?, ?, ?, ?, '2021')`)
  db.transaction(() => {
    for (const r of rows) {
      st.src++
      const seq = parseInt(r.seq, 10)
      if (!r.item || !Number.isFinite(seq)) { st.skipped++; continue }
      const out = r.out_yn && r.out_yn !== '0' && r.out_yn.toUpperCase() !== 'N' ? 1 : 0
      ins.run(r.item, seq, r.proc_code || '0', out).changes ? st.inserted++ : st.skipped++
    }
  })()
}

// ── 시드 5: 거래처 (POP_CUST) ──
{
  const st = S('partner')
  const rows = readCsv('POP_CUST_전량.csv')
  const ins = db.prepare(`INSERT OR IGNORE INTO partner (partner_code, name, partner_type, biz_no, ceo, active, source)
                          VALUES (?, ?, ?, ?, ?, ?, 'popcust')`)
  db.transaction(() => {
    for (const r of rows) {
      st.src++
      if (!r.CUST_NO || !r.CUST_NM) { st.skipped++; continue }
      const type = r.SALES_YN === '1' ? '고객' : r.OUT_YN === '1' ? '외주처' : r.JAJE_YN === '1' ? '자재공급처' : '기타'
      const active = r.USE_YN === '0' ? 0 : 1
      ins.run(r.CUST_NO, r.CUST_NM, type, r.REGNO || null, r.CEO_NM || null, active).changes ? st.inserted++ : st.skipped++
    }
  })()
}

// ── 시드 6: 불량유형 (메인 DB mes_codes ROUTEBAD — ref1=공정) ──
{
  const st = S('defect_type')
  let rows = []
  try {
    rows = db.prepare(`SELECT sub_code, code_name, ref1, use_gbn FROM mes_codes
                       WHERE main_code='ROUTEBAD' AND sub_code <> '$'`).all()
  } catch (e) {
    console.warn('[semimes] mes_codes 없음(0076 미적용 DB?) — defect_type 시드 생략')
  }
  const ins = db.prepare(`INSERT OR IGNORE INTO defect_type (code, name, proc_code, active, source)
                          VALUES (?, ?, ?, ?, 'mes_codes')`)
  db.transaction(() => {
    for (const r of rows) {
      st.src++
      ins.run(r.sub_code, r.code_name, r.ref1 || null, r.use_gbn ? 1 : 0).changes ? st.inserted++ : st.skipped++
    }
  })()
}

// ── 파이프라인: POP_BOM 갱신 (upsert + 소멸 간선 deactivate) ──
const RE_SEMI = /^S?\d{5}-[A-Z0-9]{5}-[A-Z]+\d*$/
const RE_FIN = /^S?\d{5}-[A-Z0-9]{5}(-\d)?$/
const classify = (c) => (RE_SEMI.test(c) ? '반제품' : RE_FIN.test(c) ? '완제품/조립' : '원자재/기타')
{
  const file = 'POP_BOM_전량.csv'
  const rows = readCsv(file)
  const run = { added: 0, updated: 0, unchanged: 0, deactivated: 0, items_new: 0 }
  const runStart = now
  const selEdge = db.prepare('SELECT id, qty, active FROM bom_edge WHERE parent_code=? AND child_code=?')
  const insEdge = db.prepare(`INSERT INTO bom_edge (parent_code, child_code, qty, active, source, first_seen_at, last_seen_at)
                              VALUES (?, ?, ?, ?, 'popbom', ?, ?)`)
  const updEdge = db.prepare('UPDATE bom_edge SET qty=?, active=?, last_seen_at=? WHERE id=?')
  const insItem = db.prepare(`INSERT OR IGNORE INTO item_master (item_code, item_type, source) VALUES (?, ?, 'popbom')`)
  db.transaction(() => {
    for (const r of rows) {
      const p = (r.MPNO || '').trim(), c = (r.CPNO || '').trim()
      if (!p || !c) continue
      const qty = parseFloat(r.JUST_QTY) || parseFloat(r.REAL_QTY) || 1
      const active = r.USE_YN === '0' ? 0 : 1
      for (const code of [p, c]) {
        if (insItem.run(code, classify(code)).changes) run.items_new++
      }
      const ex = selEdge.get(p, c)
      if (!ex) {
        insEdge.run(p, c, qty, active, runStart, runStart)
        run.added++
      } else if (Math.abs((ex.qty ?? 1) - qty) > 1e-9 || ex.active !== active) {
        updEdge.run(qty, active, runStart, ex.id)
        run.updated++
      } else {
        updEdge.run(qty, active, runStart, ex.id)
        run.unchanged++
      }
    }
    // 이번 임포트에서 안 보인 popbom 간선 = 소멸 → active=0 (삭제 금지)
    run.deactivated = db
      .prepare(`UPDATE bom_edge SET active=0 WHERE source='popbom' AND last_seen_at < ? AND active=1`)
      .run(runStart).changes
    db.prepare(`INSERT INTO bom_import_runs (source, file_name, added, updated, deactivated, unchanged, items_new, note)
                VALUES ('popbom-csv', ?, ?, ?, ?, ?, ?, ?)`)
      .run(file, run.added, run.updated, run.deactivated, run.unchanged, run.items_new,
           'M0 초기 이관 (tspmes 2026-07-17 덤프)')
  })()
  stats['bom_edge(popbom)'] = { src: rows.length, inserted: run.added, skipped: run.unchanged, updated: run.updated, deactivated: run.deactivated, items_new: run.items_new }
}

// ── 사후 집계 (리포트) ──
const count = (sql) => db.prepare(sql).get().c
const totals = {
  process_master: count('SELECT COUNT(*) c FROM process_master'),
  item_master: count('SELECT COUNT(*) c FROM item_master'),
  'item_master(2021)': count(`SELECT COUNT(*) c FROM item_master WHERE source='2021'`),
  'item_master(popbom신규)': count(`SELECT COUNT(*) c FROM item_master WHERE source='popbom'`),
  bom_edge: count('SELECT COUNT(*) c FROM bom_edge'),
  'bom_edge(active)': count('SELECT COUNT(*) c FROM bom_edge WHERE active=1'),
  routing_step: count('SELECT COUNT(*) c FROM routing_step'),
  partner: count('SELECT COUNT(*) c FROM partner'),
  defect_type: count('SELECT COUNT(*) c FROM defect_type'),
  lot_registry: count('SELECT COUNT(*) c FROM lot_registry'),
  obligation_triggers: count('SELECT COUNT(*) c FROM obligation_triggers'),
  '트리 루트(운영 활성)': count(`SELECT COUNT(DISTINCT parent_code) c FROM bom_edge b WHERE active=1
     AND NOT EXISTS (SELECT 1 FROM bom_edge x WHERE x.child_code=b.parent_code AND x.active=1)`)
}

let md = `# M0 이관·대사 리포트 — 반-MES 코어스키마 + 시드 (${now})\n\n`
md += `DB: \`${DB_PATH}\` · 마이그 0101 ${migApplied ? '기적용' : '신규 적용'} · 시드/파이프라인 = semimes-seed.cjs (멱등)\n\n`
md += `## 시드·파이프라인 건수 (전 건수 표)\n\n| 대상 | 원천행 | 신규 | 중복/무변경 | 갱신 | 소멸 | 신규품목 |\n| --- | --- | --- | --- | --- | --- | --- |\n`
for (const [k, v] of Object.entries(stats)) {
  md += `| ${k} | ${v.src} | ${v.inserted} | ${v.skipped} | ${v.updated ?? '—'} | ${v.deactivated ?? '—'} | ${v.items_new ?? '—'} |\n`
}
md += `\n## 적재 후 테이블 총계\n\n| 테이블 | 건수 |\n| --- | --- |\n`
for (const [k, v] of Object.entries(totals)) md += `| ${k} | ${v} |\n`
md += `\n주: 2021 설계 간선(source='2021')은 이력으로 active 유지 — 화면은 source 뱃지로 구분.\n`
md += `soft-delete 원칙: 파이프라인 소멸 간선은 active=0 (삭제 없음).\n`

if (REPORT) {
  fs.writeFileSync(REPORT, md, 'utf-8')
  console.log('[semimes] report -> ' + REPORT)
}
console.log(md)
db.close()
