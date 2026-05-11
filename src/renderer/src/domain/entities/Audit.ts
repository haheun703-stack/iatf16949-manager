import type { AuditType } from '../value-objects/AuditType'
import type { FindingType } from '../value-objects/FindingType'

export interface Audit {
  id: string
  type: AuditType
  scheduledDate: string | null
  actualDate: string | null
  status: 'planned' | 'in_progress' | 'completed' | 'follow_up'
  leadAuditor: string | null
  scope: string | null
}

export interface Finding {
  id: string
  auditId: string
  clauseId: string
  type: FindingType
  description: string
  rootCause: string | null
  correctiveAction: string | null
  dueDate: string | null
  verificationDate: string | null
  status: 'open' | 'action_submitted' | 'verified' | 'closed'
}
