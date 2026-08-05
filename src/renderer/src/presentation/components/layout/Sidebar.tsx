import { useEffect, useState } from 'react'
import {
  LayoutDashboard, AlertTriangle, CalendarDays, CalendarClock, Route, Package, ClipboardCheck,
  GitBranch, Ruler, ShieldCheck, ListChecks, FolderTree, FileEdit, Factory, Home, Users,
  Sparkles, Wand2, Search, Building2, Gauge, BadgeCheck, BookOpen, ClipboardList
} from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { DdayBadge } from '../shared/DdayBadge'
import { useCopilotStore } from '../../stores/copilotStore'
import { useAiAuthorStore } from '../../stores/aiAuthorStore'
import { useSimilarStore } from '../../stores/similarStore'
import { SettingsMenu } from './SettingsMenu'
import { UserSwitcher } from './UserSwitcher'
import { MesMenuBar } from './MesMenuBar'

/**
 * 좌측 다크 사이드바 + 상단 도구 스트립 (17번 §2 — GNB 전환, 시각 정본 = 16번 목업 v1).
 * 라우팅·PageId·기존 화면 무수정 — 기존 GNB의 전 항목을 섹션으로 재배치(정보 손실 0).
 * 기존 상단 우측 요소(D-day·AI 도구·사용자·설정)는 TopBar(페이지 헤더 존)로 이동.
 * 좁은 창: 1100px 미만에서 아이콘만 남는 축소 모드 1단계(과설계 금지).
 */

interface NavItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
  desc: string
  /** 아직 활성화되지 않은 항목(예: 입고 사진함 = M1 파일럿 후) */
  disabled?: boolean
}

const DIRECT: NavItem[] = [
  { id: 'home', label: '관제탑 (홈)', icon: Home, desc: '오늘 내 할 일 — 했는지·안 했는지' },
  { id: 'doc-browse', label: '문서 작성', icon: BookOpen, desc: '규정·양식 찾아 바로 작성' },
  { id: 'schedule', label: '일정표', icon: CalendarDays, desc: '보드·캘린더·타임라인' }
]

const SECTIONS: { key: string; label: string; items: NavItem[] }[] = [
  {
    key: 'audit',
    label: '심사 대응',
    items: [
      { id: 'sq-dashboard', label: 'SQ 대시보드', icon: Gauge, desc: '점수·등급·남은 점수 — 한 장 요약' },
      { id: 'sq-assessment', label: 'SQ 자체평가', icon: BadgeCheck, desc: '42항목 확정 → 점수 → 리포트' },
      { id: 'sq-readiness', label: 'SQ 준비도', icon: ShieldCheck, desc: '항목별 신호등 상세' },
      { id: 'sq-track', label: 'SQ 심사 트랙', icon: ClipboardList, desc: '품번 4종 · 심사 동선 체크리스트' },
      { id: 'iatf-dashboard', label: 'IATF 대시보드', icon: Gauge, desc: '조항·핵심 의무·문서화 한 장' },
      { id: 'clause-tree', label: '조항 커버리지', icon: ListChecks, desc: 'IATF 4~10장 규정 매핑' }
    ]
  },
  // PB2 ⓐ(8/5): 반-MES 섹션은 상단 MES 모듈 메뉴바로 승격 — 항목별 새 위치는
  // docs/ui-pb2/PB2a_정보손실0_확인표_260805.md (품번트리·흐름맵→기준정보 / 수집함·LOT→자재 /
  // 기록현황→생산 — 정보 손실 0, 사이드바는 심사·매일관리·Core Tool·문서 축으로 축소 재편).
  {
    key: 'daily',
    label: '매일 관리',
    items: [
      { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, desc: '심사 준비 현황 · 채점' },
      { id: 'case-work', label: '불량 대책서', icon: AlertTriangle, desc: '접수→선별→8D→개선대책' },
      { id: 'obligations', label: '정기 의무', icon: CalendarClock, desc: '반복 업무 등록·도래 관리' },
      { id: 'team-hub', label: '팀별 허브', icon: Users, desc: '팀별 준비도 · 책임 규정' }
    ]
  },
  {
    key: 'coretool',
    label: 'APQP · Core Tool',
    items: [
      { id: 'apqp', label: 'APQP 여정', icon: Route, desc: '5단계 43산출물' },
      { id: 'parts', label: '품번 / ISIR', icon: Package, desc: '검사협정·관리계획서 통제' },
      { id: 'ppap', label: 'PPAP 승인', icon: ClipboardCheck, desc: '양산부품승인 18요구사항' },
      { id: 'fmea', label: '공정 FMEA (신판)', icon: GitBranch, desc: '전환 대비 — 제출은 구판' },
      { id: 'msa', label: 'MSA', icon: Ruler, desc: '측정시스템 %GRR' }
    ]
  },
  {
    key: 'docs',
    label: '문서 · 양식',
    items: [
      { id: 'document-bom', label: '문서 BOM', icon: FolderTree, desc: '프로세스·규정·양식 원장' },
      { id: 'form-builder', label: '양식 단독 작성', icon: FileEdit, desc: '양식만 빠르게 작성' },
      { id: 'process-workbench', label: '프로세스 작업장', icon: Factory, desc: '흐름도 등록 · AI 추출' }
    ]
  }
]

/** 앱 코어스키마 리비전 — 마이그 추가 시 갱신(사이드바 풋터 표기용) */
const SCHEMA_REV = '0136'

export function Sidebar(): JSX.Element {
  const { currentPage, setPage } = useUIStore()
  const [companyName, setCompanyName] = useState('')
  const [serverMode, setServerMode] = useState<'web' | 'local' | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        if (alive) setCompanyName(p?.companyName || '')
      } catch {
        /* 프로필 미구성 */
      }
      // 풋터 상태: 로컬웹(서버)인지 데스크톱 실행인지 — /api/health 응답 여부로 판별
      try {
        const r = await fetch('/api/health')
        if (alive) setServerMode(r.ok ? 'web' : 'local')
      } catch {
        if (alive) setServerMode('local')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const Item = ({ item }: { item: NavItem }): JSX.Element => {
    const Icon = item.icon
    const active = !item.disabled && currentPage === item.id
    return (
      <button
        type="button"
        disabled={item.disabled}
        onClick={() => setPage(item.id)}
        title={item.desc}
        className={cn(
          'w-full flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-[13.5px] transition-colors',
          active
            ? 'bg-side-active text-white font-bold'
            : 'text-side-ink font-medium hover:bg-side-hover',
          item.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
        )}
      >
        <Icon className="w-4 h-4 shrink-0 opacity-85" />
        <span className="truncate max-[1099px]:hidden">{item.label}</span>
      </button>
    )
  }

  return (
    <nav className="w-16 min-[1100px]:w-[216px] shrink-0 bg-side-bg flex flex-col px-3 py-5 gap-0.5 overflow-y-auto">
      {/* 브랜드 — 회사명은 company_profile(고객사마다 자기 회사) */}
      <button
        type="button"
        onClick={() => setPage('home')}
        className="flex items-center gap-2.5 px-2 pb-4 text-left"
        title="홈(관제탑)으로"
      >
        <div className="w-[34px] h-[34px] rounded-[10px] shrink-0 bg-gradient-to-br from-primary to-data flex items-center justify-center">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight max-[1099px]:hidden min-w-0">
          <div className="text-[14px] font-bold text-white truncate">{companyName || 'IATF 16949 QMS'}</div>
          <div className="text-[11px] text-side-sec">IATF 16949 QMS</div>
        </div>
      </button>

      {DIRECT.map((item) => (
        <Item key={item.id} item={item} />
      ))}

      {SECTIONS.map((sec) => (
        <div key={sec.key}>
          <div className="px-3 pt-4 pb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-side-sec max-[1099px]:hidden">
            {sec.label}
          </div>
          <div className="max-[1099px]:pt-3 flex flex-col gap-0.5">
            {sec.items.map((item) => (
              <Item key={sec.key + item.id} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* 풋터 — 운영 상태가 늘 보이게 (17번 §2) */}
      <div className="mt-auto pt-3 px-2 border-t border-side-line text-[11px] text-side-sec max-[1099px]:hidden">
        <span
          className={cn(
            'inline-block w-[7px] h-[7px] rounded-full mr-1.5',
            serverMode === 'web' ? 'bg-emerald-500' : 'bg-sky-400'
          )}
        />
        {serverMode === 'web' ? '서버 정상 · 사내망' : '로컬 실행'} · DB v{SCHEMA_REV}
      </div>
    </nav>
  )
}

/** 상단 스트립 — 좌 = MES 모듈 메뉴바(PB2 ⓐ, 30번 v2) · 우 = 기존 도구(D-day·AI·사용자·설정, 기능 무변) */
export function TopBar(): JSX.Element {
  const toggleCopilot = useCopilotStore((s) => s.toggle)
  const copilotOpen = useCopilotStore((s) => s.open)
  const toggleAuthor = useAiAuthorStore((s) => s.toggle)
  const toggleSimilar = useSimilarStore((s) => s.toggle)

  return (
    <div className="h-[52px] shrink-0 flex items-center justify-between gap-3 px-5 bg-card border-b border-border">
      <MesMenuBar />
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
      <UserSwitcher />
      <SettingsMenu />
      </div>
    </div>
  )
}
