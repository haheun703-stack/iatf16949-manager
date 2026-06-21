import { create } from 'zustand'
import type {
  FormListItemDto,
  FormDefinitionDto,
  FormSubmissionDto,
  FormSubmissionListItemDto,
  RegulationSectionDto,
  FormGuideDto,
  FormScoreDto,
  AiGuideResponse,
  AiScoreResponse
} from '@shared/ipc-types'

export type CopilotTab = 'guide' | 'score'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

/** AI 전송용 값 정제: photo 필드의 data URL 은 텍스트 AI에 불필요·과대 → 마커로 치환 */
function sanitizeForAi(
  values: Record<string, unknown>,
  fields: Array<{ fieldKey: string; type: string }>
): Record<string, unknown> {
  const photoKeys = new Set(fields.filter((f) => f.type === 'photo').map((f) => f.fieldKey))
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(values)) {
    out[k] = photoKeys.has(k) ? (v ? '[사진 첨부됨]' : '') : v
  }
  return out
}

interface FormState {
  formList: FormListItemDto[]
  formListLoading: boolean
  loadFormList: () => Promise<void>

  currentForm: FormDefinitionDto | null
  currentFormLoading: boolean
  loadFormDefinition: (code: string) => Promise<void>

  currentRegulationSections: RegulationSectionDto[]
  loadRegulationSections: (regCode: string) => Promise<void>

  // Working draft (values being edited)
  values: Record<string, unknown>
  setValue: (key: string, value: unknown) => void
  mergeValues: (partial: Record<string, unknown>) => void
  resetValues: (initial?: Record<string, unknown>) => void

  // 자동 메타주입(새 양식): 발행번호 미리보기(저장 시 serial_no로 확정)
  serialPreview: string | null

  // Current submission id (if editing an existing one)
  currentSubmissionId: number | null
  setCurrentSubmissionId: (id: number | null) => void

  // Submissions list (recent)
  submissions: FormSubmissionListItemDto[]
  loadSubmissions: (formCode?: string) => Promise<void>
  // 저장된 작성본을 양식에 불러와 이어쓰기
  loadSubmission: (id: number) => Promise<void>

  // Save
  saveDraft: () => Promise<number>

  // AI generate (per-field)
  aiLoadingFieldKey: string | null
  aiError: string | null
  generateAI: (fieldKey: string) => Promise<void>

  // AI Copilot UI (작성가이드 + 채점)
  copilotOpen: boolean
  copilotTab: CopilotTab
  toggleCopilot: () => void
  openCopilot: (tab?: CopilotTab) => void
  setCopilotTab: (tab: CopilotTab) => void

  // AI 작성 가이드
  guide: FormGuideDto | null
  guideLoading: boolean
  guideError: string | null
  loadGuide: (formCode: string) => Promise<void>
  generateGuide: (force?: boolean) => Promise<void>

  // AI 채점
  score: FormScoreDto | null
  scoreLoading: boolean
  scoreError: string | null
  loadLatestScore: (formCode: string) => Promise<void>
  scoreForm: () => Promise<void>
}

export const useFormStore = create<FormState>((set, get) => ({
  formList: [],
  formListLoading: false,
  loadFormList: async () => {
    set({ formListLoading: true })
    const res = (await window.api.invoke(ch('FORM_LIST'))) as FormListItemDto[]
    set({ formList: res, formListLoading: false })
  },

  currentForm: null,
  currentFormLoading: false,
  loadFormDefinition: async (code) => {
    set({ currentFormLoading: true })
    const res = (await window.api.invoke(ch('FORM_GET_DEFINITION'), { code })) as
      | FormDefinitionDto
      | null
    set({
      currentForm: res,
      currentFormLoading: false,
      values: {},
      serialPreview: null,
      currentSubmissionId: null,
      aiError: null,
      // reset copilot context for the new form
      guide: null,
      guideError: null,
      score: null,
      scoreError: null
    })
    if (res) {
      await get().loadRegulationSections(res.regCode)
      // 새 양식 메타 자동주입(발행번호/작성일자/작성자). 폼이 바뀌었으면 무시.
      try {
        const defaults = (await window.api.invoke(ch('FORM_DRAFT_DEFAULTS'), {
          formCode: res.code
        })) as { values: Record<string, string>; serialPreview: string | null }
        if (get().currentForm?.code === res.code && get().currentSubmissionId === null) {
          set((s) => ({
            values: { ...defaults.values, ...s.values },
            serialPreview: defaults.serialPreview
          }))
        }
      } catch {
        // 메타 주입 실패는 치명적이지 않음(사람이 직접 입력 가능)
      }
      // 캐시된 가이드/최근 채점은 조용히 미리 불러옴 (API 호출 없음)
      void get().loadGuide(res.code)
      void get().loadLatestScore(res.code)
    }
  },

  currentRegulationSections: [],
  loadRegulationSections: async (regCode) => {
    const res = (await window.api.invoke(ch('REGULATION_GET_SECTIONS'), { regCode })) as
      | RegulationSectionDto[]
    set({ currentRegulationSections: res })
  },

  values: {},
  serialPreview: null,
  setValue: (key, value) => set((s) => ({ values: { ...s.values, [key]: value } })),
  mergeValues: (partial) => set((s) => ({ values: { ...s.values, ...partial } })),
  resetValues: (initial = {}) => set({ values: initial }),

  currentSubmissionId: null,
  setCurrentSubmissionId: (id) => set({ currentSubmissionId: id }),

  submissions: [],
  loadSubmissions: async (formCode) => {
    const res = (await window.api.invoke(ch('FORM_SUBMISSION_LIST'), { formCode })) as
      | FormSubmissionListItemDto[]
    set({ submissions: res })
  },

  loadSubmission: async (id) => {
    const sub = (await window.api.invoke(ch('FORM_SUBMISSION_GET'), { id })) as FormSubmissionDto | null
    if (!sub) return
    // 해당 양식 정의를 먼저 로드(메타 기본값 주입 포함) → 그 위에 저장본 값으로 덮어씀
    if (get().currentForm?.code !== sub.formCode) {
      await get().loadFormDefinition(sub.formCode)
    }
    set({
      values: sub.values,
      currentSubmissionId: sub.id,
      serialPreview: sub.serialNo ?? null
    })
    // loadFormDefinition이 currentSubmissionId=null 상태에서 채점을 미리 불러와(submissionId=null)
    // 이 작성본이 아닌 양식 전체 최신 채점이 잡힌다. id 확정 후 해당 작성본 채점으로 재조회.
    void get().loadLatestScore(sub.formCode)
  },

  saveDraft: async () => {
    const { currentForm, values, currentSubmissionId, serialPreview } = get()
    if (!currentForm) throw new Error('양식이 로드되지 않았습니다.')

    if (currentSubmissionId) {
      await window.api.invoke(ch('FORM_SUBMISSION_UPDATE'), {
        id: currentSubmissionId,
        values
      })
      return currentSubmissionId
    }

    // 최초 저장 시 발행번호를 serial_no로 확정(다음 양식 넘버링이 이어지도록)
    const { id } = (await window.api.invoke(ch('FORM_SUBMISSION_CREATE'), {
      formCode: currentForm.code,
      values,
      serialNo: serialPreview ?? undefined
    })) as { id: number }
    set({ currentSubmissionId: id })
    return id
  },

  aiLoadingFieldKey: null,
  aiError: null,
  generateAI: async (fieldKey) => {
    const { currentForm, values } = get()
    if (!currentForm) return
    set({ aiLoadingFieldKey: fieldKey, aiError: null })
    try {
      const res = (await window.api.invoke(ch('AI_GENERATE'), {
        formCode: currentForm.code,
        fieldKey,
        currentValues: sanitizeForAi(values, currentForm.fields)
      })) as { success: boolean; text?: string; error?: string }
      if (res.success && res.text) {
        set((s) => ({ values: { ...s.values, [fieldKey]: res.text } }))
      } else {
        set({ aiError: res.error || 'AI 생성에 실패했습니다.' })
      }
    } catch (err) {
      set({ aiError: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ aiLoadingFieldKey: null })
    }
  },

  // ──── AI Copilot UI ────
  copilotOpen: false,
  copilotTab: 'guide',
  toggleCopilot: () => set((s) => ({ copilotOpen: !s.copilotOpen })),
  openCopilot: (tab) => set((s) => ({ copilotOpen: true, copilotTab: tab ?? s.copilotTab })),
  setCopilotTab: (tab) => set({ copilotTab: tab }),

  // ──── AI 작성 가이드 ────
  guide: null,
  guideLoading: false,
  guideError: null,
  loadGuide: async (formCode) => {
    const res = (await window.api.invoke(ch('FORM_GUIDE_GET'), { formCode })) as FormGuideDto | null
    // 폼이 바뀌었으면 무시
    if (get().currentForm?.code !== formCode) return
    if (res) set({ guide: res })
  },
  generateGuide: async (force = false) => {
    const { currentForm } = get()
    if (!currentForm) return
    set({ guideLoading: true, guideError: null })
    try {
      const res = (await window.api.invoke(ch('AI_GENERATE_GUIDE'), {
        formCode: currentForm.code,
        force
      })) as AiGuideResponse
      if (get().currentForm?.code !== currentForm.code) return
      if (res.success && res.guide) set({ guide: res.guide })
      else set({ guideError: res.error || 'AI 가이드 생성에 실패했습니다.' })
    } catch (err) {
      set({ guideError: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ guideLoading: false })
    }
  },

  // ──── AI 채점 ────
  score: null,
  scoreLoading: false,
  scoreError: null,
  loadLatestScore: async (formCode) => {
    const { currentSubmissionId } = get()
    const res = (await window.api.invoke(ch('FORM_SCORE_LATEST'), {
      formCode,
      submissionId: currentSubmissionId
    })) as FormScoreDto | null
    if (get().currentForm?.code !== formCode) return
    if (res) set({ score: res })
  },
  scoreForm: async () => {
    const { currentForm, values, currentSubmissionId } = get()
    if (!currentForm) return
    set({ scoreLoading: true, scoreError: null })
    try {
      const res = (await window.api.invoke(ch('AI_SCORE_FORM'), {
        formCode: currentForm.code,
        values: sanitizeForAi(values, currentForm.fields),
        submissionId: currentSubmissionId
      })) as AiScoreResponse
      if (get().currentForm?.code !== currentForm.code) return
      if (res.success && res.result) set({ score: res.result, copilotOpen: true, copilotTab: 'score' })
      else set({ scoreError: res.error || 'AI 채점에 실패했습니다.' })
    } catch (err) {
      set({ scoreError: err instanceof Error ? err.message : String(err) })
    } finally {
      set({ scoreLoading: false })
    }
  }
}))
