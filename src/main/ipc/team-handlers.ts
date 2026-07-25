import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { computeSqReadiness } from './sq-handlers'
import { evaluateDataTriggers, listBoardIssues } from './trigger-engine'
import { getMesDataEndYmd } from './mes-records-handlers'
import { TEAMS, normalizeTeam, normalizeOwnerTeam, teamTheme, type TeamId } from '@shared/team-theme'
import type {
  TeamSummaryDto,
  TeamSqItemDto,
  TeamRegDto,
  SqSignal,
  TeamTodayBoardDto,
  TeamTodayDto,
  TodayTaskDto
} from '@shared/ipc-types'

const SIGNAL_SCORE: Record<SqSignal, number> = { green: 1, yellow: 0.5, red: 0, gray: 0 }

/**
 * 팀별 허브 집계 — 기존 데이터의 렌즈 전환(원본 불변):
 *   SQ 항목 → sq_reg_map → 규정 → forms.resp_dept → 팀.
 *   준비도 = 팀 배정 항목의 신호등 가중점수(gray 제외).
 *   할 일 = 🔴항목 수 + 도래·연체 정기의무(팀 책임 양식 기준).
 */
export function registerTeamHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.TEAM_SUMMARY, (): TeamSummaryDto[] => {
    // 규정 → 팀들 (한 규정에 여러 부서 양식이 있으면 여러 팀)
    const regTeams = new Map<string, Set<TeamId>>()
    try {
      const rows = db
        .prepare('SELECT DISTINCT reg_code, resp_dept FROM forms WHERE resp_dept IS NOT NULL')
        .all() as Array<{ reg_code: string; resp_dept: string }>
      for (const r of rows) {
        const t = normalizeTeam(r.resp_dept)
        if (!t) continue
        if (!regTeams.has(r.reg_code)) regTeams.set(r.reg_code, new Set())
        regTeams.get(r.reg_code)!.add(t)
      }
    } catch {
      /* forms.resp_dept 미존재(구버전) → 전 팀 빈 집계 */
    }

    // SQ 항목 → 근거 규정
    const itemRegs = new Map<string, string[]>()
    try {
      const maps = db.prepare('SELECT item_code, reg_code FROM sq_reg_map').all() as Array<{
        item_code: string
        reg_code: string
      }>
      for (const m of maps) {
        if (!itemRegs.has(m.item_code)) itemRegs.set(m.item_code, [])
        itemRegs.get(m.item_code)!.push(m.reg_code)
      }
    } catch {
      /* SQ 백본 미구성 */
    }

    // 근거 규정 없는 항목의 직접 팀 배정(0061 fallback_dept, 사장님 확정) — 규정 역산이 항상 우선
    const itemFallback = new Map<string, TeamId>()
    try {
      const rows = db
        .prepare('SELECT code, fallback_dept FROM sq_items WHERE fallback_dept IS NOT NULL')
        .all() as Array<{ code: string; fallback_dept: string }>
      for (const r of rows) {
        const t = normalizeTeam(r.fallback_dept)
        if (t) itemFallback.set(r.code, t)
      }
    } catch {
      /* 0061 미적용(구버전) → 폴백 없음 */
    }

    // SQ 준비도(신호등) — 기존 계산 재사용
    type Item = { code: string; title: string; points: number; signal: SqSignal }
    const allItems: Item[] = []
    try {
      const readiness = computeSqReadiness(db)
      for (const cat of readiness.categories) for (const it of cat.items) allItems.push(it)
    } catch {
      /* 미구성 */
    }

    // 팀별 버킷 구성
    const buckets = new Map<TeamId, { items: TeamSqItemDto[] }>()
    for (const t of TEAMS) buckets.set(t.id, { items: [] })
    for (const it of allItems) {
      const regs = itemRegs.get(it.code) ?? []
      const teams = new Set<TeamId>()
      for (const reg of regs) for (const t of regTeams.get(reg) ?? []) teams.add(t)
      if (teams.size === 0) {
        const fb = itemFallback.get(it.code)
        if (fb) teams.add(fb)
      }
      for (const teamId of teams) {
        const teamRegs = regs.filter((r) => regTeams.get(r)?.has(teamId))
        buckets.get(teamId)!.items.push({
          code: it.code,
          title: it.title,
          points: it.points,
          signal: it.signal,
          regs: teamRegs
        })
      }
    }

    // 정기의무 도래(팀 배정 = form_code → reg → 팀)
    const dueByTeam = new Map<TeamId, { due: number; overdue: number }>()
    for (const t of TEAMS) dueByTeam.set(t.id, { due: 0, overdue: 0 })
    try {
      const today = new Date()
      const t0 = new Date(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`
      )
      const obs = db
        .prepare(
          `SELECT o.next_due_date, o.lead_days, f.resp_dept
           FROM recurring_obligations o
           JOIN forms f ON f.code = o.form_code
           WHERE o.active = 1 AND o.next_due_date IS NOT NULL AND f.resp_dept IS NOT NULL`
        )
        .all() as Array<{ next_due_date: string; lead_days: number; resp_dept: string }>
      for (const o of obs) {
        const teamId = normalizeTeam(o.resp_dept)
        if (!teamId) continue
        const due = new Date(`${o.next_due_date}T00:00:00`)
        const daysLeft = Math.round((due.getTime() - t0.getTime()) / 86400000)
        const b = dueByTeam.get(teamId)!
        if (daysLeft < 0) b.overdue++
        else if (daysLeft <= (o.lead_days ?? 7)) b.due++
      }
    } catch {
      /* obligations 미구성 */
    }

    // 팀 양식 보유/작성가능
    const formStats = new Map<TeamId, { total: number; fillable: number }>()
    for (const t of TEAMS) formStats.set(t.id, { total: 0, fillable: 0 })
    try {
      const rows = db
        .prepare(
          `SELECT f.resp_dept, COUNT(*) AS total,
                  SUM(CASE WHEN EXISTS (SELECT 1 FROM form_fields ff WHERE ff.form_code = f.code) THEN 1 ELSE 0 END) AS fillable
           FROM forms f WHERE f.resp_dept IS NOT NULL GROUP BY f.resp_dept`
        )
        .all() as Array<{ resp_dept: string; total: number; fillable: number }>
      for (const r of rows) {
        const teamId = normalizeTeam(r.resp_dept)
        if (!teamId) continue
        const s = formStats.get(teamId)!
        s.total += r.total
        s.fillable += r.fillable ?? 0
      }
    } catch {
      /* noop */
    }

    return TEAMS.map((t) => {
      const bucket = buckets.get(t.id)!
      const items = bucket.items.sort((a, b) => b.points - a.points)
      const scored = items.filter((i) => i.signal !== 'gray')
      const wsum = scored.reduce((s, i) => s + i.points, 0)
      const readinessPct =
        scored.length === 0
          ? null
          : Math.round((scored.reduce((s, i) => s + SIGNAL_SCORE[i.signal] * i.points, 0) / (wsum || 1)) * 100)
      const redCount = items.filter((i) => i.signal === 'red').length
      const due = dueByTeam.get(t.id)!
      const fs = formStats.get(t.id)!
      return {
        teamId: t.id,
        readinessPct,
        itemCount: items.length,
        redCount,
        dueCount: due.due + due.overdue,
        urgent: due.overdue > 0 || items.some((i) => i.signal === 'red' && i.points >= 30),
        formsTotal: fs.total,
        formsFillable: fs.fillable,
        items
      }
    })
  })

  // ──── 팀 책임 규정(지침) → 하위 양식 트리 (문서 BOM 의 팀 렌즈) ────
  ipcMain.handle(IPC_CHANNELS.TEAM_REGS, (_event, { teamId }: { teamId: string }): TeamRegDto[] => {
    const theme = teamTheme(teamId as TeamId)
    if (!theme) return []
    try {
      const rows = db
        .prepare(
          `SELECT f.reg_code, f.code, f.name, f.resp_dept, f.iatf_clause,
                  (SELECT COUNT(*) FROM form_fields ff WHERE ff.form_code = f.code) AS fields_count,
                  (SELECT COUNT(*) FROM form_submissions s WHERE s.form_code = f.code) AS draft_count
           FROM forms f
           WHERE f.resp_dept IS NOT NULL
           ORDER BY f.reg_code ASC, f.code ASC`
        )
        .all() as Array<{
        reg_code: string
        code: string
        name: string
        resp_dept: string
        iatf_clause: string | null
        fields_count: number
        draft_count: number
      }>
      const bodyRegs = new Set(
        (db.prepare('SELECT DISTINCT reg_code FROM regulation_sections').all() as Array<{ reg_code: string }>).map(
          (r) => r.reg_code
        )
      )

      const regs = new Map<string, TeamRegDto>()
      for (const r of rows) {
        if (normalizeTeam(r.resp_dept) !== teamId) continue
        if (!regs.has(r.reg_code)) {
          regs.set(r.reg_code, {
            regCode: r.reg_code,
            regName: r.reg_code, // 규정문서 행(code=reg_code)을 만나면 이름 교체
            hasBody: bodyRegs.has(r.reg_code),
            iatfClause: r.iatf_clause,
            forms: []
          })
        }
        const reg = regs.get(r.reg_code)!
        if (r.code === r.reg_code) {
          reg.regName = r.name // 규정 문서 자체
        } else {
          reg.forms.push({
            code: r.code,
            name: r.name,
            fieldsCount: r.fields_count ?? 0,
            draftCount: r.draft_count ?? 0
          })
        }
      }
      // 규정문서 행이 없어 이름이 코드 그대로인 경우: 첫 양식 이름에서 유추하지 않고 코드 유지(정직)
      return [...regs.values()].sort((a, b) => a.regCode.localeCompare(b.regCode))
    } catch (err) {
      console.error('[team:regs] failed:', (err as Error).message)
      return []
    }
  })

  // ──── 관제탑 홈: 팀별 오늘 할 일 보드 (포털 1단계) ────
  // "했는지·안 했는지"의 원천 = recurring_obligations(도래) + 완료 이력(0063)
  // + 연결 양식의 오늘 작성 기록(form_submissions, 자동 판정 표시).
  // 팀 배정 = 연결 양식 resp_dept(BOM 정본) 우선 → owner 텍스트 정규화 폴백.
  ipcMain.handle(IPC_CHANNELS.TEAM_TODAY_BOARD, (): TeamTodayBoardDto => {
    const ymd = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = ymd(new Date())
    const t0 = new Date(`${today}T00:00:00`)
    const empty: TeamTodayBoardDto = {
      date: today,
      totals: { done: 0, open: 0, overdue: 0 },
      trend: [],
      teams: TEAMS.map((t) => ({ teamId: t.id, done: 0, open: 0, overdue: 0, upcoming: 0, tasks: [] })),
      unassigned: []
    }
    try {
      // 양식 → 책임팀 / 규정 (SQ 배지용)
      const formMeta = new Map<string, { team: TeamId | null; regCode: string | null }>()
      try {
        const rows = db
          .prepare('SELECT code, resp_dept, reg_code FROM forms')
          .all() as Array<{ code: string; resp_dept: string | null; reg_code: string | null }>
        for (const r of rows) formMeta.set(r.code, { team: normalizeTeam(r.resp_dept), regCode: r.reg_code })
      } catch {
        /* forms 미구성 */
      }
      // 규정 → SQ 항목 배지
      const regSq = new Map<string, string[]>()
      try {
        const rows = db.prepare('SELECT reg_code, item_code FROM sq_reg_map').all() as Array<{
          reg_code: string
          item_code: string
        }>
        for (const r of rows) {
          if (!regSq.has(r.reg_code)) regSq.set(r.reg_code, [])
          regSq.get(r.reg_code)!.push(r.item_code)
        }
      } catch {
        /* SQ 백본 미구성 */
      }
      // 연결 양식의 오늘 작성 기록 (자동 판정 표시 — 확정은 완료 버튼)
      const formDoneToday = new Set<string>()
      try {
        const rows = db
          .prepare(
            `SELECT DISTINCT form_code FROM form_submissions
             WHERE date(COALESCE(updated_at, created_at)) = date('now', 'localtime')`
          )
          .all() as Array<{ form_code: string }>
        for (const r of rows) formDoneToday.add(r.form_code)
      } catch {
        /* noop */
      }

      const obs = db
        .prepare(
          `SELECT id, title, cadence, owner, assignee, lead_days, last_done_date, next_due_date, form_code
           FROM recurring_obligations WHERE active = 1
           ORDER BY next_due_date ASC, sort_order ASC`
        )
        .all() as Array<Record<string, unknown>>

      const byTeam = new Map<TeamId, TeamTodayDto>()
      for (const t of TEAMS) byTeam.set(t.id, { teamId: t.id, done: 0, open: 0, overdue: 0, upcoming: 0, tasks: [] })
      const unassigned: TodayTaskDto[] = []
      const totals = { done: 0, open: 0, overdue: 0 }

      for (const o of obs) {
        const formCode = (o.form_code as string) || null
        const meta = formCode ? formMeta.get(formCode) : undefined
        const team = meta?.team ?? normalizeOwnerTeam(o.owner as string)
        const sqBadges = meta?.regCode ? (regSq.get(meta.regCode) ?? []) : []

        const lastDone = (o.last_done_date as string) || null
        const dueDate = (o.next_due_date as string) || null
        const daysLeft = dueDate
          ? Math.round((new Date(`${dueDate}T00:00:00`).getTime() - t0.getTime()) / 86400000)
          : null
        const lead = (o.lead_days as number) ?? 7

        const formRecordToday = !!(formCode && formDoneToday.has(formCode))
        let task: TodayTaskDto | null = null
        if (lastDone === today) {
          // 확정 완료(OBLIGATION_COMPLETE). 작성기록으로 확정한 것도 여기 — 프론트는 hasFormRecord 로 '작성기록' 표기
          task = mk(o, 'done', dueDate, null, today, formRecordToday ? 'form' : 'manual', formCode, sqBadges, formRecordToday)
        } else if (daysLeft != null && daysLeft < 0) {
          // §0.6 결정2: 작성기록만 있고 미확정이면 done 아님 — overdue 유지 + hasFormRecord(홈에서 앰버 확정 유도)
          task = mk(o, 'overdue', dueDate, daysLeft, null, null, formCode, sqBadges, formRecordToday)
        } else if (daysLeft != null && daysLeft === 0) {
          task = mk(o, 'due', dueDate, daysLeft, null, null, formCode, sqBadges, formRecordToday)
        } else if (daysLeft != null && daysLeft <= lead) {
          task = mk(o, 'upcoming', dueDate, daysLeft, null, null, formCode, sqBadges, formRecordToday)
        }
        if (!task) continue // 도래 창 밖 — 오늘의 일 아님

        const bucket = team ? byTeam.get(team)! : null
        if (task.status === 'done') {
          totals.done++
          if (bucket) bucket.done++
        } else if (task.status === 'overdue') {
          totals.overdue++
          totals.open++
          if (bucket) {
            bucket.overdue++
            bucket.open++
          }
        } else if (task.status === 'due') {
          totals.open++
          if (bucket) bucket.open++
        } else if (bucket) {
          bucket.upcoming++
        }
        if (bucket) bucket.tasks.push(task)
        else unassigned.push(task)
      }

      // 4) 데이터 트리거 의무(M3, 15번 §3) — 엔진 평가(멱등) 후 보드 합류.
      //    "오늘 할 일"의 정본은 관제탑 하나 — 별도 화면·엔진 금지(§1-3).
      try {
        evaluateDataTriggers(db, { today, mesDataEndYmd: getMesDataEndYmd() })
        // T1 [심사 갭] = 팀당 집계 1행(코워크 7/25 판단①-b): 원 연체 행이 이미 "할 일"이므로
        // 의무별 갭 행은 중복 — N건 집계·자동 소멸형(완료 개념 없음)·팀 집계수 미포함(표출 전용).
        const gapAgg = new Map<TeamId | 'unassigned', { count: number; oldest: string }>()
        for (const it of listBoardIssues(db, today)) {
          if (it.entityKind === 'obligation') {
            if (it.status !== '발행') continue // 해소표시(원 의무 이행)·완료는 N 에서 제외
            const meta = it.obFormCode ? formMeta.get(it.obFormCode) : undefined
            const team = meta?.team ?? normalizeOwnerTeam(it.obOwner ?? '')
            const key = team ?? 'unassigned'
            const cur = gapAgg.get(key) ?? { count: 0, oldest: it.bucket }
            cur.count++
            if (it.bucket < cur.oldest) cur.oldest = it.bucket
            gapAgg.set(key, cur)
            continue
          }
          // T2 [증거 공백] — 원 의무와 중복 아님 → 개별 행 유지(완료는 사람 ✓)
          const team = normalizeTeam(it.teamHint) ?? normalizeOwnerTeam(it.teamHint ?? '')
          const done = it.status === '완료'
          const daysLeft = Math.round(
            (new Date(`${it.bucket}T00:00:00`).getTime() - t0.getTime()) / 86400000
          )
          const task: TodayTaskDto = {
            id: -it.issueId, // 의무 id 와 키 충돌 방지(프론트 completing/key 용도뿐)
            title: `[증거 공백] MES 일일 기록 미수신 — ${it.bucket}부터`,
            cadence: '데이터',
            assignee: null, // §3-4 팀 단위 발행 — 개인 자동 지정 금지
            status: done ? 'done' : 'overdue',
            dueDate: it.bucket,
            daysLeft: done ? null : daysLeft,
            doneAt: done ? ((it.completedAt ?? '').slice(0, 10) || today) : null,
            doneSource: done ? 'manual' : null,
            formCode: null,
            hasFormRecord: false,
            sqBadges: [],
            triggerIssueId: it.issueId,
            triggerResolved: it.status === '해소표시'
          }
          const bucket = team ? byTeam.get(team)! : null
          if (done) {
            totals.done++
            if (bucket) bucket.done++
          } else {
            totals.overdue++
            totals.open++
            if (bucket) {
              bucket.overdue++
              bucket.open++
            }
          }
          if (bucket) bucket.tasks.push(task)
          else unassigned.push(task)
        }
        let gapSeq = 0
        for (const [key, agg] of gapAgg) {
          gapSeq++
          const task: TodayTaskDto = {
            id: -(1_000_000 + gapSeq), // 합성 행 — 의무·이슈 id 와 충돌 없는 표출 전용 키
            title: `[심사 갭] 장기연체(7일+) ${agg.count}건`,
            cadence: '데이터',
            assignee: null,
            status: 'overdue',
            dueDate: agg.oldest,
            daysLeft: null, // 집계 행은 "연체 N일" 표기 억제 — N건이 신호
            doneAt: null,
            doneSource: null,
            formCode: null,
            hasFormRecord: false,
            sqBadges: [],
            gapCount: agg.count
          }
          if (key === 'unassigned') unassigned.push(task)
          else byTeam.get(key)!.tasks.push(task)
          // 팀 done/open/overdue 집계 미포함 — 원 의무가 이미 세어짐(이중 계상 방지)
        }
      } catch (err) {
        console.error('[team:todayBoard] 데이터 트리거 합류 실패(보드는 계속):', (err as Error).message)
      }

      // 팀 내 정렬: 연체 → 오늘 마감 → 완료 → 예정
      const rank: Record<string, number> = { overdue: 0, due: 1, done: 2, upcoming: 3 }
      for (const b of byTeam.values())
        b.tasks.sort((a, z) => rank[a.status] - rank[z.status] || (a.daysLeft ?? 0) - (z.daysLeft ?? 0))

      // 최근 7일 완료 추이 (0063 — 데이터는 오늘부터 쌓임)
      const trend: Array<{ date: string; done: number }> = []
      try {
        const from = new Date(t0)
        from.setDate(from.getDate() - 6)
        const rows = db
          .prepare(
            `SELECT done_date, COUNT(*) AS c FROM obligation_completions
             WHERE done_date >= ? GROUP BY done_date`
          )
          .all(ymd(from)) as Array<{ done_date: string; c: number }>
        const byDate = new Map(rows.map((r) => [r.done_date, r.c]))
        for (let i = 6; i >= 0; i--) {
          const d = new Date(t0)
          d.setDate(d.getDate() - i)
          const key = ymd(d)
          trend.push({ date: key, done: byDate.get(key) ?? 0 })
        }
      } catch {
        /* 0063 미적용 — 추이 없이 동작 */
      }

      return { date: today, totals, trend, teams: [...byTeam.values()], unassigned }
    } catch (err) {
      console.error('[team:todayBoard] failed:', (err as Error).message)
      return empty
    }

    function mk(
      o: Record<string, unknown>,
      status: TodayTaskDto['status'],
      dueDate: string | null,
      daysLeft: number | null,
      doneAt: string | null,
      doneSource: TodayTaskDto['doneSource'],
      formCode: string | null,
      sqBadges: string[],
      hasFormRecord: boolean
    ): TodayTaskDto {
      return {
        id: o.id as number,
        title: o.title as string,
        cadence: (o.cadence as string) || '월',
        assignee: (o.assignee as string) || null,
        status,
        dueDate,
        daysLeft: status === 'done' ? null : daysLeft,
        doneAt,
        doneSource,
        formCode,
        hasFormRecord,
        sqBadges
      }
    }
  })
}
