import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  DashboardV5Dto,
  DashboardGradeBucket,
  DashboardRecentScore,
  DashboardAttentionItem
} from '@shared/ipc-types'

function countOf(db: ReturnType<typeof getSqlite>, sql: string): number {
  try {
    const row = db.prepare(sql).get() as { c: number } | undefined
    return row?.c ?? 0
  } catch {
    return 0
  }
}

/**
 * v5 대시보드: forms / form_scores / form_submissions / BOM 에서 실데이터 집계.
 * 채점된 데이터가 없으면 0/빈 배열을 반환(하드코딩 없음 → 화면에서 빈 상태 안내).
 */
export function registerDashboardHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_V5, (): DashboardV5Dto => {
   try {
    // 양식별 최신 채점 1건
    const latestPerForm = db
      .prepare(
        `SELECT fs.form_code, fs.score, fs.grade, fs.verdict, fs.scored_at,
                f.name AS form_name, f.reg_code
         FROM form_scores fs
         JOIN (
           SELECT form_code, MAX(scored_at) AS max_at
           FROM form_scores GROUP BY form_code
         ) m ON fs.form_code = m.form_code AND fs.scored_at = m.max_at
            -- 동일 scored_at 동률 시 최신 id 1건만 선택(중복행 방지)
            AND fs.id = (SELECT MAX(z.id) FROM form_scores z
                         WHERE z.form_code = fs.form_code AND z.scored_at = m.max_at)
         JOIN forms f ON f.code = fs.form_code`
      )
      .all() as Array<{
      form_code: string
      score: number
      grade: string | null
      verdict: string | null
      scored_at: string
      form_name: string
      reg_code: string
    }>

    const formsTotal = countOf(db, 'SELECT COUNT(*) AS c FROM forms')
    const formsScored = latestPerForm.length

    const avgScore =
      formsScored > 0
        ? Math.round(latestPerForm.reduce((s, r) => s + (r.score ?? 0), 0) / formsScored)
        : null

    const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 }
    for (const r of latestPerForm) {
      const g = r.grade && gradeCounts[r.grade] !== undefined ? r.grade : 'D'
      gradeCounts[g] = (gradeCounts[g] ?? 0) + 1
    }
    const gradeDist: DashboardGradeBucket[] = ['A', 'B', 'C', 'D'].map((grade) => ({
      grade,
      count: gradeCounts[grade] ?? 0
    }))

    // 초안 있는 양식
    const draftForms = db
      .prepare(`SELECT DISTINCT form_code FROM form_submissions WHERE status = 'draft'`)
      .all() as Array<{ form_code: string }>
    const draftSet = new Set(draftForms.map((d) => d.form_code))
    const formsWithDraft = draftSet.size

    // 보완 필요 항목: 점수 < 80(보완필요/부적합) + 초안만 있고 미채점
    const scoredCodes = new Set(latestPerForm.map((r) => r.form_code))
    const needsAttention: DashboardAttentionItem[] = []

    for (const r of latestPerForm) {
      if (r.score < 80) {
        needsAttention.push({
          formCode: r.form_code,
          formName: r.form_name,
          regCode: r.reg_code,
          score: r.score,
          grade: r.grade,
          verdict: r.verdict,
          reason: r.verdict || (r.score < 60 ? '부적합' : '보완필요')
        })
      }
    }
    // 미채점 초안
    if (draftSet.size > 0) {
      const draftMeta = db
        .prepare(
          `SELECT code, name, reg_code FROM forms WHERE code IN (${draftForms.map(() => '?').join(',')})`
        )
        .all(...draftForms.map((d) => d.form_code)) as Array<{
        code: string
        name: string
        reg_code: string
      }>
      for (const f of draftMeta) {
        if (!scoredCodes.has(f.code)) {
          needsAttention.push({
            formCode: f.code,
            formName: f.name,
            regCode: f.reg_code,
            score: null,
            grade: null,
            verdict: null,
            reason: '미채점 초안'
          })
        }
      }
    }

    // 점수 낮은 순 → 미채점은 뒤로
    needsAttention.sort((a, b) => {
      if (a.score == null && b.score == null) return 0
      if (a.score == null) return 1
      if (b.score == null) return -1
      return a.score - b.score
    })
    const needsAttentionCount = needsAttention.length

    // 최근 채점 6건
    const recentRows = db
      .prepare(
        `SELECT fs.form_code, fs.score, fs.grade, fs.verdict, fs.scored_at,
                f.name AS form_name, f.reg_code
         FROM form_scores fs JOIN forms f ON f.code = fs.form_code
         ORDER BY fs.scored_at DESC LIMIT 6`
      )
      .all() as Array<{
      form_code: string
      score: number
      grade: string | null
      verdict: string | null
      scored_at: string
      form_name: string
      reg_code: string
    }>
    const recentScores: DashboardRecentScore[] = recentRows.map((r) => ({
      formCode: r.form_code,
      formName: r.form_name,
      regCode: r.reg_code,
      score: r.score,
      grade: r.grade || '-',
      verdict: r.verdict || '-',
      scoredAt: r.scored_at
    }))

    return {
      formsTotal,
      formsScored,
      formsWithDraft,
      avgScore,
      gradeDist,
      needsAttentionCount,
      needsAttention: needsAttention.slice(0, 8),
      recentScores,
      bomTotalDocs: countOf(db, 'SELECT COUNT(*) AS c FROM bom_documents'),
      bomTotalForms: countOf(db, 'SELECT COUNT(*) AS c FROM bom_form_refs')
    }
   } catch (err) {
     // 집계 중 예외 시에도 IPC가 reject되지 않도록 안전한 빈 DTO 반환(ErrorBoundary 외 2차 방어)
     console.error('[dashboard:v5] aggregation failed:', (err as Error).message)
     return {
       formsTotal: 0,
       formsScored: 0,
       formsWithDraft: 0,
       avgScore: null,
       gradeDist: ['A', 'B', 'C', 'D'].map((grade) => ({ grade, count: 0 })),
       needsAttentionCount: 0,
       needsAttention: [],
       recentScores: [],
       bomTotalDocs: 0,
       bomTotalForms: 0
     }
   }
  })
}
