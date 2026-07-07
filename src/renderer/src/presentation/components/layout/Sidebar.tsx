import { useEffect, useState } from 'react'
import { LayoutDashboard, ShieldCheck, AlertTriangle, Factory, FileEdit, FolderTree, CalendarDays, CalendarClock, ClipboardCheck, GitBranch, Ruler, Pencil, Check, Package, Folder, ListChecks, Route, Home } from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'
import { setAuditDateCache } from '../../hooks/useDday'

interface MenuItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
  desc: string
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

// 업무 흐름 기준 4그룹: 매일 돌보는 것 → 개발·양산 여정 → 심사 대비 → 문서 원장
const MENU_GROUPS: MenuGroup[] = [
  {
    title: '매일 관리',
    items: [
      { id: 'home', label: '홈 (팀별 허브)', icon: Home, desc: '7팀 준비도 · 할 일 조망' },
      { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, desc: '오늘 할 일 · D-Day 현황' },
      { id: 'case-work', label: '불량 대책서', icon: AlertTriangle, desc: '접수→선별→8D→개선대책' },
      { id: 'schedule', label: '일정표', icon: CalendarDays, desc: '보드·캘린더·타임라인' },
      { id: 'obligations', label: '정기 의무', icon: CalendarClock, desc: '일·주·월·분기·년 반복' }
    ]
  },
  {
    title: 'APQP · Core Tool',
    items: [
      { id: 'apqp', label: 'APQP 여정', icon: Route, desc: '5단계 43산출물 순차 진행' },
      { id: 'parts', label: '품번 / ISIR', icon: Package, desc: '검사협정·관리계획서 통제' },
      { id: 'ppap', label: 'PPAP 승인', icon: ClipboardCheck, desc: '양산부품승인 18요구사항' },
      // 2026-07-07 회의: 고객사(삼보 외 1차사) 신판 미도입 → 제출 표준 = 구판 J1101-01(0058 복원).
      // 신판 모듈은 고객 전환 대비용으로 보존.
      { id: 'fmea', label: '공정 FMEA (신판)', icon: GitBranch, desc: '전환 대비 — 제출은 구판 양식' },
      { id: 'msa', label: 'MSA', icon: Ruler, desc: '측정시스템 %GRR 분석' }
    ]
  },
  {
    title: '심사 대응',
    items: [
      { id: 'sq-readiness', label: 'SQ 준비도', icon: ShieldCheck, desc: '42항목 심사 준비 현황' },
      { id: 'clause-tree', label: '조항 커버리지', icon: ListChecks, desc: 'IATF 4~10장 규정 매핑' }
    ]
  },
  {
    title: '문서 · 양식',
    items: [
      { id: 'document-bom', label: '문서 BOM', icon: FolderTree, desc: '프로세스·규정·양식 원장' },
      { id: 'form-builder', label: '양식 단독 작성', icon: FileEdit, desc: '양식만 빠르게 작성' },
      { id: 'process-workbench', label: '프로세스 작업장', icon: Factory, desc: '흐름도 등록 · AI 추출' }
    ]
  }
]

export function Sidebar(): JSX.Element {
  const { currentPage, setPage, sidebarCollapsed } = useUIStore()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [author, setAuthor] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingDate, setEditingDate] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        if (alive) {
          setProfile(p)
          setAuthor(p?.defaultAuthor || '')
        }
      } catch {
        /* 프로필 없으면 빈 값 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const saveAuthor = async (): Promise<void> => {
    const name = draft.trim()
    setEditing(false)
    if (!name || !profile || name === author) return
    const next = { ...profile, defaultAuthor: name }
    try {
      await window.api.invoke(window.api.channels.COMPANY_PROFILE_SAVE, next)
      setProfile(next)
      setAuthor(name)
    } catch {
      /* 저장 실패 시 이전 값 유지 */
    }
  }

  const saveAuditDate = async (value: string): Promise<void> => {
    setEditingDate(false)
    if (!value || !profile || value === profile.auditDate) return
    const next = { ...profile, auditDate: value }
    try {
      await window.api.invoke(window.api.channels.COMPANY_PROFILE_SAVE, next)
      setProfile(next)
      setAuditDateCache(value) // D-day 배지·대시보드 즉시 갱신
    } catch {
      /* 저장 실패 시 이전 값 유지 */
    }
  }

  const masterBase = profile?.mastersDir
    ? profile.mastersDir.split(/[\\/]/).filter(Boolean).pop() || ''
    : ''

  const pickMastersDir = async (): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.COMPANY_PICK_MASTERS_DIR)) as {
        filePath: string | null
      }
      if (res?.filePath && profile) setProfile({ ...profile, mastersDir: res.filePath })
    } catch {
      /* 취소/실패 무시 */
    }
  }

  return (
    <aside
      className={cn(
        'bg-card border-r border-border flex flex-col shrink-0 transition-[width] duration-200 ease-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <nav className="flex-1 overflow-y-auto p-2">
        {MENU_GROUPS.map((group, gi) => (
          <div key={group.title} className={cn(gi > 0 && 'mt-3')}>
            {sidebarCollapsed ? (
              gi > 0 && <div className="mx-2 mb-2 border-t border-border/70" aria-hidden />
            ) : (
              <div className="px-4 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {group.title}
              </div>
            )}
            {group.items.map((item) => {
              const Icon = item.icon
              const active = currentPage === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPage(item.id)}
                  title={sidebarCollapsed ? `${item.label} · ${item.desc}` : undefined}
                  className={cn(
                    'relative w-full rounded-md mb-0.5 flex items-start gap-3 transition-colors',
                    sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'text-left pl-4 pr-3 py-2',
                    active
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-primary"
                    />
                  )}
                  <Icon
                    className={cn('w-[18px] h-[18px] shrink-0', !sidebarCollapsed && 'mt-0.5', active && 'text-primary')}
                  />
                  {!sidebarCollapsed && (
                    <div className="leading-snug">
                      <div className="text-[13px] font-semibold">{item.label}</div>
                      <div
                        className={cn(
                          'text-[11px] mt-0.5',
                          active ? 'text-primary/80' : 'text-foreground/55'
                        )}
                      >
                        {item.desc}
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-border">
        {sidebarCollapsed ? (
          <div
            className="w-8 h-8 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold"
            title={`${author || '작성자 미설정'} · 품질/개발팀장 · AM사업부`}
          >
            {(author || '?').slice(0, 1)}
          </div>
        ) : editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => void saveAuthor()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveAuthor()
                else if (e.key === 'Escape') setEditing(false)
              }}
              placeholder="작성자명"
              className="flex-1 min-w-0 bg-fillable text-[12px] px-2 py-1 rounded border border-primary/50 focus:outline-none"
            />
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void saveAuthor()}
              className="shrink-0 text-primary hover:bg-primary/10 rounded p-1"
              title="저장"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setDraft(author)
              setEditing(true)
            }}
            className="group w-full text-left text-[11px] text-muted-foreground leading-relaxed hover:bg-muted rounded px-1.5 py-1 -mx-1.5"
            title="양식 작성자 변경"
          >
            <div className="font-semibold text-foreground mb-0.5 flex items-center gap-1">
              {author || '작성자 미설정'}
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </div>
            <div>품질/개발팀장 · AM사업부 · 양식 작성자</div>
          </button>
        )}

        {!sidebarCollapsed && (
          <button
            type="button"
            onClick={() => void pickMastersDir()}
            title={profile?.mastersDir || '정본(마스터 양식) 폴더 미설정 — 클릭하여 지정. 공식 xlsx 출력의 원본 위치.'}
            className="group mt-2 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1.5 py-1 -mx-1.5"
          >
            <Folder className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate">
              정본 폴더:{' '}
              <span className={cn('font-medium', masterBase ? 'text-foreground' : 'text-amber-600')}>
                {masterBase || '미설정'}
              </span>
            </span>
          </button>
        )}

        {!sidebarCollapsed &&
          (editingDate ? (
            <input
              autoFocus
              type="date"
              defaultValue={profile?.auditDate || ''}
              onBlur={(e) => void saveAuditDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveAuditDate((e.target as HTMLInputElement).value)
                else if (e.key === 'Escape') setEditingDate(false)
              }}
              className="mt-2 w-full bg-fillable text-[11px] px-1.5 py-1 rounded border border-primary/50 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDate(true)}
              title="정기 인증심사일 변경 — D-day 배지·브리핑의 기준일"
              className="group mt-2 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1.5 py-1 -mx-1.5"
            >
              <CalendarClock className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">
                심사일:{' '}
                <span className={cn('font-medium', profile?.auditDate ? 'text-foreground' : 'text-amber-600')}>
                  {profile?.auditDate || '미설정'}
                </span>
              </span>
              <Pencil className="w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          ))}
      </div>
    </aside>
  )
}
