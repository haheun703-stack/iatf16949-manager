import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './app.css'
import { useUIStore } from './presentation/stores/uiStore'

// CDP 캡처 파이프라인(scripts/capture.mjs)용 네비 헬퍼 — dev 전용.
// zustand 스토어는 모듈 스코프라 Runtime.evaluate(페이지 전역)에서 직접 못 잡는다 →
// window.__cap 으로 결정론적 페이지 전환/선택자 세팅을 노출한다. 프로덕션엔 포함되지 않음.
if (import.meta.env.DEV) {
  ;(window as unknown as { __cap: unknown }).__cap = {
    goto(page: string, opts?: Record<string, unknown>): string {
      const s = useUIStore.getState()
      if (opts) {
        if ('formCode' in opts) s.setSelectedFormCode(opts.formCode as string | null)
        if ('submissionId' in opts) s.setPendingSubmissionId(opts.submissionId as number | null)
        if ('team' in opts) s.setSelectedTeam(opts.team as never)
        if ('processCode' in opts) s.setSelectedProcessCode(opts.processCode as string | null)
        if ('clauseId' in opts) s.setSelectedClauseId(opts.clauseId as string | null)
      }
      s.setPage(page as never)
      return page
    },
    page(): string {
      return useUIStore.getState().currentPage
    }
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
