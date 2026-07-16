import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  DashboardV5Dto,
  DashboardGradeBucket,
  DashboardRecentScore,
  DashboardAttentionItem,
  DailyBoardDto,
  DailyObligationDto,
  DailySqRedDto,
  DailyDraftDto,
  IatfDashboardDto,
  IatfDutyDto,
  RegBrowseDto
} from '@shared/ipc-types'
import { computeSqReadiness } from './sq-handlers'

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
      bomTotalForms: countOf(db, 'SELECT COUNT(*) AS c FROM bom_form_refs'),
      openCases: countOf(
        db,
        "SELECT COUNT(*) AS c FROM cases WHERE status IN ('open','in_progress')"
      ),
      formsFillable: countOf(
        db,
        'SELECT COUNT(*) AS c FROM forms f WHERE EXISTS (SELECT 1 FROM form_fields ff WHERE ff.form_code = f.code)'
      ),
      sqNewDrafts4w: countOf(
        db,
        `SELECT COUNT(DISTINCT s.form_code) AS c
         FROM form_submissions s
         JOIN forms f ON f.code = s.form_code
         JOIN sq_reg_map m ON m.reg_code = f.reg_code
         WHERE s.created_at >= datetime('now', '-28 days')`
      )
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
       bomTotalForms: 0,
       openCases: 0,
       formsFillable: 0,
       sqNewDrafts4w: 0
     }
   }
  })

  // ──── 오늘 할 일 (매일 관리 보드) ────
  // 정기의무 도래(연체/임박) + SQ 🔴미충족(작성으로 해결) + 작성중 draft 이어쓰기.
  ipcMain.handle(IPC_CHANNELS.DAILY_BOARD, (): DailyBoardDto => {
    const empty: DailyBoardDto = { overdue: [], dueSoon: [], sqRed: [], drafts: [] }
    try {
      // 1) 정기 의무 — 로컬 오늘 기준 남은 일수
      const today = new Date()
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const obs = db
        .prepare(
          `SELECT id, title, cadence, next_due_date, lead_days, owner, form_code
           FROM recurring_obligations
           WHERE active = 1 AND next_due_date IS NOT NULL
           ORDER BY next_due_date ASC`
        )
        .all() as Array<Record<string, unknown>>
      const toDto = (r: Record<string, unknown>, daysLeft: number): DailyObligationDto => ({
        id: r.id as number,
        title: r.title as string,
        cadence: (r.cadence as string) || '월',
        nextDueDate: r.next_due_date as string,
        daysLeft,
        owner: (r.owner as string) || null,
        formCode: (r.form_code as string) || null
      })
      const overdue: DailyObligationDto[] = []
      const dueSoon: DailyObligationDto[] = []
      const t0 = new Date(`${todayStr}T00:00:00`)
      for (const r of obs) {
        const due = new Date(`${r.next_due_date as string}T00:00:00`)
        const daysLeft = Math.round((due.getTime() - t0.getTime()) / 86400000)
        const lead = (r.lead_days as number) ?? 7
        if (daysLeft < 0) overdue.push(toDto(r, daysLeft))
        else if (daysLeft <= lead) dueSoon.push(toDto(r, daysLeft))
      }

      // 2) SQ 🔴 미충족 — 양식이 매핑돼 있어 작성으로 즉시 개선 가능한 항목 (점수 큰 순)
      const sqRed: DailySqRedDto[] = []
      try {
        const readiness = computeSqReadiness(db)
        for (const cat of readiness.categories) {
          for (const it of cat.items) {
            if (it.signal === 'red' && it.formCount > 0) {
              sqRed.push({
                code: it.code,
                title: it.title,
                points: it.points,
                categoryName: cat.name,
                formCount: it.formCount
              })
            }
          }
        }
        sqRed.sort((a, b) => b.points - a.points)
      } catch {
        /* SQ 백본 미구성 시 생략 */
      }

      // 3) 작성 중 초안 — 최근 수정 순
      const drafts = db
        .prepare(
          `SELECT s.id, s.form_code, s.serial_no, s.updated_at, f.name AS form_name
           FROM form_submissions s
           JOIN forms f ON f.code = s.form_code
           WHERE s.status = 'draft'
           ORDER BY s.updated_at DESC
           LIMIT 8`
        )
        .all() as Array<Record<string, unknown>>
      const draftDtos: DailyDraftDto[] = drafts.map((r) => ({
        submissionId: r.id as number,
        formCode: r.form_code as string,
        formName: (r.form_name as string) || (r.form_code as string),
        serialNo: (r.serial_no as string) || null,
        updatedAt: r.updated_at as string
      }))

      return { overdue, dueSoon, sqRed: sqRed.slice(0, 8), drafts: draftDtos }
    } catch (err) {
      console.error('[dashboard:dailyBoard] failed:', (err as Error).message)
      return empty
    }
  })

  // ──── IATF 대시보드 — 인증 심사 준비 한 장 (SQ 와 별개: 인증기관 심사 관점) ────
  ipcMain.handle(IPC_CHANNELS.IATF_DASHBOARD, (): IatfDashboardDto => {
    const empty: IatfDashboardDto = {
      clauses: [],
      duties: [],
      docs: { regsTotal: 0, regBodies: 0, formsTotal: 0, formsFillable: 0, formsWithSubmission: 0 }
    }
    try {
      // ① 조항 커버리지 요약 (CLAUSE_COVERAGE 와 동일 원천, 장별 규정 수만)
      const TITLES: Record<string, string> = {
        '4': '조직 상황', '5': '리더십', '6': '기획', '7': '지원',
        '8': '운용', '9': '성과평가', '10': '개선'
      }
      const clauseRegs = new Map<string, Set<string>>()
      const rows = db
        .prepare(
          `SELECT reg_code, iatf_clause FROM forms
           WHERE iatf_clause IS NOT NULL AND iatf_clause <> ''`
        )
        .all() as Array<{ reg_code: string; iatf_clause: string }>
      for (const r of rows) {
        for (const cl of String(r.iatf_clause).split(',').map((s) => s.trim()).filter(Boolean)) {
          if (!clauseRegs.has(cl)) clauseRegs.set(cl, new Set())
          clauseRegs.get(cl)!.add(r.reg_code)
        }
      }
      const clauses = ['4', '5', '6', '7', '8', '9', '10'].map((cl) => ({
        clause: cl,
        title: TITLES[cl],
        regCount: clauseRegs.get(cl)?.size ?? 0
      }))

      // ② 심사 핵심 정기 의무 — 내부심사·경영검토·교정·교육·문서·비상 (이행 기록 기준, 정직)
      const CORE = ['내부심사', '경영검토', '교정/MSA', '교육/인식', '문서관리', '안전/비상']
      const today = new Date()
      const t0 = new Date(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`
      )
      const dutyRows = db
        .prepare(
          `SELECT id, title, category, clause_ref, cadence, last_done_date, next_due_date, lead_days
           FROM recurring_obligations
           WHERE active = 1 AND category IN (${CORE.map(() => '?').join(',')})
           ORDER BY next_due_date ASC`
        )
        .all(...CORE) as Array<Record<string, unknown>>
      const duties: IatfDutyDto[] = dutyRows.map((r) => {
        const due = (r.next_due_date as string) || null
        const daysLeft = due ? Math.round((new Date(`${due}T00:00:00`).getTime() - t0.getTime()) / 86400000) : null
        const lead = (r.lead_days as number) ?? 7
        const status: IatfDutyDto['status'] =
          daysLeft != null && daysLeft < 0 ? 'overdue' : daysLeft != null && daysLeft <= lead ? 'due' : 'ok'
        return {
          id: r.id as number,
          title: r.title as string,
          category: r.category as string,
          clauseRef: (r.clause_ref as string) || null,
          cadence: (r.cadence as string) || '월',
          lastDoneDate: (r.last_done_date as string) || null,
          nextDueDate: due,
          daysLeft,
          status
        }
      })

      // ③ 문서화 준비도
      const docs = {
        regsTotal: countOf(db, 'SELECT COUNT(DISTINCT reg_code) AS c FROM forms'),
        regBodies: countOf(db, 'SELECT COUNT(DISTINCT reg_code) AS c FROM regulation_sections'),
        formsTotal: countOf(db, 'SELECT COUNT(*) AS c FROM forms WHERE code <> reg_code'),
        formsFillable: countOf(
          db,
          'SELECT COUNT(*) AS c FROM forms f WHERE EXISTS (SELECT 1 FROM form_fields ff WHERE ff.form_code = f.code)'
        ),
        formsWithSubmission: countOf(db, 'SELECT COUNT(DISTINCT form_code) AS c FROM form_submissions')
      }

      return { clauses, duties, docs }
    } catch (err) {
      console.error('[iatf:dashboard] failed:', (err as Error).message)
      return empty
    }
  })

  // ──── 규정·양식 찾아보기 (포털 2단계) — 규정 카드 그리드 원천 ────
  ipcMain.handle(IPC_CHANNELS.REG_BROWSE, (): RegBrowseDto[] => {
    try {
      const rows = db
        .prepare(
          `SELECT f.code, f.name, f.reg_code, f.resp_dept, f.iatf_clause,
                  (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
                  (SELECT COUNT(*) FROM form_submissions s WHERE s.form_code = f.code) AS draft_count
           FROM forms f ORDER BY f.reg_code, f.code`
        )
        .all() as Array<Record<string, unknown>>
      const bodyRegs = new Set(
        (db.prepare('SELECT DISTINCT reg_code FROM regulation_sections').all() as Array<{ reg_code: string }>).map(
          (r) => r.reg_code
        )
      )
      const regs = new Map<string, RegBrowseDto>()
      for (const r of rows) {
        const reg = r.reg_code as string
        if (!regs.has(reg)) {
          regs.set(reg, {
            regCode: reg,
            regName: reg,
            respDepts: [],
            iatfClause: null,
            hasBody: bodyRegs.has(reg),
            formsTotal: 0,
            formsFillable: 0,
            draftCount: 0
          })
        }
        const dto = regs.get(reg)!
        const dept = (r.resp_dept as string) || null
        if (dept && !dto.respDepts.includes(dept)) dto.respDepts.push(dept)
        if (!dto.iatfClause && r.iatf_clause) dto.iatfClause = r.iatf_clause as string
        if ((r.code as string) === reg) {
          dto.regName = (r.name as string) || reg // 규정 문서 자체 행
        } else {
          dto.formsTotal += 1
          if (((r.fields_count as number) ?? 0) > 0) dto.formsFillable += 1
          dto.draftCount += (r.draft_count as number) ?? 0
        }
      }
      return [...regs.values()].sort((a, b) => a.regCode.localeCompare(b.regCode))
    } catch (err) {
      console.error('[reg:browse] failed:', (err as Error).message)
      return []
    }
  })

  // 규정 상세 — 하위 양식 목록 (작성가능/작성본 수)
  ipcMain.handle(IPC_CHANNELS.REG_FORMS, (_e, { regCode }: { regCode: string }) => {
    try {
      const rows = db
        .prepare(
          `SELECT f.code, f.name,
                  (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
                  (SELECT COUNT(*) FROM form_submissions s WHERE s.form_code = f.code) AS draft_count
           FROM forms f WHERE f.reg_code = ? AND f.code <> f.reg_code ORDER BY f.code`
        )
        .all(regCode) as Array<Record<string, unknown>>
      return rows.map((r) => ({
        code: r.code as string,
        name: r.name as string,
        fieldsCount: (r.fields_count as number) ?? 0,
        draftCount: (r.draft_count as number) ?? 0
      }))
    } catch {
      return []
    }
  })
}
