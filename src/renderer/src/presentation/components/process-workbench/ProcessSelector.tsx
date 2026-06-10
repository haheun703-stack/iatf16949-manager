import { useEffect } from 'react'
import { Factory, CheckCircle2, Image as ImageIcon, FileText } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useProcessStore } from '../../stores/processStore'
import { useUIStore } from '../../stores/uiStore'

const CATEGORY_LABEL: Record<string, string> = {
  CP: '핵심 프로세스',
  MP: '경영 프로세스',
  SP: '지원 프로세스'
}

const CATEGORY_COLOR: Record<string, string> = {
  CP: 'bg-primary/10 text-primary',
  MP: 'bg-warning/10 text-warning',
  SP: 'bg-success/10 text-success'
}

export function ProcessSelector(): JSX.Element {
  const { list, listLoading, loadList } = useProcessStore()
  const { selectedProcessCode, setSelectedProcessCode } = useUIStore()

  useEffect(() => {
    loadList()
  }, [loadList])

  const grouped = list.reduce<Record<string, typeof list>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = []
    acc[p.category].push(p)
    return acc
  }, {})

  const handleClick = (code: string): void => {
    setSelectedProcessCode(code)
  }

  if (listLoading) {
    return (
      <div className="text-center text-xs text-muted-foreground py-12">불러오는 중...</div>
    )
  }

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Factory className="w-6 h-6 text-primary" />
          프로세스 작업장
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          작업할 프로세스를 선택하세요. 기본서(흐름도)를 보면서 하위 양식을 차례로 작성합니다.
        </p>
      </div>

      {(['CP', 'MP', 'SP'] as const).map((cat) => (
        <section key={cat}>
          <h2 className="text-sm font-bold text-muted-foreground tracking-wide mb-3.5">
            {CATEGORY_LABEL[cat]}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(grouped[cat] || []).map((p) => {
              const active = selectedProcessCode === p.code
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => handleClick(p.code)}
                  className={cn(
                    'text-left p-5 rounded-xl border transition-all',
                    active
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-card shadow-sm hover:border-primary/40 hover:shadow-md'
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn('inline-flex items-center justify-center min-w-[56px] px-2 py-0.5 rounded text-[11px] font-mono font-bold', CATEGORY_COLOR[cat])}>
                      {p.code}
                    </span>
                    {active && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="font-semibold text-sm mb-2">{p.name}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground tabular-nums">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      페이지 {p.pagesCount}
                      {!p.hasImages && p.pagesCount > 0 && (
                        <span className="text-warning ml-0.5">(이미지 없음)</span>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      양식 {p.formsCount}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
