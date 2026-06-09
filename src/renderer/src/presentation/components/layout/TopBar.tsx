import { Bell, Settings, Building2, PanelLeftClose, PanelLeft } from 'lucide-react'
import { DdayBadge } from '../shared/DdayBadge'
import { useUIStore } from '../../stores/uiStore'

export function TopBar(): JSX.Element {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

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
