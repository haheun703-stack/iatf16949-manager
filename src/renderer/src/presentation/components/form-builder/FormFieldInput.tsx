import { Sparkles, Loader2, Lock } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
import { PhotoField } from './PhotoField'
import type { FormFieldDto } from '@shared/ipc-types'

interface Props {
  field: FormFieldDto
}

export function FormFieldInput({ field }: Props): JSX.Element {
  const { values, setValue, generateAI, aiLoadingFieldKey } = useFormStore()
  const value = values[field.fieldKey] ?? ''
  const isAILoading = aiLoadingFieldKey === field.fieldKey

  const handleAI = (): void => {
    void generateAI(field.fieldKey)
  }

  return (
    <div>
      <label className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium flex items-center gap-2">
          {field.label}
          {field.type === 'auto' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-normal">
              자동
            </span>
          )}
          {field.fieldClass === 'fact' && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-semibold"
              title="사람이 실측·기입하는 값 — 예시·[틀 가져오기]·AI로 채울 수 없습니다(기록 조작 방지)"
            >
              오늘의 사실
            </span>
          )}
          {field.unit && (
            <span className="text-[11px] text-muted-foreground font-normal">({field.unit})</span>
          )}
        </span>

        {/* fact 필드는 AI 자동생성 금지(원칙2 — 사실은 사람만 채운다) */}
        {field.aiEnabled && field.fieldClass !== 'fact' && (
          <button
            type="button"
            onClick={handleAI}
            disabled={isAILoading}
            className={cn(
              'text-[11px] font-semibold flex items-center gap-1 px-2 py-1 rounded transition-colors',
              isAILoading
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {isAILoading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <Sparkles className="w-3 h-3" />
                AI 자동생성
              </>
            )}
          </button>
        )}
      </label>

      {renderInput(field, value, setValue)}
      {field.fieldClass === 'fact' && (
        <p className="mt-1 text-[11px] text-amber-600/90 flex items-center gap-1">
          <Lock className="w-3 h-3 shrink-0" /> 이 칸은 [틀 가져오기]·AI로 채워지지 않습니다 — 실측·실제 값만 저장됩니다
        </p>
      )}
    </div>
  )
}

function renderInput(
  field: FormFieldDto,
  value: unknown,
  setValue: (key: string, value: unknown) => void
): JSX.Element {
  const k = field.fieldKey
  const ph = field.placeholder ?? ''

  switch (field.type) {
    case 'textarea':
      return (
        <textarea
          className="w-full px-3 py-2 text-sm bg-fillable border border-fillable-border rounded-md focus:border-primary focus:outline-none resize-y min-h-[120px] whitespace-pre-wrap"
          placeholder={ph}
          value={String(value ?? '')}
          onChange={(e) => setValue(k, e.target.value)}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          className="w-full px-3 py-2 text-sm bg-fillable border border-fillable-border rounded-md focus:border-primary focus:outline-none"
          placeholder={ph}
          value={String(value ?? '')}
          onChange={(e) => setValue(k, e.target.value)}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          className="w-full px-3 py-2 text-sm bg-fillable border border-fillable-border rounded-md focus:border-primary focus:outline-none"
          value={String(value ?? '')}
          onChange={(e) => setValue(k, e.target.value)}
        />
      )
    case 'select':
      return (
        <select
          className="w-full px-3 py-2 text-sm bg-fillable border border-fillable-border rounded-md focus:border-primary focus:outline-none"
          value={String(value ?? '')}
          onChange={(e) => setValue(k, e.target.value)}
        >
          <option value="">선택</option>
          {(field.options || []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      )
    case 'radio':
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => (
            <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input
                type="radio"
                name={k}
                value={opt}
                checked={value === opt}
                onChange={() => setValue(k, opt)}
                className="accent-primary"
              />
              {opt}
            </label>
          ))}
        </div>
      )
    case 'checkbox': {
      const arr = Array.isArray(value) ? (value as string[]) : []
      return (
        <div className="flex flex-wrap gap-3">
          {(field.options || []).map((opt) => {
            const checked = arr.includes(opt)
            return (
              <label key={opt} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    const next = checked ? arr.filter((x) => x !== opt) : [...arr, opt]
                    setValue(k, next)
                  }}
                  className="accent-primary"
                />
                {opt}
              </label>
            )
          })}
        </div>
      )
    }
    case 'grid':
      return <GridField field={field} value={value} setValue={setValue} />
    case 'photo':
      return <PhotoField value={value} onChange={(v) => setValue(k, v)} />
    case 'auto':
      return (
        <input
          type="text"
          disabled
          className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-md text-muted-foreground"
          placeholder={ph}
          value={String(value ?? '')}
        />
      )
    default:
      return (
        <input
          type="text"
          className="w-full px-3 py-2 text-sm bg-fillable border border-fillable-border rounded-md focus:border-primary focus:outline-none"
          placeholder={ph}
          value={String(value ?? '')}
          onChange={(e) => setValue(k, e.target.value)}
        />
      )
  }
}

/** 격자/대장형 입력 — 행 추가/삭제 가능한 표. 값 = 레코드 배열(values_json[grid_key]). */
function GridField({
  field,
  value,
  setValue
}: {
  field: FormFieldDto
  value: unknown
  setValue: (key: string, value: unknown) => void
}): JSX.Element {
  const cols = field.gridColumns ?? []
  const rows: Array<Record<string, unknown>> = Array.isArray(value)
    ? (value as Array<Record<string, unknown>>)
    : []

  const commit = (next: Array<Record<string, unknown>>): void => setValue(field.fieldKey, next)
  const update = (rowIdx: number, colKey: string, v: string): void =>
    commit(rows.map((r, i) => (i === rowIdx ? { ...r, [colKey]: v } : r)))
  const addRow = (): void => commit([...rows, {}])
  const removeRow = (i: number): void => commit(rows.filter((_, idx) => idx !== i))

  if (cols.length === 0) {
    return <p className="text-xs text-muted-foreground">격자 컬럼 정의가 없습니다.</p>
  }

  return (
    <div className="border border-fillable-border rounded-md overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/50">
            <th className="px-2 py-1.5 text-left font-semibold text-muted-foreground w-8">#</th>
            {cols.map((c) => (
              <th key={c.colKey} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap">
                {c.label}
              </th>
            ))}
            <th className="px-1 w-8" />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 2} className="px-2 py-3 text-center text-muted-foreground">
                행이 없습니다. 아래 “행 추가”를 누르세요.
              </td>
            </tr>
          )}
          {rows.map((row, ri) => (
            <tr key={ri} className="border-t border-fillable-border">
              <td className="px-2 py-1 text-muted-foreground text-center">{ri + 1}</td>
              {cols.map((c) => (
                <td key={c.colKey} className="px-1 py-1">
                  <input
                    type={c.type === 'date' ? 'date' : 'text'}
                    className="w-full min-w-[84px] px-1.5 py-1 text-xs bg-fillable border border-transparent hover:border-fillable-border rounded focus:border-primary focus:outline-none"
                    value={String(row[c.colKey] ?? '')}
                    onChange={(e) => update(ri, c.colKey, e.target.value)}
                  />
                </td>
              ))}
              <td className="px-1 text-center">
                <button
                  type="button"
                  onClick={() => removeRow(ri)}
                  title="행 삭제"
                  className="text-muted-foreground hover:text-destructive text-base leading-none"
                >
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-2 py-1.5 border-t border-fillable-border bg-muted/20">
        <button
          type="button"
          onClick={addRow}
          className="text-xs font-semibold text-primary hover:underline"
        >
          + 행 추가
        </button>
      </div>
    </div>
  )
}
