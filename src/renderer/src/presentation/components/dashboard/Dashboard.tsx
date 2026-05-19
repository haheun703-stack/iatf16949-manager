import { AuditReadinessPanel } from './AuditReadinessPanel'
import { PrevAuditScores } from './PrevAuditScores'
import { CriticalItemsList } from './CriticalItemsList'
import { KpiStrip } from './KpiStrip'

export function Dashboard(): JSX.Element {
  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold">심사 준비 현황</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          2026년 정기 IATF 16949 인증심사 대비 — TPC AM사업부
        </p>
      </div>

      <KpiStrip />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AuditReadinessPanel />
        </div>
        <div>
          <PrevAuditScores />
        </div>
      </div>

      <CriticalItemsList />
    </div>
  )
}
