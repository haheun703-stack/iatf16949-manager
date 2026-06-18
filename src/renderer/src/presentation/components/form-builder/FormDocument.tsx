import { useEffect, useMemo, useState } from 'react'
import { useFormStore } from '../../stores/formStore'
import type { FormFieldDto } from '@shared/ipc-types'

/**
 * 노션풍 양식 문서 뷰.
 * 실제 종이 양식처럼 제목·결재란·섹션 표 레이아웃에 값을 인라인 입력.
 * 화면에서는 A4 시트로 보이고, 인쇄 시 .print-document 영역만 출력된다(app.css @media print).
 * 실내용은 사람이 입력하고, 발행번호/작성일자/작성자 등 메타는 자동 주입된 값이 들어온다.
 */
export function FormDocument(): JSX.Element | null {
  const { currentForm, values, setValue } = useFormStore()
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const profile = (await window.api.invoke(
          window.api.channels.COMPANY_PROFILE_GET
        )) as { companyName?: string }
        if (alive) setCompanyName(profile?.companyName || '')
      } catch {
        /* 회사명 없으면 빈 값 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 섹션별 그룹화(정의 순서 유지)
  const sections = useMemo(() => {
    if (!currentForm) return []
    const map = new Map<string, FormFieldDto[]>()
    for (const f of currentForm.fields) {
      const k = f.section || '기타'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(f)
    }
    return Array.from(map.entries())
  }, [currentForm])

  if (!currentForm) return null

  return (
    <div className="print-document mx-auto w-full max-w-[820px] bg-card border border-border shadow-sm">
      {/* ── 머리말: 회사명 / 제목 / 결재란 ── */}
      <div className="flex items-stretch border-b-2 border-foreground/80">
        <div className="flex flex-col justify-center px-4 py-3 border-r border-border min-w-[150px]">
          <div className="text-[11px] text-muted-foreground">{currentForm.code}</div>
          <div className="text-base font-bold leading-tight">{companyName || '회사명'}</div>
          {currentForm.regCode && (
            <div className="text-[10px] text-muted-foreground mt-0.5">규정 {currentForm.regCode}</div>
          )}
        </div>
        <div className="flex flex-1 items-center justify-center px-4 py-3">
          <h1 className="text-2xl font-bold tracking-[0.15em] text-center">{currentForm.name}</h1>
        </div>
        {currentForm.approvals.length > 0 && <ApprovalGrid approvals={currentForm.approvals} />}
      </div>

      {/* ── 본문: 섹션별 표 ── */}
      <div className="p-0">
        {sections.map(([sectionName, fields]) => (
          <div key={sectionName}>
            <div className="bg-muted/60 px-3 py-1.5 text-[11px] font-bold tracking-wide border-b border-border">
              {sectionName}
            </div>
            <table className="w-full border-collapse">
              <tbody>
                {fields.map((f) => (
                  <DocRow key={`${currentForm.code}-${f.fieldKey}`} field={f} value={values[f.fieldKey]} setValue={setValue} />
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 우상단 결재란 (담당/팀장/…) */
function ApprovalGrid({ approvals }: { approvals: string[] }): JSX.Element {
  return (
    <table className="border-l border-border border-collapse shrink-0">
      <tbody>
        <tr>
          <td
            rowSpan={2}
            className="border border-border px-1 text-[10px] text-muted-foreground text-center align-middle"
            style={{ writingMode: 'vertical-rl' }}
          >
            결재
          </td>
          {approvals.map((label, i) => (
            <td key={`${label}-${i}`} className="border border-border px-3 py-1 text-[10px] text-center text-muted-foreground min-w-[52px]">
              {label}
            </td>
          ))}
        </tr>
        <tr>
          {approvals.map((label, i) => (
            <td key={`sign-${label}-${i}`} className="border border-border h-12" />
          ))}
        </tr>
      </tbody>
    </table>
  )
}

/* 한 필드 = 한 행 (라벨 칸 + 값 칸). textarea/photo 는 전폭. */
function DocRow({
  field,
  value,
  setValue
}: {
  field: FormFieldDto
  value: unknown
  setValue: (key: string, value: unknown) => void
}): JSX.Element {
  const fullWidth = field.type === 'textarea' || field.type === 'photo'
  return (
    <tr className="border-b border-border align-top">
      <th className="bg-muted/30 border-r border-border px-3 py-2 text-left text-[12px] font-semibold w-[140px] align-top">
        {field.label}
        {field.unit && <span className="text-[10px] text-muted-foreground font-normal"> ({field.unit})</span>}
      </th>
      <td className="px-2 py-1.5" colSpan={fullWidth ? 2 : 1}>
        <DocCell field={field} value={value} setValue={setValue} />
      </td>
    </tr>
  )
}

function cellClass(extra = ''): string {
  return `w-full bg-transparent text-[13px] px-1.5 py-1 rounded focus:bg-primary/5 focus:outline-none ${extra}`
}

function DocCell({
  field,
  value,
  setValue
}: {
  field: FormFieldDto
  value: unknown
  setValue: (key: string, value: unknown) => void
}): JSX.Element {
  const k = field.fieldKey
  const v = value ?? ''

  switch (field.type) {
    case 'auto':
      return (
        <input
          type="text"
          readOnly
          value={String(v)}
          placeholder={field.placeholder ?? ''}
          className={cellClass('text-muted-foreground font-mono')}
        />
      )
    case 'date':
      return (
        <input
          type="date"
          value={String(v)}
          onChange={(e) => setValue(k, e.target.value)}
          className={cellClass()}
        />
      )
    case 'number':
      return (
        <input
          type="number"
          value={String(v)}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => setValue(k, e.target.value)}
          className={cellClass()}
        />
      )
    case 'textarea':
      return (
        <textarea
          value={String(v)}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => setValue(k, e.target.value)}
          className={cellClass('min-h-[88px] resize-y whitespace-pre-wrap leading-relaxed')}
        />
      )
    case 'select':
      return (
        <select value={String(v)} onChange={(e) => setValue(k, e.target.value)} className={cellClass()}>
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
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 py-1">
          {(field.options || []).map((opt) => {
            const on = v === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(k, opt)}
                className={`text-[13px] flex items-center gap-1 ${on ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                <span>{on ? '●' : '○'}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )
    case 'checkbox': {
      const arr = Array.isArray(v) ? (v as string[]) : []
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 px-1 py-1">
          {(field.options || []).map((opt) => {
            const on = arr.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(k, on ? arr.filter((x) => x !== opt) : [...arr, opt])}
                className={`text-[13px] flex items-center gap-1 ${on ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                <span>{on ? '☑' : '☐'}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )
    }
    case 'photo':
      return (
        <div className="border border-dashed border-border rounded h-24 flex items-center justify-center text-[11px] text-muted-foreground">
          사진 첨부 (구현 예정)
        </div>
      )
    default:
      return (
        <input
          type="text"
          value={String(v)}
          placeholder={field.placeholder ?? ''}
          onChange={(e) => setValue(k, e.target.value)}
          className={cellClass()}
        />
      )
  }
}
