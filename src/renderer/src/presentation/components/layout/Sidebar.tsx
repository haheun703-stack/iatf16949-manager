import { useEffect, useState } from 'react'
import { LayoutDashboard, ShieldCheck, AlertTriangle, Factory, FileEdit, FolderTree, GitBranch, ListTree, Users, CalendarDays, Pencil, Check, Package } from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, type PageId } from '../../stores/uiStore'

interface MenuItem {
  id: PageId
  label: string
  icon: typeof LayoutDashboard
  desc: string
}

const MENU: MenuItem[] = [
  { id: 'dashboard', label: '대시보드', icon: LayoutDashboard, desc: '심사 D-Day 현황' },
  { id: 'sq-readiness', label: 'SQ 준비도', icon: ShieldCheck, desc: '42항목 심사 준비 현황' },
  { id: 'parts', label: '품번 / ISIR', icon: Package, desc: '검사협정·관리계획서 통제' },
  { id: 'case-work', label: '불량 대책서', icon: AlertTriangle, desc: '접수→선별→8D→개선대책' },
  { id: 'document-bom', label: '문서 BOM', icon: FolderTree, desc: '105 문서 · 405 양식' },
  { id: 'process-workbench', label: '프로세스 작업장', icon: Factory, desc: '기본서 + 양식 작성' },
  { id: 'form-builder', label: '양식 단독 작성', icon: FileEdit, desc: '양식만 빠르게 작성' },
  { id: 'schedule', label: '일정표', icon: CalendarDays, desc: '보드·캘린더·타임라인' },
  { id: 'form-chain', label: '문서 연결고리', icon: GitBranch, desc: '시정조치 흐름' },
  { id: 'clause-tree', label: '조항 트리', icon: ListTree, desc: 'IATF 0~10장' },
  { id: 'team', label: '팀', icon: Users, desc: 'AM사업부 조직도' }
]

export function Sidebar(): JSX.Element {
  const { currentPage, setPage, sidebarCollapsed } = useUIStore()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [author, setAuthor] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

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

  return (
    <aside
      className={cn(
        'bg-card border-r border-border flex flex-col shrink-0 transition-[width] duration-200 ease-out',
        sidebarCollapsed ? 'w-16' : 'w-60'
      )}
    >
      <nav className="flex-1 overflow-y-auto p-2">
        {MENU.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              title={sidebarCollapsed ? `${item.label} · ${item.desc}` : undefined}
              className={cn(
                'relative w-full rounded-md mb-1 flex items-start gap-3 transition-colors',
                sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'text-left pl-4 pr-3 py-2.5',
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
                  <div className="text-sm font-semibold">{item.label}</div>
                  <div
                    className={cn(
                      'text-xs mt-0.5',
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
      </div>
    </aside>
  )
}
