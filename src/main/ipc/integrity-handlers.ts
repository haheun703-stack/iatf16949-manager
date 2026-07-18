import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { normalizeTeam, normalizeOwnerTeam } from '@shared/team-theme'
import type { IntegrityCheckRow, IntegrityReportDto } from '@shared/ipc-types'

/**
 * 정합성 점검 (2026-07-19 사장님 발제 — "검증·검수를 체계로").
 * 팀→프로세스→규정→양식→의무→SQ 체인의 결정론 검사 10종.
 * 원칙: 결정론이 정본, AI 검수 에이전트(.claude/agents/integrity-auditor)는
 * 이 결과를 근거로만 판단한다. 검사 추가 시 이 파일 + 에이전트 정의 동기 갱신.
 */

const VALID_CADENCE = new Set(['일', '주', '월', '분기', '반기', '년'])
const DETAIL_MAX = 20

function row(
  key: string,
  name: string,
  details: string[],
  note: string,
  warnOnly = false
): IntegrityCheckRow {
  return {
    key,
    name,
    status: details.length === 0 ? 'ok' : warnOnly ? 'warn' : 'fail',
    count: details.length,
    details: details.slice(0, DETAIL_MAX),
    note
  }
}

export function registerIntegrityHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.INTEGRITY_CHECK, (): IntegrityReportDto => {
    const rows: IntegrityCheckRow[] = []

    // ① 양식 책임팀 매핑 — resp_dept 가 5팀으로 정규화되는가
    {
      const bad: string[] = []
      for (const r of db
        .prepare(
          `SELECT COALESCE(resp_dept,'(공란)') d, COUNT(*) n FROM forms WHERE deprecated=0 GROUP BY resp_dept`
        )
        .all() as Array<{ d: string; n: number }>) {
        if (!normalizeTeam(r.d)) bad.push(`${r.d} (${r.n}건)`)
      }
      rows.push(row('forms-team', '양식 책임팀 매핑', bad, 'forms.resp_dept 전값이 5팀으로 정규화돼야 함'))
    }

    // ② 규정 팀 부재 — 규정(지침)에 소속 팀이 하나도 없는가
    {
      const regTeam = new Map<string, boolean>()
      for (const r of db
        .prepare(`SELECT reg_code, resp_dept FROM forms WHERE deprecated=0`)
        .all() as Array<{ reg_code: string; resp_dept: string | null }>) {
        const has = regTeam.get(r.reg_code) ?? false
        regTeam.set(r.reg_code, has || !!normalizeTeam(r.resp_dept))
      }
      const bad = [...regTeam.entries()].filter(([, ok]) => !ok).map(([k]) => k)
      rows.push(row('reg-team', '규정별 소속 팀 존재', bad, '규정마다 최소 1개 팀 필요(팀별 허브 표출 조건)'))
    }

    // ③ 프로세스 주관팀 — bom_documents.owner_dept 매핑
    {
      const bad: string[] = []
      for (const r of db
        .prepare(
          `SELECT p.code, b.owner_dept FROM processes p LEFT JOIN bom_documents b ON b.doc_no_raw = p.code`
        )
        .all() as Array<{ code: string; owner_dept: string | null }>) {
        if (!normalizeTeam(r.owner_dept)) bad.push(`${r.code} (owner=${r.owner_dept ?? '없음'})`)
      }
      rows.push(row('process-team', '프로세스 주관팀 매핑', bad, '9개 프로세스의 BOM owner_dept → 5팀'))
    }

    // ④ 프로세스↔양식 고아 연결
    {
      const bad = (
        db
          .prepare(
            `SELECT pf.process_code || '→' || pf.form_code k FROM process_forms pf
             LEFT JOIN forms f ON f.code = pf.form_code WHERE f.code IS NULL`
          )
          .all() as Array<{ k: string }>
      ).map((r) => r.k)
      rows.push(row('pf-orphan', '프로세스↔양식 고아 연결', bad, 'process_forms 가 참조하는 양식이 마스터에 실존해야 함'))
    }

    // ⑤ 정기 의무 owner 매핑
    {
      const bad: string[] = []
      for (const r of db
        .prepare(`SELECT owner, COUNT(*) n FROM recurring_obligations GROUP BY owner`)
        .all() as Array<{ owner: string | null; n: number }>) {
        if (!normalizeOwnerTeam(r.owner)) bad.push(`${r.owner ?? '(공란)'} (${r.n}건)`)
      }
      rows.push(row('obligation-team', '정기 의무 팀 배정', bad, 'owner 전값이 5팀으로 정규화(관제탑 보드 조건)'))
    }

    // ⑥ SQ 항목 팀 미배정 — 규정 경유 + fallback 모두 없음
    {
      const regTeams = new Map<string, boolean>()
      for (const r of db
        .prepare(`SELECT DISTINCT reg_code, resp_dept FROM forms WHERE resp_dept IS NOT NULL`)
        .all() as Array<{ reg_code: string; resp_dept: string }>) {
        if (normalizeTeam(r.resp_dept)) regTeams.set(r.reg_code, true)
      }
      const itemRegs = new Map<string, string[]>()
      for (const m of db.prepare(`SELECT item_code, reg_code FROM sq_reg_map`).all() as Array<{
        item_code: string
        reg_code: string
      }>) {
        if (!itemRegs.has(m.item_code)) itemRegs.set(m.item_code, [])
        itemRegs.get(m.item_code)!.push(m.reg_code)
      }
      const bad: string[] = []
      for (const it of db.prepare(`SELECT code, fallback_dept FROM sq_items`).all() as Array<{
        code: string
        fallback_dept: string | null
      }>) {
        const viaReg = (itemRegs.get(it.code) ?? []).some((rc) => regTeams.get(rc))
        if (!viaReg && !normalizeTeam(it.fallback_dept)) bad.push(it.code)
      }
      rows.push(row('sq-team', 'SQ 항목 팀 배정', bad, '규정 경유 또는 fallback_dept 로 팀 산출 가능해야 함'))
    }

    // ⑦ 의무 form_code 중복 연결 (0071 함정 — auto-done 오검)
    {
      const bad = (
        db
          .prepare(
            `SELECT form_code || ' (' || COUNT(*) || '건)' k FROM recurring_obligations
             WHERE form_code IS NOT NULL GROUP BY form_code HAVING COUNT(*) > 1`
          )
          .all() as Array<{ k: string }>
      ).map((r) => r.k)
      rows.push(row('obligation-dup-form', '의무 양식 중복 연결 금지', bad, '같은 form_code 2건 이상 연결 시 auto-done 오검(0071 함정)'))
    }

    // ⑧ cadence 유효값
    {
      const bad = (
        db.prepare(`SELECT DISTINCT cadence FROM recurring_obligations`).all() as Array<{ cadence: string }>
      )
        .filter((r) => !VALID_CADENCE.has(r.cadence))
        .map((r) => r.cadence)
      rows.push(row('cadence', '의무 주기값 유효성', bad, "허용값: 일·주·월·분기·반기·년 (advanceDate 와 세트)"))
    }

    // ⑨ SQ 제목 ↔ AI 검색(kb) 동기 — 개명 시 인덱스 누락 감지 (0080 선례)
    {
      const bad = (
        db
          .prepare(
            `SELECT si.code || ': ' || si.title k FROM sq_items si
             JOIN kb_chunks kc ON kc.kind='sq_item' AND kc.ref_key = si.code
             WHERE kc.title <> si.title`
          )
          .all() as Array<{ k: string }>
      ).map((r) => r.k)
      rows.push(row('kb-sync', 'SQ 제목↔AI 검색 인덱스 동기', bad, '항목 개명 시 kb_chunks/kb_fts 동기 필요(0080 선례)', true))
    }

    // ⑩ sq_reg_map 참조 무결성
    {
      const bad = (
        db
          .prepare(
            `SELECT DISTINCT m.reg_code FROM sq_reg_map m
             LEFT JOIN forms f ON f.reg_code = m.reg_code WHERE f.reg_code IS NULL`
          )
          .all() as Array<{ reg_code: string }>
      ).map((r) => r.reg_code)
      rows.push(row('sqmap-ref', 'SQ↔규정 매핑 참조 무결성', bad, 'sq_reg_map 이 참조하는 규정이 양식 마스터에 실존해야 함', true))
    }

    const totals = {
      ok: rows.filter((r) => r.status === 'ok').length,
      warn: rows.filter((r) => r.status === 'warn').length,
      fail: rows.filter((r) => r.status === 'fail').length
    }
    return { ranAt: new Date().toISOString(), totals, rows }
  })
}
