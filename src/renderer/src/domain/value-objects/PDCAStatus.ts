export const PDCA_STATUSES = ['plan', 'do', 'check', 'act', 'done'] as const
export type PDCAStatus = (typeof PDCA_STATUSES)[number]

export const PDCA_TRANSITIONS: Record<PDCAStatus, PDCAStatus[]> = {
  plan: ['do'],
  do: ['check'],
  check: ['act'],
  act: ['done', 'plan'],
  done: ['plan']
}

export const PDCA_LABELS: Record<PDCAStatus, string> = {
  plan: '기획',
  do: '실행',
  check: '검증',
  act: '개선',
  done: '완료'
}

export const PDCA_COLORS: Record<PDCAStatus, { color: string; bg: string }> = {
  plan: { color: '#6b7280', bg: '#1f2937' },
  do: { color: '#f59e0b', bg: '#422006' },
  check: { color: '#3b82f6', bg: '#1e3a5f' },
  act: { color: '#ef4444', bg: '#450a0a' },
  done: { color: '#22c55e', bg: '#052e16' }
}

export function canTransition(from: PDCAStatus, to: PDCAStatus): boolean {
  return PDCA_TRANSITIONS[from].includes(to)
}

export function getNextStatuses(current: PDCAStatus): PDCAStatus[] {
  return PDCA_TRANSITIONS[current]
}
