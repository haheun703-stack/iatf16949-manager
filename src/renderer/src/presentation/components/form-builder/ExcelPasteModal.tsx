import { useMemo, useState } from 'react'
import { X, ClipboardPaste, Check, AlertCircle } from 'lucide-react'
import type { FormFieldDto } from '@shared/ipc-types'

/** 라벨 매칭용 정규화: 공백/구두점 제거 + 소문자 */
function norm(s: string): string {
  return s.replace(/[\s&·.()\-/[\]]/g, '').toLowerCase()
}

export interface PasteMatch {
  fieldKey: string
  label: string
  value: string
}
export interface PasteUnmatched {
  header: string
  value: string
  reason: string
}
export interface PasteResult {
  matched: PasteMatch[]
  unmatched: PasteUnmatched[]
}

/**
 * Excel 클립보드(TSV) → 필드 매핑. 두 가지 모양 지원:
 *  - 세로 키-값: 각 행이 [라벨, 값]
 *  - 가로 헤더+값: 1행=헤더, 2행=값(열 인덱스로 짝)
 */
export function mapPastedToFields(text: string, fields: FormFieldDto[]): PasteResult {
  const rows = text
    .replace(/\r/g, '')
    .split('\n')
    .map((r) => r.split('\t'))
    .filter((cells) => cells.some((c) => c.trim() !== ''))

  if (rows.length === 0) return { matched: [], unmatched: [] }

  // 모양 판별: 모든(혹은 대부분) 행이 정확히 2칸이면 세로 키-값
  const twoColRows = rows.filter((r) => r.length === 2).length
  const pairs: Array<[string, string]> = []
  if (rows.length >= 2 && twoColRows >= Math.ceil(rows.length / 2) && rows[0].length === 2) {
    for (const r of rows) pairs.push([r[0] ?? '', r[1] ?? ''])
  } else {
    // 가로: 1행 헤더, 2행 값
    const headers = rows[0]
    const valuesRow = rows[1] ?? []
    headers.forEach((h, i) => pairs.push([h, valuesRow[i] ?? '']))
  }

  const fieldByNorm = new Map<string, FormFieldDto>()
  for (const f of fields) fieldByNorm.set(norm(f.label), f)

  const matched: PasteMatch[] = []
  const unmatched: PasteUnmatched[] = []
  const usedKeys = new Set<string>()

  for (const [label, rawValue] of pairs) {
    const value = (rawValue ?? '').trim()
    if (label.trim() === '' && value === '') continue
    const f = fieldByNorm.get(norm(label))
    if (!f) {
      unmatched.push({ header: label.trim() || '(빈 라벨)', value, reason: '일치 필드 없음' })
      continue
    }
    if (f.type === 'auto' || f.type === 'photo') {
      unmatched.push({ header: f.label, value, reason: f.type === 'auto' ? '자동 필드(건너뜀)' : '사진(건너뜀)' })
      continue
    }
    if (usedKeys.has(f.fieldKey)) {
      unmatched.push({ header: f.label, value, reason: '중복 라벨' })
      continue
    }
    if ((f.type === 'select' || f.type === 'radio') && f.options && value && !f.options.includes(value)) {
      unmatched.push({ header: f.label, value, reason: '선택지에 없는 값' })
      continue
    }
    matched.push({ fieldKey: f.fieldKey, label: f.label, value })
    usedKeys.add(f.fieldKey)
  }

  return { matched, unmatched }
}

interface Props {
  fields: FormFieldDto[]
  onApply: (values: Record<string, unknown>) => void
  onClose: () => void
}

export function ExcelPasteModal({ fields, onApply, onClose }: Props): JSX.Element {
  const [raw, setRaw] = useState('')
  const result = useMemo(() => mapPastedToFields(raw, fields), [raw, fields])
  const hasInput = raw.trim() !== ''

  const apply = (): void => {
    const values: Record<string, unknown> = {}
    for (const m of result.matched) values[m.fieldKey] = m.value
    onApply(values)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl shadow-xl border border-border w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold">Excel에서 붙여넣기</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          <p className="text-[12px] text-muted-foreground leading-relaxed">
            엑셀에서 <b>라벨+값</b>(세로 2열) 또는 <b>헤더행+값행</b>(가로)을 복사한 뒤 아래에 붙여넣으세요(Ctrl+V).
            라벨이 양식 항목과 일치하면 자동으로 채워집니다.
          </p>
          <textarea
            autoFocus
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder={'예)\n품 명\t브라켓 ASSY\nLOT NO\tL2026-0612\n불량수량\t30'}
            className="w-full h-32 px-3 py-2 text-[13px] font-mono bg-input border border-border rounded-md focus:border-primary focus:outline-none resize-y whitespace-pre"
          />

          {hasInput && (
            <div className="space-y-3">
              <div>
                <div className="text-[11px] font-bold text-success mb-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 채울 항목 ({result.matched.length})
                </div>
                {result.matched.length === 0 ? (
                  <div className="text-[12px] text-muted-foreground">매칭된 항목이 없습니다. 라벨이 양식 항목명과 같은지 확인하세요.</div>
                ) : (
                  <div className="border border-border rounded-md divide-y divide-border">
                    {result.matched.map((m) => (
                      <div key={m.fieldKey} className="flex items-start gap-2 px-3 py-1.5 text-[12px]">
                        <span className="font-semibold min-w-[120px] shrink-0">{m.label}</span>
                        <span className="text-foreground break-all">{m.value || <span className="text-muted-foreground">(빈 값)</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {result.unmatched.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> 건너뛴 항목 ({result.unmatched.length})
                  </div>
                  <div className="border border-border rounded-md divide-y divide-border">
                    {result.unmatched.map((u, i) => (
                      <div key={`${u.header}-${i}`} className="flex items-start gap-2 px-3 py-1.5 text-[12px] text-muted-foreground">
                        <span className="min-w-[120px] shrink-0">{u.header}</span>
                        <span className="break-all flex-1">{u.value}</span>
                        <span className="text-[10px] shrink-0 px-1.5 py-0.5 rounded bg-muted">{u.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border">
          <button type="button" onClick={onClose} className="text-[13px] font-semibold px-3.5 py-2 rounded-lg border border-border hover:bg-muted">
            취소
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={result.matched.length === 0}
            className="text-[13px] font-semibold px-3.5 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            {result.matched.length}개 채우기
          </button>
        </div>
      </div>
    </div>
  )
}
