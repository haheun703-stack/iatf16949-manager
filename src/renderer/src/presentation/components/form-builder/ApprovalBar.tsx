interface Props {
  approvals: string[]
}

export function ApprovalBar({ approvals }: Props): JSX.Element | null {
  // 결재란이 없으면 빈 테두리 박스(repeat(0,1fr)) 대신 아무것도 렌더하지 않음
  if (approvals.length === 0) return null
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="grid" style={{ gridTemplateColumns: `repeat(${approvals.length}, 1fr)` }}>
        {approvals.map((label, idx) => (
          <div
            key={`${label}-${idx}`}
            className="border-r border-border last:border-r-0 px-3 py-2 text-center bg-muted/30"
          >
            <div className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase">
              {label}
            </div>
            <div className="h-10 mt-1" aria-label={`${label} 결재란`} />
          </div>
        ))}
      </div>
    </div>
  )
}
