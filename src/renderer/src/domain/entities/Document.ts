export interface Document {
  id: string
  clauseId: string
  name: string
  type: DocumentType
  templatePath: string | null
  currentVersion: string
  retentionDays: number
}

export type DocumentType = 'form' | 'record' | 'procedure' | 'manual'

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  form: '양식',
  record: '기록',
  procedure: '절차서',
  manual: '매뉴얼'
}
