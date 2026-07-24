import { useUIStore } from '../../stores/uiStore'
import { Gnb } from './Gnb'
import { Dashboard } from '../dashboard/Dashboard'
import { SqReadinessPage } from '../sq-readiness/SqReadinessPage'
import { SqDashboardView } from '../sq-dashboard/SqDashboardView'
import { SelfAssessmentPage } from '../sq-assessment/SelfAssessmentPage'
import { SqTrackPage } from '../sq-track/SqTrackPage'
import { IatfDashboardView } from '../iatf-dashboard/IatfDashboardView'
import { DocBrowseView } from '../doc-browse/DocBrowseView'
import { PartsView } from '../parts/PartsView'
import { CaseWorkPage } from '../case-work/CaseWorkPage'
import { ProcessWorkbenchPage } from '../process-workbench/ProcessWorkbenchPage'
import { FormBuilderPage } from '../form-builder/FormBuilderPage'
import { DocumentBomPage } from '../document-bom/DocumentBomPage'
import { SchedulePage } from '../schedule/SchedulePage'
import { ObligationPage } from '../obligation/ObligationPage'
import { PpapView } from '../ppap/PpapView'
import { FmeaView } from '../fmea/FmeaView'
import { MsaView } from '../msa/MsaView'
import { ClauseCoverageView } from '../clause/ClauseCoverageView'
import { ApqpView } from '../apqp/ApqpView'
import { PortalHome } from '../home/PortalHome'
import { TeamHubView } from '../home/TeamHubView'
import { TeamDetailView } from '../home/TeamDetailView'
import { AboutView } from '../about/AboutView'
import { IntegrityView } from '../integrity/IntegrityView'
import { MesTraceView } from '../mestrace/MesTraceView'
import { MesRecordsView } from '../mesrecords/MesRecordsView'
import { ItemTreeView } from '../semimes/ItemTreeView'
import { ErrorBoundary } from '../shared/ErrorBoundary'
import { GlobalCopilot } from '../copilot/GlobalCopilot'
import { AiAuthorModal } from '../copilot/AiAuthorModal'
import { SimilarCaseModal } from '../copilot/SimilarCaseModal'

export function AppShell(): JSX.Element {
  const { currentPage } = useUIStore()

  // P8 — 양식 작성 화면(3분할 워크벤치)은 중앙 1400px 틀을 벗어나 모니터 전체 폭을 쓴다.
  //  좁은 폭에서 정답·목록·캔버스가 눌려 엑셀 뷰가 잘리던 문제 해소. 그 외 화면은 기존 중앙 정렬 유지.
  const fullBleed = currentPage === 'form-builder'

  return (
    <div className="h-screen flex flex-col">
      {/* 포털 1단계(7/16): 사이드바 제거 → 상단 GNB 통일. 홈 = 관제탑(팀별 오늘 할 일). */}
      <Gnb />
      <div className="flex flex-1 min-h-0">
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* 전 화면 공통 중앙 칼럼 — 화면의 94%·최대 1400px: 어떤 창 크기/글자 배율에서도
              좌우 여백이 반드시 생긴다 (7/16 사장님: "전체적인" 가운데 정렬·좌우 비율).
              인라인 스타일 고정 — 유틸리티 클래스 미생성/충돌에도 영향받지 않는 정본.
              단, 작성 화면(full-bleed)만 예외로 전체 폭. */}
          <div
            className={fullBleed ? 'min-w-0 w-full h-full' : 'min-w-0 w-full px-2 py-7'}
            style={
              fullBleed
                ? undefined
                : { maxWidth: 'min(1400px, 94vw)', marginLeft: 'auto', marginRight: 'auto' }
            }
          >
          {/* key=currentPage: 한 페이지에서 오류가 나도 다른 메뉴로 이동하면 자동 복구 */}
          <ErrorBoundary key={currentPage}>
            {currentPage === 'home' && <PortalHome />}
            {currentPage === 'team-hub' && <TeamHubView />}
            {currentPage === 'team-detail' && <TeamDetailView />}
            {currentPage === 'dashboard' && <Dashboard />}
            {currentPage === 'sq-dashboard' && <SqDashboardView />}
            {currentPage === 'sq-assessment' && <SelfAssessmentPage />}
            {currentPage === 'iatf-dashboard' && <IatfDashboardView />}
            {currentPage === 'doc-browse' && <DocBrowseView />}
            {currentPage === 'sq-readiness' && <SqReadinessPage />}
            {currentPage === 'sq-track' && <SqTrackPage />}
            {currentPage === 'parts' && <PartsView />}
            {currentPage === 'case-work' && <CaseWorkPage />}
            {currentPage === 'document-bom' && <DocumentBomPage />}
            {currentPage === 'process-workbench' && <ProcessWorkbenchPage />}
            {currentPage === 'form-builder' && <FormBuilderPage />}
            {currentPage === 'schedule' && <SchedulePage />}
            {currentPage === 'obligations' && <ObligationPage />}
            {currentPage === 'ppap' && <PpapView />}
            {currentPage === 'fmea' && <FmeaView />}
            {currentPage === 'msa' && <MsaView />}
            {currentPage === 'clause-tree' && <ClauseCoverageView />}
            {currentPage === 'apqp' && <ApqpView />}
            {currentPage === 'about' && <AboutView />}
            {currentPage === 'integrity' && <IntegrityView />}
            {currentPage === 'mes-trace' && <MesTraceView />}
            {currentPage === 'mes-records' && <MesRecordsView />}
            {currentPage === 'item-tree' && <ItemTreeView />}
          </ErrorBoundary>
          </div>
        </main>
      </div>
      <GlobalCopilot />
      <AiAuthorModal />
      <SimilarCaseModal />
    </div>
  )
}
