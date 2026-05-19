export type ProcessCategory = 'CP' | 'MP' | 'SP'

export interface ProcessListItem {
  code: string
  category: ProcessCategory
  name: string
  docNo: string | null
  pagesCount: number
  formsCount: number
  hasImages: boolean
  sortOrder: number
}

export interface ProcessPage {
  id: number
  processCode: string
  pageNo: number
  pageLabel: string | null
  imagePath: string | null
}

export interface ProcessFormRef {
  formCode: string
  formName: string
  regCode: string
  fieldsCount: number
  submissionsCount: number
  draftCount: number
  sortOrder: number
}

export interface ProcessDetail {
  code: string
  category: ProcessCategory
  name: string
  description: string | null
  docNo: string | null
  pages: ProcessPage[]
  forms: ProcessFormRef[]
}
