const PDCA_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  plan: { bg: '#f1f5f9', text: '#64748b', label: '기획' },
  do: { bg: '#fef3c7', text: '#b45309', label: '실행' },
  check: { bg: '#dbeafe', text: '#1d4ed8', label: '검증' },
  act: { bg: '#fee2e2', text: '#dc2626', label: '개선' },
  done: { bg: '#dcfce7', text: '#15803d', label: '완료' }
}

export function StatusBadge({ status }: { status: string }): JSX.Element {
  const style = PDCA_STYLES[status] || PDCA_STYLES.plan
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[10px] font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  )
}

const PRIORITY_STYLES: Record<string, { color: string; label: string }> = {
  high: { color: '#dc2626', label: '높음' },
  medium: { color: '#d97706', label: '보통' },
  low: { color: '#64748b', label: '낮음' }
}

export function PriorityBadge({ priority }: { priority: string }): JSX.Element {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium
  return (
    <span className="text-[10px] font-medium" style={{ color: style.color }}>
      {style.label}
    </span>
  )
}
