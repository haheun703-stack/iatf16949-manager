import { useEffect, useState } from 'react'
import { ListChecks, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { TEAMS } from '@shared/team-theme'
import type { ClauseCoverageDto } from '@shared/ipc-types'

// 책임팀 배지 색 — team-theme 정본에서 파생(부서명 → 팀 고유색). 임의 색 재정의 금지.
const DEPT_STYLE: Record<string, { backgroundColor: string; color: string }> = {}
for (const t of TEAMS) {
  for (const dept of t.deptKeys) {
    DEPT_STYLE[dept] = { backgroundColor: t.tintBg, color: t.darkText }
  }
}
// 프로세스 코드 → 짧은 이름 칩
const PROC_NAME: Record<string, string> = {
  'CP-01': '영업', 'CP-02': '개발', 'CP-03': '생산',
  'MP-01': '경영', 'MP-02': '리스크', 'MP-03': '인적',
  'SP-01': '구매', 'SP-02': '검사', 'SP-03': '개선'
}

/**
 * IATF 조항(4~10)별 커버리지 — 정본 품질환경매뉴얼 0.7 매트릭스 기반.
 * "이 조항, 우리가 어떤 규정/프로세스로 커버하나"를 한 화면에. 심사 대응용.
 */
export function ClauseCoverageView(): JSX.Element {
  const [data, setData] = useState<ClauseCoverageDto[] | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const res = (await window.api.invoke(
          window.api.channels.CLAUSE_COVERAGE
        )) as ClauseCoverageDto[]
        if (alive) setData(res)
      } catch {
        if (alive) setData([])
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> 불러오는 중...
      </div>
    )
  }

  const totalRegs = new Set(data.flatMap((c) => c.regs.map((r) => r.regCode))).size

  return (
    <div className="max-w-5xl space-y-5">
      <PageHeader
        icon={<ListChecks className="w-5 h-5" />}
        title="IATF 조항별 커버리지"
        sub={`품질환경매뉴얼 0.7 프로세스 매트릭스(조항) 기준 · IATF 4~10장에 어떤 규정·프로세스가 걸려있는지 · 총 ${totalRegs}개 규정`}
      />

      {data.map((c) => (
        <section key={c.clause} className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center min-w-[40px] h-9 px-2 rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              {c.clause}장
            </span>
            <span className="font-semibold">{c.title}</span>
            <span
              className={cn(
                'ml-auto text-xs font-semibold px-2 py-0.5 rounded-full',
                c.regs.length ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              )}
            >
              규정 {c.regs.length}
            </span>
          </div>
          {c.regs.length === 0 ? (
            <div className="px-4 py-4 flex items-center gap-2 text-sm text-rose-600">
              <AlertTriangle className="w-4 h-4" /> 이 조항을 커버하는 규정이 없습니다.
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {c.regs.map((r) => (
                <li
                  key={r.regCode}
                  className="px-4 py-2 flex items-center gap-3 text-sm hover:bg-muted/30"
                >
                  <span className="font-mono font-bold text-[12px] text-primary w-24 shrink-0">
                    {r.regCode}
                  </span>
                  <span className="flex-1 min-w-0 truncate" title={r.name}>
                    {r.name}
                  </span>
                  {r.respDept && (
                    <span
                      className={cn(
                        'text-[11px] font-semibold px-2 py-0.5 rounded shrink-0',
                        !DEPT_STYLE[r.respDept] && 'bg-muted text-muted-foreground'
                      )}
                      style={DEPT_STYLE[r.respDept]}
                    >
                      {r.respDept}
                    </span>
                  )}
                  <div className="hidden sm:flex gap-1 shrink-0 w-44 justify-end flex-wrap">
                    {r.processes.map((p) => (
                      <span
                        key={p}
                        title={p}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-foreground/70"
                      >
                        {PROC_NAME[p] ?? p}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  )
}
