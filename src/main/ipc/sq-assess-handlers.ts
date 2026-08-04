import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { todayKST } from '@shared/date-kst'
import { getSqlite } from '../database/connection'
import { suggestState } from './sq-guide-handlers'
import { exportSqReport } from '../docgen/sq-report-exporter'
import type {
  SqAssessmentDto,
  SqAssessmentLineDto,
  SqAssessmentSummaryDto,
  SqAssessConfirmInput,
  SqAssessMetaInput,
  SqCheckpointStatus,
  SqSuggestedState
} from '@shared/ipc-types'

/**
 * SQ 자체평가 (코워크 07 Phase B — v5 재구성).
 * 흐름: RUN(제안값 일괄 산출·세션 생성) → 사람 확정(CONFIRM/META) →
 * FINALIZE(42/42 확정 시 점수·등급 계산) → EXPORT(코워크 템플릿 fill).
 * A레일: suggested 는 감사 추적용 보존, final 은 사람만 쓴다.
 */

const FINAL_STATES: SqSuggestedState[] = ['우수', '양호', '보완', '일부미흡', '다수미흡', '미관리', '미해당']

function todayYmd(): string {
  return todayKST() // 공용 유틸 위임(중복 4벌 통합, 검수 7/30)
}

export function registerSqAssessHandlers(): void {
  const db = getSqlite()

  const confirmedCount = (id: string): number =>
    (
      db
        .prepare('SELECT COUNT(*) AS c FROM sq_assessment_lines WHERE assessment_id = ? AND final_state IS NOT NULL')
        .get(id) as { c: number }
    ).c

  // ──── 실행: 세션 생성 + 42항목 제안값 스냅샷 ────
  ipcMain.handle(IPC_CHANNELS.SQ_ASSESS_RUN, (): { success: boolean; id?: string; error?: string } => {
    try {
      const y = new Date().getFullYear()
      const half = new Date().getMonth() + 1 <= 6 ? 'H1' : 'H2'
      let id = `SA-${y}-${half}`
      let n = 1
      while (db.prepare('SELECT 1 FROM sq_assessments WHERE id = ?').get(id)) {
        n += 1
        id = `SA-${y}-${half}-${n}` // 같은 반기 재실행 시 회차 접미
      }

      const items = db.prepare('SELECT code FROM sq_items ORDER BY code').all() as Array<{ code: string }>
      if (items.length !== 42) return { success: false, error: `sq_items ${items.length}건 — 42 필요` }
      const cpStmt = db.prepare('SELECT status FROM sq_checkpoints WHERE item_code = ?')

      const tx = db.transaction(() => {
        db.prepare('INSERT INTO sq_assessments (id, assessed_at) VALUES (?, ?)').run(id, todayYmd())
        const ins = db.prepare(
          'INSERT INTO sq_assessment_lines (assessment_id, item_code, suggested_state) VALUES (?, ?, ?)'
        )
        for (const it of items) {
          const cps = cpStmt.all(it.code) as Array<{ status: SqCheckpointStatus }>
          ins.run(id, it.code, suggestState(cps))
        }
      })
      tx()
      return { success: true, id }
    } catch (err) {
      console.error('[sq:assessRun] failed:', (err as Error).message)
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.SQ_ASSESS_LIST, (): SqAssessmentSummaryDto[] => {
    try {
      const rows = db
        .prepare('SELECT id, assessed_at, total_score, grade, report_path FROM sq_assessments ORDER BY created_at DESC')
        .all() as Array<Record<string, unknown>>
      return rows.map((r) => ({
        id: r.id as string,
        assessedAt: r.assessed_at as string,
        totalScore: (r.total_score as number) ?? null,
        grade: (r.grade as string) ?? null,
        reportPath: (r.report_path as string) ?? null,
        confirmedCount: confirmedCount(r.id as string)
      }))
    } catch {
      return []
    }
  })

  ipcMain.handle(IPC_CHANNELS.SQ_ASSESS_GET, (_e, { id }: { id?: string } = {}): SqAssessmentDto | null => {
    try {
      const head = (
        id
          ? db.prepare('SELECT * FROM sq_assessments WHERE id = ?').get(id)
          : db.prepare('SELECT * FROM sq_assessments ORDER BY created_at DESC LIMIT 1').get()
      ) as Record<string, unknown> | undefined
      if (!head) return null
      const aid = head.id as string
      const lines = db
        .prepare(
          `SELECT l.item_code, l.suggested_state, l.final_state, l.observation, l.extra_finding,
                  si.title, si.points, gi.area
           FROM sq_assessment_lines l
           JOIN sq_items si ON si.code = l.item_code
           JOIN sq_guide_items gi ON gi.item_code = l.item_code
           WHERE l.assessment_id = ? ORDER BY l.item_code`
        )
        .all(aid) as Array<Record<string, unknown>>
      const lineDtos: SqAssessmentLineDto[] = lines.map((r) => ({
        itemCode: r.item_code as string,
        title: r.title as string,
        area: r.area as string,
        score: (r.points as number) ?? 0,
        suggestedState: (r.suggested_state as SqSuggestedState) ?? null,
        finalState: (r.final_state as SqSuggestedState) ?? null,
        observation: (r.observation as string) ?? null,
        extraFinding: (r.extra_finding as string) ?? null
      }))
      return {
        id: aid,
        assessedAt: head.assessed_at as string,
        assessor: (head.assessor as string) ?? null,
        witness: (head.witness as string) ?? null,
        summaryOpinion: (head.summary_opinion as string) ?? null,
        nextDue: (head.next_due as string) ?? null,
        totalScore: (head.total_score as number) ?? null,
        grade: (head.grade as string) ?? null,
        reportPath: (head.report_path as string) ?? null,
        approvedBy: (head.approved_by as string) ?? null,
        approvedAt: (head.approved_at as string) ?? null,
        confirmedCount: lineDtos.filter((l) => l.finalState != null).length,
        lines: lineDtos
      }
    } catch (err) {
      console.error('[sq:assessGet] failed:', (err as Error).message)
      return null
    }
  })

  // ──── 항목 확정 (사람만) ────
  ipcMain.handle(
    IPC_CHANNELS.SQ_ASSESS_CONFIRM,
    (_e, input: SqAssessConfirmInput): { success: boolean; confirmedCount: number } => {
      try {
        if (input.finalState != null && !FINAL_STATES.includes(input.finalState)) {
          return { success: false, confirmedCount: confirmedCount(input.assessmentId) }
        }
        const sets: string[] = []
        const vals: unknown[] = []
        if ('finalState' in input) {
          sets.push('final_state = ?')
          vals.push(input.finalState ?? null)
        }
        if ('observation' in input) {
          sets.push('observation = ?')
          vals.push(input.observation ?? null)
        }
        if ('extraFinding' in input) {
          sets.push('extra_finding = ?')
          vals.push(input.extraFinding ?? null)
        }
        if (sets.length > 0) {
          vals.push(input.assessmentId, input.itemCode)
          db.prepare(
            `UPDATE sq_assessment_lines SET ${sets.join(', ')} WHERE assessment_id = ? AND item_code = ?`
          ).run(...vals)
          // 확정 내용이 바뀌면 기존 점수 확정은 무효(재확정 필요)
          db.prepare('UPDATE sq_assessments SET total_score = NULL, grade = NULL WHERE id = ?').run(
            input.assessmentId
          )
        }
        return { success: true, confirmedCount: confirmedCount(input.assessmentId) }
      } catch (err) {
        console.error('[sq:assessConfirm] failed:', (err as Error).message)
        return { success: false, confirmedCount: 0 }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.SQ_ASSESS_META, (_e, input: SqAssessMetaInput): { success: boolean } => {
    try {
      const map: Record<string, string> = {
        assessedAt: 'assessed_at',
        assessor: 'assessor',
        witness: 'witness',
        summaryOpinion: 'summary_opinion',
        nextDue: 'next_due',
        approvedBy: 'approved_by'
      }
      const sets: string[] = []
      const vals: unknown[] = []
      for (const [k, col] of Object.entries(map)) {
        if (k in input) {
          sets.push(`${col} = ?`)
          vals.push((input as unknown as Record<string, unknown>)[k] ?? null)
        }
      }
      if ('approvedBy' in input) sets.push("approved_at = datetime('now')")
      if (sets.length === 0) return { success: false }
      vals.push(input.assessmentId)
      db.prepare(`UPDATE sq_assessments SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
      return { success: true }
    } catch (err) {
      console.error('[sq:assessMeta] failed:', (err as Error).message)
      return { success: false }
    }
  })

  // ──── 점수 확정 — 42/42 필수, 계수·컷은 app_config (07번: 하드코딩 금지) ────
  ipcMain.handle(
    IPC_CHANNELS.SQ_ASSESS_FINALIZE,
    (_e, { assessmentId }: { assessmentId: string }): { success: boolean; totalScore?: number; grade?: string; remaining?: number } => {
      try {
        const lines = db
          .prepare(
            `SELECT l.final_state, si.points FROM sq_assessment_lines l
             JOIN sq_items si ON si.code = l.item_code WHERE l.assessment_id = ?`
          )
          .all(assessmentId) as Array<{ final_state: SqSuggestedState | null; points: number }>
        const remaining = lines.filter((l) => l.final_state == null).length
        if (lines.length !== 42 || remaining > 0) return { success: false, remaining }

        const coeff = JSON.parse(
          (db.prepare("SELECT value FROM app_config WHERE key='sq.state_coefficients'").get() as { value: string })
            .value
        ) as Record<string, number>
        const gradeRule = JSON.parse(
          (db.prepare("SELECT value FROM app_config WHERE key='sq.grade_rule'").get() as { value: string }).value
        ) as { S: number; G: number }

        const naScore = lines.filter((l) => l.final_state === '미해당').reduce((s, l) => s + l.points, 0)
        const raw = lines.reduce(
          (s, l) => s + (l.final_state === '미해당' ? 0 : Math.round(l.points * (coeff[l.final_state!] ?? 0))),
          0
        )
        // 미해당 환산 모드①(분모 제외 비례) — 템플릿 G54 수식과 동일 (08번 4절 대조 지점)
        const denom = 1000 - naScore
        const total = denom > 0 ? Math.round((raw / denom) * 1000) : 0
        const grade = total >= gradeRule.S ? 'S' : total >= gradeRule.G ? 'G' : '불합격'

        db.prepare('UPDATE sq_assessments SET total_score = ?, grade = ? WHERE id = ?').run(
          total,
          grade,
          assessmentId
        )
        return { success: true, totalScore: total, grade }
      } catch (err) {
        console.error('[sq:assessFinalize] failed:', (err as Error).message)
        return { success: false }
      }
    }
  )

  // ──── 리포트 출력 — 코워크 템플릿 fill (08번 3절 셀맵 계약) ────
  ipcMain.handle(IPC_CHANNELS.SQ_ASSESS_EXPORT, async (_e, { assessmentId }: { assessmentId: string }) => {
    return exportSqReport(db, assessmentId)
  })
}
