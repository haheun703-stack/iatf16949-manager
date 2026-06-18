import { Sparkles, Camera, Loader2 } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useFormStore } from '../../stores/formStore'
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
          {field.unit && (
            <span className="text-[11px] text-muted-foreground font-normal">({field.unit})</span>
          )}
        </span>

        {field.aiEnabled && (
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
    case 'photo':
      return (
        <div className="border-2 border-dashed border-border rounded-md p-6 text-center text-xs text-muted-foreground bg-muted/30">
          <Camera className="w-6 h-6 mx-auto mb-1.5 opacity-50" />
          사진 첨부 (구현 예정)
        </div>
      )
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
