import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { exportFmeaXlsx } from '../docgen/fmea-export'
import type {
  FmeaDocDto,
  FmeaRowDto,
  FmeaBoardDto,
  FmeaDocStatus,
  FmeaDocCreateInput,
  FmeaDocUpdateInput,
  FmeaRowUpdateInput
} from '@shared/ipc-types'
import { computeActionPriority } from '@shared/fmea-ap'

function rowToDoc(r: Record<string, unknown>): FmeaDocDto {
  return {
    id: r.id as number,
    fmeaNo: r.fmea_no as string,
    partName: (r.part_name as string) || null,
    partNo: (r.part_no as string) || null,
    procOwner: (r.proc_owner as string) || null,
    model: (r.model as string) || null,
    customer: (r.customer as string) || null,
    author: (r.author as string) || null,
    reviewer: (r.reviewer as string) || null,
    approver: (r.approver as string) || null,
    dueDate: (r.due_date as string) || null,
    mpDate: (r.mp_date as string) || null,
    teamMembers: (r.team_members as string) || null,
    revisionNote: (r.revision_note as string) || null,
    status: (r.status as FmeaDocStatus) ?? 'draft',
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string
  }
}

function mul(a: number | null, b: number | null, c: number | null): number | null {
  if (a == null || b == null || c == null) return null
  return a * b * c
}

function rowToRow(r: Record<string, unknown>): FmeaRowDto {
  const num = (k: string): number | null => (r[k] == null ? null : (r[k] as number))
  const severity = num('severity')
  const occurrence = num('occurrence')
  const detection = num('detection')
  const reSeverity = num('re_severity')
  const reOccurrence = num('re_occurrence')
  const reDetection = num('re_detection')
  return {
    id: r.id as number,
    docId: r.doc_id as number,
    seq: r.seq as number,
    procItem: (r.proc_item as string) || null,
    procStep: (r.proc_step as string) || null,
    procElement: (r.proc_element as string) || null,
    funcItem: (r.func_item as string) || null,
    funcStep: (r.func_step as string) || null,
    funcElement: (r.func_element as string) || null,
    failureEffect: (r.failure_effect as string) || null,
    severity,
    failureMode: (r.failure_mode as string) || null,
    failureCause: (r.failure_cause as string) || null,
    preventionCtrl: (r.prevention_ctrl as string) || null,
    occurrence,
    detectionCtrl: (r.detection_ctrl as string) || null,
    detection,
    // AP는 S·O·D에서 부표4 기준으로 자동 산출(저장값 무시 — 결정론적)
    actionPriority: computeActionPriority(severity, occurrence, detection),
    specialChar: (r.special_char as string) || null,
    preventionAction: (r.prevention_action as string) || null,
    detectionAction: (r.detection_action as string) || null,
    responsible: (r.responsible as string) || null,
    dueDate: (r.due_date as string) || null,
    actionStatus: (r.action_status as string) || null,
    evidence: (r.evidence as string) || null,
    completedDate: (r.completed_date as string) || null,
    reSeverity,
    reOccurrence,
    reDetection,
    specialProdChar: (r.special_prod_char as string) || null,
    reActionPriority: computeActionPriority(reSeverity, reOccurrence, reDetection),
    note: (r.note as string) || null,
    sortOrder: (r.sort_order as number) ?? 0,
    rpn: mul(severity, occurrence, detection),
    reRpn: mul(reSeverity, reOccurrence, reDetection)
  }
}

// FmeaRowUpdateInput key → DB column 화이트리스트
const ROW_COL: Record<string, string> = {
  procItem: 'proc_item',
  procStep: 'proc_step',
  procElement: 'proc_element',
  funcItem: 'func_item',
  funcStep: 'func_step',
  funcElement: 'func_element',
  failureEffect: 'failure_effect',
  severity: 'severity',
  failureMode: 'failure_mode',
  failureCause: 'failure_cause',
  preventionCtrl: 'prevention_ctrl',
  occurrence: 'occurrence',
  detectionCtrl: 'detection_ctrl',
  detection: 'detection',
  specialChar: 'special_char',
  preventionAction: 'prevention_action',
  detectionAction: 'detection_action',
  responsible: 'responsible',
  dueDate: 'due_date',
  actionStatus: 'action_status',
  evidence: 'evidence',
  completedDate: 'completed_date',
  reSeverity: 're_severity',
  reOccurrence: 're_occurrence',
  reDetection: 're_detection',
  specialProdChar: 'special_prod_char',
  note: 'note'
}

export function registerFmeaHandlers(): void {
  const db = getSqlite()

  // ──── 문서 목록 ────
  ipcMain.handle(IPC_CHANNELS.FMEA_DOC_LIST, (): FmeaDocDto[] => {
    const rows = db
      .prepare('SELECT * FROM fmea_documents ORDER BY created_at DESC, id DESC')
      .all() as Array<Record<string, unknown>>
    return rows.map(rowToDoc)
  })

  // ──── 보드 (문서 + 행 + 요약) ────
  ipcMain.handle(
    IPC_CHANNELS.FMEA_BOARD,
    (_event, { docId }: { docId: number }): FmeaBoardDto | null => {
      const doc = db
        .prepare('SELECT * FROM fmea_documents WHERE id = ?')
        .get(docId) as Record<string, unknown> | undefined
      if (!doc) return null
      const rawRows = db
        .prepare('SELECT * FROM fmea_rows WHERE doc_id = ? ORDER BY seq ASC, id ASC')
        .all(docId) as Array<Record<string, unknown>>
      const rows = rawRows.map(rowToRow)
      const total = rows.length
      const highAp = rows.filter((r) => r.actionPriority === 'H').length
      const rpns = rows.map((r) => r.rpn).filter((v): v is number => v != null)
      const avgRpn = rpns.length ? Math.round(rpns.reduce((a, b) => a + b, 0) / rpns.length) : 0
      return { doc: rowToDoc(doc), rows, summary: { total, highAp, avgRpn } }
    }
  )

  // ──── 문서 생성 ────
  ipcMain.handle(
    IPC_CHANNELS.FMEA_DOC_CREATE,
    (_event, input: FmeaDocCreateInput): { id: number } => {
      const res = db
        .prepare(
          `INSERT INTO fmea_documents (fmea_no, part_name, part_no, proc_owner, model, customer, author, team_members)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          input.fmeaNo?.trim() || 'PFMEA-NEW-001',
          input.partName ?? null,
          input.partNo ?? null,
          input.procOwner ?? null,
          input.model ?? null,
          input.customer ?? null,
          input.author ?? null,
          input.teamMembers ?? null
        )
      return { id: Number(res.lastInsertRowid) }
    }
  )

  // ──── 문서 헤더 수정 ────
  ipcMain.handle(
    IPC_CHANNELS.FMEA_DOC_UPDATE,
    (_event, input: FmeaDocUpdateInput): { success: boolean } => {
      const map: Record<string, string> = {
        fmeaNo: 'fmea_no',
        partName: 'part_name',
        partNo: 'part_no',
        procOwner: 'proc_owner',
        model: 'model',
        customer: 'customer',
        author: 'author',
        reviewer: 'reviewer',
        approver: 'approver',
        dueDate: 'due_date',
        mpDate: 'mp_date',
        teamMembers: 'team_members',
        revisionNote: 'revision_note',
        status: 'status'
      }
      const sets: string[] = []
      const values: unknown[] = []
      for (const [key, col] of Object.entries(map)) {
        if (key in input) {
          sets.push(`${col} = ?`)
          values.push((input as unknown as Record<string, unknown>)[key] ?? null)
        }
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE fmea_documents SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 행 추가 (빈 행) ────
  ipcMain.handle(IPC_CHANNELS.FMEA_ROW_CREATE, (_event, { docId }: { docId: number }): { id: number } => {
    const m = db
      .prepare('SELECT COALESCE(MAX(seq), 0) AS s FROM fmea_rows WHERE doc_id = ?')
      .get(docId) as { s: number }
    const nextSeq = (m.s ?? 0) + 1
    const res = db
      .prepare('INSERT INTO fmea_rows (doc_id, seq, sort_order) VALUES (?, ?, ?)')
      .run(docId, nextSeq, nextSeq * 10)
    return { id: Number(res.lastInsertRowid) }
  })

  // ──── 행 부분 수정 (화이트리스트) ────
  ipcMain.handle(
    IPC_CHANNELS.FMEA_ROW_UPDATE,
    (_event, input: FmeaRowUpdateInput): { success: boolean } => {
      const sets: string[] = []
      const values: unknown[] = []
      for (const [key, col] of Object.entries(ROW_COL)) {
        if (key in input) {
          sets.push(`${col} = ?`)
          values.push((input as unknown as Record<string, unknown>)[key] ?? null)
        }
      }
      if (sets.length === 0) return { success: false }
      sets.push("updated_at = datetime('now')")
      values.push(input.id)
      db.prepare(`UPDATE fmea_rows SET ${sets.join(', ')} WHERE id = ?`).run(...values)
      return { success: true }
    }
  )

  // ──── 행 삭제 ────
  ipcMain.handle(IPC_CHANNELS.FMEA_ROW_DELETE, (_event, { id }: { id: number }): { success: boolean } => {
    db.prepare('DELETE FROM fmea_rows WHERE id = ?').run(id)
    return { success: true }
  })

  // ──── 신판 시트(J1101-01) 공식 xlsx 출력 ────
  ipcMain.handle(IPC_CHANNELS.FMEA_EXPORT_XLSX, async (_event, { docId }: { docId: number }) => {
    const doc = db.prepare('SELECT fmea_no FROM fmea_documents WHERE id = ?').get(docId) as
      | { fmea_no: string }
      | undefined
    // M-1 동반(8/13 검수): 웹 모드는 창 스텁이 null — 조기 반환하면 shim 경로 주입까지
    // 못 가서 다운로드가 영구 불능이었다. kpi 핸들러 패턴(win 분기)으로 정정.
    const win = BrowserWindow.getFocusedWindow()
    const dialogOpts = {
      title: '공정 FMEA 신판 시트 출력',
      defaultPath: `${doc?.fmea_no || 'PFMEA'}.xlsx`,
      filters: [{ name: 'Excel 파일', extensions: ['xlsx'] }]
    }
    const save = win ? await dialog.showSaveDialog(win, dialogOpts) : await dialog.showSaveDialog(dialogOpts)
    if (save.canceled || !save.filePath) return { success: false, canceled: true }
    try {
      return await exportFmeaXlsx(db, docId, save.filePath)
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
