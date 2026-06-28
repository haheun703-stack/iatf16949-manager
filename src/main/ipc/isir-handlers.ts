// ─────────────────────────────────────────────────────────────────────────────
// 품번/ISIR IPC — 부품 단위 통제(관리계획서·ISIR 완비도) read 핸들러 + AI 진단.
//   PARTS_LIST/PART_DETAIL = 결정론 조회. AI_ISIR_* = 완비도(결정론) + 진단(AI).
// ─────────────────────────────────────────────────────────────────────────────
import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { computeIsirCompleteness, explainIsirGap } from '../ai/isir'
import { importIsirBatch } from '../ingest/isir-import'
import type {
  PartListItem,
  PartDetailDto,
  ControlPlanItemDto,
  PartDefectDto,
  IsirCompleteness,
  IsirExplainResponse,
  IsirImportBatchResult
} from '@shared/ipc-types'

interface CpRow {
  seq: number
  process_no: string | null
  process_name: string | null
  char_kind: string | null
  control_item: string | null
  special_char: string | null
  spec: string | null
  method: string | null
  frequency: string | null
  control_method: string | null
  reaction: string | null
  note: string | null
}

function mapCp(r: CpRow): ControlPlanItemDto {
  return {
    seq: r.seq,
    processNo: r.process_no,
    processName: r.process_name,
    charKind: r.char_kind,
    controlItem: r.control_item,
    special: r.special_char,
    spec: r.spec,
    method: r.method,
    frequency: r.frequency,
    controlMethod: r.control_method,
    reaction: r.reaction,
    note: r.note
  }
}

export function registerIsirHandlers(): void {
  const db = getSqlite()

  // ──── 품번 목록(ISIR·관리계획서·불량 카운트 동반) ────
  ipcMain.handle(IPC_CHANNELS.PARTS_LIST, (): PartListItem[] => {
    const rows = db
      .prepare(
        `SELECT p.part_no, p.part_name, p.customer, p.model,
                (SELECT COUNT(*) FROM isir_packages ip WHERE ip.part_no = p.part_no) AS isir_count,
                (SELECT COUNT(*) FROM control_plan_items ci
                   JOIN isir_packages ip2 ON ip2.id = ci.isir_id
                   WHERE ip2.part_no = p.part_no) AS cp_count,
                (SELECT COUNT(*) FROM cases c WHERE c.part_no = p.part_no) AS defect_count
         FROM parts p ORDER BY p.part_no`
      )
      .all() as Array<{
      part_no: string
      part_name: string | null
      customer: string | null
      model: string | null
      isir_count: number
      cp_count: number
      defect_count: number
    }>
    return rows.map((r) => ({
      partNo: r.part_no,
      partName: r.part_name,
      customer: r.customer,
      model: r.model,
      isirCount: r.isir_count,
      cpItemCount: r.cp_count,
      defectCount: r.defect_count
    }))
  })

  // ──── 품번 통합 상세(완비도 + 관리계획서 + 불량 이력) ────
  ipcMain.handle(
    IPC_CHANNELS.PART_DETAIL,
    (_event, { partNo }: { partNo: string }): PartDetailDto | null => {
      const part = db
        .prepare('SELECT part_no, part_name, customer, model, plant FROM parts WHERE part_no = ?')
        .get(partNo) as
        | { part_no: string; part_name: string | null; customer: string | null; model: string | null; plant: string | null }
        | undefined
      if (!part) return null

      const completeness = computeIsirCompleteness(db, partNo)

      // 관리계획서 라인아이템(최신 제출본 기준)
      let controlPlan: ControlPlanItemDto[] = []
      if (completeness.pkg) {
        const cpRows = db
          .prepare(
            `SELECT seq, process_no, process_name, char_kind, control_item, special_char,
                    spec, method, frequency, control_method, reaction, note
             FROM control_plan_items WHERE isir_id = ? ORDER BY seq`
          )
          .all(completeness.pkg.id) as CpRow[]
        controlPlan = cpRows.map(mapCp)
      }

      // 불량 이력(같은 품번 케이스)
      const defects = db
        .prepare(
          `SELECT case_no, title, defect_desc, occurred_date, status
           FROM cases WHERE part_no = ? ORDER BY COALESCE(occurred_date, received_date) DESC`
        )
        .all(partNo) as Array<{
        case_no: string | null
        title: string | null
        defect_desc: string | null
        occurred_date: string | null
        status: string | null
      }>
      const defectDtos: PartDefectDto[] = defects.map((d) => ({
        caseNo: d.case_no,
        title: d.title,
        defectDesc: d.defect_desc,
        occurredDate: d.occurred_date,
        status: d.status
      }))

      return {
        partNo: part.part_no,
        partName: part.part_name,
        customer: part.customer,
        model: part.model,
        plant: part.plant,
        completeness,
        controlPlan,
        defects: defectDtos
      }
    }
  )

  // ──── 런타임 ISIR 배치 임포트(xlsx 다중선택 → 파싱 → 적재 → 1회 재색인) ────
  ipcMain.handle(IPC_CHANNELS.PARTS_IMPORT_ISIR, async (): Promise<IsirImportBatchResult> => {
    const win = BrowserWindow.getFocusedWindow()
    const opts = {
      title: 'ISIR 워크북 선택 (.xlsx) — 여러 개 선택 가능',
      properties: ['openFile' as const, 'multiSelections' as const],
      filters: [{ name: 'Excel 워크북', extensions: ['xlsx'] }]
    }
    const res = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (res.canceled || res.filePaths.length === 0) {
      return { canceled: true, total: 0, clean: 0, partial: 0, failed: 0, results: [] }
    }
    return importIsirBatch(db, res.filePaths)
  })

  // ──── ISIR 완비도(결정론, 무API) ────
  ipcMain.handle(
    IPC_CHANNELS.AI_ISIR_COMPLETENESS,
    (_event, { partNo }: { partNo: string }): IsirCompleteness => computeIsirCompleteness(db, partNo)
  )

  // ──── ISIR 완비도 AI 진단(누락 영향·우선순위, 온디맨드) ────
  ipcMain.handle(
    IPC_CHANNELS.AI_ISIR_EXPLAIN,
    async (_event, { check }: { check: IsirCompleteness }): Promise<IsirExplainResponse> => {
      try {
        const { text, costUsd } = await explainIsirGap(check)
        return { success: true, text, costUsd }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error('[ai:isirExplain] error', msg)
        return { success: false, error: msg }
      }
    }
  )
}
