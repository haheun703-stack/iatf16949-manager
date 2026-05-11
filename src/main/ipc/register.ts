import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { getSqlite } from '../database/connection'
import type {
  ClauseTreeNode,
  ClauseDetail,
  DocumentSummary,
  DashboardStats,
  TeamSummary,
  PersonSummary,
  DbStatus
} from '@shared/ipc-types'

export function registerAllIpcHandlers(): void {
  const db = getSqlite()

  // ──── Clause Handlers ────

  ipcMain.handle(IPC_CHANNELS.CLAUSE_GET_TREE, () => {
    const allClauses = db
      .prepare('SELECT * FROM clauses ORDER BY sort_order')
      .all() as Array<{
        id: string; title: string; description: string | null;
        parent_id: string | null; depth: number; sort_order: number; category: string | null
      }>

    const countStmt = db.prepare('SELECT COUNT(*) as count FROM documents WHERE clause_id = ?')

    const result: ClauseTreeNode[] = allClauses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      parentId: c.parent_id,
      depth: c.depth,
      sortOrder: c.sort_order,
      category: c.category,
      hasChildren: allClauses.some((child) => child.parent_id === c.id),
      documentCount: (countStmt.get(c.id) as { count: number }).count
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
      .prepare('SELECT * FROM documents WHERE clause_id = ?')
      .all(id) as Array<{
        id: string; name: string; type: string; current_version: string; clause_id: string
      }>

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
        id: d.id,
        name: d.name,
        type: d.type,
        currentVersion: d.current_version,
        clauseId: d.clause_id
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
        completedAt: (t.completed_at as string) || null
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
      .prepare('SELECT * FROM documents WHERE clause_id = ?')
      .all(clauseId) as Array<{
        id: string; name: string; type: string; current_version: string; clause_id: string
      }>

    return docs.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type,
      currentVersion: d.current_version,
      clauseId: d.clause_id
    })) as DocumentSummary[]
  })

  // ──── Team Handlers ────

  ipcMain.handle(IPC_CHANNELS.TEAM_LIST, () => {
    return db.prepare('SELECT * FROM teams').all() as TeamSummary[]
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
}
