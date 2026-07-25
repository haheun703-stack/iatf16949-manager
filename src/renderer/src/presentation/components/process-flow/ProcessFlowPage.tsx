import { useCallback, useEffect, useState } from 'react'
import { Workflow, Printer, RefreshCw, Star } from 'lucide-react'
import type { ProcessFlowDto, ProcessFlowPartDto, ProcessFlowSymbol, CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { PageHeader } from '../shared/PageHeader'
import { CardShell } from '../shared/dash/DashKit'

/**
 * 공정 흐름 맵 (C군 2배치 선두) — CP(관리계획서)→라우팅 파이프라인 시각화.
 * 템플릿 C: 좌 품번 목록 380px / 우 흐름도 문서·미선택 요약.
 * [공정 흐름도 인쇄] 출력물이 ISIR 26종 중 #14 '공정 흐름도'(J1100-02 준용)를 해소한다.
 */

/** 공정흐름도 기호 관례: ▽ 입고/저장 · ○ 가공 · ◇ 검사 · ◆ 출하 */
const SYMBOL: Record<ProcessFlowSymbol, { glyph: string; cls: string }> = {
  입고: { glyph: '▽', cls: 'bg-data-tint text-data-ink' },
  가공: { glyph: '○', cls: 'bg-secondary text-secondary-foreground' },
  검사: { glyph: '◇', cls: 'bg-ok-tint text-ok-ink' },
  출하: { glyph: '◆', cls: 'bg-warn-tint text-warn-ink' }
}

export function ProcessFlowPage(): JSX.Element {
  const [parts, setParts] = useState<ProcessFlowPartDto[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [flow, setFlow] = useState<ProcessFlowDto | null>(null)
  const [company, setCompany] = useState<string>('')

  const loadList = useCallback(async () => {
    setLoading(true)
    try {
      const res = await window.api.invoke(window.api.channels.PROCESS_FLOW_LIST)
      setParts(res)
    } finally {
      setLoading(false)
    }
  }, [])

  const select = useCallback(async (partNo: string) => {
    setSelected(partNo)
    const res = await window.api.invoke(window.api.channels.PROCESS_FLOW_GET, { partNo })
    setFlow(res)
  }, [])

  useEffect(() => {
    void loadList()
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        setCompany(p?.companyName || '')
      } catch {
        /* noop */
      }
    })()
  }, [loadList])

  // 정본 품번 자동 선택 (없으면 첫 품번)
  useEffect(() => {
    if (!selected && parts.length > 0) {
      const primary = parts.find((p) => p.isPrimary)
      void select((primary ?? parts[0]).partNo)
    }
  }, [parts, selected, select])

  // 인쇄 = 기존 .print-document 패턴 재사용(양식 인쇄와 동일) — 흐름도 문서 영역만 출력
  const printFlow = (): void => window.print()

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0">
        <PageHeader
          icon={<Workflow className="w-5 h-5" />}
          title="공정 흐름 맵"
          sub={`관리계획서 공정 → 라우팅 파이프라인 · ${parts.length}개 품번 — 인쇄 출력 = ISIR #14 공정 흐름도(J1100-02 준용)`}
          actions={
            <>
              <button
                type="button"
                onClick={printFlow}
                disabled={!flow}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:bg-primary/90 disabled:opacity-50"
                title="현재 품번의 공정 흐름도를 인쇄합니다 (ISIR #14 제출물)"
              >
                <Printer className="w-4 h-4" /> 공정 흐름도 인쇄
              </button>
              <button
                type="button"
                onClick={() => void loadList()}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                title="새로고침"
              >
                <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
              </button>
            </>
          }
        />
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {/* 좌측 — 품번 목록 (템플릿 C: 380px 고정) */}
        <div className="w-[380px] shrink-0 overflow-y-auto pr-1 space-y-1.5">
          {loading && parts.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">불러오는 중...</div>
          )}
          {!loading && parts.length === 0 && (
            <div className="text-center text-[13px] text-muted-foreground py-12 px-4">
              CP 라우팅이 없습니다.
              <br />
              <span className="text-[11px]">ISIR(관리계획서) 적재 후 semimes-seed 를 실행하면 생성됩니다.</span>
            </div>
          )}
          {parts.map((p) => {
            const active = selected === p.partNo
            return (
              <button
                key={p.partNo}
                type="button"
                onClick={() => void select(p.partNo)}
                className={cn(
                  'w-full text-left rounded-lg px-3 py-2.5 transition-colors border',
                  active ? 'bg-muted border-primary/40' : 'bg-card border-border hover:bg-muted/50'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] font-bold tabular-nums">{p.partNo}</span>
                  {p.isPrimary && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5 shrink-0">
                      <Star className="w-2.5 h-2.5 fill-current" /> 심사 정본
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground tabular-nums shrink-0">{p.stepCount}공정</span>
                </div>
                <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {p.partName ?? ''}
                  {p.model ? ` · ${p.model}` : ''}
                  {p.customer ? ` · ${p.customer}` : ''}
                </div>
              </button>
            )
          })}
        </div>

        {/* 우측 — 흐름도 문서 (인쇄 대상) */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {flow ? (
            <FlowDocument flow={flow} company={company} />
          ) : (
            <CardShell title="공정 흐름 맵" cap="좌측에서 품번을 선택하세요">
              <div className="px-[18px] pb-4 text-[13px] text-muted-foreground leading-relaxed">
                관리계획서(CP) 공정을 라우팅으로 변환한 흐름을 문서 형태로 보여줍니다. 인쇄하면 ISIR 26종 중 #14
                '공정 흐름도' 제출물이 됩니다. 데이터 갱신 = ISIR 재적재 후 시드 재실행(일회성 복사 없음).
              </div>
            </CardShell>
          )}
        </div>
      </div>
    </div>
  )
}

/** 흐름도 문서 — 화면과 인쇄가 같은 DOM(.flow-print-root). 기호·외주·검사양식·관리항목 표기. */
function FlowDocument({ flow, company }: { flow: ProcessFlowDto; company: string }): JSX.Element {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <div className="print-document bg-card border border-border rounded-xl overflow-hidden">
      {/* 문서 헤더 — SPEC REVISION(화면문법노트 §2-4) 1급 표기 */}
      <div className="px-6 pt-5 pb-4 border-b border-border">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-[18px] font-extrabold tracking-tight">공정 흐름도</h2>
          <span className="text-[11px] text-muted-foreground">J1100-02 준용 · {company} · 출력일 {today}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1 text-[12.5px]">
          <div>
            <span className="text-muted-foreground mr-1.5">품번</span>
            <b className="font-mono tabular-nums">{flow.partNo}</b>
          </div>
          <div>
            <span className="text-muted-foreground mr-1.5">품명</span>
            <b>{flow.partName ?? '—'}</b>
          </div>
          <div>
            <span className="text-muted-foreground mr-1.5">고객/차종</span>
            <b>
              {flow.customer ?? '—'}
              {flow.model ? ` · ${flow.model}` : ''}
            </b>
          </div>
          <div>
            <span className="text-muted-foreground mr-1.5">SPEC REV</span>
            <b className="font-mono">
              {flow.revCode ?? '—'}
              {flow.revDate ? ` (${flow.revDate})` : ''}
            </b>
          </div>
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          근거: 관리계획서 {flow.steps.length}공정(ISIR) → 라우팅 파이프라인(source=cp) · 기호 ▽입고 ○가공 ◇검사 ◆출하
          {flow.qaManager ? ` · 품질보증 책임자 ${flow.qaManager}` : ''}
        </div>
      </div>

      {/* 스텝 흐름 — 세로 레일 + 스텝 카드 */}
      <div className="px-6 py-5">
        <div className="relative ml-4 border-l-2 border-border pl-6 space-y-3">
          {flow.steps.map((s) => {
            const sym = SYMBOL[s.symbol]
            return (
              <div key={`${s.seq}-${s.procCode}`} className="flow-step relative">
                {/* 레일 노드 */}
                <span
                  className={cn(
                    'absolute -left-[38px] top-1.5 w-6 h-6 rounded-full border border-border flex items-center justify-center text-[12px] font-bold',
                    sym.cls
                  )}
                  title={s.symbol}
                >
                  {sym.glyph}
                </span>
                <div className="rounded-[11px] border border-border px-4 py-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11.5px] font-bold text-muted-foreground tabular-nums w-8">{s.seq}</span>
                    <span className="text-[14px] font-bold">{s.procName}</span>
                    {s.procType === '외주' && (
                      <span className="text-[10px] font-bold bg-warn-tint text-warn-ink rounded-full px-1.5 py-0.5">외주</span>
                    )}
                    {s.outYn === 1 && (
                      <span className="text-[10px] font-bold bg-primary/10 text-primary rounded-full px-1.5 py-0.5">출하</span>
                    )}
                    {s.inspFormCode && (
                      <span
                        className="ml-auto text-[10.5px] text-muted-foreground shrink-0"
                        title={s.inspFormName ?? undefined}
                      >
                        검사기록 <b className="font-mono">{s.inspFormCode}</b>
                      </span>
                    )}
                  </div>
                  {s.controlItems.length > 0 && (
                    <div className="mt-1.5 space-y-0.5">
                      {s.controlItems.map((c, i) => (
                        <div key={i} className="text-[11.5px] text-muted-foreground leading-snug">
                          <span className="text-foreground font-medium">{c.item ?? '—'}</span>
                          {c.method ? ` · ${c.method}` : ''}
                          {c.frequency ? ` · ${c.frequency}` : ''}
                          {c.equipment ? ` · ${c.equipment}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
