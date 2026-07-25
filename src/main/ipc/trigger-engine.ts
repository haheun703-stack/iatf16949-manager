import type Database from 'better-sqlite3'

/**
 * 데이터→할 일 변환 엔진 (15번 §3, M3) — "국내 SME MES에 없는 계층".
 *
 * 4규칙 구현:
 *  1) 발행: 트리거 충족 시 1건 — 중복 방지 = UNIQUE(trigger_id, entity_key, due_bucket)
 *     + INSERT OR IGNORE. 같은 엔티티·같은 버킷은 몇 번을 평가해도 1건.
 *  2) 소멸: 원천 데이터가 해소해도 자동 완료 금지 — status='해소표시'(resolved_mark_at)만.
 *     ✓(완료)는 사람의 OBLIGATION_TRIGGER_COMPLETE 뿐. (12번 "작성기록으로만 ✓" 정합)
 *  3) 취소: 원천 정정으로 조건이 소급 소멸하면 미완료 건만 자동 취소(cancel_reason 필수).
 *     완료된 건은 불변 — 기록은 지우지 않는다.
 *  4) 배정: 팀 단위 발행 기본(개인 자동 지정 금지) — 팀 결정은 보드 합류부(team-handlers)가
 *     기존 의무와 같은 규칙(양식 resp_dept → owner 정규화)으로 수행.
 *
 * 평가 시점: 관제탑 보드 조회 시(lazy·결정론·멱등). 별도 엔진/스케줄러 없음 — 15번 §1-3.
 * 1차 트리거(코워크 7/25 승인): 심사 갭(의무 장기연체) · 증거 공백(MES 일일 기록 미수신).
 * insp_due·mold_count·nonconform 은 기록 데이터 축적 후(M1 이후) 활성화.
 */

/** T1: 연체가 이 일수를 넘으면 '심사 갭'으로 승격(일상 연체와 구분 — 보드 중복 방지) */
const DEFAULT_OVERDUE_DAYS = 7

interface TriggerRow {
  id: number
  trigger_kind: string
  entity_kind: string | null
  config_json: string | null
  team: string | null
}

/** 내장 트리거 2종 보장 — 코어 기능(팩 시드 아님)이라 코드가 정본. 멱등. */
export function ensureBuiltinTriggers(db: Database.Database): void {
  const has = db.prepare(
    `SELECT id FROM obligation_triggers WHERE trigger_kind = 'audit_gap' AND entity_kind = ?`
  )
  const ins = db.prepare(
    `INSERT INTO obligation_triggers (trigger_kind, title, entity_kind, entity_key, config_json, team)
     VALUES ('audit_gap', ?, ?, NULL, ?, ?)`
  )
  if (!has.get('obligation')) {
    ins.run('심사 갭 — 의무 장기 연체', 'obligation', JSON.stringify({ overdueDays: DEFAULT_OVERDUE_DAYS }), null)
  }
  if (!has.get('mes-feed')) {
    ins.run('증거 공백 — MES 일일 기록 미수신', 'mes-feed', '{}', '생산팀')
  }
}

function ymdAddDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00`)
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 트리거 평가 — 발행/해소표시/취소 상태 전이(멱등). 보드 조회 직전에 호출.
 * @param mesDataEndYmd 사이드카(mes_records.db) 최신 데이터 일자 — null 이면 T2 평가 불가(전이 없음)
 */
export function evaluateDataTriggers(
  db: Database.Database,
  ctx: { today: string; mesDataEndYmd: string | null }
): void {
  ensureBuiltinTriggers(db)
  const triggers = db
    .prepare(`SELECT id, trigger_kind, entity_kind, config_json, team FROM obligation_triggers WHERE active = 1`)
    .all() as TriggerRow[]

  const issue = db.prepare(
    `INSERT OR IGNORE INTO obligation_trigger_issues (trigger_id, entity_key, due_bucket) VALUES (?, ?, ?)`
  )
  const openIssues = db.prepare(
    `SELECT id, entity_key, due_bucket, status FROM obligation_trigger_issues
     WHERE trigger_id = ? AND status IN ('발행','해소표시')`
  )
  const markResolved = db.prepare(
    `UPDATE obligation_trigger_issues
     SET status='해소표시', resolved_mark_at = COALESCE(resolved_mark_at, datetime('now','localtime'))
     WHERE id = ? AND status = '발행'`
  )
  const cancel = db.prepare(
    `UPDATE obligation_trigger_issues
     SET status='취소', canceled_at = datetime('now','localtime'), cancel_reason = ?
     WHERE id = ? AND status IN ('발행','해소표시')`
  )

  for (const t of triggers) {
    if (t.trigger_kind !== 'audit_gap') continue // insp_due·mold_count·nonconform = M1 이후

    if (t.entity_kind === 'obligation') {
      // ── T1: 의무 장기 연체 = 심사 갭 ──
      let overdueDays = DEFAULT_OVERDUE_DAYS
      try {
        const c = JSON.parse(t.config_json ?? '{}') as { overdueDays?: number }
        if (Number.isFinite(c.overdueDays)) overdueDays = c.overdueDays!
      } catch {
        /* 설정 파손 시 기본값 */
      }
      const threshold = ymdAddDays(ctx.today, -overdueDays)
      const obs = db
        .prepare(
          `SELECT id, active, next_due_date, last_done_date FROM recurring_obligations
           WHERE trigger_type = 'periodic'`
        )
        .all() as Array<{ id: number; active: number; next_due_date: string | null; last_done_date: string | null }>
      const byId = new Map(obs.map((o) => [String(o.id), o]))

      // 발행 (중복 방지 = UNIQUE + OR IGNORE)
      for (const o of obs) {
        if (o.active === 1 && o.next_due_date && o.next_due_date <= threshold) {
          issue.run(t.id, String(o.id), o.next_due_date)
        }
      }
      // 전이
      for (const it of openIssues.all(t.id) as Array<{ id: number; entity_key: string; due_bucket: string; status: string }>) {
        const o = byId.get(it.entity_key)
        if (!o || o.active !== 1) {
          cancel.run('의무 비활성/삭제', it.id)
        } else if (o.last_done_date && o.last_done_date >= it.due_bucket) {
          markResolved.run(it.id) // 의무가 이행됨 — 표시만, ✓는 사람
        } else if (o.next_due_date !== it.due_bucket) {
          cancel.run(`도래일 정정 (${it.due_bucket} → ${o.next_due_date ?? '없음'})`, it.id)
        }
      }
    } else if (t.entity_kind === 'mes-feed') {
      // ── T2: MES 일일 기록 미수신 = 증거 공백 ──
      if (!ctx.mesDataEndYmd) continue // 사이드카 없음 — 평가 불가(발행도 취소도 안 함)
      const expected = ymdAddDays(ctx.today, -1) // 어제까지의 기록은 있어야 함
      if (ctx.mesDataEndYmd < expected) {
        // 버킷 = 공백 시작일(최신 데이터 다음 날) — 공백 1구간 = 이슈 1건 (일별 스팸 방지)
        issue.run(t.id, 'mes-feed', ymdAddDays(ctx.mesDataEndYmd, 1))
      }
      for (const it of openIssues.all(t.id) as Array<{ id: number; due_bucket: string }>) {
        if (ctx.mesDataEndYmd >= it.due_bucket) markResolved.run(it.id)
      }
    }
  }
}

export interface BoardIssueRow {
  issueId: number
  entityKind: string
  entityKey: string
  bucket: string
  status: '발행' | '해소표시' | '완료'
  teamHint: string | null
  completedAt: string | null
  completedBy: string | null
  /** T1 전용 — 연결 의무 정보(보드 팀 결정·제목용) */
  obTitle: string | null
  obOwner: string | null
  obFormCode: string | null
}

/** 보드 표출 대상: 열린 이슈 전부 + 오늘 완료된 이슈(당일 ✓ 표시). 취소는 미표출. */
export function listBoardIssues(db: Database.Database, today: string): BoardIssueRow[] {
  return db
    .prepare(
      `SELECT i.id AS issueId, t.entity_kind AS entityKind, i.entity_key AS entityKey,
              i.due_bucket AS bucket, i.status AS status, t.team AS teamHint,
              i.completed_at AS completedAt, i.completed_by AS completedBy,
              ro.title AS obTitle, ro.owner AS obOwner, ro.form_code AS obFormCode
       FROM obligation_trigger_issues i
       JOIN obligation_triggers t ON t.id = i.trigger_id
       LEFT JOIN recurring_obligations ro
         ON t.entity_kind = 'obligation' AND ro.id = CAST(i.entity_key AS INTEGER)
       WHERE i.status IN ('발행','해소표시') OR (i.status = '완료' AND date(i.completed_at) = ?)
       ORDER BY i.due_bucket ASC`
    )
    .all(today) as BoardIssueRow[]
}
