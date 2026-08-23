import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { usePermStore } from '../../stores/permStore'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { isAddonLocked } from '../../lib/license'

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
  /** 진입 전용 별칭(다른 모듈이 정본) — 메가바 점등·2차 탭 귀속에서 제외(8/6 검수: 이중 등재 정리) */
  alias?: boolean
  /** manager+ 전용 항목(관리 화면) — member 에겐 미표출 */
  adminOnly?: boolean
  /** executive 전용 항목(W4-B 판정 ① — 권한 배분은 사장님 고유) — 그 외 미표출 */
  execOnly?: boolean
  note?: string
}

// W4-B: 권한 매트릭스 관리자 화면의 메뉴 트리 원천으로도 쓰인다(그림33 좌측 트리) — export.
export const MODULES: { key: string; label: string; items: MenuEntry[] }[] = [
  {
    key: 'master',
    label: '기준정보',
    items: [
      { label: '품목코드관리', page: 'item-master' },
      { label: '거래처코드관리', page: 'partner-master' },
      { label: 'BOM 조회 (정/역전개)', page: 'bom-browse' },
      { label: 'BOM관리 — 품번 트리 (레벨·라우팅)', page: 'item-tree' },
      { label: '코드관리', page: 'code-master' },
      { label: '공정 흐름 맵', page: 'process-flow' },
      { label: '품번 / ISIR', page: 'parts' },
      { label: '문서 BOM', page: 'document-bom' },
      { label: '프로세스 작업장', page: 'process-workbench' },
      // W4-B(#19) — 그림33 화면별 권한관리(판정 ① 8/13: 사장님 전용)
      { label: '화면별 권한관리', page: 'screen-perm', execOnly: true }
    ]
  },
  {
    key: 'material',
    label: '자재관리',
    items: [
      { label: '수집함 (입고·출하 전표)', page: 'receipt-inbox', sq: ['2_1', '2_2'] },
      { label: '자재입하 / 입고내역', page: 'mat-receipts', sq: ['2_1', '2_2'] },
      { label: '재고현황 (자재)', page: 'mat-stock' },
      { label: 'LOT 계보 조회', page: 'mes-trace', sq: ['5_1'], iatf: ['8.5.2'] },
      { label: '수입검사 관리대장', form: 'L2100-07', sq: ['2_1', '2_2'] }
    ]
  },
  {
    key: 'prod',
    label: '생산관리',
    items: [
      { label: '작업지시관리', page: 'work-order', iatf: ['8.5.1'] },
      { label: '생산실적 등록 (초·중·종 연동)', page: 'prod-entry', sq: ['1_4'], iatf: ['8.5.1'] },
      { label: '생산실적 현황 (상세·일별·월별)', page: 'prod-history', sq: ['1_4'] },
      { label: '생산현황 차트', page: 'prod-chart' },
      { label: '일일 실적현황 (결재란 인쇄)', page: 'daily-report' },
      { label: '추적 공정 흐름 (지시→공정→LOT)', page: 'trace-band', sq: ['5_1'], iatf: ['8.5.2'] },
      { label: '조업달력 (가동일 = 공유 분모)', page: 'work-calendar' },
      { label: '자주검사 등록 (초중종 3회)', page: 'insp-entry', sq: ['1_4', '2_7'], iatf: ['8.6.1'] },
      { label: 'MES 기록 현황 (커버리지)', page: 'mes-records', sq: ['1_4'] },
      { label: '품번×공정 실황 (수불 상위)', page: 'part-process' },
      { label: '정기 의무 (반복 업무)', page: 'obligations' },
      { label: '＋ 예방보전(TPM) 기록', gap: true, form: 'L1100-12', iatf: ['8.5.1.5'], note: 'L1100-12 연결' },
      { label: '＋ 작업준비 검증(초물)', gap: true, form: 'M1200-10', iatf: ['8.5.1.3'], note: '초품검사 연결' }
    ]
  },
  {
    key: 'quality',
    label: '품질관리',
    items: [
      { label: '검사 등록 (수입·공정·패트롤·출하)', page: 'insp-entry', alias: true, sq: ['2_1', '2_7'], iatf: ['8.6.1'] },
      { label: '수입검사내역 조회', page: 'insp-incoming', sq: ['2_1', '2_2'] },
      { label: '품질검사내역 (구분 통합)', page: 'insp-history', sq: ['1_4', '2_7'] },
      { label: '검사기준(SPEC) 등록 — 개정=신규 행', page: 'insp-spec', sq: ['2_7'], iatf: ['8.6.1'] },
      { label: '부적합 PPM 대시보드', page: 'ppm-dash', sq: ['6_6'] },
      { label: 'X BAR R 관리도', page: 'xbar-r', sq: ['4_x'] },
      { label: '자주검사 CHECK SHEET (양식)', form: 'M1200-10', sq: ['1_4', '2_7'], iatf: ['8.6.1'] },
      { label: '순회검사(패트롤) 시트 (양식)', form: 'L2100-05', sq: ['2_7'] },
      { label: '불량 대책서 (8D)', page: 'case-work', sq: ['6_6'], iatf: ['8.7'] },
      { label: 'MSA (측정시스템)', page: 'msa' },
      { label: '공정 FMEA', page: 'fmea' }
    ]
  },
  {
    key: 'equip',
    label: '설비관리',
    items: [
      { label: '설비등록 (마스터)', page: 'equip-master' },
      { label: '설비 일상점검 내역 (MES+앱)', page: 'equip-check', sq: ['3_1'] },
      { label: '설비 일상 점검표', form: 'L1100-07', sq: ['3_1'] },
      { label: '월간설비 정기점검 계획서', form: 'L1100-12', iatf: ['8.5.1.5'] }
    ]
  },
  {
    key: 'mold',
    label: '금형관리',
    items: [
      { label: '금형마스터·타발수 (실적 연동)', page: 'mold-master', iatf: ['8.5.1.6'] },
      { label: '금형 점검 체크시트 (일상·정기·보관)', form: 'L1100-25', sq: ['3_4'] },
      { label: '금형 진행사항 점검', form: 'B2100-06' },
      { label: '지그·금형 보관 위치 식별표', form: 'L1200-11' }
    ]
  },
  {
    key: 'mgmt',
    label: '경영정보',
    items: [
      { label: 'KPI 실적 그리드 (엑셀형)', page: 'kpi-grid' },
      { label: 'KPI 기준정보관리 (목표·방향)', page: 'kpi-indicators' },
      { label: '성과 지표 (양품률·수입 PPM)', page: 'perf-indicators' },
      { label: '대시보드 (심사 준비 현황)', page: 'dashboard' },
      { label: '팀별 허브', page: 'team-hub' }
    ]
  },
  // 32호 §1-2 — 심사대응(SQ/IATF) 1차 메뉴 신설: "속이 SQ"의 전용 방(§3-3 전부 수용)
  {
    key: 'audit',
    label: '심사대응',
    items: [
      { label: '관제탑 (문제·TOP5·심사 뷰)', page: 'audit-hub' },
      { label: '오늘 할 일 보드', page: 'today-board' },
      { label: 'SQ 심사 뷰 (항목×공정)', page: 'sq-audit' },
      { label: 'SQ 대시보드', page: 'sq-dashboard' },
      { label: 'SQ 자체평가', page: 'sq-assessment' },
      { label: 'SQ 준비도', page: 'sq-readiness' },
      { label: 'SQ 심사 트랙', page: 'sq-track' },
      { label: 'IATF 대시보드', page: 'iatf-dashboard' },
      { label: '조항 커버리지', page: 'clause-tree' }
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

// W4-B 화면 숨김(보조): 읽기 꺼진 화면·member 의 관리 항목을 메뉴에서 감춘다.
// 서버 SCREEN_GUARD 가 정본(쓰기·수정·삭제·엑셀 403) — 여기는 어수선함 방지용 보조막.
function useMenuVisible(): (it: MenuEntry) => boolean {
  const { bypass, rules } = usePermStore()
  const { users, activeUserId, session } = useActiveUserStore()
  // N-7(8/14 검수 2차): execOnly·adminOnly 판정도 세션 role 정본 — 종전엔 로컬 스위처 선택을
  // 믿어서 팀원이 '경영진'으로 갈아타면 관리 메뉴가 그대로 떴다(진입은 AppShell 가드가
  // 막지만 메뉴가 뜨는 것 자체가 오안내). 데스크톱(세션 없음) = 로컬 판정 유지.
  const role = session ? session.role : users.find((u) => u.id === activeUserId)?.role
  return (it: MenuEntry): boolean => {
    if (it.execOnly && role !== 'executive') return false
    if (it.adminOnly && role !== 'manager' && role !== 'executive') return false
    if (it.page && !bypass) {
      const r = rules[it.page]
      if (r && !r.read) return false
    }
    return true
  }
}

export function MesMenuBar(): JSX.Element {
  const { currentPage, setPage, setSelectedFormCode } = useUIStore()
  const session = useActiveUserStore((s) => s.session) // M2 라이선스 🔒 표시용
  const visible = useMenuVisible()
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
    // 32호 §1-2 — 남색 메가바(캡쳐 문법 · §7-1 진한 파스텔톤은 강조 전용)
    <div
      ref={barRef}
      // 8/23 사장님 지적: overflow-x-auto 는 브라우저 규칙상 overflow-y 도 auto 로 바꿔 절대배치 드롭다운(top 40px)을
      // 막대 높이 안에서 잘라 버렸다 — 눌러도 목록이 안 보이던 원인. visible 로(좁은 화면은 flex-wrap 으로 줄바꿈).
      className="w-full flex flex-wrap items-center gap-0.5 px-3 min-w-0 overflow-visible bg-mega-bg"
      onMouseLeave={() => setOpen(null)}
    >
      {MODULES.map((m) => {
        const active = m.items.some((it) => it.page && it.page === currentPage && !it.alias)
        return (
          <div key={m.key} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen((o) => (o === m.key ? null : m.key))}
              onMouseEnter={() => setOpen((o) => (o ? m.key : o))}
              className={cn(
                'h-10 px-3.5 text-[13.5px] font-bold flex items-center gap-1 transition-colors',
                open === m.key || active ? 'bg-mega-active text-white' : 'text-mega-ink hover:bg-mega-active/60'
              )}
            >
              {m.label}
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            {open === m.key && (
              <div className="absolute top-[40px] left-0 min-w-[340px] bg-card border border-border rounded-b-xl shadow-[0_10px_28px_rgba(30,50,80,.16)] overflow-hidden z-50">
                {m.items.filter(visible).map((it) => (
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
                      {it.page && isAddonLocked(it.page, session) && (
                        <span className="text-[11px] text-amber-600" title="IATF 애드온 라이선스 필요" data-testid="addon-lock-badge">🔒 애드온</span>
                      )}
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

/**
 * 32호 §1-3 — 2차 메뉴 탭 줄: 현재 화면이 속한 1차 메뉴의 하위 화면들을 가로 탭으로
 * 나열, 현재 화면 하이라이트(캡쳐 "작업지시관리" 강조 문법). 모듈 밖 화면이면 미표출.
 */
export function MesSubTabs(): JSX.Element | null {
  const { currentPage, setPage, setSelectedFormCode } = useUIStore()
  const visible = useMenuVisible()
  const module = MODULES.find((m) => m.items.some((it) => it.page === currentPage && !it.alias))
  if (!module) return null
  return (
    <div className="w-full flex items-center gap-1 px-3 py-1 bg-card border-b border-border overflow-x-auto">
      {module.items.filter(visible).map((it) => {
        const isCur = it.page === currentPage
        return (
          <button
            key={it.label}
            type="button"
            disabled={it.soon}
            onClick={() => {
              if (it.soon) return
              if (it.page) setPage(it.page)
              else if (it.form) {
                setSelectedFormCode(it.form)
                setPage('form-builder')
              }
            }}
            className={cn(
              'px-3 py-1.5 rounded-t-lg text-[12.5px] whitespace-nowrap border-b-2 transition-colors',
              isCur
                ? 'border-mega-active text-mega-active font-extrabold bg-secondary/50'
                : it.soon
                  ? 'border-transparent text-muted-foreground/40 cursor-not-allowed'
                  : 'border-transparent text-muted-foreground font-semibold hover:text-foreground hover:bg-muted/60',
              it.gap && 'text-warn-ink'
            )}
          >
            {it.label}
          </button>
        )
      })}
    </div>
  )
}
