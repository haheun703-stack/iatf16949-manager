import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type { ProcessFlowDto, ProcessFlowPartDto, ProcessFlowStepDto, ProcessFlowSymbol } from '@shared/ipc-types'

/**
 * 공정 흐름 맵 (C군 2배치 선두) — CP(관리계획서)→라우팅 파이프라인(source='cp') 조회 전용.
 * 화면이 곧 산출물: 인쇄 출력이 ISIR 26종 중 #14 '공정 흐름도'(J1100-02 준용)를 해소한다.
 * 데이터 갱신 = ISIR 재적재 → semimes-seed.cjs 재실행 (일회성 복사 없음).
 */

/** 공정흐름도 기호 관례 분류 — 공정명 휴리스틱(품질팀이 출력물에서 검토·정정 가능한 제안값) */
function classifySymbol(procName: string, outYn: number): ProcessFlowSymbol {
  if (/입고|수입/.test(procName)) return '입고'
  if (/검사|TEST|테스트/i.test(procName)) return '검사'
  if (outYn || /포장|출하/.test(procName)) return '출하'
  return '가공'
}

export function registerProcessFlowHandlers(): void {
  const db = getSqlite()

  function hasCore(): boolean {
    try {
      db.prepare('SELECT 1 FROM routing_step LIMIT 1').get()
      return true
    } catch {
      return false
    }
  }

  ipcMain.handle(IPC_CHANNELS.PROCESS_FLOW_LIST, (): ProcessFlowPartDto[] => {
    if (!hasCore()) return []
    const primary =
      (db.prepare(`SELECT value FROM app_config WHERE key='audit.primaryPartNo'`).get() as { value: string } | undefined)
        ?.value ?? null
    const rows = db
      .prepare(
        `SELECT r.item_code AS partNo, COUNT(*) AS stepCount, p.part_name, p.customer, p.model
         FROM routing_step r
         LEFT JOIN parts p ON p.part_no = r.item_code
         WHERE r.source = 'cp' AND r.active = 1
         GROUP BY r.item_code ORDER BY r.item_code`
      )
      .all() as { partNo: string; stepCount: number; part_name: string | null; customer: string | null; model: string | null }[]
    return rows.map((r) => ({
      partNo: r.partNo,
      partName: r.part_name,
      customer: r.customer,
      model: r.model,
      stepCount: r.stepCount,
      isPrimary: r.partNo === primary
    }))
  })

  ipcMain.handle(IPC_CHANNELS.PROCESS_FLOW_GET, (_e, { partNo }: { partNo: string }): ProcessFlowDto | null => {
    if (!hasCore() || !partNo) return null
    const head = db
      .prepare(
        `SELECT p.part_no, p.part_name, p.customer, p.model, i.rev_code, i.rev_date, i.qa_manager, i.id AS isir_id
         FROM parts p
         LEFT JOIN isir_packages i ON i.part_no = p.part_no
         WHERE p.part_no = ? ORDER BY i.id DESC LIMIT 1`
      )
      .get(partNo) as
      | { part_no: string; part_name: string | null; customer: string | null; model: string | null; rev_code: string | null; rev_date: string | null; qa_manager: string | null; isir_id: number | null }
      | undefined
    if (!head) return null

    const stepRows = db
      .prepare(
        `SELECT r.seq, r.proc_code, r.out_yn, m.proc_name, m.proc_type, m.insp_form_code, f.name AS insp_form_name
         FROM routing_step r
         LEFT JOIN process_master m ON m.proc_code = r.proc_code
         LEFT JOIN forms f ON f.code = m.insp_form_code
         WHERE r.item_code = ? AND r.source = 'cp' AND r.active = 1
         ORDER BY r.seq`
      )
      .all(partNo) as { seq: number; proc_code: string; out_yn: number; proc_name: string | null; proc_type: string | null; insp_form_code: string | null; insp_form_name: string | null }[]

    const cpByStep = new Map<number, ProcessFlowStepDto['controlItems']>()
    if (head.isir_id != null) {
      const cpRows = db
        .prepare(
          `SELECT CAST(process_no AS INTEGER) AS seq, control_item, method, frequency, equipment
           FROM control_plan_items
           WHERE isir_id = ? AND process_no GLOB '[0-9]*' ORDER BY seq, id`
        )
        .all(head.isir_id) as { seq: number; control_item: string | null; method: string | null; frequency: string | null; equipment: string | null }[]
      for (const r of cpRows) {
        const list = cpByStep.get(r.seq) ?? []
        list.push({ item: r.control_item, method: r.method, frequency: r.frequency, equipment: r.equipment })
        cpByStep.set(r.seq, list)
      }
    }

    const steps: ProcessFlowStepDto[] = stepRows.map((r) => {
      const name = r.proc_name ?? r.proc_code
      return {
        seq: r.seq,
        procCode: r.proc_code,
        procName: name,
        procType: r.proc_type ?? '사내',
        inspFormCode: r.insp_form_code,
        inspFormName: r.insp_form_name ? r.insp_form_name.trim() : null,
        outYn: r.out_yn,
        symbol: classifySymbol(name, r.out_yn),
        controlItems: cpByStep.get(r.seq) ?? []
      }
    })

    return {
      partNo: head.part_no,
      partName: head.part_name,
      customer: head.customer,
      model: head.model,
      revCode: head.rev_code,
      revDate: head.rev_date,
      qaManager: head.qa_manager,
      steps
    }
  })
}
