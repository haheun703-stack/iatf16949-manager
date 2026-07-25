import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { TEAMS, normalizeTeam, normalizeOwnerTeam, teamTheme, type TeamId } from '@shared/team-theme'
import { evaluateDataTriggers, listBoardIssues } from './trigger-engine'
import { getMesDataEndYmd } from './mes-records-handlers'
import type {
  ObligationDto,
  ObligationCreateInput,
  ObligationUpdateInput,
  ObligationCadence,
  ObligationCategory,
  ObligationMatrixCellDto,
  ObligationMatrixDto,
  ObligationMatrixRowDto
} from '@shared/ipc-types'

function rowToObligation(r: Record<string, unknown>): ObligationDto {
  return {
    id: r.id as number,
    title: r.title as string,
    cadence: (r.cadence as ObligationCadence) ?? '월',
    category: (r.category as ObligationCategory) ?? '기타',
    clauseRef: (r.clause_ref as string) || null,
    owner: (r.owner as string) || null,
    assignee: (r.assignee as string) || null,
    leadDays: (r.lead_days as number) ?? 7,
    anchorDate: (r.anchor_date as string) || null,
    lastDoneDate: (r.last_done_date as string) || null,
    nextDueDate: (r.next_due_date as string) || null,
    formCode: (r.form_code as string) || null,
    active: ((r.active as number) ?? 1) === 1,
    note: (r.note as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

/** YYYY-MM-DD 기준일에서 주기만큼 전진한 다음 도래일. 이행일 기준으로 다음 주기를 잡는다. */
function advanceDate(baseYmd: string, cadence: ObligationCadence): string {
  const d = new Date(baseYmd + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return baseYmd
  switch (cadence) {
    case '일':
      d.setDate(d.getDate() + 1)
      break
    case '주':
      d.setDate(d.getDate() + 7)
      break
    case '월':
      d.setMonth(d.getMonth() + 1)
      break
    case '분기':
      d.setMonth(d.getMonth() + 3)
      break
    case '반기':
      d.setMonth(d.getMonth() + 6)
      break
    case '년':
      d.setMonth(d.getMonth() + 12)
      break
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** 로컬 오늘 날짜 YYYY-MM-DD */
function todayYmd(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function registerObligationHandlers(): void {
  const db = getSqlite()

  // ──── 목록 (도래일 빠른 순, 활성 우선) ────
  ipcMain.handle(IPC_CHANNELS.OBLIGATION_LIST, (): ObligationDto[] => {
    const rows = db
      .prepare(
        `SELECT * FROM recurring_obligations
         ORDER BY active DESC, (next_due_date IS NULL), next_due_date ASC, sort_order ASC, id ASC`
      )
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToObligation)
  })

  // ──── 생성 ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_CREATE,
    (_event, input: ObligationCreateInput): { id: number } => {
      const maxOrder = db
        .prepare('SELECT COALESCE(MAX(sort_order), 0) AS m FROM recurring_obligations')
        .get() as { m: number }
      const res = db
        .prepare(
          `INSERT INTO recurring_obligations
             (title, cadence, category, clause_ref, owner, assignee, lead_days, next_due_date, form_code, active, note, sort_order)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.title?.trim() || '제목 없음',
          input.cadence ?? '월',
          input.category ?? '기타',
          input.clauseRef ?? null,
          input.owner ?? null,
          input.assignee ?? null,
          input.leadDays ?? 7,
          input.nextDueDate ?? null,
          input.formCode ?? null,
          input.active === false ? 0 : 1,
          input.note ?? null,
          (maxOrder.m ?? 0) + 10
        )
      return { id: Number(res.lastInsertRowid) }
    }
  )

  // ──── 수정 (부분 업데이트) ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_UPDATE,
    (_event, input: ObligationUpdateInput): { success: boolean } => {
      const map: Record<string, string> = {
        title: 'title',
        cadence: 'cadence',
        category: 'category',
        clauseRef: 'clause_ref',
        owner: 'owner',
        assignee: 'assignee',
        leadDays: 'lead_days',
        nextDueDate: 'next_due_date',
        formCode: 'form_code',
        active: 'active',
        note: 'note'
      }
      const sets: string[] = []
      const values: unknown[] = []
      for (const [key, col] of Object.entries(map)) {
        if (key in input) {
          const raw = (input as unknown as Record<string, unknown>)[key]
          sets.push(`${col} = ?`)
          values.push(key === 'active' ? (raw ? 1 : 0) : raw ?? null)
        }
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE recurring_obligations SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 삭제 ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_DELETE,
    (_event, { id }: { id: number }): { success: boolean } => {
      db.prepare('DELETE FROM recurring_obligations WHERE id = ?').run(id)
      try {
        db.prepare('DELETE FROM obligation_completions WHERE obligation_id = ?').run(id)
      } catch {
        /* 0063 미적용 구버전 */
      }
      return { success: true }
    }
  )

  // ──── 이행 완료 → 최근이행일 기록 + 다음 도래일 자동 전진 + 이력 적재(0063) ────
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_COMPLETE,
    (
      _event,
      { id, doneDate, doneBy, source }: { id: number; doneDate?: string; doneBy?: string; source?: 'manual' | 'form' }
    ): {
      success: boolean
      nextDueDate: string | null
    } => {
      const row = db
        .prepare('SELECT cadence FROM recurring_obligations WHERE id = ?')
        .get(id) as { cadence: ObligationCadence } | undefined
      if (!row) return { success: false, nextDueDate: null }

      const done = doneDate || todayYmd()
      const next = advanceDate(done, row.cadence)
      db.prepare(
        `UPDATE recurring_obligations
         SET last_done_date = ?, next_due_date = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).run(done, next, id)
      try {
        // 관제탑 홈 주간 추이의 원천 — 같은 날 중복 완료는 1건만 유지
        db.prepare(
          `INSERT INTO obligation_completions (obligation_id, done_date, done_by, source)
           SELECT ?, ?, ?, ?
           WHERE NOT EXISTS (
             SELECT 1 FROM obligation_completions WHERE obligation_id = ? AND done_date = ?
           )`
        ).run(id, done, doneBy ?? null, source === 'form' ? 'form' : 'manual', id, done)
      } catch {
        /* 0063 미적용 구버전 — 이력 없이 동작 */
      }
      return { success: true, nextDueDate: next }
    }
  )

  // 도래일 일괄 재설정(실사용 개시) — 코워크 §0.7 ④. 모든 active 의무의 next_due_date/anchor_date 를
  // 오늘로 맞추고 last_done_date 초기화(오늘부터 관리 시작). 데이터 조작이 아니라 가동 개시일 설정.
  // 완료 이력(obligation_completions)은 보존. 권한 체크는 렌더러(executive/manager만 버튼 노출).
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_RESET_DUE,
    (_event, { by }: { by?: string }): { success: boolean; count: number } => {
      try {
        const today = todayYmd()
        const info = db
          .prepare(
            `UPDATE recurring_obligations
             SET next_due_date = ?, anchor_date = ?, last_done_date = NULL, updated_at = datetime('now')
             WHERE active = 1`
          )
          .run(today, today)
        const count = info.changes
        try {
          db.prepare(
            `INSERT INTO obligation_reset_log (reset_by, affected_count) VALUES (?, ?)`
          ).run(by ?? null, count)
        } catch {
          /* 0086 미적용 구버전 — 이력 없이 동작 */
        }
        return { success: true, count }
      } catch (err) {
        console.error('[obligation:resetDue] failed:', (err as Error).message)
        return { success: false, count: 0 }
      }
    }
  )
}

/**
 * 데이터 트리거 이슈 완료(M3, 15번 §3-2) — ✓는 사람만.
 * 웹 모드에선 doneBy 가 세션 주체로 강제 주입(W3 STAMP_FIELDS)되어 위조 불가.
 * 완료된 건은 불변(§3-3) — 발행/해소표시 상태에서만 전이 허용.
 */
export function registerTriggerIssueHandlers(): void {
  const db = getSqlite()
  ipcMain.handle(
    IPC_CHANNELS.OBLIGATION_TRIGGER_COMPLETE,
    (_e, { issueId, doneBy }: { issueId: number; doneBy?: string }) => {
      try {
        const res = db
          .prepare(
            `UPDATE obligation_trigger_issues
             SET status='완료', completed_at = datetime('now','localtime'), completed_by = ?
             WHERE id = ? AND status IN ('발행','해소표시')`
          )
          .run(doneBy ?? null, issueId)
        return { success: res.changes > 0 }
      } catch (err) {
        console.error('[obligation:triggerComplete] failed:', (err as Error).message)
        return { success: false }
      }
    }
  )
}

/**
 * 이행 매트릭스(17번 §3-2) — 사람(팀 그룹)×최근 14일 칩. 조회 전용·새 테이블 없음.
 * 원천 = recurring_obligations + obligation_completions(0063) + 트리거 대장(M3).
 * 셀 규칙: ✓완료 / 숫자=연체일수(구간 첫 셀만, 이후 ·) / !오늘 해야 / ⚡데이터 / —해당없음.
 * 주말(토·일)은 열에서 제외(오늘이 주말이면 오늘만 포함) — HRMS 근태 문법.
 */
export function registerObligationMatrixHandler(): void {
  const db = getSqlite()
  ipcMain.handle(IPC_CHANNELS.OBLIGATION_MATRIX, (_e, req?: { days?: number }) => {
    const span = Math.min(Math.max(req?.days ?? 14, 7), 31)
    const ymd = (d: Date): string =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = new Date()
    const todayStr = ymd(today)
    const days: string[] = []
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      const wd = d.getDay()
      const s = ymd(d)
      if (s === todayStr || (wd >= 1 && wd <= 5)) days.push(s)
    }
    const start = days[0]

    // 팀 결정 — 관제탑 보드와 동일 규칙(양식 resp_dept 1순위 → owner 정규화)
    const formTeam = new Map<string, TeamId | null>()
    try {
      for (const r of db.prepare('SELECT code, resp_dept FROM forms').all() as Array<{ code: string; resp_dept: string | null }>)
        formTeam.set(r.code, normalizeTeam(r.resp_dept))
    } catch { /* forms 미구성 */ }

    const comps = new Set<string>()
    try {
      for (const r of db
        .prepare('SELECT obligation_id, done_date FROM obligation_completions WHERE done_date >= ?')
        .all(start) as Array<{ obligation_id: number; done_date: string }>)
        comps.add(r.obligation_id + '|' + r.done_date)
    } catch { /* 0063 미적용 */ }

    const teams = new Map<string, { teamId: string | null; label: string; rows: ObligationMatrixRowDto[] }>()
    for (const t of TEAMS) teams.set(t.id, { teamId: t.id, label: teamTheme(t.id).label, rows: [] })
    teams.set('__none__', { teamId: null, label: '팀 미지정', rows: [] })
    const push = (team: TeamId | null, row: ObligationMatrixRowDto): void => {
      teams.get(team ?? '__none__')!.rows.push(row)
    }

    const obs = db
      .prepare(
        `SELECT id, title, owner, assignee, next_due_date, form_code FROM recurring_obligations
         WHERE active = 1 AND trigger_type = 'periodic' ORDER BY next_due_date ASC, sort_order ASC`
      )
      .all() as Array<{ id: number; title: string; owner: string | null; assignee: string | null; next_due_date: string | null; form_code: string | null }>
    for (const o of obs) {
      const team = (o.form_code ? formTeam.get(o.form_code) : null) ?? normalizeOwnerTeam(o.owner ?? '')
      const due = o.next_due_date
      const overdueDays = due && due < todayStr
        ? Math.round((new Date(`${todayStr}T00:00:00`).getTime() - new Date(`${due}T00:00:00`).getTime()) / 86400000)
        : 0
      let firstOverdueMarked = false
      const cells: ObligationMatrixCellDto[] = days.map((d) => {
        if (comps.has(o.id + '|' + d)) return { d, s: 'done' as const }
        if (d === todayStr && due && due <= todayStr) return { d, s: 'due' as const }
        if (due && d >= due && d < todayStr) {
          if (!firstOverdueMarked) {
            firstOverdueMarked = true
            return { d, s: 'overdue' as const, n: overdueDays }
          }
          return { d, s: 'overdue' as const }
        }
        return { d, s: 'na' as const }
      })
      push(team, {
        key: 'ob' + o.id,
        person: o.assignee || o.owner || '팀 공동',
        label: o.title,
        cells
      })
    }

    // 데이터 트리거 행(M3) — 평가는 멱등, 최신 상태 반영
    try {
      evaluateDataTriggers(db, { today: todayStr, mesDataEndYmd: getMesDataEndYmd() })
      const gapByTeam = new Map<TeamId | null, { count: number; oldest: string }>()
      for (const it of listBoardIssues(db, todayStr)) {
        if (it.status === '완료') continue
        if (it.entityKind === 'obligation') {
          if (it.status !== '발행') continue
          const team = (it.obFormCode ? formTeam.get(it.obFormCode) : null) ?? normalizeOwnerTeam(it.obOwner ?? '')
          const cur = gapByTeam.get(team) ?? { count: 0, oldest: it.bucket }
          cur.count++
          if (it.bucket < cur.oldest) cur.oldest = it.bucket
          gapByTeam.set(team, cur)
        } else {
          const team = normalizeTeam(it.teamHint) ?? normalizeOwnerTeam(it.teamHint ?? '')
          push(team, {
            key: 'iss' + it.issueId,
            person: '[데이터]',
            label: `MES 일일 기록 미수신 — ${it.bucket}부터`,
            data: true,
            cells: days.map((d) => ({ d, s: d >= it.bucket ? ('data' as const) : ('na' as const) }))
          })
        }
      }
      for (const [team, agg] of gapByTeam) {
        push(team, {
          key: 'gap' + (team ?? 'none'),
          person: '[데이터]',
          label: `심사 갭 — 장기연체(7일+) ${agg.count}건`,
          data: true,
          cells: days.map((d) => ({ d, s: d >= agg.oldest ? ('data' as const) : ('na' as const) }))
        })
      }
    } catch (err) {
      console.error('[obligation:matrix] 트리거 행 생략:', (err as Error).message)
    }

    const out: ObligationMatrixDto = {
      days,
      today: todayStr,
      teams: [...teams.values()].filter((t) => t.rows.length > 0)
    }
    return out
  })
}
