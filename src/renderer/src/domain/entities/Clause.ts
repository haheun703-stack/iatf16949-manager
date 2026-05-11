export interface Clause {
  id: string
  title: string
  description: string | null
  parentId: string | null
  depth: number
  sortOrder: number
  category: ClauseCategory | null
}

export type ClauseCategory =
  | 'context'
  | 'leadership'
  | 'planning'
  | 'support'
  | 'operation'
  | 'evaluation'
  | 'improvement'

export const CLAUSE_CATEGORY_LABELS: Record<ClauseCategory, string> = {
  context: '조직의 상황',
  leadership: '리더십',
  planning: '기획',
  support: '지원',
  operation: '운용',
  evaluation: '성과 평가',
  improvement: '개선'
}

export const CLAUSE_ICONS: Record<string, string> = {
  '4': '🏢',
  '5': '👔',
  '6': '📋',
  '7': '🔧',
  '8': '⚙️',
  '9': '📊',
  '10': '🔄'
}
