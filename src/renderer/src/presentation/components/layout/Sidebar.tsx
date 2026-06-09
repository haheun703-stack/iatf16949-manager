import { LayoutDashboard, Factory, FileEdit, FolderTree, GitBranch, ListTree, Users } from 'lucide-react'
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
  { id: 'document-bom', label: '문서 BOM', icon: FolderTree, desc: '105 문서 · 405 양식' },
  { id: 'process-workbench', label: '프로세스 작업장', icon: Factory, desc: '기본서 + 양식 작성' },
  { id: 'form-builder', label: '양식 단독 작성', icon: FileEdit, desc: '양식만 빠르게 작성' },
  { id: 'form-chain', label: '문서 연결고리', icon: GitBranch, desc: '시정조치 흐름' },
  { id: 'clause-tree', label: '조항 트리', icon: ListTree, desc: 'IATF 0~10장' },
  { id: 'team', label: '팀', icon: Users, desc: 'AM사업부 조직도' }
]

export function Sidebar(): JSX.Element {
  const { currentPage, setPage } = useUIStore()

  return (
    <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0">
      <nav className="flex-1 overflow-y-auto p-2">
        {MENU.map((item) => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setPage(item.id)}
              className={cn(
                'relative w-full text-left pl-4 pr-3 py-2.5 rounded-md mb-1 flex items-start gap-3 transition-colors',
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
              <Icon className={cn('w-[18px] h-[18px] mt-0.5 shrink-0', active && 'text-primary')} />
              <div className="leading-snug">
                <div className="text-sm font-semibold">{item.label}</div>
                <div className={cn('text-xs mt-0.5', active ? 'text-primary/80' : 'text-foreground/55')}>
                  {item.desc}
                </div>
              </div>
            </button>
          )
        })}
      </nav>

      <div className="p-3 border-t border-border text-[11px] text-muted-foreground leading-relaxed">
        <div className="font-semibold text-foreground mb-0.5">하헌 부장</div>
        <div>품질/개발팀장 · AM사업부</div>
      </div>
    </aside>
  )
}
