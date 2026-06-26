import { Bell, Settings, Building2, PanelLeftClose, PanelLeft, Sparkles, Wand2 } from 'lucide-react'
import { DdayBadge } from '../shared/DdayBadge'
import { useUIStore } from '../../stores/uiStore'
import { useCopilotStore } from '../../stores/copilotStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'

export function TopBar(): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const toggleCopilot = useCopilotStore((s) => s.toggle)
  const copilotOpen = useCopilotStore((s) => s.open)
  const toggleAuthor = useAiAuthorStore((s) => s.toggle)

  return (
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          title={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
          className="w-8 h-8 -ml-1 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold">TPC · AM사업부</div>
          <div className="text-[11px] text-muted-foreground">IATF 16949 품질경영시스템</div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <DdayBadge />
        <button
          type="button"
          onClick={toggleAuthor}
          aria-label="AI 초안 작성"
          title="AI 초안 작성 — 메모를 공식 양식 초안으로(결재 필요)"
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          AI 작성
        </button>
        <button
          type="button"
          onClick={toggleCopilot}
          aria-label="AI 코파일럿"
          title="AI 코파일럿 — 우리 데이터에 질문(읽기전용)"
          className={`h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${
            copilotOpen
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'border border-border hover:bg-muted text-foreground'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          코파일럿
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label="알림"
        >
          <Bell className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="w-8 h-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
          aria-label="설정"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
