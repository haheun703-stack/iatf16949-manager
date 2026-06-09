import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  BomStats,
  BomCategory,
  BomDocListItem,
  BomDocDetail,
  BomFormRef,
  BomFormType,
  BomFormUsage
} from '@shared/ipc-types'
import { BOM_CATEGORY_LABELS } from '@shared/ipc-types'

interface DocRow {
  doc_no_norm: string
  doc_no_raw: string
  category: BomCategory
  category_label: string
  name: string
  owner_dept: string | null
  list_rev: number | null
  list_date: string | null
  file_rev: number | null
  file_date: string | null
  status: string
  forms_count: number
}

interface FormRefRow {
  id: number
  form_type: BomFormType
  form_no_raw: string | null
  form_no_norm: string | null
  label: string
  sort_order: number
}

function mapDoc(r: DocRow): BomDocListItem {
  return {
    docNoNorm: r.doc_no_norm,
    docNoRaw: r.doc_no_raw,
    category: r.category,
    categoryLabel: r.category_label,
    name: r.name,
    ownerDept: r.owner_dept,
    listRev: r.list_rev,
    listDate: r.list_date,
    fileRev: r.file_rev,
    fileDate: r.file_date,
    status: r.status,
    formsCount: r.forms_count
  }
}

export function registerBomHandlers(): void {
  const db = getSqlite()

  ipcMain.handle(IPC_CHANNELS.BOM_STATS, (): BomStats => {
    const totalDocs = (db.prepare('SELECT COUNT(*) AS c FROM bom_documents').get() as { c: number }).c
    const totalForms = (db.prepare('SELECT COUNT(*) AS c FROM bom_form_refs').get() as { c: number }).c

    const byStatus = db.prepare(
      'SELECT status, COUNT(*) AS count FROM bom_documents GROUP BY status ORDER BY count DESC'
    ).all() as { status: string; count: number }[]

    const byCategoryRaw = db.prepare(
      'SELECT category, COUNT(*) AS count FROM bom_documents GROUP BY category'
    ).all() as { category: BomCategory; count: number }[]

    const order: BomCategory[] = ['manual', 'process', 'quality', 'safety_env', 'other']
    const byCategory = order
      .map((cat) => {
        const row = byCategoryRaw.find((r) => r.category === cat)
        return row ? { category: cat, categoryLabel: BOM_CATEGORY_LABELS[cat], count: row.count } : null
      })
      .filter((x): x is { category: BomCategory; categoryLabel: string; count: number } => x !== null)

    const byFormType = db.prepare(
      'SELECT form_type AS type, COUNT(*) AS count FROM bom_form_refs GROUP BY form_type ORDER BY count DESC'
    ).all() as { type: BomFormType; count: number }[]

    return { totalDocs, totalForms, byStatus, byCategory, byFormType }
  })

  ipcMain.handle(
    IPC_CHANNELS.BOM_LIST_DOCS,
    (_event, filter?: { category?: BomCategory; status?: string }): BomDocListItem[] => {
      let sql =
        'SELECT * FROM bom_documents WHERE 1=1'
      const params: unknown[] = []
      if (filter?.category) {
        sql += ' AND category = ?'
        params.push(filter.category)
      }
      if (filter?.status) {
        sql += ' AND status = ?'
        params.push(filter.status)
      }
      sql += ' ORDER BY sort_order ASC'
      const rows = db.prepare(sql).all(...params) as DocRow[]
      return rows.map(mapDoc)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOM_GET_DOC_DETAIL,
    (_event, { docNoNorm }: { docNoNorm: string }): BomDocDetail | null => {
      const doc = db
        .prepare('SELECT * FROM bom_documents WHERE doc_no_norm = ?')
        .get(docNoNorm) as DocRow | undefined
      if (!doc) return null
      const refRows = db
        .prepare(
          'SELECT id, form_type, form_no_raw, form_no_norm, label, sort_order FROM bom_form_refs WHERE doc_no_norm = ? ORDER BY sort_order ASC'
        )
        .all(docNoNorm) as FormRefRow[]
      const forms: BomFormRef[] = refRows.map((r) => ({
        id: r.id,
        formType: r.form_type,
        formNoRaw: r.form_no_raw,
        formNoNorm: r.form_no_norm,
        label: r.label,
        sortOrder: r.sort_order
      }))
      return { ...mapDoc(doc), forms }
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.BOM_FORM_USAGE,
    (_event, { formNoNorm }: { formNoNorm: string }): BomFormUsage => {
      const rows = db
        .prepare(
          `SELECT DISTINCT d.doc_no_norm, d.doc_no_raw, d.name
           FROM bom_form_refs r
           INNER JOIN bom_documents d ON d.doc_no_norm = r.doc_no_norm
           WHERE r.form_no_norm = ?
           ORDER BY d.sort_order`
        )
        .all(formNoNorm) as { doc_no_norm: string; doc_no_raw: string; name: string }[]
      return {
        formNoNorm,
        usedBy: rows.map((r) => ({ docNoNorm: r.doc_no_norm, docNoRaw: r.doc_no_raw, name: r.name }))
      }
    }
  )
}
