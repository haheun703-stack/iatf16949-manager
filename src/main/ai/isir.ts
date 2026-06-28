// ─────────────────────────────────────────────────────────────────────────────
// 품번/ISIR 척추 — ISIR 완비도(F1 ISIR판). 시크릿 #4("돈은 없는 것에서") 의 ISIR 특화.
//   ISIR = 고객과 협의한 통제 패키지(26종 + 관리계획서). SQ 공정감사가 이걸로 진행.
//   완비도 = 제출유형 기준 필수 26종 중 미제출(=감사 리스크) + 관리계획서 커버리지.
//   존재 여부 판정 = 결정론. AI 는 영향·우선순위 설명만(read-only).
// ─────────────────────────────────────────────────────────────────────────────
import { aiCall } from './gateway'
import type Database from 'better-sqlite3'
import type {
  IsirCompleteness,
  IsirDocItemDto,
  IsirPackageDto
} from '@shared/ipc-types'
import { ISIR_SUBMIT_TYPE_LABEL } from '@shared/ipc-types'

interface PkgRow {
  id: number
  part_no: string
  rev_code: string | null
  rev_date: string | null
  submit_type: string | null
  customer_recipient: string | null
  ire_risk: string | null
  qa_manager: string | null
  submitted_at: string | null
}
interface DocRow {
  doc_no: number
  doc_name: string
  req_agreement: number
  req_new: number
  req_change: number
  present: number
}

/** 부품의 최신 ISIR 제출본(사양 개정일 우선, 동률 시 최근 등록). */
function latestPackage(db: Database.Database, partNo: string): PkgRow | undefined {
  return db
    .prepare(
      `SELECT id, part_no, rev_code, rev_date, submit_type, customer_recipient, ire_risk, qa_manager, submitted_at
       FROM isir_packages WHERE part_no = ? ORDER BY rev_date DESC, id DESC LIMIT 1`
    )
    .get(partNo) as PkgRow | undefined
}

/** 제출유형별 필수 컬럼 선택(미지정 시 설계변경 기준). */
function requiredOf(d: DocRow, submitType: string | null): boolean {
  const t = submitType || 'isir_change'
  const v = t === 'agreement' ? d.req_agreement : t === 'isir_new' ? d.req_new : d.req_change
  return v === 1
}

/** 결정론 ISIR 완비도(무API): 필수 26종 대비 제출 + 관리계획서 커버리지. */
export function computeIsirCompleteness(db: Database.Database, partNo: string): IsirCompleteness {
  const part = db.prepare('SELECT part_no, part_name FROM parts WHERE part_no = ?').get(partNo) as
    | { part_no: string; part_name: string | null }
    | undefined
  const partName = part?.part_name ?? null

  const pkgRow = latestPackage(db, partNo)
  if (!pkgRow) {
    return {
      partNo,
      partName,
      pkg: null,
      docs: [],
      cpItemCount: 0,
      processCount: 0,
      summary: { totalRequired: 0, present: 0, missing: 0 }
    }
  }

  const pkg: IsirPackageDto = {
    id: pkgRow.id,
    revCode: pkgRow.rev_code,
    revDate: pkgRow.rev_date,
    submitType: pkgRow.submit_type,
    submitTypeLabel: ISIR_SUBMIT_TYPE_LABEL[pkgRow.submit_type ?? ''] ?? (pkgRow.submit_type ?? ''),
    customerRecipient: pkgRow.customer_recipient,
    ireRisk: pkgRow.ire_risk,
    qaManager: pkgRow.qa_manager,
    submittedAt: pkgRow.submitted_at
  }

  const docRows = db
    .prepare(
      `SELECT doc_no, doc_name, req_agreement, req_new, req_change, present
       FROM isir_documents WHERE isir_id = ? ORDER BY doc_no`
    )
    .all(pkgRow.id) as DocRow[]

  const docs: IsirDocItemDto[] = docRows.map((d) => {
    const required = requiredOf(d, pkgRow.submit_type)
    const present = d.present === 1
    return {
      docNo: d.doc_no,
      docName: d.doc_name,
      required,
      present,
      status: required && !present ? 'missing' : 'ok'
    }
  })

  const cp = db
    .prepare(
      `SELECT COUNT(*) AS items, COUNT(DISTINCT process_name) AS procs
       FROM control_plan_items WHERE isir_id = ?`
    )
    .get(pkgRow.id) as { items: number; procs: number }

  const required = docs.filter((d) => d.required)
  const summary = {
    totalRequired: required.length,
    present: required.filter((d) => d.present).length,
    missing: required.filter((d) => !d.present).length
  }

  return {
    partNo,
    partName,
    pkg,
    docs,
    cpItemCount: cp.items,
    processCount: cp.procs,
    summary
  }
}

/** AI 진단(누락 26종의 감사 영향 + 우선순위). 도구 없음, 사실만. read-only. */
export async function explainIsirGap(
  check: IsirCompleteness
): Promise<{ text: string; costUsd: number | null }> {
  const missing = check.docs.filter((d) => d.status === 'missing').map((d) => `${d.docNo}.${d.docName}`)
  const pkg = check.pkg
  const system = `당신은 IATF 16949 / 고객 SQ(공정감사) 심사 전문가입니다.
부품 ${check.partNo}(${check.partName ?? ''})의 ISIR 제출본(유형: ${pkg?.submitTypeLabel ?? '미상'}, 사양 ${pkg?.revCode ?? '-'}, IRE 위험도 ${pkg?.ireRisk ?? '-'})의 완비 상태(JSON)를 보고:
- 1줄 총평: 필수 ${check.summary.totalRequired}종 중 미제출 ${check.summary.missing}종이 ISIR 승인/SQ 공정감사에 주는 리스크.
- 미제출 항목(${missing.join(', ') || '없음'})이 "왜 필요한지", 빠지면 감사에서 어떤 지적을 받는지.
- 관리계획서 항목 ${check.cpItemCount}개(${check.processCount}개 공정) 기준, 우선 보완 순서 3가지.
사실(JSON)에 있는 항목만. 지어내지 말 것. 한국어, 간결, 행동촉구.`
  const res = await aiCall({
    purpose: 'isir',
    system,
    messages: [
      { role: 'user', content: JSON.stringify(check) + '\n\n위 ISIR 완비 상태를 진단하고 우선순위를 제안해줘.' }
    ],
    tier: 'fast',
    maxTokens: 700
  })
  return { text: res.text, costUsd: res.costUsd }
}
