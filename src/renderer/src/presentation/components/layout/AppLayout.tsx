import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { MainContent } from './MainContent'

export function AppLayout(): JSX.Element {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground font-sans">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar />
        <MainContent />
      </div>
    </div>
  )
}
