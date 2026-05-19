export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'date'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'photo'
  | 'auto'

export interface FormField {
  id: number
  formCode: string
  fieldKey: string
  label: string
  type: FormFieldType
  section: string | null
  placeholder: string | null
  options: string[] | null
  unit: string | null
  aiEnabled: boolean
  aiPromptHint: string | null
  sortOrder: number
}

export interface FormDefinition {
  code: string
  name: string
  regCode: string
  description: string | null
  approvals: string[]
  nextFormCode: string | null
  nextFormLabel: string | null
  prevFormCode: string | null
  fields: FormField[]
}

export interface FormListItem {
  code: string
  name: string
  regCode: string
  approvalsCount: number
  fieldsCount: number
  submissionsCount: number
  draftCount: number
}

export interface FormSubmission {
  id: number
  formCode: string
  serialNo: string | null
  values: Record<string, unknown>
  status: 'draft' | 'submitted' | 'approved'
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface FormSubmissionListItem {
  id: number
  formCode: string
  formName: string
  serialNo: string | null
  status: FormSubmission['status']
  updatedAt: string
  preview: string
}

export interface FormSubmissionLink {
  id: number
  fromSubmissionId: number
  toSubmissionId: number
  createdAt: string
}

export interface RegulationSection {
  id: number
  regCode: string
  sectionTitle: string
  sectionBody: string
  sortOrder: number
}
