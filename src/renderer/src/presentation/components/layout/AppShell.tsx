import { useEffect } from 'react'
import { useUIStore } from '../../stores/uiStore'
import { markPage, startPerfWatch } from '../../lib/perfWatch'
import { Sidebar, TopBar } from './Sidebar'
import { MesMenuBar, MesSubTabs } from './MesMenuBar'
import { MesHome } from '../mes-home/MesHome'
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
import { ReceiptInboxView } from '../semimes/ReceiptInboxView'
import { SqAuditView } from '../sq-audit/SqAuditView'
import { KpiGridView } from '../kpi-grid/KpiGridView'
import { PartProcessView } from '../home/PartProcessView'
import { InspEntryView } from '../semimes-entry/InspEntryView'
import { ProdEntryView } from '../semimes-entry/ProdEntryView'
import { WorkOrderView } from '../semimes-entry/WorkOrderView'
import { ProdHistoryView } from '../semimes-entry/ProdHistoryView'
import { InspHistoryView } from '../semimes-entry/InspHistoryView'
import { MatStockView } from '../semimes-entry/MatStockView'
import { MatReceiptsView } from '../semimes-entry/MatReceiptsView'
import { SpecRegistryView } from '../semimes-entry/SpecRegistryView'
import { PpmDashView } from '../semimes-entry/PpmDashView'
import { ItemMasterView } from '../semimes-entry/ItemMasterView'
import { PartnerMasterView } from '../semimes-entry/PartnerMasterView'
import { BomBrowseView } from '../semimes-entry/BomBrowseView'
import { CodeMasterView } from '../semimes-entry/CodeMasterView'
import { WorkCalendarView } from '../semimes-entry/WorkCalendarView'
import { PerfIndicatorsView } from '../semimes-entry/PerfIndicatorsView'
import { ProdChartView } from '../semimes-entry/ProdChartView'
import { TraceBandView } from '../semimes-entry/TraceBandView'
import { EquipMasterView } from '../semimes-entry/EquipMasterView'
import { EquipCheckHistoryView } from '../semimes-entry/EquipCheckHistoryView'
import { MoldView } from '../semimes-entry/MoldView'
import { KpiIndicatorView } from '../semimes-entry/KpiIndicatorView'
import { DailyReportView } from '../semimes-entry/DailyReportView'
import { XbarRView } from '../semimes-entry/XbarRView'
import { TvBoardView } from '../tv-board/TvBoardView'
import { ProcessFlowPage } from '../process-flow/ProcessFlowPage'
import { ScreenPermPage } from '../screen-perm/ScreenPermPage'
import { usePermStore } from '../../stores/permStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { ErrorBoundary } from '../shared/ErrorBoundary'
import { ConfirmDialogHost } from '../shared/ConfirmDialog'
import { GlobalCopilot } from '../copilot/GlobalCopilot'
import { AiAuthorModal } from '../copilot/AiAuthorModal'
import { SimilarCaseModal } from '../copilot/SimilarCaseModal'

export function AppShell(): JSX.Element {
  const { currentPage } = useUIStore()
  // M-11(8/13 검수): 권한관리 화면은 메뉴 숨김(execOnly)만으로는 못 막는다 — 사용자 전환·
  // 딥링크로 열람 가능(perm:list 는 로그인만). 진입 자체를 role 로 가드(저장은 서버 403 정본).
  // N-7(8/14 검수 2차): 그 가드가 **로컬 role**(UserSwitcher = localStorage)을 믿고 있었다 —
  // 웹에서 팀원이 비번 없이 스위처 클릭 1회로 '경영진'을 골라 매트릭스를 열람할 수 있었다.
  // 판정 근거를 서버 세션(auth:me)으로 옮긴다. 데스크톱은 세션 개념이 없어 로컬 판정 유지
  // (그 축은 서버 강제도 자기신고라 여기서 못 닫는다 — N-9·Minor 4 잔존, 화면에 고지).
  const users = useActiveUserStore((s) => s.users)
  const activeUserId = useActiveUserStore((s) => s.activeUserId)
  const session = useActiveUserStore((s) => s.session)
  const sessionChecked = useActiveUserStore((s) => s.sessionChecked)
  const isExec = session
    ? session.role === 'executive'
    : users.find((u) => u.id === activeUserId)?.role === 'executive'

  // 8/12 계측 트랙(도장 — 육안 체감 "보였다" = 원격 한정 가설 기각): 멎음의 축 판별용
  // 관찰자 기동 + 화면 전환 좌표 마크. 열람 = F12 → __perfLog() (perfWatch.ts 참조)
  useEffect(() => {
    startPerfWatch()
  }, [])
  // W4-B 화면 숨김(보조): 세션 사용자의 유효 권한 1회 로드(웹 = perm:effective ·
  // 데스크톱/실패 = bypass 현행 유지). 서버 SCREEN_GUARD 가 정본 — 이건 메뉴 보조막.
  const loadPerm = usePermStore((s) => s.load)
  useEffect(() => {
    void loadPerm()
  }, [loadPerm])
  useEffect(() => {
    markPage(currentPage)
  }, [currentPage])

  // P8 — 양식 작성 화면(3분할 워크벤치)은 중앙 1400px 틀을 벗어나 모니터 전체 폭을 쓴다.
  //  좁은 폭에서 정답·목록·캔버스가 눌려 엑셀 뷰가 잘리던 문제 해소. 그 외 화면은 기존 중앙 정렬 유지.
  const fullBleed = currentPage === 'form-builder'

  // 35호 — 전광판은 5층 골격 예외(32호 §1 "별도 전광판 모드로 분리"): 껍데기 없이 전체화면.
  // 훅(perfWatch 마크 포함)은 위에서 이미 걸렸다 — ESC/닫기로 복귀하면 껍데기 복원.
  if (currentPage === 'tv-board') {
    return (
      <ErrorBoundary key={currentPage}>
        <TvBoardView />
      </ErrorBoundary>
    )
  }

  return (
    <div className="h-screen flex">
      {/* 대시보드형 리프레시(17번, 7/26): 상단 GNB → 좌측 다크 사이드바 + 상단 도구 스트립.
          라우팅·PageId·화면 무수정 — 껍데기 교체만. */}
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* 32호 §1 5층 골격: ①타이틀 줄 ②남색 메가바 ③2차 탭 줄 → ④⑤(툴바·그리드)는 각 화면 */}
        <TopBar />
        <MesMenuBar />
        <MesSubTabs />
        <main className="flex-1 min-w-0 overflow-y-auto">
          {/* 전 화면 공통 중앙 칼럼 — 최대 1400px 유지(7/16 정본), 사이드바 만큼 줄어든 가용폭 기준.
              인라인 스타일 고정 — 유틸리티 클래스 미생성/충돌에도 영향받지 않는 정본.
              단, 작성 화면(full-bleed)만 예외로 전체 폭. */}
          <div
            className={fullBleed ? 'min-w-0 w-full h-full' : 'min-w-0 w-full px-6 py-6'}
            style={
              fullBleed
                ? undefined
                : { maxWidth: 'min(1400px, 100%)', marginLeft: 'auto', marginRight: 'auto' }
            }
          >
          {/* key=currentPage: 한 페이지에서 오류가 나도 다른 메뉴로 이동하면 자동 복구 */}
          <ErrorBoundary key={currentPage}>
            {currentPage === 'home' && <MesHome />}
            {currentPage === 'audit-hub' && <PortalHome />}
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
            {currentPage === 'receipt-inbox' && <ReceiptInboxView />}
            {currentPage === 'sq-audit' && <SqAuditView />}
            {currentPage === 'kpi-grid' && <KpiGridView />}
            {currentPage === 'part-process' && <PartProcessView />}
            {currentPage === 'today-board' && <PortalHome mode="board" />}
            {currentPage === 'insp-entry' && <InspEntryView />}
            {currentPage === 'prod-entry' && <ProdEntryView />}
            {currentPage === 'work-order' && <WorkOrderView />}
            {currentPage === 'prod-history' && <ProdHistoryView />}
            {currentPage === 'insp-incoming' && <InspHistoryView fixedKind="수입" />}
            {currentPage === 'insp-history' && <InspHistoryView />}
            {currentPage === 'mat-stock' && <MatStockView />}
            {currentPage === 'mat-receipts' && <MatReceiptsView />}
            {currentPage === 'insp-spec' && <SpecRegistryView />}
            {currentPage === 'ppm-dash' && <PpmDashView />}
            {currentPage === 'item-master' && <ItemMasterView />}
            {currentPage === 'partner-master' && <PartnerMasterView />}
            {currentPage === 'bom-browse' && <BomBrowseView />}
            {currentPage === 'code-master' && <CodeMasterView />}
            {currentPage === 'work-calendar' && <WorkCalendarView />}
            {currentPage === 'perf-indicators' && <PerfIndicatorsView />}
            {currentPage === 'prod-chart' && <ProdChartView />}
            {currentPage === 'trace-band' && <TraceBandView />}
            {currentPage === 'equip-master' && <EquipMasterView />}
            {currentPage === 'equip-check' && <EquipCheckHistoryView />}
            {currentPage === 'mold-master' && <MoldView />}
            {currentPage === 'kpi-indicators' && <KpiIndicatorView />}
            {currentPage === 'daily-report' && <DailyReportView />}
            {currentPage === 'xbar-r' && <XbarRView />}
            {currentPage === 'process-flow' && <ProcessFlowPage />}
            {currentPage === 'screen-perm' &&
              // N-7: 세션 확인 전에는 거부 화면을 띄우지 않는다(로드 직후 한 틱 "권한 없음"이
              // 번쩍이던 가짜 거부 방지 — 판정 유예를 정직하게 표기).
              (!sessionChecked ? (
                <div className="rounded-[14px] border border-border bg-card shadow-card p-8 text-center">
                  <div className="text-[12.5px] text-muted-foreground">권한 확인 중…</div>
                </div>
              ) : isExec ? (
                <ScreenPermPage />
              ) : (
                <div className="rounded-[14px] border border-border bg-card shadow-card p-8 text-center">
                  <div className="text-[15px] font-bold mb-1">화면별 권한관리 — 최종관리자 전용</div>
                  <div className="text-[12.5px] text-muted-foreground">
                    권한 배분은 최종관리자(사장님) 고유 권한입니다(판정 ① 8/13). 열람이 필요하면 관리자에게 문의하세요.
                  </div>
                </div>
              ))}
          </ErrorBoundary>
          </div>
        </main>
      </div>
      <GlobalCopilot />
      <AiAuthorModal />
      <SimilarCaseModal />
      <ConfirmDialogHost />
    </div>
  )
}
