import type { PDCAStatus } from '../value-objects/PDCAStatus'
import type { Priority } from '../value-objects/Priority'

export interface Task {
  id: string
  documentId: string | null
  clauseId: string
  assigneeId: string
  teamId: string
  status: PDCAStatus
  priority: Priority
  deadline: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface TaskPDCAHistoryEntry {
  id: number
  taskId: string
  fromStatus: string | null
  toStatus: string
  changedAt: string
  changedBy: string | null
  note: string | null
}
