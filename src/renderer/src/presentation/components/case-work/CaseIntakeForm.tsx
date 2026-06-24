import { useState } from 'react'
import { Sparkles, Inbox } from 'lucide-react'
import type { CaseIntakeInput } from '@shared/ipc-types'

/** 캡쳐된 실제 고객 통보서 샘플(삼보 INLINE 감마2 클립 이물 불량). 데모 1클릭 채움. */
const SAMPLE: CaseIntakeInput = {
  title: '삼보 INLINE 감마2 워터 아웃 파이프 클립 이물 불량',
  customer: '삼보모터스',
  source: '삼보 INLINE',
  partNo: '28237-2MAA1',
  partName: 'PIPE ASSY, B-T/C WATER, OUT',
  model: '감마2',
  defectDesc: '클립 이물 불량 (도면 마킹 번짐)',
  defectQty: 1,
  attributable: 'TPC 2공장',
  occurredDate: '2026-06-17',
  receivedDate: '2026-06-17',
  dueDate: '2026-06-19',
  owner: '홍길동',
  lot: 'L26-0617A'
}

const EMPTY: CaseIntakeInput = {
  title: '', customer: '', source: '', partNo: '', partName: '', model: '',
  defectDesc: '', defectQty: null, attributable: '', occurredDate: '',
  receivedDate: '', dueDate: '', owner: '', lot: ''
}

// 필드 정의(모듈 레벨) — 렌더 시 input을 직접 그려 포커스/한글조합 유지
const FIELDS: Array<{ label: string; k: keyof CaseIntakeInput; type?: string; wide?: boolean }> = [
  { label: '통보 제목', k: 'title', wide: true },
  { label: '고객사', k: 'customer' },
  { label: '발생처', k: 'source' },
  { label: '품번', k: 'partNo' },
  { label: '품명', k: 'partName' },
  { label: '차종', k: 'model' },
  { label: 'LOT NO', k: 'lot' },
  { label: '불량 수량', k: 'defectQty', type: 'number' },
  { label: '불량 내용', k: 'defectDesc', wide: true },
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

  const set = (k: keyof CaseIntakeInput, val: string): void =>
    setV((p) => ({ ...p, [k]: k === 'defectQty' ? (val === '' ? null : Number(val)) : val }))

  const submit = async (): Promise<void> => {
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
        <button
          type="button"
          onClick={() => setV(SAMPLE)}
          className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-primary border border-primary/40 rounded px-2.5 py-1.5 hover:bg-primary/5"
        >
          <Sparkles className="w-3.5 h-3.5" /> 샘플 채우기(삼보 통보서)
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((f) => (
          <label key={f.k} className={f.wide ? 'col-span-2' : ''}>
            <span className="block text-[11px] font-semibold text-muted-foreground mb-1">{f.label}</span>
            <input
              type={f.type ?? 'text'}
              value={(v[f.k] ?? '') as string | number}
              onChange={(e) => set(f.k, e.target.value)}
              className={FILL}
            />
          </label>
        ))}
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
