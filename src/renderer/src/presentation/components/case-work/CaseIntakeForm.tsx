import { useState } from 'react'
import { Inbox, AlertTriangle } from 'lucide-react'
import type { CaseIntakeInput } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'

const EMPTY: CaseIntakeInput = {
  title: '', customer: '', source: '', partNo: '', partName: '', model: '',
  defectDesc: '', defectQty: null, attributable: '', occurredDate: '',
  receivedDate: '', dueDate: '', owner: '', lot: ''
}

// 필드 정의(모듈 레벨) — 렌더 시 input을 직접 그려 포커스/한글조합 유지.
// required = 필수입력 계약(화면문법노트 §2-2): 컬럼명 앞 * + 미입력 시 경고 + 저장 제한.
const FIELDS: Array<{ label: string; k: keyof CaseIntakeInput; type?: string; wide?: boolean; required?: boolean }> = [
  { label: '통보 제목', k: 'title', wide: true, required: true },
  { label: '고객사', k: 'customer', required: true },
  { label: '발생처', k: 'source' },
  { label: '품번', k: 'partNo', required: true },
  { label: '품명', k: 'partName' },
  { label: '차종', k: 'model' },
  { label: 'LOT NO', k: 'lot' },
  { label: '불량 수량', k: 'defectQty', type: 'number' },
  { label: '불량 내용', k: 'defectDesc', wide: true, required: true },
  { label: '귀책처', k: 'attributable' },
  { label: '사내 담당', k: 'owner' },
  { label: '발생일', k: 'occurredDate', type: 'date' },
  { label: '접수일', k: 'receivedDate', type: 'date' },
  { label: '회신 요구일(개선대책서 限)', k: 'dueDate', type: 'date', wide: true }
]

const FILL =
  'w-full bg-fillable text-[13px] px-2.5 py-2 rounded border border-border focus:border-primary/50 focus:outline-none'

export function CaseIntakeForm({
  onCreated,
  onCancel
}: {
  onCreated: (id: number) => void
  onCancel: () => void
}): JSX.Element {
  const [v, setV] = useState<CaseIntakeInput>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [missing, setMissing] = useState<string[]>([])

  const set = (k: keyof CaseIntakeInput, val: string): void =>
    setV((p) => ({ ...p, [k]: k === 'defectQty' ? (val === '' ? null : Number(val)) : val }))

  const submit = async (): Promise<void> => {
    // 필수입력 계약(§2-2): 미입력 시 저장 제한 — 빈칸이 가짜보다 낫지만, 접수 4요소는 없으면 케이스가 성립 안 함
    const miss = FIELDS.filter((f) => f.required && !String(v[f.k] ?? '').trim()).map((f) => f.label)
    setMissing(miss)
    if (miss.length > 0) return
    setSaving(true)
    try {
      const res = await window.api.invoke(window.api.channels.CASE_CREATE, v)
      onCreated(res.id)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-[680px]">
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="w-5 h-5 text-primary" />
        <h2 className="text-lg font-bold">새 불량 접수</h2>
      </div>

      {missing.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-bad-tint text-bad-ink text-[12.5px] font-semibold px-3.5 py-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          필수 항목 미입력: {missing.join(' · ')} — 입력해야 접수됩니다.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => {
          const isMissing = missing.length > 0 && f.required && !String(v[f.k] ?? '').trim()
          return (
            <label key={f.k} className={f.wide ? 'col-span-2' : ''}>
              <span className="block text-[11px] font-semibold text-muted-foreground mb-1">
                {f.required && <span className="text-bad-ink mr-0.5">*</span>}
                {f.label}
              </span>
              <input
                type={f.type ?? 'text'}
                value={(v[f.k] ?? '') as string | number}
                onChange={(e) => set(f.k, e.target.value)}
                className={cn(FILL, isMissing && '!border-bad-ink/60')}
              />
            </label>
          )
        })}
      </div>

      <div className="flex gap-2 mt-5">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={saving}
          className="bg-primary text-primary-foreground text-sm font-semibold rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? '접수 중...' : '접수 등록'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-muted-foreground rounded-lg px-4 py-2 hover:bg-muted"
        >
          취소
        </button>
      </div>
    </div>
  )
}
