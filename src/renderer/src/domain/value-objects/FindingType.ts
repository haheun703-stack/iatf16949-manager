export const FINDING_TYPES = ['major_nc', 'minor_nc', 'observation', 'opportunity'] as const
export type FindingType = (typeof FINDING_TYPES)[number]

export const FINDING_TYPE_LABELS: Record<FindingType, string> = {
  major_nc: '중부적합',
  minor_nc: '경부적합',
  observation: '관찰사항',
  opportunity: '개선기회'
}
