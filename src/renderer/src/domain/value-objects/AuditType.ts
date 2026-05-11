export const AUDIT_TYPES = [
  'internal_qms',
  'internal_process',
  'internal_product',
  'external_surveillance',
  'external_recert',
  'special'
] as const

export type AuditType = (typeof AUDIT_TYPES)[number]

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  internal_qms: 'QMS 내부심사',
  internal_process: '공정심사',
  internal_product: '제품심사',
  external_surveillance: '사후심사',
  external_recert: '갱신심사',
  special: '특별심사'
}
