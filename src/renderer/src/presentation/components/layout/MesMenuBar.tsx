import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'

/**
 * PB2 ⓐ — 상단 MES 모듈 메뉴바 (29번 §11 "겉이 MES, 속이 SQ" · 시각 정본 = 30번 목업 v2).
 * 앱 정보구조 = MES 모듈 메뉴 중심(문법노트 3차 §1 트리 중 데일리Q 채택 7모듈),
 * 심사 요소는 오버레이: ⓐ하위 항목 SQ·IATF 배지 ⓑMES 에 없는 IATF 추가 요구 = 주황 ＋행
 * (연결 양식으로 직행 — 0135 'iatf-gap' 팩과 동일 근거) ⓒSQ 심사 뷰는 PB2-ⓒ에서 신설.
 * 배지 3색 = 토큰(SQ=secondary/primary · IATF=iatf-tint/ink · 갭=warn-tint/ink) — CVD 검증 잉크.
 * 미구현 기록 화면(쓰기 5종)은 PC 단계 예약으로 표기(disabled) — 방향을 미리 보여준다(정보 손실 0).
 */

interface MenuEntry {
  label: string
  /** 이동할 화면 — 없으면 form 직행 또는 예약(disabled) */
  page?: PageId
  /** 양식 직행(문서 작성 캔버스) — 매일 여는 양식의 지름길 */
  form?: string
  sq?: string[]
  iatf?: string[]
  /** IATF 추가 요구 ＋행(주황) — 보완 양식으로 직행 */
  gap?: boolean
  /** PC 단계 예약(미구현 기록 화면) */
  soon?: boolean
  note?: string
}

const MODULES: { key: string; label: string; items: MenuEntry[] }[] = [
  {
    key: 'master',
    label: '기준정보',
    items: [
      { label: '품번 트리 (BOM·라우팅)', page: 'item-tree' },
      { label: '공정 흐름 맵', page: 'process-flow' },
      { label: '품번 / ISIR', page: 'parts' },
      { label: '문서 BOM', page: 'document-bom' },
      { label: '프로세스 작업장', page: 'process-workbench' }
    ]
  },
  {
    key: 'material',
    label: '자재관리',
    items: [
      { label: '수집함 (입고·출하 전표)', page: 'receipt-inbox', sq: ['2_1', '2_2'] },
      { label: 'LOT 계보 조회', page: 'mes-trace', sq: ['5_1'], iatf: ['8.5.2'] },
      { label: '수입검사 관리대장', form: 'L2100-07', sq: ['2_1', '2_2'] }
    ]
  },
  {
    key: 'prod',
    label: '생산관리',
    items: [
      { label: 'MES 기록 현황 (커버리지)', page: 'mes-records', sq: ['1_4'] },
      { label: '정기 의무 (반복 업무)', page: 'obligations' },
      { label: '작업지시관리', soon: true, iatf: ['8.5.1'], note: 'PC 단계' },
      { label: '생산실적 등록 (초·중·종 연동)', soon: true, sq: ['1_4'], iatf: ['8.5.1'], note: 'PC 단계' },
      { label: '자주검사 등록 (초중종 3회)', soon: true, sq: ['1_4', '2_7'], iatf: ['8.6.1'], note: 'PC 단계' },
      { label: '＋ 예방보전(TPM) 기록', gap: true, form: 'L1100-12', iatf: ['8.5.1.5'], note: 'L1100-12 연결' },
      { label: '＋ 작업준비 검증(초물)', gap: true, form: 'M1200-10', iatf: ['8.5.1.3'], note: '초품검사 연결' }
    ]
  },
  {
    key: 'quality',
    label: '품질관리',
    items: [
      { label: '자주검사 CHECK SHEET', form: 'M1200-10', sq: ['1_4', '2_7'], iatf: ['8.6.1'] },
      { label: '순회검사(패트롤) 시트', form: 'L2100-05', sq: ['2_7'] },
      { label: '불량 대책서 (8D)', page: 'case-work', sq: ['6_6'], iatf: ['8.7'] },
      { label: 'MSA (측정시스템)', page: 'msa' },
      { label: '공정 FMEA', page: 'fmea' }
    ]
  },
  {
    key: 'equip',
    label: '설비관리',
    items: [
      { label: '설비 일상 점검표', form: 'L1100-07', sq: ['3_1'] },
      { label: '월간설비 정기점검 계획서', form: 'L1100-12', iatf: ['8.5.1.5'] },
      { label: '설비점검 등록 (현장)', soon: true, note: 'PC 단계' }
    ]
  },
  {
    key: 'mold',
    label: '금형관리',
    items: [{ label: '금형 타발수 대장', soon: true, note: '26번 A4 — 별도 판단' }]
  },
  {
    key: 'mgmt',
    label: '경영정보',
    items: [
      { label: '대시보드 (심사 준비 현황)', page: 'dashboard' },
      { label: 'SQ 대시보드', page: 'sq-dashboard' },
      { label: 'IATF 대시보드', page: 'iatf-dashboard' },
      { label: '팀별 허브', page: 'team-hub' }
    ]
  }
]

function Badge({ tone, children }: { tone: 'sq' | 'iatf' | 'gap'; children: string }): JSX.Element {
  return (
    <span
      className={cn(
        'inline-block text-[10.5px] font-semibold rounded-full px-2 py-[1px] whitespace-nowrap',
        tone === 'sq' && 'bg-secondary text-primary',
        tone === 'iatf' && 'bg-iatf-tint text-iatf-ink',
        tone === 'gap' && 'bg-warn-tint text-warn-ink'
      )}
    >
      {children}
    </span>
  )
}

export function MesMenuBar(): JSX.Element {
  const { currentPage, setPage, setSelectedFormCode } = useUIStore()
  const [open, setOpen] = useState<string | null>(null)
  const barRef = useRef<HTMLDivElement>(null)

  // 바깥 클릭 → 닫기 (드롭다운은 클릭·호버 병용 — 사무실 PC 문법. 현장 셸은 별도)
  useEffect(() => {
    const onDown = (e: MouseEvent): void => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const go = (entry: MenuEntry): void => {
    if (entry.soon) return
    setOpen(null)
    if (entry.page) {
      setPage(entry.page)
    } else if (entry.form) {
      // 양식 직행 — 갭 ＋행·매일 양식의 지름길(문서 작성에서도 동일 도달 가능 — 중복 진입)
      setSelectedFormCode(entry.form)
      setPage('form-builder')
    }
  }

  return (
    <div ref={barRef} className="flex items-center gap-0.5 min-w-0 overflow-x-auto" onMouseLeave={() => setOpen(null)}>
      {/* 목업 우측 링크 — SQ 심사 뷰(ⓒ 신설). TV현황판은 PF 후순위 — 미표기(확인표 §5) */}
      <button
        type="button"
        onClick={() => {
          setOpen(null)
          setPage('sq-audit')
        }}
        className={cn(
          'h-9 px-3 rounded-[10px] text-[13px] font-bold shrink-0 order-last ml-1',
          currentPage === 'sq-audit' ? 'bg-secondary text-secondary-foreground' : 'text-primary hover:bg-secondary/60'
        )}
      >
        SQ 심사 뷰
      </button>
      {MODULES.map((m) => {
        const active = m.items.some((it) => it.page && it.page === currentPage)
        return (
          <div key={m.key} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((o) => (o === m.key ? null : m.key))}
              onMouseEnter={() => setOpen((o) => (o ? m.key : o))}
              className={cn(
                'h-9 px-3 rounded-[10px] text-[13px] font-semibold flex items-center gap-1 transition-colors',
                open === m.key
                  ? 'bg-secondary text-secondary-foreground'
                  : active
                    ? 'text-primary'
                    : 'text-foreground/80 hover:bg-muted'
              )}
            >
              {m.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {open === m.key && (
              <div className="absolute top-[42px] left-0 min-w-[340px] bg-card border border-border rounded-xl shadow-[0_10px_28px_rgba(30,50,80,.16)] overflow-hidden z-50">
                {m.items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    disabled={it.soon}
                    onClick={() => go(it)}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13px] border-b border-border/50 last:border-b-0 transition-colors',
                      it.gap ? 'bg-warn-tint/40 hover:bg-warn-tint/70' : 'hover:bg-muted/60',
                      it.soon && 'opacity-45 cursor-not-allowed'
                    )}
                  >
                    <span className="min-w-0 truncate">
                      {it.label}
                      {it.note && <span className="ml-1.5 text-[11px] text-muted-foreground">({it.note})</span>}
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      {it.sq?.map((s) => (
                        <Badge key={s} tone="sq">{`SQ ${s}`}</Badge>
                      ))}
                      {it.iatf?.map((c) => (
                        <Badge key={c} tone={it.gap ? 'gap' : 'iatf'}>{it.gap ? `IATF ${c} 추가 요구` : `IATF ${c}`}</Badge>
                      ))}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
