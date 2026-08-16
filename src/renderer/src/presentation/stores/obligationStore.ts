import { create } from 'zustand'
import type {
  ObligationDto,
  ObligationCreateInput,
  ObligationUpdateInput
} from '@shared/ipc-types'

type ChannelKey = keyof typeof window.api.channels
function ch<T extends ChannelKey>(k: T): (typeof window.api.channels)[T] {
  return window.api.channels[k]
}

interface ObligationState {
  items: ObligationDto[]
  loading: boolean
  error: string | null

  load: () => Promise<void>
  create: (input: ObligationCreateInput) => Promise<void>
  update: (input: ObligationUpdateInput) => Promise<void>
  remove: (id: number) => Promise<void>
  /**
   * 이행 처리. Minor 2(8/14 검수 2차): 종전엔 `{id}` 만 보내 **데스크톱에서 done_by=NULL**
   * 로 적재됐다(주체 원칙 위반 — 웹은 STAMP 가 doneBy 를 세션으로 덮어써 구제되고 있었다).
   * 호출부가 현재 사용자를 실어 준다(웹에선 서버 STAMP 가 여전히 정본).
   */
  complete: (id: number, doneBy?: string) => Promise<void>
  /** 도래일 일괄 재설정(실사용 개시) — 재설정된 건수 반환 */
  resetDueDates: (by?: string) => Promise<number>

  // 모달 (생성/편집)
  modalOpen: boolean
  editing: ObligationDto | null
  openCreate: () => void
  openEdit: (item: ObligationDto) => void
  closeModal: () => void
}

export const useObligationStore = create<ObligationState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null })
    try {
      const res = (await window.api.invoke(ch('OBLIGATION_LIST'))) as ObligationDto[]
      set({ items: res, loading: false })
    } catch (err) {
      set({ error: err instanceof Error ? err.message : String(err), loading: false })
    }
  },

  create: async (input) => {
    await window.api.invoke(ch('OBLIGATION_CREATE'), input)
    await get().load()
  },

  update: async (input) => {
    await window.api.invoke(ch('OBLIGATION_UPDATE'), input)
    await get().load()
  },

  remove: async (id) => {
    await window.api.invoke(ch('OBLIGATION_DELETE'), { id })
    await get().load()
  },

  complete: async (id, doneBy) => {
    await window.api.invoke(ch('OBLIGATION_COMPLETE'), { id, doneBy })
    await get().load()
  },

  resetDueDates: async (by) => {
    const res = (await window.api.invoke(ch('OBLIGATION_RESET_DUE'), { by })) as {
      success: boolean
      count: number
    }
    await get().load()
    return res.success ? res.count : 0
  },

  modalOpen: false,
  editing: null,
  openCreate: () => set({ modalOpen: true, editing: null }),
  openEdit: (item) => set({ modalOpen: true, editing: item }),
  closeModal: () => set({ modalOpen: false, editing: null })
}))
