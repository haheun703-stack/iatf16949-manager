import { useState } from 'react'
import { BookOpen, ArrowRight, PanelLeftClose, Lock, Check } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import type { FormExampleDto } from '@shared/ipc-types'

/**
 * P5 — 좌측 정답 패널(정답 따라쓰기, 목업 v2 화면②).
 * 왼쪽 = 90% 모범 정답(form_examples), 오른쪽(FormCanvas) = 실제 작성.
 * 틀(frame)은 [틀 가져오기]로 우측에 채울 수 있고, 사실(fact)은 사람이 직접만(원칙2).
 */
type Tab = 'example' | 'howto' | 'evidence' | 'penalty'
const TABS: { key: Tab; label: string; warn?: boolean }[] = [
  { key: 'example', label: '모범 예시' },
  { key: 'howto', label: '작성 방법' },
  { key: 'evidence', label: '증빙 체크' },
  { key: 'penalty', label: '감점 · 주의', warn: true }
]

export function AnswerPanel({ onFold }: { onFold: () => void }): JSX.Element {
  const examples = useFormStore((s) => s.examples)
  const importFrame = useFormStore((s) => s.importFrame)
  const [tab, setTab] = useState<Tab>('example')
  const [imported, setImported] = useState<number | null>(null)

  const frameCount = examples.filter((e) => e.fieldClass === 'frame').length
  const factCount = examples.filter((e) => e.fieldClass === 'fact').length

  const doImport = (): void => {
    const n = importFrame()
    setImported(n)
    setTimeout(() => setImported(null), 3500)
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-emerald-200 bg-card">
      <header className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="font-bold text-[14px]">이렇게 작성하세요</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-semibold">모범 정답</span>
        <span className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={doImport}
            disabled={frameCount === 0}
            title="틀(양식 고정 문구)만 오른쪽에 채웁니다 — 오늘의 사실 칸은 채우지 않습니다"
            className="text-[12px] font-bold px-2.5 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 inline-flex items-center gap-1"
          >
            틀 가져오기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onFold}
            title="정답 패널 접기(좁은 화면 대비)"
            className="text-[12px] font-semibold px-2 py-1.5 rounded-md border border-border hover:bg-muted inline-flex items-center gap-1"
          >
            <PanelLeftClose className="w-3.5 h-3.5" /> 접기
          </button>
        </span>
      </header>

      {imported != null && (
        <div className="px-4 py-2 text-[12px] bg-emerald-50 text-emerald-800 border-b border-emerald-200 flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 shrink-0" />
          {imported > 0 ? (
            <>틀 <b>{imported}개</b>를 오른쪽 빈 칸에 채웠습니다 — <b>오늘의 사실</b> 칸은 직접 입력하세요</>
          ) : (
            <>채울 틀이 없습니다(이미 채워졌거나 틀 항목 없음)</>
          )}
        </div>
      )}

      {/* 탭 */}
      <div className="flex items-center gap-1 px-3 pt-2.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'text-[12.5px] font-semibold px-3 py-2 rounded-t-md transition-colors',
              tab === t.key
                ? 'bg-muted text-foreground'
                : t.warn
                  ? 'text-rose-500 hover:text-rose-600'
                  : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 break-keep">
        {examples.length === 0 ? (
          <div className="text-[13px] text-muted-foreground leading-relaxed py-8 px-4 text-center">
            이 양식은 아직 <b>모범 예시</b>가 준비되지 않았습니다.
            <br />
            (예시가 등록된 양식은 왼쪽에 90% 정답이 함께 뜹니다)
            <span className="mt-3 block rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] text-emerald-800">
              💡 자주 쓰는 양식인데 예시가 없다면 <b>관리자(품질팀)에게 예시 등록을 요청</b>하세요.
              <br />
              관리자는 <span className="font-mono">form_examples</span> 시드로 모범 작성본을 추가할 수 있습니다.
            </span>
          </div>
        ) : tab === 'example' ? (
          <ExampleTable examples={examples} frameCount={frameCount} factCount={factCount} />
        ) : tab === 'howto' ? (
          <HowTo examples={examples} />
        ) : tab === 'evidence' ? (
          <Evidence examples={examples} />
        ) : (
          <Penalty />
        )}
      </div>
    </div>
  )
}

function Tag({ kind }: { kind: 'frame' | 'fact' }): JSX.Element {
  return kind === 'fact' ? (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold shrink-0">사실</span>
  ) : (
    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold shrink-0">틀</span>
  )
}

function ExampleTable({
  examples,
  frameCount,
  factCount
}: {
  examples: FormExampleDto[]
  frameCount: number
  factCount: number
}): JSX.Element {
  return (
    <div>
      <div className="text-[12px] text-muted-foreground mb-3 leading-relaxed">
        ✅ 모범 작성본(읽기 전용) — <span className="font-semibold text-emerald-700">틀</span>은 그대로 써도 되고,
        <span className="font-semibold text-amber-700"> 사실</span>은 반드시 본인이 잰·확인한 값을 쓰세요.
        <span className="block mt-0.5 text-[11px]">틀 {frameCount} · 사실 {factCount}</span>
      </div>
      <table className="w-full text-[13px] border-collapse">
        <tbody>
          {examples.map((ex) => (
            <tr key={ex.fieldKey} className="border-b border-border align-top">
              <th className="text-left font-semibold py-2 pr-3 w-[38%] text-muted-foreground">{ex.label}</th>
              <td className="py-2">
                <div className="flex items-start gap-1.5">
                  <Tag kind={ex.fieldClass} />
                  <div className="min-w-0">
                    <span
                      className={cn(
                        ex.fieldClass === 'fact'
                          ? 'font-bold text-amber-700 bg-amber-50 px-1 rounded border border-dashed border-amber-300'
                          : 'text-foreground'
                      )}
                    >
                      {ex.exampleValue || '(공란)'}
                    </span>
                    {ex.fieldClass === 'fact' && ex.fieldType !== 'date' && (
                      <span className="block text-[11px] text-amber-600 mt-0.5">※ 숫자·값은 예시 — 반드시 본인 값</span>
                    )}
                    {ex.whyNote && <div className="text-[11px] text-muted-foreground mt-0.5">{ex.whyNote}</div>}
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-muted-foreground flex items-start gap-1">
        <Lock className="w-3 h-3 mt-0.5 shrink-0" />
        [틀 가져오기]는 <b className="text-emerald-700 mx-0.5">틀</b>만 채웁니다.
        <b className="text-amber-700 mx-0.5">사실</b>은 예시를 그대로 저장하면 차단됩니다(기록 조작 방지).
      </p>
    </div>
  )
}

function HowTo({ examples }: { examples: FormExampleDto[] }): JSX.Element {
  const notes = examples.filter((e) => e.whyNote)
  return (
    <div className="space-y-2.5 text-[13px]">
      <div className="font-semibold">항목별 작성 요령</div>
      {notes.length === 0 ? (
        <p className="text-muted-foreground">등록된 작성 요령이 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((e) => (
            <li key={e.fieldKey} className="leading-relaxed">
              <b>{e.label}</b> <Tag kind={e.fieldClass} />
              <span className="block text-muted-foreground mt-0.5">{e.whyNote}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Evidence({ examples }: { examples: FormExampleDto[] }): JSX.Element {
  const facts = examples.filter((e) => e.fieldClass === 'fact')
  return (
    <div className="text-[13px] space-y-2.5">
      <div className="font-semibold">증빙으로 인정받으려면</div>
      <p className="text-muted-foreground leading-relaxed">
        아래 <b className="text-amber-700">사실</b> 항목은 실제 측정·확인 값이 있어야 심사에서 인정됩니다.
        빈칸이거나 예시값 그대로면 저장이 차단됩니다.
      </p>
      <ul className="space-y-1.5">
        {facts.map((e) => (
          <li key={e.fieldKey} className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            <b>{e.label}</b>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Penalty(): JSX.Element {
  return (
    <div className="text-[13px] space-y-2 text-rose-700">
      <div className="font-semibold">감점 · 주의</div>
      <ul className="space-y-1.5 text-[12.5px] leading-relaxed">
        <li>· 측정값을 "OK" 한 글자로 대체 — 실측 수치를 적지 않으면 감점.</li>
        <li>· 예시값을 그대로 복사 저장 — 기록 조작으로 간주(저장 자체가 차단됨).</li>
        <li>· 판정 근거(기준·시료수) 누락 — "기준대로 검사했다"가 증명 안 됨.</li>
        <li>· 부적합인데 관리대장 번호(NCR) 미연결 — 추적성 감점.</li>
      </ul>
    </div>
  )
}
