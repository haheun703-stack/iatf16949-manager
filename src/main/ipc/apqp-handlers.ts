import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  ApqpBoardDto,
  ApqpPhaseDto,
  ApqpElementDto,
  ApqpStatus,
  ApqpCoreTool,
  ApqpElementUpdateInput,
  ApqpEvidenceDto
} from '@shared/ipc-types'

type Db = ReturnType<typeof getSqlite>

function count(db: Db, sql: string): number {
  try {
    return (db.prepare(sql).get() as { c: number } | undefined)?.c ?? 0
  } catch {
    return 0 // 테이블 미존재(구버전 DB) 등 — 증거 없음으로 처리
  }
}

/**
 * 산출물 ↔ 실데이터 연동(결정론). 데이터가 실재하는 산출물에 증거 요약+제안 상태를 계산.
 * 상태 자체는 덮어쓰지 않음 — UI의 [반영] 원클릭으로 사람이 확정(A레일 철학).
 */
function computeEvidence(db: Db): Map<string, ApqpEvidenceDto> {
  const ev = new Map<string, ApqpEvidenceDto>()

  // 공정 FMEA (apqp-3-06): fmea_documents — 존재→진행중, 승인 있으면→완료
  const fmeaTotal = count(db, 'SELECT COUNT(*) AS c FROM fmea_documents')
  if (fmeaTotal > 0) {
    const approved = count(db, "SELECT COUNT(*) AS c FROM fmea_documents WHERE status = 'approved'")
    ev.set('apqp-3-06', {
      summary: `FMEA 문서 ${fmeaTotal}건 (승인 ${approved})`,
      suggestedStatus: approved > 0 ? 'completed' : 'in_progress'
    })
  }

  // MSA (apqp-4-02): msa_studies — 존재→진행중, 판정된 스터디가 전부 양호면→완료
  const msaTotal = count(db, 'SELECT COUNT(*) AS c FROM msa_studies')
  if (msaTotal > 0) {
    const judged = count(db, "SELECT COUNT(*) AS c FROM msa_studies WHERE result <> 'pending'")
    const ok = count(db, "SELECT COUNT(*) AS c FROM msa_studies WHERE result = 'acceptable'")
    ev.set('apqp-4-02', {
      summary: `MSA 스터디 ${msaTotal}건 (양호 ${ok}/${judged})`,
      suggestedStatus: judged > 0 && ok === judged ? 'completed' : 'in_progress'
    })
  }

  // PPAP (apqp-4-04): ppap_submissions — 존재→진행중, 승인 있으면→완료
  const ppapTotal = count(db, 'SELECT COUNT(*) AS c FROM ppap_submissions')
  if (ppapTotal > 0) {
    const approved = count(db, "SELECT COUNT(*) AS c FROM ppap_submissions WHERE status = 'approved'")
    ev.set('apqp-4-04', {
      summary: `PPAP 제출 ${ppapTotal}건 (승인 ${approved})`,
      suggestedStatus: approved > 0 ? 'completed' : 'in_progress'
    })
  }

  // 양산 관리계획서 (apqp-4-07): ISIR control_plan_items — 항목 실재=승인된 ISIR→완료
  const cpItems = count(db, 'SELECT COUNT(*) AS c FROM control_plan_items')
  if (cpItems > 0) {
    const pkgs = count(db, 'SELECT COUNT(*) AS c FROM isir_packages')
    ev.set('apqp-4-07', {
      summary: `ISIR 관리계획서 ${cpItems}항목 (패키지 ${pkgs})`,
      suggestedStatus: 'completed'
    })
  }

  return ev
}

function rowToElement(r: Record<string, unknown>, evidence: ApqpEvidenceDto | null): ApqpElementDto {
  return {
    evidence,
    id: r.id as string,
    phaseId: r.phase_id as string,
    seq: r.seq as number,
    name: r.name as string,
    nameEn: (r.name_en as string) || null,
    io: (r.io as 'input' | 'output') ?? 'output',
    coreTool: (r.core_tool as ApqpCoreTool) || null,
    clauseId: (r.clause_id as string) || null,
    clauseTitle: (r.clause_title as string) || null,
    teamId: (r.team_id as string) || null,
    teamName: (r.team_name as string) || null,
    status: (r.status as ApqpStatus) ?? 'not_started',
    targetDate: (r.target_date as string) || null,
    actualDate: (r.actual_date as string) || null,
    note: (r.note as string) || null
  }
}

export function registerApqpHandlers(): void {
  const db = getSqlite()

  // ──── 보드: 5단계 + 43산출물 + 진척 집계 ────
  ipcMain.handle(IPC_CHANNELS.APQP_BOARD, (): ApqpBoardDto => {
    const phaseRows = db
      .prepare('SELECT * FROM apqp_phases ORDER BY sort_order ASC')
      .all() as Array<Record<string, unknown>>
    const elemRows = db
      .prepare(
        `SELECT e.*, c.title AS clause_title, t.name AS team_name
         FROM apqp_elements e
         LEFT JOIN clauses c ON e.clause_id = c.id
         LEFT JOIN teams t ON e.team_id = t.id
         ORDER BY e.phase_id ASC, e.seq ASC`
      )
      .all() as Array<Record<string, unknown>>

    const evidenceMap = computeEvidence(db)
    const byPhase = new Map<string, ApqpElementDto[]>()
    for (const r of elemRows) {
      const e = rowToElement(r, evidenceMap.get(r.id as string) ?? null)
      if (!byPhase.has(e.phaseId)) byPhase.set(e.phaseId, [])
      byPhase.get(e.phaseId)!.push(e)
    }

    const phases: ApqpPhaseDto[] = phaseRows.map((p) => {
      const elements = byPhase.get(p.id as string) ?? []
      const applicable = elements.filter((e) => e.status !== 'na')
      return {
        id: p.id as string,
        phaseNo: p.phase_no as number,
        title: p.title as string,
        titleEn: (p.title_en as string) || null,
        description: (p.description as string) || null,
        elements,
        total: applicable.length,
        completed: applicable.filter((e) => e.status === 'completed').length,
        inProgress: applicable.filter((e) => e.status === 'in_progress').length
      }
    })

    const totAll = phases.reduce((s, p) => s + p.total, 0)
    const totDone = phases.reduce((s, p) => s + p.completed, 0)
    const overallPct = totAll > 0 ? Math.round((totDone / totAll) * 100) : 0
    // 현재 단계 = 미완료 요소가 남은 첫 단계 (전부 완료면 마지막 단계)
    const firstOpen = phases.find((p) => p.completed < p.total)
    const currentPhaseNo = firstOpen ? firstOpen.phaseNo : (phases.at(-1)?.phaseNo ?? 5)

    return { phases, overallPct, currentPhaseNo }
  })

  // ──── 산출물 수정 (화이트리스트: 상태·일정·메모) ────
  ipcMain.handle(
    IPC_CHANNELS.APQP_ELEMENT_UPDATE,
    (_event, input: ApqpElementUpdateInput): { success: boolean } => {
      const sets: string[] = []
      const values: unknown[] = []
      if ('status' in input && input.status) {
        sets.push('status = ?')
        values.push(input.status)
      }
      if ('targetDate' in input) {
        sets.push('target_date = ?')
        values.push(input.targetDate ?? null)
      }
      if ('actualDate' in input) {
        sets.push('actual_date = ?')
        values.push(input.actualDate ?? null)
      }
      if ('note' in input) {
        sets.push('note = ?')
        values.push(input.note ?? null)
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE apqp_elements SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )
}
