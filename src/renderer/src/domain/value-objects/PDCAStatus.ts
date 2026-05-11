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
  plan: { color: '#64748b', bg: '#f1f5f9' },
  do: { color: '#b45309', bg: '#fef3c7' },
  check: { color: '#1d4ed8', bg: '#dbeafe' },
  act: { color: '#dc2626', bg: '#fee2e2' },
  done: { color: '#15803d', bg: '#dcfce7' }
}

export function canTransition(from: PDCAStatus, to: PDCAStatus): boolean {
  return PDCA_TRANSITIONS[from].includes(to)
}

export function getNextStatuses(current: PDCAStatus): PDCAStatus[] {
  return PDCA_TRANSITIONS[current]
}
