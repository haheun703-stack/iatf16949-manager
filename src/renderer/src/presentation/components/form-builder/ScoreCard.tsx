import { CheckCircle2, AlertTriangle, Lightbulb, FileWarning, ShieldCheck } from 'lucide-react'
import { cn } from '../../../lib/utils'
import type { FormScoreDto, ScoreSeverity } from '@shared/ipc-types'

interface Props {
  score: FormScoreDto
}

function toneOf(score: number): { ring: string; text: string; bg: string; label: string } {
  if (score >= 90) return { ring: 'stroke-success', text: 'text-success', bg: 'bg-success/10', label: '우수' }
  if (score >= 75) return { ring: 'stroke-primary', text: 'text-primary', bg: 'bg-primary/10', label: '양호' }
  if (score >= 60) return { ring: 'stroke-warning', text: 'text-warning', bg: 'bg-warning/10', label: '보완' }
  return { ring: 'stroke-destructive', text: 'text-destructive', bg: 'bg-destructive/10', label: '미흡' }
}

const SEVERITY_STYLE: Record<ScoreSeverity, string> = {
  경미: 'bg-warning/10 text-warning border-warning/30',
  중대: 'bg-destructive/10 text-destructive border-destructive/30',
  치명: 'bg-destructive/20 text-destructive border-destructive/50 font-semibold'
}

function ScoreRing({ score }: { score: number }): JSX.Element {
  const t = toneOf(score)
  const r = 34
  const c = 2 * Math.PI * r
  const offset = c * (1 - score / 100)
  return (
    <div className="relative w-[88px] h-[88px] shrink-0">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} className="stroke-muted" strokeWidth="7" fill="none" />
        <circle
          cx="40"
          cy="40"
          r={r}
          className={cn(t.ring, 'transition-all duration-700')}
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={cn('text-2xl font-bold tabular-nums', t.text)}>{score}</span>
        <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
      </div>
    </div>
  )
}

export function ScoreCard({ score }: Props): JSX.Element {
  const t = toneOf(score.score)

  return (
    <div className="space-y-4">
      {/* Header: ring + grade + verdict */}
      <div className="flex items-center gap-4 p-3 rounded-lg border border-border bg-card">
        <ScoreRing score={score.score} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('text-3xl font-black leading-none', t.text)}>{score.grade}</span>
            <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', t.bg, t.text)}>
              {score.verdict}
            </span>
          </div>
          <p className="text-[12px] text-foreground/80 mt-1.5 leading-relaxed">{score.summary}</p>
        </div>
      </div>

      {/* Strengths */}
      {score.strengths.length > 0 && (
        <Section icon={<CheckCircle2 className="w-3.5 h-3.5 text-success" />} title="잘 작성된 점">
          <ul className="space-y-1.5">
            {score.strengths.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] text-foreground/85 leading-relaxed">
                <span className="text-success mt-0.5">·</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Gaps (감점 사유) */}
      {score.gaps.length > 0 && (
        <Section icon={<AlertTriangle className="w-3.5 h-3.5 text-destructive" />} title={`감점 사유 (${score.gaps.length})`}>
          <ul className="space-y-2">
            {score.gaps.map((g, i) => (
              <li key={i} className="text-[12px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className={cn('shrink-0 px-1.5 py-0.5 rounded border text-[10px]', SEVERITY_STYLE[g.severity])}>
                    {g.severity}
                  </span>
                  <span className="text-foreground/85">{g.item}</span>
                </div>
                {g.regRef && (
                  <div className="text-[11px] text-muted-foreground ml-1 mt-0.5">↳ {g.regRef}</div>
                )}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Missing fields */}
      {score.missingFields.length > 0 && (
        <Section icon={<FileWarning className="w-3.5 h-3.5 text-warning" />} title="비었거나 불충분한 항목">
          <div className="flex flex-wrap gap-1.5">
            {score.missingFields.map((m, i) => (
              <span key={i} className="px-2 py-0.5 rounded bg-warning/10 text-warning text-[11px]">
                {m}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Suggestions */}
      {score.suggestions.length > 0 && (
        <Section icon={<Lightbulb className="w-3.5 h-3.5 text-primary" />} title="개선 제안">
          <ul className="space-y-1.5">
            {score.suggestions.map((s, i) => (
              <li key={i} className="flex gap-1.5 text-[12px] text-foreground/85 leading-relaxed">
                <span className="text-primary mt-0.5">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Footer meta */}
      <div className="flex items-center gap-1.5 pt-1 text-[10px] text-muted-foreground border-t border-border">
        <ShieldCheck className="w-3 h-3" />
        <span>
          {score.provider ?? 'AI'} 채점 · {new Date(score.scoredAt).toLocaleString('ko-KR')}
        </span>
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  children
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{title}</h4>
      </div>
      {children}
    </div>
  )
}
