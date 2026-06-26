import { create } from 'zustand'
import type { CopilotMessage, CopilotSource, CopilotAskResponse } from '@shared/ipc-types'

export interface CopilotTurn {
  role: 'user' | 'assistant'
  text: string
  sources?: CopilotSource[]
  tools?: Array<{ name: string; ok: boolean }>
  error?: boolean
}

interface CopilotState {
  open: boolean
  loading: boolean
  turns: CopilotTurn[]
  toggle: () => void
  setOpen: (v: boolean) => void
  clear: () => void
  ask: (text: string) => Promise<void>
}

export const useCopilotStore = create<CopilotState>((set, get) => ({
  open: false,
  loading: false,
  turns: [],
  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (v) => set({ open: v }),
  clear: () => set({ turns: [] }),
  ask: async (text) => {
    const t = text.trim()
    if (!t || get().loading) return
    set((s) => ({ turns: [...s.turns, { role: 'user', text: t }], loading: true }))
    // 대화 이력(오류 턴 제외) → API 메시지
    const messages: CopilotMessage[] = get()
      .turns.filter((x) => !x.error)
      .map((x) => ({ role: x.role, text: x.text }))
    try {
      const res = (await window.api.invoke(window.api.channels.AI_COPILOT_ASK, {
        messages
      })) as CopilotAskResponse
      if (res.success) {
        set((s) => ({
          turns: [...s.turns, { role: 'assistant', text: res.text || '(빈 응답)', sources: res.sources, tools: res.tools }],
          loading: false
        }))
      } else {
        set((s) => ({
          turns: [...s.turns, { role: 'assistant', text: res.error || 'AI 오류', error: true }],
          loading: false
        }))
      }
    } catch (err) {
      set((s) => ({
        turns: [...s.turns, { role: 'assistant', text: err instanceof Error ? err.message : String(err), error: true }],
        loading: false
      }))
    }
  }
}))
