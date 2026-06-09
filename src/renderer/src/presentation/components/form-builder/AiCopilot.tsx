import {
  Sparkles,
  X,
  BookOpen,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Target,
  ListChecks,
  Eye,
  AlertTriangle,
  Lightbulb,
  AlertCircle,
  Gauge
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { ScoreCard } from './ScoreCard'

export function AiCopilot(): JSX.Element {
  const {
    copilotTab,
    setCopilotTab,
    toggleCopilot,
    guide,
    guideLoading,
    guideError,
    generateGuide,
    score,
    scoreLoading,
    scoreError,
    scoreForm
  } = useFormStore()

  return (
    <aside className="w-[380px] shrink-0 border-l border-border bg-card flex flex-col h-full">
      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </span>
          <h3 className="text-sm font-bold">AI 도우미</h3>
        </div>
        <button
          type="button"
          onClick={toggleCopilot}
          aria-label="닫기"
          className="w-7 h-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <TabButton active={copilotTab === 'guide'} onClick={() => setCopilotTab('guide')} icon={<BookOpen className="w-3.5 h-3.5" />}>
          작성 가이드
        </TabButton>
        <TabButton active={copilotTab === 'score'} onClick={() => setCopilotTab('score')} icon={<ClipboardCheck className="w-3.5 h-3.5" />}>
          AI 채점
        </TabButton>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4">
        {copilotTab === 'guide' ? (
          <GuideTab
            guide={guide}
            loading={guideLoading}
            error={guideError}
            onGenerate={generateGuide}
          />
        ) : (
          <ScoreTab score={score} loading={scoreLoading} error={scoreError} onScore={scoreForm} />
        )}
      </div>
    </aside>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  children
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold border-b-2 transition-colors',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

// ──────────────────────────────────────────────────────────
// Guide tab
// ──────────────────────────────────────────────────────────

function GuideTab({
  guide,
  loading,
  error,
  onGenerate
}: {
  guide: ReturnType<typeof useFormStore.getState>['guide']
  loading: boolean
  error: string | null
  onGenerate: (force?: boolean) => Promise<void>
}): JSX.Element {
  if (loading) {
    return <CenterState icon={<Loader2 className="w-6 h-6 animate-spin" />} text="AI가 작성 가이드를 만드는 중..." />
  }

  if (!guide) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
        <h4 className="text-sm font-bold mb-1">작성 가이드가 아직 없습니다</h4>
        <p className="text-[12px] text-muted-foreground mb-4 leading-relaxed px-2">
          이 양식을 <b>왜·어떻게</b> 써야 심사를 통과하는지<br />AI가 규정 기준에 맞춰 안내해 드립니다.
        </p>
        {error && <ErrorLine msg={error} />}
        <button
          type="button"
          onClick={() => void onGenerate(false)}
          className="text-xs font-semibold px-4 py-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          작성 가이드 생성
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {guide.purpose && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3.5 h-3.5 text-primary" />
            <h4 className="text-[11px] font-bold text-primary uppercase tracking-wider">이 양식의 목적</h4>
          </div>
          <p className="text-[12px] text-foreground/85 leading-relaxed">{guide.purpose}</p>
        </div>
      )}

      <GuideList icon={<ListChecks className="w-3.5 h-3.5 text-success" />} title="반드시 포함할 항목" items={guide.mustInclude} marker="✓" markerClass="text-success" />
      <GuideList icon={<Eye className="w-3.5 h-3.5 text-primary" />} title="심사원 확인 포인트" items={guide.auditPoints} marker="•" markerClass="text-primary" />
      <GuideList icon={<AlertTriangle className="w-3.5 h-3.5 text-warning" />} title="자주 나오는 지적사항" items={guide.commonFindings} marker="!" markerClass="text-warning" />
      <GuideList icon={<Lightbulb className="w-3.5 h-3.5 text-foreground/60" />} title="작성 팁" items={guide.tips} marker="→" markerClass="text-foreground/50" />

      {error && <ErrorLine msg={error} />}

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <span className="text-[10px] text-muted-foreground">
          {guide.generatedAt ? `생성 ${new Date(guide.generatedAt).toLocaleDateString('ko-KR')}` : ''}
        </span>
        <button
          type="button"
          onClick={() => void onGenerate(true)}
          className="text-[11px] font-semibold px-2 py-1 rounded-md hover:bg-muted text-muted-foreground inline-flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          다시 생성
        </button>
      </div>
    </div>
  )
}

function GuideList({
  icon,
  title,
  items,
  marker,
  markerClass
}: {
  icon: React.ReactNode
  title: string
  items: string[]
  marker: string
  markerClass: string
}): JSX.Element {
  if (!items || items.length === 0) return <></>
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</h4>
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-[12px] text-foreground/85 leading-relaxed">
            <span className={cn('shrink-0 font-bold', markerClass)}>{marker}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Score tab
// ──────────────────────────────────────────────────────────

function ScoreTab({
  score,
  loading,
  error,
  onScore
}: {
  score: ReturnType<typeof useFormStore.getState>['score']
  loading: boolean
  error: string | null
  onScore: () => Promise<void>
}): JSX.Element {
  if (loading) {
    return <CenterState icon={<Loader2 className="w-6 h-6 animate-spin" />} text="AI 심사원이 채점하는 중..." />
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => void onScore()}
        className="w-full text-xs font-semibold px-4 py-2.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center justify-center gap-1.5"
      >
        <Gauge className="w-4 h-4" />
        {score ? '다시 채점하기' : 'AI 채점 실행'}
      </button>

      {error && <ErrorLine msg={error} />}

      {score ? (
        <ScoreCard score={score} />
      ) : (
        !error && (
          <div className="text-center py-6">
            <ClipboardCheck className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-[12px] text-muted-foreground leading-relaxed px-2">
              작성한 내용을 IATF 16949 규정 기준으로<br />
              AI가 채점하고 <b>점수·감점 사유·개선안</b>을 알려드립니다.
            </p>
          </div>
        )
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────

function CenterState({ icon, text }: { icon: React.ReactNode; text: string }): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      {icon}
      <p className="text-[12px] mt-3">{text}</p>
    </div>
  )
}

function ErrorLine({ msg }: { msg: string }): JSX.Element {
  return (
    <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-[11px] text-destructive">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  )
}
