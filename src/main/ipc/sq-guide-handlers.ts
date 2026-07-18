import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { TEAMS, normalizeTeam, type TeamId } from '@shared/team-theme'
import type {
  SqGuideDto,
  SqGuideCheckpointDto,
  SqCheckpointStatus,
  SqCheckpointUpdateInput,
  SqSuggestedState,
  SqDashboardDto,
  SqDashboardItemDto
} from '@shared/ipc-types'

/**
 * SQ 작성 가이드층 (0064, 코워크 07/08 지시서 재구성).
 * 가이드 = 읽기 전용 마스터(수정 API 없음 — 개정은 JSON 재시드).
 * 체크포인트 상태 → 이행상태는 "제안"일 뿐, 확정은 자체평가에서 사람이(A레일 원칙).
 */

/** 07번 5절 SqStateSuggestionRule — 결정론 분기. '우수'는 개선증빙 수동 플래그(v1 미지원). */
export function suggestState(checkpoints: Array<{ status: SqCheckpointStatus }>): SqSuggestedState {
  if (checkpoints.length === 0) return '미관리'
  const active = checkpoints.filter((c) => c.status !== 'na')
  if (active.length === 0) return '미해당'
  const missing = active.filter((c) => c.status === 'missing').length
  const partial = active.filter((c) => c.status === 'partial').length
  if (missing === active.length) return '미관리' // 기준·실적 모두 없음
  if (missing === 0 && partial === 0) return '양호'
  if (missing === 0) return '보완'
  if (missing <= 2) return '일부미흡' // [대책수립 요청] 문구는 자체평가 화면에서
  return '다수미흡'
}

export function registerSqGuideHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.SQ_GUIDE_GET, (_event, { itemCode }: { itemCode: string }): SqGuideDto | null => {
    try {
      const head = db
        .prepare(
          `SELECT gi.item_code, gi.area, gi.high_value, gi.regulations_text, gi.forms_text,
                  gi.cycle_retention, gi.guide_version, si.title, si.points
           FROM sq_guide_items gi JOIN sq_items si ON si.code = gi.item_code
           WHERE gi.item_code = ?`
        )
        .get(itemCode) as Record<string, unknown> | undefined
      if (!head) return null

      const bullets = db
        .prepare(
          `SELECT id, section, sort_order, content FROM sq_guides
           WHERE item_code = ? ORDER BY section, sort_order`
        )
        .all(itemCode) as Array<{ id: number; section: string; sort_order: number; content: string }>

      const cps = db
        .prepare(
          `SELECT cp.id, cp.guide_id, cp.status, cp.evidence_note, g.content
           FROM sq_checkpoints cp JOIN sq_guides g ON g.id = cp.guide_id
           WHERE cp.item_code = ? ORDER BY g.sort_order`
        )
        .all(itemCode) as Array<Record<string, unknown>>
      const checkpoints: SqGuideCheckpointDto[] = cps.map((r) => ({
        id: r.id as number,
        guideId: r.guide_id as number,
        content: r.content as string,
        status: (r.status as SqCheckpointStatus) || 'missing',
        evidenceNote: (r.evidence_note as string) || null
      }))

      const pick = (section: string): string[] =>
        bullets.filter((b) => b.section === section).map((b) => b.content)

      return {
        itemCode,
        title: (head.title as string) || itemCode,
        area: head.area as string,
        score: (head.points as number) ?? 0,
        highValue: ((head.high_value as number) ?? 0) === 1,
        regulationsText: (head.regulations_text as string) || null,
        formsText: (head.forms_text as string) || null,
        cycleRetention: (head.cycle_retention as string) || null,
        guideVersion: (head.guide_version as string) || 'Ver4',
        checkpoints,
        howToWrite: pick('how_to_write'),
        examples: pick('examples'),
        penaltyPatterns: pick('penalty_patterns'),
        suggestedState: suggestState(checkpoints)
      }
    } catch (err) {
      console.error('[sq:guideGet] failed:', (err as Error).message)
      return null
    }
  })

  // ──── SQ 대시보드 (09 목업 실구현) — 제안 기준 환산점수·등급·영역·Top손실·팀별 ────
  // basis='suggested': 체크리스트 상태 → 계수 환산의 자동 제안치. 확정 점수는 자체평가(Phase B)가 만든다.
  ipcMain.handle(IPC_CHANNELS.SQ_DASHBOARD, (): SqDashboardDto | null => {
    try {
      const coeff = JSON.parse(
        (db.prepare("SELECT value FROM app_config WHERE key='sq.state_coefficients'").get() as { value: string })
          .value
      ) as Record<string, number>
      const gradeRule = JSON.parse(
        (db.prepare("SELECT value FROM app_config WHERE key='sq.grade_rule'").get() as { value: string }).value
      ) as { S: number; G: number }
      const guideVersion =
        (db.prepare("SELECT value FROM app_config WHERE key='sq.guide_version'").get() as { value: string } | undefined)
          ?.value ?? 'Ver4'

      // 항목 마스터 + 가이드 영역
      const items = db
        .prepare(
          `SELECT si.code, si.title, si.points, si.fallback_dept, gi.area
           FROM sq_items si JOIN sq_guide_items gi ON gi.item_code = si.code
           ORDER BY si.code`
        )
        .all() as Array<{ code: string; title: string; points: number; fallback_dept: string | null; area: string }>

      // 체크포인트 상태(항목별)
      const cpRows = db
        .prepare('SELECT item_code, status FROM sq_checkpoints')
        .all() as Array<{ item_code: string; status: SqCheckpointStatus }>
      const cpsByItem = new Map<string, Array<{ status: SqCheckpointStatus }>>()
      const cpTotal = { met: 0, partial: 0, missing: 0, na: 0 }
      for (const r of cpRows) {
        if (!cpsByItem.has(r.item_code)) cpsByItem.set(r.item_code, [])
        cpsByItem.get(r.item_code)!.push({ status: r.status })
        cpTotal[r.status]++
      }

      // 항목 → 팀 (TEAM_SUMMARY 와 동일 원칙: 규정 역산 우선 → fallback_dept)
      const regTeams = new Map<string, Set<TeamId>>()
      for (const r of db
        .prepare('SELECT DISTINCT reg_code, resp_dept FROM forms WHERE resp_dept IS NOT NULL')
        .all() as Array<{ reg_code: string; resp_dept: string }>) {
        const t = normalizeTeam(r.resp_dept)
        if (!t) continue
        if (!regTeams.has(r.reg_code)) regTeams.set(r.reg_code, new Set())
        regTeams.get(r.reg_code)!.add(t)
      }
      const itemRegs = new Map<string, string[]>()
      for (const m of db.prepare('SELECT item_code, reg_code FROM sq_reg_map').all() as Array<{
        item_code: string
        reg_code: string
      }>) {
        if (!itemRegs.has(m.item_code)) itemRegs.set(m.item_code, [])
        itemRegs.get(m.item_code)!.push(m.reg_code)
      }

      // 주담당 규칙(7/19 사장님 지적 — "수입검사 기준 수립은 품질팀"): 복수 책임팀이면
      // SQ 영역의 본질 담당 팀을 주담당(첫 번째)으로 — 심사 영역 구조 그대로라 설명 가능.
      const AREA_PRIMARY: Record<string, TeamId> = {
        생산조건관리: 'saengsan',
        검사시험: 'pumjil',
        설비관리: 'saengsan',
        금형관리: 'saengsan',
        자재관리: 'jajae',
        품질경영체제: 'pumjil'
      }

      const dtoItems: SqDashboardItemDto[] = items.map((it) => {
        const state = suggestState(cpsByItem.get(it.code) ?? [])
        const isNa = state === '미해당'
        const earned = isNa ? 0 : Math.round(it.points * (coeff[state] ?? 0))
        const teams = new Set<TeamId>()
        for (const reg of itemRegs.get(it.code) ?? []) for (const t of regTeams.get(reg) ?? []) teams.add(t)
        if (teams.size === 0 && it.fallback_dept) {
          const fb = normalizeTeam(it.fallback_dept)
          if (fb) teams.add(fb)
        }
        const teamArr = [...teams]
        const pref = AREA_PRIMARY[it.area]
        if (pref && teamArr.includes(pref)) {
          teamArr.splice(teamArr.indexOf(pref), 1)
          teamArr.unshift(pref)
        }
        return {
          code: it.code,
          title: it.title,
          area: it.area,
          score: it.points,
          suggestedState: state,
          earned,
          loss: isNa ? 0 : it.points - earned,
          teams: teamArr
        }
      })

      const naScore = dtoItems.filter((i) => i.suggestedState === '미해당').reduce((s, i) => s + i.score, 0)
      const totalRaw = dtoItems.reduce((s, i) => s + i.earned, 0)
      // 미해당 환산 모드①(분모 제외 비례) — xlsm 확정 전 기본값 (07번 5절)
      const denom = 1000 - naScore
      const totalConverted = denom > 0 ? Math.round((totalRaw / denom) * 1000) : 0
      const grade: SqDashboardDto['grade'] =
        totalConverted >= gradeRule.S ? 'S' : totalConverted >= gradeRule.G ? 'G' : '불합격'

      const AREA_ORDER = ['생산조건관리', '검사시험', '설비관리', '금형관리', '자재관리', '품질경영체제']
      const areas = AREA_ORDER.map((area) => {
        const list = dtoItems.filter((i) => i.area === area)
        return {
          area,
          score: list.reduce((s, i) => s + i.score, 0),
          earned: list.reduce((s, i) => s + i.earned, 0),
          naAll: list.length > 0 && list.every((i) => i.suggestedState === '미해당')
        }
      })

      const topLosses = [...dtoItems].sort((a, b) => b.loss - a.loss).slice(0, 5)

      const byTeam = new Map<TeamId, { loss: number; items: SqDashboardItemDto[] }>()
      for (const t of TEAMS) byTeam.set(t.id, { loss: 0, items: [] })
      const unassigned: SqDashboardItemDto[] = []
      for (const it of dtoItems) {
        if (it.teams.length === 0) {
          if (it.loss > 0) unassigned.push(it)
          continue
        }
        // 복수 책임팀 항목은 주담당(첫 팀)에만 배정 — 팀 카드 중복 표출·손실 이중계상 방지
        // (7/19 사장님 지적: 자재/품질 공동 항목이 두 카드에 다 뜸). 부담당은 teams 배열로 유지(+N 배지).
        const b = byTeam.get(it.teams[0])!
        b.items.push(it)
        b.loss += it.loss
      }
      const teams = [...byTeam.entries()]
        .map(([teamId, v]) => ({
          teamId,
          loss: v.loss,
          items: v.items.filter((i) => i.loss > 0).sort((a, b) => b.loss - a.loss)
        }))
        .filter((t) => t.items.length > 0)
        .sort((a, b) => b.loss - a.loss)

      // 최근 확정 자체평가 — 있으면 대시보드 정본(제안치는 참고 강등)
      let confirmed: SqDashboardDto['confirmed'] = null
      try {
        const c = db
          .prepare(
            `SELECT id, assessed_at, total_score, grade FROM sq_assessments
             WHERE total_score IS NOT NULL ORDER BY created_at DESC LIMIT 1`
          )
          .get() as Record<string, unknown> | undefined
        if (c) {
          confirmed = {
            id: c.id as string,
            assessedAt: c.assessed_at as string,
            totalScore: c.total_score as number,
            grade: c.grade as string
          }
        }
      } catch {
        /* 0064 미구성 */
      }

      return {
        basis: 'suggested',
        guideVersion,
        totalRaw,
        naScore,
        totalConverted,
        grade,
        gradeRule,
        checkpoint: cpTotal,
        areas,
        topLosses,
        teams,
        unassigned: unassigned.sort((a, b) => b.loss - a.loss),
        confirmed
      }
    } catch (err) {
      console.error('[sq:dashboard] failed:', (err as Error).message)
      return null
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.SQ_CHECKPOINT_UPDATE,
    (_event, input: SqCheckpointUpdateInput): { success: boolean; suggestedState: SqSuggestedState } => {
      try {
        const row = db.prepare('SELECT item_code FROM sq_checkpoints WHERE id = ?').get(input.checkpointId) as
          | { item_code: string }
          | undefined
        if (!row) return { success: false, suggestedState: '미관리' }
        const sets: string[] = ["status = ?", "updated_at = datetime('now')"]
        const vals: unknown[] = [input.status]
        if ('evidenceNote' in input) {
          sets.push('evidence_note = ?')
          vals.push(input.evidenceNote ?? null)
        }
        if (input.updatedBy) {
          sets.push('updated_by = ?')
          vals.push(input.updatedBy)
        }
        vals.push(input.checkpointId)
        db.prepare(`UPDATE sq_checkpoints SET ${sets.join(', ')} WHERE id = ?`).run(...vals)

        const cps = db
          .prepare('SELECT status FROM sq_checkpoints WHERE item_code = ?')
          .all(row.item_code) as Array<{ status: SqCheckpointStatus }>
        return { success: true, suggestedState: suggestState(cps) }
      } catch (err) {
        console.error('[sq:checkpointUpdate] failed:', (err as Error).message)
        return { success: false, suggestedState: '미관리' }
      }
    }
  )
}
