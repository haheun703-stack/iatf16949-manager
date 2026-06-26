import { useUIStore } from '../../stores/uiStore'
import { TopBar } from './TopBar'
import { Sidebar } from './Sidebar'
import { Dashboard } from '../dashboard/Dashboard'
import { SqReadinessPage } from '../sq-readiness/SqReadinessPage'
import { CaseWorkPage } from '../case-work/CaseWorkPage'
import { ProcessWorkbenchPage } from '../process-workbench/ProcessWorkbenchPage'
import { FormBuilderPage } from '../form-builder/FormBuilderPage'
import { DocumentBomPage } from '../document-bom/DocumentBomPage'
import { SchedulePage } from '../schedule/SchedulePage'
import { ComingSoon } from '../shared/ComingSoon'
import { ErrorBoundary } from '../shared/ErrorBoundary'
import { GlobalCopilot } from '../copilot/GlobalCopilot'

export function AppShell(): JSX.Element {
  const { currentPage } = useUIStore()

  return (
    <div className="h-screen flex flex-col">
      <TopBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          {/* key=currentPage: 한 페이지에서 오류가 나도 다른 메뉴로 이동하면 자동 복구 */}
          <ErrorBoundary key={currentPage}>
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'sq-readiness' && <SqReadinessPage />}
            {currentPage === 'case-work' && <CaseWorkPage />}
            {currentPage === 'document-bom' && <DocumentBomPage />}
            {currentPage === 'process-workbench' && <ProcessWorkbenchPage />}
            {currentPage === 'form-builder' && <FormBuilderPage />}
            {currentPage === 'schedule' && <SchedulePage />}
            {currentPage === 'form-chain' && (
              <ComingSoon title="문서 연결고리" subtitle="다음 단계에서 구축됩니다 (Step C)" />
            )}
            {currentPage === 'clause-tree' && (
              <ComingSoon title="조항 트리" subtitle="다음 단계에서 구축됩니다 (Step D)" />
            )}
            {currentPage === 'team' && (
              <ComingSoon title="팀" subtitle="다음 단계에서 구축됩니다 (Step E)" />
            )}
          </ErrorBoundary>
        </main>
      </div>
      <GlobalCopilot />
    </div>
  )
}
