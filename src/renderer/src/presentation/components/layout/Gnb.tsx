import { useEffect, useRef, useState } from 'react'
import {
  LayoutDashboard, AlertTriangle, CalendarDays, CalendarClock, Route, Package, ClipboardCheck,
  GitBranch, Ruler, ShieldCheck, ListChecks, FolderTree, FileEdit, Factory, Home, Users,
  ChevronDown, Sparkles, Wand2, Search, Building2, Gauge, BadgeCheck, BookOpen
} from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { DdayBadge } from '../shared/DdayBadge'
import { useCopilotStore } from '../../stores/copilotStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { useSimilarStore } from '../../stores/similarStore'
import { SettingsMenu } from './SettingsMenu'

interface NavItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
  desc: string
}

interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

// 삼성닷컴식 상단 카테고리 바(포털 1단계) — 사이드바 4그룹을 GNB 드롭다운으로 이관.
const DIRECT_ITEMS: NavItem[] = [
  { id: 'home', label: '홈', icon: Home, desc: '관제탑 — 팀별 오늘 할 일' },
  { id: 'team-hub', label: '팀별 허브', icon: Users, desc: '7팀 준비도 · 책임 규정' }
]

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'daily',
    label: '매일 관리',
    items: [
      { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, desc: '심사 준비 현황 · 채점' },
      { id: 'case-work', label: '불량 대책서', icon: AlertTriangle, desc: '접수→선별→8D→개선대책' },
      { id: 'schedule', label: '일정표', icon: CalendarDays, desc: '보드·캘린더·타임라인' },
      { id: 'obligations', label: '정기 의무', icon: CalendarClock, desc: '일·주·월·분기·년 반복' }
    ]
  },
  {
    key: 'apqp',
    label: 'APQP · Core Tool',
    items: [
      { id: 'apqp', label: 'APQP 여정', icon: Route, desc: '5단계 43산출물 순차 진행' },
      { id: 'parts', label: '품번 / ISIR', icon: Package, desc: '검사협정·관리계획서 통제' },
      { id: 'ppap', label: 'PPAP 승인', icon: ClipboardCheck, desc: '양산부품승인 18요구사항' },
      // 2026-07-07 회의: 고객사(삼보 외 1차사) 신판 미도입 → 제출 표준 = 구판 J1101-01(0058 복원).
      { id: 'fmea', label: '공정 FMEA (신판)', icon: GitBranch, desc: '전환 대비 — 제출은 구판 양식' },
      { id: 'msa', label: 'MSA', icon: Ruler, desc: '측정시스템 %GRR 분석' }
    ]
  },
  {
    key: 'audit',
    label: '심사 대응',
    items: [
      // SQ = 고객사(HKMC) 평가 / IATF = 인증 심사 — 대시보드 이원화 (7/16 사장님 확정)
      { id: 'sq-dashboard', label: 'SQ 대시보드', icon: Gauge, desc: '점수·등급·남은 점수 — 한 장 요약' },
      { id: 'sq-assessment', label: 'SQ 자체평가', icon: BadgeCheck, desc: '42항목 확정 → 점수 → 리포트 (6_4 증빙)' },
      { id: 'sq-readiness', label: 'SQ 준비도 (42항목)', icon: ShieldCheck, desc: '항목별 신호등 상세' },
      { id: 'iatf-dashboard', label: 'IATF 대시보드', icon: Gauge, desc: '조항·핵심 의무·문서화 — 인증 심사 한 장' },
      { id: 'clause-tree', label: '조항 커버리지 (IATF)', icon: ListChecks, desc: 'IATF 4~10장 규정 매핑 상세' }
    ]
  },
  {
    key: 'docs',
    label: '문서 · 양식',
    items: [
      { id: 'doc-browse', label: '규정·양식 찾아보기', icon: BookOpen, desc: '카드 → 규정 본문 → 양식 작성 (포털)' },
      { id: 'document-bom', label: '문서 BOM', icon: FolderTree, desc: '프로세스·규정·양식 원장' },
      { id: 'form-builder', label: '양식 단독 작성', icon: FileEdit, desc: '양식만 빠르게 작성' },
      { id: 'process-workbench', label: '프로세스 작업장', icon: Factory, desc: '흐름도 등록 · AI 추출' }
    ]
  }
]

/** currentPage 가 속한 그룹 key ('home'·'team-hub' 등 직접 항목은 자기 id). */
function activeKey(page: PageId): string {
  if (page === 'team-detail') return 'team-hub'
  for (const g of NAV_GROUPS) if (g.items.some((i) => i.id === page)) return g.key
  return page
}

export function Gnb(): JSX.Element {
  const { currentPage, setPage } = useUIStore()
  const toggleCopilot = useCopilotStore((s) => s.toggle)
  const copilotOpen = useCopilotStore((s) => s.open)
  const toggleAuthor = useAiAuthorStore((s) => s.toggle)
  const toggleSimilar = useSimilarStore((s) => s.toggle)
  const [openGroup, setOpenGroup] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState('')
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        if (alive) setCompanyName(p?.companyName || '')
      } catch {
        /* 프로필 미구성 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 드롭다운: 바깥 클릭 / Escape 닫기
  useEffect(() => {
    if (!openGroup) return
    const onDown = (e: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenGroup(null)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpenGroup(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openGroup])

  const active = activeKey(currentPage)

  const go = (id: PageId): void => {
    setOpenGroup(null)
    setPage(id)
  }

  return (
    <header className="h-16 bg-card border-b border-border shrink-0">
      {/* FLOWX식 중앙 칼럼 — 본문(AppShell 래퍼)과 같은 폭 규칙 (7/16, 인라인 고정) */}
      <div
        className="w-full h-full flex items-center px-2 gap-2"
        style={{ maxWidth: 'min(1400px, 94vw)', marginLeft: 'auto', marginRight: 'auto' }}
      >
      {/* 로고 — 회사명은 company_profile(고객사마다 자기 회사) */}
      <button
        type="button"
        onClick={() => go('home')}
        className="flex items-center gap-2.5 mr-4 shrink-0 rounded-md px-1 -mx-1 hover:bg-muted/60 transition-colors"
        title="홈(관제탑)으로"
      >
        <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Building2 className="w-4 h-4 text-primary" />
        </div>
        <div className="leading-tight text-left">
          <div className="text-sm font-bold truncate max-w-[180px]">{companyName || 'IATF 16949 QMS'}</div>
          <div className="text-[11px] text-muted-foreground">IATF 16949 품질경영시스템</div>
        </div>
      </button>

      {/* 카테고리 내비게이션 */}
      <nav ref={navRef} className="flex items-stretch gap-3 h-full flex-1 min-w-0">
        {DIRECT_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => go(item.id)}
            title={item.desc}
            className={cn(
              'relative px-4 text-[14px] font-semibold transition-colors whitespace-nowrap',
              active === item.id ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {item.label}
            {active === item.id && (
              <span aria-hidden className="absolute left-2.5 right-2.5 bottom-0 h-0.5 rounded-t bg-primary" />
            )}
          </button>
        ))}

        {NAV_GROUPS.map((group) => (
          <div key={group.key} className="relative flex items-stretch">
            <button
              type="button"
              onClick={() => setOpenGroup((k) => (k === group.key ? null : group.key))}
              aria-expanded={openGroup === group.key}
              className={cn(
                'relative px-4 text-[14px] font-semibold transition-colors whitespace-nowrap inline-flex items-center gap-1',
                active === group.key || openGroup === group.key
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {group.label}
              <ChevronDown
                className={cn('w-3.5 h-3.5 transition-transform', openGroup === group.key && 'rotate-180')}
              />
              {active === group.key && (
                <span aria-hidden className="absolute left-2.5 right-2.5 bottom-0 h-0.5 rounded-t bg-primary" />
              )}
            </button>

            {openGroup === group.key && (
              <div className="absolute left-0 top-full w-72 bg-popover border border-border rounded-xl shadow-lg p-1.5 z-50">
                {group.items.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item.id)}
                      className={cn(
                        'w-full flex items-start gap-2.5 text-left rounded-lg px-2.5 py-2 transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                      )}
                    >
                      <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="leading-snug">
                        <span className="block text-[13px] font-semibold">{item.label}</span>
                        <span className={cn('block text-[11px] mt-0.5', isActive ? 'text-primary/80' : 'text-muted-foreground')}>
                          {item.desc}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* 우측: D-day + AI 도구 + 설정 */}
      <div className="flex items-center gap-2.5 shrink-0">
        <DdayBadge />
        <button
          type="button"
          onClick={toggleAuthor}
          aria-label="AI 초안 작성"
          title="AI 초안 작성 — 메모를 공식 양식 초안으로(결재 필요)"
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-amber-300 text-amber-700 hover:bg-amber-50 transition-colors"
        >
          <Wand2 className="w-3.5 h-3.5" />
          AI 작성
        </button>
        <button
          type="button"
          onClick={toggleSimilar}
          aria-label="유사 사례·대책"
          title="유사 사례·대책 — 과거 불량 검색 + 5Why·재발방지"
          className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold border border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          유사사례
        </button>
        <button
          type="button"
          onClick={toggleCopilot}
          aria-label="AI 코파일럿"
          title="AI 코파일럿 — 우리 데이터에 질문(읽기전용)"
          className={cn(
            'h-8 px-2.5 rounded-md flex items-center gap-1.5 text-[12px] font-semibold transition-colors',
            copilotOpen
              ? 'bg-primary/10 text-primary border border-primary/30'
              : 'border border-border hover:bg-muted text-foreground'
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          코파일럿
        </button>
        <SettingsMenu />
      </div>
      </div>
    </header>
  )
}
