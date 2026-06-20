import { ipcMain, dialog, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import { randomUUID } from 'crypto'
import { writeFileSync } from 'fs'
import type {
  ClauseTreeNode,
  ClauseDetail,
  DocumentSummary,
  TaskListItem,
  TaskHistoryItem,
  DashboardStats,
  DashboardFullData,
  CalendarEvent,
  TeamSummary,
  PersonSummary,
  DbStatus,
  RegulationItem,
  CompanyProfile,
  DocGenRequest,
  DocGenResult
} from '@shared/ipc-types'
import { generateQualityManual } from '../docgen/quality-manual-generator'
import { registerFormHandlers } from './form-handlers'
import { registerProcessHandlers } from './process-handlers'
import { registerBomHandlers } from './bom-handlers'
import { registerScoringHandlers } from './scoring-handlers'
import { registerDashboardHandlers } from './dashboard-handlers'
import { registerScheduleHandlers } from './schedule-handlers'
import { registerReportHandlers } from './report-handlers'
import { registerSqHandlers } from './sq-handlers'
import { registerCaseHandlers } from './case-handlers'

export function registerAllIpcHandlers(): void {
  registerFormHandlers()
  registerProcessHandlers()
  registerBomHandlers()
  registerScoringHandlers()
  registerDashboardHandlers()
  registerScheduleHandlers()
  registerReportHandlers()
  registerSqHandlers()
  registerCaseHandlers()
  const db = getSqlite()

  // ──── Clause Handlers ────

  ipcMain.handle(IPC_CHANNELS.CLAUSE_GET_TREE, () => {
    const allClauses = db
      .prepare('SELECT * FROM clauses ORDER BY sort_order')
      .all() as Array<{
        id: string; title: string; description: string | null;
        parent_id: string | null; depth: number; sort_order: number; category: string | null
      }>

    // Batch document count query (fixes N+1: was 172 queries, now 1)
    const docCounts = db.prepare(
      'SELECT clause_id, COUNT(*) as count FROM documents GROUP BY clause_id'
    ).all() as Array<{ clause_id: string; count: number }>
    const countMap = new Map(docCounts.map((r) => [r.clause_id, r.count]))

    const parentIds = new Set(allClauses.filter((c) => c.parent_id).map((c) => c.parent_id!))

    const result: ClauseTreeNode[] = allClauses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      parentId: c.parent_id,
      depth: c.depth,
      sortOrder: c.sort_order,
      category: c.category,
      hasChildren: parentIds.has(c.id),
      documentCount: countMap.get(c.id) || 0
    }))

    return result
  })

  ipcMain.handle(IPC_CHANNELS.CLAUSE_GET_BY_ID, (_event, { id }: { id: string }) => {
    const clause = db.prepare('SELECT * FROM clauses WHERE id = ?').get(id) as {
      id: string; title: string; description: string | null;
      parent_id: string | null; depth: number; category: string | null
    } | undefined

    if (!clause) return null

    const docs = db
      .prepare(`
        SELECT d.*, tm.name as team_name
        FROM documents d
        LEFT JOIN teams tm ON d.team_id = tm.id
        WHERE d.clause_id = ?
      `)
      .all(id) as Array<Record<string, unknown>>

    const tasks = db
      .prepare(`
        SELECT t.*, p.name as assignee_name, tm.name as team_name, d.name as doc_name
        FROM tasks t
        LEFT JOIN persons p ON t.assignee_id = p.id
        LEFT JOIN teams tm ON t.team_id = tm.id
        LEFT JOIN documents d ON t.document_id = d.id
        WHERE t.clause_id = ?
      `)
      .all(id) as Array<Record<string, unknown>>

    const result: ClauseDetail = {
      id: clause.id,
      title: clause.title,
      description: clause.description,
      parentId: clause.parent_id,
      depth: clause.depth,
      category: clause.category,
      documents: docs.map((d) => ({
        id: d.id as string,
        name: d.name as string,
        type: d.type as string,
        currentVersion: (d.current_version as string) || '1.0',
        clauseId: d.clause_id as string,
        docCode: (d.doc_code as string) || null,
        teamId: (d.team_id as string) || null,
        teamName: (d.team_name as string) || null,
        revision: (d.revision as string) || null
      })),
      tasks: tasks.map((t) => ({
        id: t.id as string,
        clauseId: t.clause_id as string,
        clauseTitle: clause.title,
        documentId: (t.document_id as string) || null,
        documentName: (t.doc_name as string) || null,
        team: (t.team_name as string) || '',
        teamId: (t.team_id as string) || '',
        assignee: (t.assignee_name as string) || '',
        assigneeId: (t.assignee_id as string) || '',
        status: t.status as string,
        priority: t.priority as string,
        deadline: (t.deadline as string) || null,
        completedAt: (t.completed_at as string) || null,
        createdAt: (t.created_at as string) || null,
        updatedAt: (t.updated_at as string) || null
      }))
    }

    return result
  })

  ipcMain.handle(IPC_CHANNELS.CLAUSE_SEARCH, (_event, { query }: { query: string }) => {
    const allClauses = db
      .prepare('SELECT * FROM clauses ORDER BY sort_order')
      .all() as Array<{
        id: string; title: string; description: string | null;
        parent_id: string | null; depth: number; sort_order: number; category: string | null
      }>

    const lowerQuery = query.toLowerCase()
    const matched = allClauses.filter(
      (c) => c.id.toLowerCase().includes(lowerQuery) || c.title.toLowerCase().includes(lowerQuery)
    )

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents WHERE clause_id = ?')

    return matched.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      parentId: c.parent_id,
      depth: c.depth,
      sortOrder: c.sort_order,
      category: c.category,
      hasChildren: allClauses.some((child) => child.parent_id === c.id),
      documentCount: (countStmt.get(c.id) as { count: number }).count
    })) as ClauseTreeNode[]
  })

  // ──── Document Handlers ────

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_LIST_BY_CLAUSE, (_event, { clauseId }: { clauseId: string }) => {
    const docs = db
      .prepare(`
        SELECT d.*, tm.name as team_name
        FROM documents d
        LEFT JOIN teams tm ON d.team_id = tm.id
        WHERE d.clause_id = ?
      `)
      .all(clauseId) as Array<Record<string, unknown>>

    return docs.map((d) => ({
      id: d.id as string,
      name: d.name as string,
      type: d.type as string,
      currentVersion: (d.current_version as string) || '1.0',
      clauseId: d.clause_id as string,
      docCode: (d.doc_code as string) || null,
      teamId: (d.team_id as string) || null,
      teamName: (d.team_name as string) || null,
      revision: (d.revision as string) || null
    })) as DocumentSummary[]
  })

  ipcMain.handle(IPC_CHANNELS.DOCUMENT_GET_BY_ID, (_event, { id }: { id: string }) => {
    const doc = db.prepare(`
      SELECT d.*, tm.name as team_name
      FROM documents d
      LEFT JOIN teams tm ON d.team_id = tm.id
      WHERE d.id = ?
    `).get(id) as Record<string, unknown> | undefined

    if (!doc) return null

    return {
      id: doc.id as string,
      name: doc.name as string,
      type: doc.type as string,
      currentVersion: (doc.current_version as string) || '1.0',
      clauseId: doc.clause_id as string,
      docCode: (doc.doc_code as string) || null,
      teamId: (doc.team_id as string) || null,
      teamName: (doc.team_name as string) || null,
      revision: (doc.revision as string) || null
    } as DocumentSummary
  })

  // ──── Task Handlers ────

  const VALID_TRANSITIONS: Record<string, string[]> = {
    plan: ['do'],
    do: ['check'],
    check: ['act'],
    act: ['done', 'plan'],
    done: ['plan']
  }

  function mapTaskRow(t: Record<string, unknown>): TaskListItem {
    return {
      id: t.id as string,
      clauseId: t.clause_id as string,
      clauseTitle: (t.clause_title as string) || '',
      documentId: (t.document_id as string) || null,
      documentName: (t.doc_name as string) || null,
      team: (t.team_name as string) || '',
      teamId: (t.team_id as string) || '',
      assignee: (t.assignee_name as string) || '',
      assigneeId: (t.assignee_id as string) || '',
      status: t.status as string,
      priority: t.priority as string,
      deadline: (t.deadline as string) || null,
      completedAt: (t.completed_at as string) || null,
      createdAt: (t.created_at as string) || null,
      updatedAt: (t.updated_at as string) || null
    }
  }

  const TASK_SELECT_SQL = `
    SELECT t.*, c.title as clause_title,
           p.name as assignee_name, tm.name as team_name, d.name as doc_name
    FROM tasks t
    LEFT JOIN clauses c ON t.clause_id = c.id
    LEFT JOIN persons p ON t.assignee_id = p.id
    LEFT JOIN teams tm ON t.team_id = tm.id
    LEFT JOIN documents d ON t.document_id = d.id
  `

  ipcMain.handle(IPC_CHANNELS.TASK_CREATE, (_event, data: {
    clauseId: string; documentId?: string; assigneeId: string;
    teamId: string; priority: string; deadline: string
  }) => {
    const id = randomUUID()
    const now = new Date().toISOString()
    db.prepare(`
      INSERT INTO tasks (id, clause_id, document_id, assignee_id, team_id, status, priority, deadline, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'plan', ?, ?, ?, ?)
    `).run(id, data.clauseId, data.documentId || null, data.assigneeId, data.teamId, data.priority, data.deadline, now, now)

    db.prepare(`
      INSERT INTO task_pdca_history (task_id, from_status, to_status, changed_at, note)
      VALUES (?, NULL, 'plan', ?, '업무 생성')
    `).run(id, now)

    return { id }
  })

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE, (_event, data: { id: string; [key: string]: unknown }) => {
    const { id, ...fields } = data
    const allowed = ['document_id', 'assignee_id', 'team_id', 'priority', 'deadline']
    const fieldMap: Record<string, string> = {
      documentId: 'document_id', assigneeId: 'assignee_id',
      teamId: 'team_id', priority: 'priority', deadline: 'deadline'
    }

    const sets: string[] = []
    const values: unknown[] = []
    for (const [key, col] of Object.entries(fieldMap)) {
      if (key in fields) {
        if (!allowed.includes(col)) continue
        sets.push(`${col} = ?`)
        values.push(fields[key] ?? null)
      }
    }
    if (sets.length === 0) return { success: false }

    sets.push("updated_at = datetime('now')")
    values.push(id)
    db.prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.TASK_DELETE, (_event, { id }: { id: string }) => {
    db.prepare('DELETE FROM task_pdca_history WHERE task_id = ?').run(id)
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.TASK_LIST, (_event, filters: { clauseId?: string; teamId?: string; status?: string }) => {
    let sql = TASK_SELECT_SQL
    const conditions: string[] = []
    const params: unknown[] = []

    if (filters?.clauseId) { conditions.push('t.clause_id = ?'); params.push(filters.clauseId) }
    if (filters?.teamId) { conditions.push('t.team_id = ?'); params.push(filters.teamId) }
    if (filters?.status) { conditions.push('t.status = ?'); params.push(filters.status) }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ')
    sql += ' ORDER BY t.deadline ASC, t.created_at DESC'

    const rows = db.prepare(sql).all(...params) as Array<Record<string, unknown>>
    return rows.map(mapTaskRow)
  })

  ipcMain.handle(IPC_CHANNELS.TASK_GET_BY_ID, (_event, { id }: { id: string }) => {
    const row = db.prepare(TASK_SELECT_SQL + ' WHERE t.id = ?').get(id) as Record<string, unknown> | undefined
    return row ? mapTaskRow(row) : null
  })

  ipcMain.handle(IPC_CHANNELS.TASK_UPDATE_STATUS, (_event, data: {
    taskId: string; newStatus: string; note?: string; changedBy?: string
  }) => {
    const task = db.prepare('SELECT status FROM tasks WHERE id = ?').get(data.taskId) as { status: string } | undefined
    if (!task) return { success: false }

    const allowed = VALID_TRANSITIONS[task.status]
    if (!allowed || !allowed.includes(data.newStatus)) return { success: false }

    const now = new Date().toISOString()
    const completedAt = data.newStatus === 'done' ? now : null

    db.prepare(`
      UPDATE tasks SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?
    `).run(data.newStatus, completedAt, now, data.taskId)

    db.prepare(`
      INSERT INTO task_pdca_history (task_id, from_status, to_status, changed_at, changed_by, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(data.taskId, task.status, data.newStatus, now, data.changedBy || null, data.note || null)

    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.TASK_GET_HISTORY, (_event, { taskId }: { taskId: string }) => {
    return db.prepare(`
      SELECT id, task_id as taskId, from_status as fromStatus, to_status as toStatus,
             changed_at as changedAt, changed_by as changedBy, note
      FROM task_pdca_history WHERE task_id = ? ORDER BY changed_at DESC
    `).all(taskId) as TaskHistoryItem[]
  })

  // ──── Team Handlers ────

  ipcMain.handle(IPC_CHANNELS.TEAM_LIST, () => {
    return db.prepare('SELECT id, name, manager_id as managerId FROM teams').all() as TeamSummary[]
  })

  ipcMain.handle(IPC_CHANNELS.TEAM_GET_MEMBERS, (_event, { teamId }: { teamId: string }) => {
    return db
      .prepare('SELECT id, name, role, team_id as teamId FROM persons WHERE team_id = ?')
      .all(teamId) as PersonSummary[]
  })

  // ──── Dashboard Handler ────

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_STATS, () => {
    const allTasks = db
      .prepare('SELECT status, deadline FROM tasks')
      .all() as Array<{ status: string; deadline: string | null }>

    const now = new Date().toISOString().split('T')[0]
    const stats: DashboardStats = {
      total: allTasks.length,
      done: allTasks.filter((t) => t.status === 'done').length,
      inProgress: allTasks.filter((t) => t.status === 'do').length,
      overdue: allTasks.filter((t) => {
        if (!t.deadline || t.status === 'done') return false
        return t.deadline < now
      }).length,
      pending: allTasks.filter((t) => t.status === 'plan').length,
      plan: allTasks.filter((t) => t.status === 'plan').length,
      check: allTasks.filter((t) => t.status === 'check').length,
      act: allTasks.filter((t) => t.status === 'act').length
    }

    return stats
  })

  // ──── Dashboard Full ────

  ipcMain.handle(IPC_CHANNELS.DASHBOARD_FULL, () => {
    const now = new Date().toISOString().split('T')[0]

    // 1) All tasks with joins
    const taskRows = db.prepare(TASK_SELECT_SQL + ' ORDER BY t.deadline ASC, t.created_at DESC')
      .all() as Array<Record<string, unknown>>
    const tasks = taskRows.map(mapTaskRow)

    // 2) Stats from tasks
    const stats: DashboardStats = {
      total: tasks.length,
      done: tasks.filter((t) => t.status === 'done').length,
      inProgress: tasks.filter((t) => t.status === 'do').length,
      overdue: tasks.filter((t) => {
        if (!t.deadline || t.status === 'done') return false
        return t.deadline < now
      }).length,
      pending: tasks.filter((t) => t.status === 'plan').length,
      plan: tasks.filter((t) => t.status === 'plan').length,
      check: tasks.filter((t) => t.status === 'check').length,
      act: tasks.filter((t) => t.status === 'act').length
    }

    // 3) Teams
    const teams = db.prepare('SELECT id, name, manager_id as managerId FROM teams')
      .all() as TeamSummary[]

    // 4) All persons
    const members = db.prepare('SELECT id, name, role, team_id as teamId FROM persons')
      .all() as PersonSummary[]

    // 5) Calendar events from audits
    const audits = db.prepare(`
      SELECT id, type, scheduled_date, status, scope
      FROM audits WHERE scheduled_date IS NOT NULL ORDER BY scheduled_date ASC
    `).all() as Array<{
      id: string; type: string; scheduled_date: string; status: string; scope: string | null
    }>

    const auditTypeLabels: Record<string, string> = {
      internal_qms: 'QMS 내부심사',
      internal_process: '공정심사',
      internal_product: '제품심사',
      external_surveillance: '사후심사',
      external_recert: '갱신심사',
      special: '특별심사'
    }

    const calendarEvents: CalendarEvent[] = audits.map((a) => ({
      date: a.scheduled_date,
      type: 'audit' as const,
      label: `${auditTypeLabels[a.type] || a.type}${a.scope ? ` (${a.scope})` : ''}`
    }))

    // Add task deadlines as calendar events (upcoming 60 days)
    const sixtyDaysLater = new Date()
    sixtyDaysLater.setDate(sixtyDaysLater.getDate() + 60)
    const futureLimit = sixtyDaysLater.toISOString().split('T')[0]

    tasks.forEach((t) => {
      if (t.deadline && t.status !== 'done' && t.deadline >= now && t.deadline <= futureLimit) {
        calendarEvents.push({
          date: t.deadline,
          type: 'deadline',
          label: `${t.clauseId} ${t.documentName || t.clauseTitle} 마감`
        })
      }
    })

    calendarEvents.sort((a, b) => a.date.localeCompare(b.date))

    // 6) Next audit D-day
    let nextAudit: DashboardFullData['nextAudit'] = null
    const upcomingAudit = audits.find((a) => a.scheduled_date >= now)
    if (upcomingAudit) {
      const diffMs = new Date(upcomingAudit.scheduled_date).getTime() - new Date(now).getTime()
      const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      nextAudit = {
        label: auditTypeLabels[upcomingAudit.type] || upcomingAudit.type,
        daysUntil
      }
    }

    return { stats, tasks, teams, members, calendarEvents, nextAudit } as DashboardFullData
  })

  // ──── DB Status ────

  ipcMain.handle(IPC_CHANNELS.DB_STATUS, () => {
    const getCount = (table: string): number => {
      const result = db.prepare(`SELECT COUNT(*) as count FROM ${table}`).get() as { count: number }
      return result.count
    }

    return {
      clauses: getCount('clauses'),
      documents: getCount('documents'),
      teams: getCount('teams'),
      persons: getCount('persons'),
      tasks: getCount('tasks')
    } as DbStatus
  })

  // ──── Regulation Handlers ────

  ipcMain.handle(IPC_CHANNELS.REGULATION_LIST, () => {
    const rows = db.prepare(`
      SELECT d.*, c.title as clause_title, tm.name as team_name
      FROM documents d
      LEFT JOIN clauses c ON d.clause_id = c.id
      LEFT JOIN teams tm ON d.team_id = tm.id
      WHERE d.doc_code IS NOT NULL
      ORDER BY d.doc_code
    `).all() as Array<Record<string, unknown>>

    return rows.map((r) => ({
      id: r.id as string,
      docCode: r.doc_code as string,
      name: r.name as string,
      type: r.type as string,
      clauseId: r.clause_id as string,
      clauseTitle: (r.clause_title as string) || '',
      teamId: r.team_id as string,
      teamName: (r.team_name as string) || '',
      revision: (r.revision as string) || null
    })) as RegulationItem[]
  })

  ipcMain.handle(IPC_CHANNELS.TASK_BULK_CREATE, (_event, { deadline }: { deadline: string }) => {
    const bulkCreate = db.transaction(() => {
      // Get all regulation documents (those with doc_code and team_id)
      const regulations = db.prepare(`
        SELECT d.id as doc_id, d.clause_id, d.team_id, d.name, d.doc_code
        FROM documents d
        WHERE d.doc_code IS NOT NULL AND d.team_id IS NOT NULL
      `).all() as Array<{
        doc_id: string; clause_id: string; team_id: string; name: string; doc_code: string
      }>

      // Get team managers as default assignees
      const teamManagers = db.prepare(`
        SELECT t.id as team_id, t.manager_id FROM teams t WHERE t.manager_id IS NOT NULL
      `).all() as Array<{ team_id: string; manager_id: string }>

      const managerMap = new Map(teamManagers.map((tm) => [tm.team_id, tm.manager_id]))

      const now = new Date().toISOString()
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, clause_id, document_id, assignee_id, team_id, status, priority, deadline, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'plan', 'medium', ?, ?, ?)
      `)
      const insertHistory = db.prepare(`
        INSERT INTO task_pdca_history (task_id, from_status, to_status, changed_at, note)
        VALUES (?, NULL, 'plan', ?, ?)
      `)

      // Check existing tasks to avoid duplicates
      const existingTasks = db.prepare(`
        SELECT document_id FROM tasks WHERE document_id IS NOT NULL
      `).all() as Array<{ document_id: string }>
      const existingDocIds = new Set(existingTasks.map((t) => t.document_id))

      let created = 0
      for (const reg of regulations) {
        if (existingDocIds.has(reg.doc_id)) continue

        const taskId = randomUUID()
        const assigneeId = managerMap.get(reg.team_id) || null
        insertTask.run(taskId, reg.clause_id, reg.doc_id, assigneeId, reg.team_id, deadline, now, now)
        insertHistory.run(taskId, now, `[일괄생성] ${reg.doc_code} ${reg.name}`)
        created++
      }

      return { created }
    })

    return bulkCreate()
  })

  // ──── Company Profile Handlers ────

  const PROFILE_KEYS: (keyof CompanyProfile)[] = [
    'companyName', 'ceoName', 'address', 'phone', 'fax',
    'factoryName', 'revisionNumber', 'revisionDate'
  ]

  ipcMain.handle(IPC_CHANNELS.COMPANY_PROFILE_GET, () => {
    const rows = db.prepare('SELECT key, value FROM company_profile').all() as Array<{ key: string; value: string }>
    const map = new Map(rows.map((r) => [r.key, r.value]))
    const profile: CompanyProfile = {
      companyName: map.get('companyName') || '',
      ceoName: map.get('ceoName') || '',
      address: map.get('address') || '',
      phone: map.get('phone') || '',
      fax: map.get('fax') || '',
      factoryName: map.get('factoryName') || '',
      revisionNumber: map.get('revisionNumber') || '',
      revisionDate: map.get('revisionDate') || ''
    }
    return profile
  })

  // ──── 현재 창을 PDF로 인쇄(저장) — @media print 의 .print-document 영역만 출력 ────
  ipcMain.handle(
    IPC_CHANNELS.PRINT_TO_PDF,
    async (_event, { defaultName }: { defaultName?: string } = {}) => {
      const win = BrowserWindow.getFocusedWindow()
      if (!win) return { success: false, error: '활성 창을 찾을 수 없습니다.' }
      try {
        const data = await win.webContents.printToPDF({
          printBackground: true,
          pageSize: 'A4'
        })
        const saveRes = await dialog.showSaveDialog(win, {
          title: '양식 PDF 저장',
          defaultPath: defaultName || '양식.pdf',
          filters: [{ name: 'PDF 파일', extensions: ['pdf'] }]
        })
        if (saveRes.canceled || !saveRes.filePath) return { success: false, canceled: true }
        writeFileSync(saveRes.filePath, data)
        return { success: true, filePath: saveRes.filePath }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.COMPANY_PROFILE_SAVE, (_event, profile: CompanyProfile) => {
    const upsert = db.prepare(
      'INSERT INTO company_profile (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    )
    const saveAll = db.transaction(() => {
      for (const key of PROFILE_KEYS) {
        upsert.run(key, profile[key] || '')
      }
    })
    saveAll()
    return { success: true }
  })

  // ──── Document Generation Handlers ────

  ipcMain.handle(IPC_CHANNELS.DOCGEN_SAVE_DIALOG, async (_event, { defaultName }: { defaultName: string }) => {
    const win = BrowserWindow.getFocusedWindow()
    if (!win) return { filePath: null }

    const result = await dialog.showSaveDialog(win, {
      title: '문서 저장 위치 선택',
      defaultPath: defaultName,
      filters: [
        { name: 'Excel 파일', extensions: ['xlsx'] }
      ]
    })
    return { filePath: result.canceled ? null : result.filePath || null }
  })

  ipcMain.handle(IPC_CHANNELS.DOCGEN_GENERATE, async (_event, req: DocGenRequest): Promise<DocGenResult> => {
    try {
      if (req.templateId === 'quality-manual') {
        return await generateQualityManual(req, db)
      }
      return { success: false, error: `Unknown template: ${req.templateId}` }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })
}
