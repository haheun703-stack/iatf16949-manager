// ─────────────────────────────────────────────────────────────────────────────
// ISIR 런타임 임포트 — xlsx 파일 → 파싱(isir-parser) → DB 적재(트랜잭션) → 지식 재색인.
//   빌드타임 python 마이그레이션(scripts/ingest-isir.py → 0041 SQL)의 런타임 대체.
//   동일 (part_no, rev_code) 재임포트 시 기존 패키지+자식행을 교체(idempotent). 0042 UNIQUE 호환.
// ─────────────────────────────────────────────────────────────────────────────
import { basename } from 'path'
import ExcelJS from 'exceljs'
import type Database from 'better-sqlite3'
import { getProfileValue } from '../database/company-profile'
import { parseIsirWorkbook } from './isir-parser'
import { reindexKb } from '../ai/kb'
import {
  ISIR_SUBMIT_TYPE_LABEL,
  type IsirImportResult,
  type IsirImportBatchResult
} from '@shared/ipc-types'

const KNOWN_CUSTOMERS = [
  '현대위아',
  '현대모비스',
  '현대트랜시스',
  '삼보모터스',
  '삼보',
  '만도',
  '한온',
  '두원',
  'ZF',
  '보쉬'
]

/** 빈 문자열 → NULL(원본 q() 등가). 그 외는 값 그대로. */
function nz(s: string): string | null {
  return s === '' ? null : s
}

/** 고객(폴더 귀속) 추정: ①경로 토큰의 알려진 고객 ②조부모 폴더명("22. 현대위아"→"현대위아") ③수요자. */
function inferCustomer(filePath: string, recipient: string): string | null {
  const norm = filePath.replace(/\\/g, '/')
  for (const c of KNOWN_CUSTOMERS) if (norm.includes(c)) return c
  const segs = norm.split('/').filter(Boolean)
  if (segs.length >= 3) {
    const grand = segs[segs.length - 3].replace(/^\s*\d+\.\s*/, '').trim()
    if (grand) return grand
  }
  return recipient || null
}

/** xlsx 파일 1개를 읽어 ISIR 패키지로 적재. 형식 불일치 시 parser 가 throw.
 *  reindex=false: 재색인 생략(배치에서 끝에 1회만 하기 위함). */
export async function importIsirFromFile(
  db: Database.Database,
  filePath: string,
  reindex = true
): Promise<IsirImportResult> {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(filePath)
  const p = parseIsirWorkbook(wb) // 표지/관리계획서 없으면 throw

  // 품질 경고(부분 추출 = 템플릿 변형). 비었으면 clean.
  const warnings: string[] = []
  const presentCount = p.docs.filter((d) => d.present).length
  if (p.items.length === 0) warnings.push('관리계획서 0항목 (시트 인식 실패 가능)')
  if (p.docs.length === 0) warnings.push('표지 체크리스트 0종 (레이아웃 상이)')
  else if (presentCount === 0) warnings.push('표지 보유표시 0 (present 컬럼 상이)')

  const customer = inferCustomer(filePath, p.recipient)
  // 플랜트 귀속 = company_profile.plant(39호 S1 — 하드코딩 제거). 미설정 시 NULL → COALESCE 가 기존값 유지.
  const plant = getProfileValue(db, 'plant')
  const revCode = nz(p.revCode)

  let replaced = false
  const tx = db.transaction(() => {
    // 품번 upsert(기존 메타는 새 값이 있을 때만 갱신)
    db.prepare(
      `INSERT INTO parts (part_no, part_name, customer, model, plant, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(part_no) DO UPDATE SET
         part_name = COALESCE(excluded.part_name, parts.part_name),
         customer  = COALESCE(excluded.customer, parts.customer),
         model     = COALESCE(excluded.model, parts.model),
         plant     = COALESCE(excluded.plant, parts.plant)`
    ).run(p.partNo, nz(p.partName), customer, nz(p.model), plant)

    // 동일 (part_no, rev_code) 기존 패키지 교체(자식행 포함). rev_code NULL 안전비교(IS).
    const existing = db
      .prepare('SELECT id FROM isir_packages WHERE part_no = ? AND rev_code IS ?')
      .get(p.partNo, revCode) as { id: number } | undefined
    if (existing) {
      db.prepare('DELETE FROM control_plan_items WHERE isir_id = ?').run(existing.id)
      db.prepare('DELETE FROM isir_documents WHERE isir_id = ?').run(existing.id)
      db.prepare('DELETE FROM isir_packages WHERE id = ?').run(existing.id)
      replaced = true
    }

    const info = db
      .prepare(
        `INSERT INTO isir_packages
         (part_no, rev_code, rev_date, submit_type, customer_recipient, ire_risk, qa_manager, submitted_at, approved, source_path, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`
      )
      .run(
        p.partNo,
        revCode,
        nz(p.revDate),
        p.submitType,
        nz(p.recipient),
        nz(p.ireRisk),
        nz(p.qaManager),
        nz(p.submittedAt),
        filePath
      )
    const isirId = Number(info.lastInsertRowid)

    const docStmt = db.prepare(
      `INSERT INTO isir_documents (isir_id, doc_no, doc_name, req_agreement, req_new, req_change, present)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    for (const d of p.docs) docStmt.run(isirId, d.no, d.name, d.agree, d.reqNew, d.change, d.present)

    const cpStmt = db.prepare(
      `INSERT INTO control_plan_items
       (isir_id, seq, process_no, process_name, equipment, char_kind, control_item, special_char, spec, method, frequency, control_method, resp_production, resp_qa, reaction, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    for (const it of p.items) {
      cpStmt.run(
        isirId,
        it.seq,
        nz(it.processNo),
        nz(it.processName),
        nz(it.equipment),
        nz(it.charKind),
        nz(it.controlItem),
        nz(it.specialChar),
        nz(it.spec),
        nz(it.method),
        nz(it.frequency),
        nz(it.controlMethod),
        it.respProduction,
        it.respQa,
        nz(it.reaction),
        nz(it.note)
      )
    }
  })
  tx()

  // 새 부품/관리계획서를 코파일럿·검색에 그라운딩(재색인 실패는 임포트 성공을 막지 않음).
  let reindexChunks: number | undefined
  if (reindex) {
    try {
      reindexChunks = reindexKb(db).chunks
    } catch (err) {
      console.error('[isir:import] reindex 실패(무시):', err instanceof Error ? err.message : err)
    }
  }

  return {
    success: true,
    file: basename(filePath),
    warnings,
    partNo: p.partNo,
    partName: nz(p.partName),
    revCode,
    submitType: p.submitType,
    submitTypeLabel: ISIR_SUBMIT_TYPE_LABEL[p.submitType] ?? p.submitType,
    customer,
    docCount: p.docs.length,
    presentCount,
    cpItemCount: p.items.length,
    processCount: new Set(p.items.map((i) => i.processName)).size,
    replaced,
    reindexChunks
  }
}

/** 다품번 배치 — 여러 xlsx 를 순차 적재. 파서 throw(ISIR 아님)는 파일별 실패로 수집.
 *  재색인은 전체 끝에 1회(파일마다 하면 낭비). 품질 집계(clean/partial/failed) 반환. */
export async function importIsirBatch(
  db: Database.Database,
  filePaths: string[]
): Promise<IsirImportBatchResult> {
  const results: IsirImportResult[] = []
  for (const fp of filePaths) {
    try {
      results.push(await importIsirFromFile(db, fp, false)) // 개별 재색인 생략
    } catch (err) {
      results.push({
        success: false,
        file: basename(fp),
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // 전체 끝에 1회 재색인
  let reindexChunks: number | undefined
  try {
    reindexChunks = reindexKb(db).chunks
  } catch (err) {
    console.error('[isir:batch] reindex 실패(무시):', err instanceof Error ? err.message : err)
  }
  const succeeded = results.filter((r) => r.success)
  if (reindexChunks !== undefined && succeeded[0]) succeeded[0].reindexChunks = reindexChunks

  return {
    total: filePaths.length,
    clean: succeeded.filter((r) => !r.warnings || r.warnings.length === 0).length,
    partial: succeeded.filter((r) => (r.warnings?.length ?? 0) > 0).length,
    failed: results.filter((r) => !r.success).length,
    results
  }
}
