import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { computeSqReadiness } from './sq-handlers'
import { TEAMS, normalizeTeam, type TeamId } from '@shared/team-theme'
import type { TeamSummaryDto, TeamSqItemDto, SqSignal } from '@shared/ipc-types'

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
          : Math.round((scored.reduce((s, i) => s + SIGNAL_SCORE[i.signal] * i.points, 0) / wsum) * 100)
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
}
