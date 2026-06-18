import { useEffect, useMemo, useState } from 'react'
import { useFormStore } from '../../stores/formStore'
import type { FormFieldDto, FormLayoutBlock, FormLayoutCell } from '@shared/ipc-types'

/**
 * 노션풍 양식 문서 뷰 — "양식 그리는 기계".
 * forms.layout_json(설계도)이 있으면 블록(section/grid/full)대로 실양식처럼 그리고,
 * 없으면 섹션 기반 auto-layout 으로 폴백한다.
 * 화면에서는 A4 시트로 보이고, 인쇄 시 .print-document 영역만 출력(app.css @media print).
 * 메타(발행번호/작성일/작성자)는 자동 주입, 실내용은 사람이 입력.
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

  const fieldByKey = useMemo(() => {
    const m = new Map<string, FormFieldDto>()
    if (currentForm) for (const f of currentForm.fields) m.set(f.fieldKey, f)
    return m
  }, [currentForm])

  // 폴백용: 섹션별 그룹화(정의 순서 유지)
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
  const layout = currentForm.layout

  return (
    <div className="print-document mx-auto w-full max-w-[820px] bg-card border border-foreground/70 shadow-sm">
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

      {/* ── 본문 ── */}
      {layout ? (
        <div>
          {layout.blocks.map((block, i) => (
            <Block key={i} block={block} fieldByKey={fieldByKey} values={values} setValue={setValue} />
          ))}
        </div>
      ) : (
        // 설계도 없는 양식: 섹션 기반 auto-layout
        <div>
          {sections.map(([sectionName, fields]) => (
            <div key={sectionName}>
              <SectionBar title={sectionName} />
              <table className="w-full border-collapse">
                <tbody>
                  {fields.map((f) => (
                    <tr key={`${currentForm.code}-${f.fieldKey}`} className="border-b border-border align-top">
                      <th className="bg-muted/30 border-r border-border px-3 py-2 text-left text-[12px] font-semibold w-[140px] align-top">
                        {f.label}
                      </th>
                      <td className="px-2 py-1.5">
                        <DocCell field={f} value={values[f.fieldKey]} setValue={setValue} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── 블록 렌더러 ── */
function Block({
  block,
  fieldByKey,
  values,
  setValue
}: {
  block: FormLayoutBlock
  fieldByKey: Map<string, FormFieldDto>
  values: Record<string, unknown>
  setValue: (key: string, value: unknown) => void
}): JSX.Element | null {
  if (block.type === 'section') return <SectionBar title={block.title} />

  if (block.type === 'full') {
    const f = fieldByKey.get(block.fieldKey)
    if (!f) return null
    return (
      <div className="border-b border-border px-3 py-2">
        <div className="text-[11px] font-semibold text-muted-foreground mb-1">※ {f.label}</div>
        <DocCell field={f} value={values[f.fieldKey]} setValue={setValue} />
      </div>
    )
  }

  // grid
  const columns = Math.max(1, block.columns)
  const rows = groupCells(block.cells, columns)
  return (
    <table className="w-full border-collapse">
      <tbody>
        {rows.map((row, ri) => {
          const used = row.reduce((s, c) => s + c.span, 0)
          return (
            <tr key={ri} className="border-b border-border align-top">
              {row.map((c, ci) => {
                const f = fieldByKey.get(c.fieldKey)
                // 마지막 셀이 행을 못 채우면 남는 만큼 값칸 확장
                const extra = ci === row.length - 1 ? (columns - used) * 2 : 0
                const valueColSpan = c.span * 2 - 1 + extra
                return (
                  <FieldCell
                    key={c.fieldKey}
                    field={f}
                    value={f ? values[f.fieldKey] : ''}
                    setValue={setValue}
                    valueColSpan={valueColSpan}
                  />
                )
              })}
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

interface SpannedCell extends FormLayoutCell {
  span: number
}

/** cells 를 columns(라벨-값 쌍 수) 단위 행으로 묶음 */
function groupCells(cells: FormLayoutCell[], columns: number): SpannedCell[][] {
  const rows: SpannedCell[][] = []
  let cur: SpannedCell[] = []
  let acc = 0
  for (const c of cells) {
    const span = Math.min(Math.max(1, c.colSpan ?? 1), columns)
    if (acc + span > columns && cur.length) {
      rows.push(cur)
      cur = []
      acc = 0
    }
    cur.push({ ...c, span })
    acc += span
    if (acc >= columns) {
      rows.push(cur)
      cur = []
      acc = 0
    }
  }
  if (cur.length) rows.push(cur)
  return rows
}

/* 그리드 한 칸 = 라벨 th + 값 td */
function FieldCell({
  field,
  value,
  setValue,
  valueColSpan
}: {
  field: FormFieldDto | undefined
  value: unknown
  setValue: (key: string, value: unknown) => void
  valueColSpan: number
}): JSX.Element {
  if (!field) {
    return <td colSpan={valueColSpan + 1} className="border-r border-border" />
  }
  return (
    <>
      <th className="bg-muted/30 border-x border-border px-2.5 py-2 text-left text-[12px] font-semibold w-[110px] whitespace-nowrap align-middle">
        {field.label}
        {field.unit && <span className="text-[10px] text-muted-foreground font-normal"> ({field.unit})</span>}
      </th>
      <td colSpan={valueColSpan} className="border-r border-border px-1.5 py-1 align-middle">
        <DocCell field={field} value={value} setValue={setValue} />
      </td>
    </>
  )
}

/* 섹션 헤더 바 */
function SectionBar({ title }: { title: string }): JSX.Element {
  return (
    <div className="bg-muted/60 px-3 py-1.5 text-[12px] font-bold tracking-wide border-y border-border">
      {title}
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

function cellClass(extra = ''): string {
  return `w-full bg-transparent text-[13px] px-1.5 py-1 rounded focus:bg-primary/5 focus:outline-none ${extra}`
}

/* 값 입력 셀(타입별) */
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
      return <input type="date" value={String(v)} onChange={(e) => setValue(k, e.target.value)} className={cellClass()} />
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
          className={cellClass('min-h-[96px] resize-y whitespace-pre-wrap leading-relaxed')}
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
          {(field.options || []).map((opt, i) => {
            const on = v === opt
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setValue(k, opt)}
                className={`text-[13px] flex items-center gap-1 ${on ? 'font-semibold' : 'text-muted-foreground'}`}
              >
                <span>{on ? '●' : '○'}</span>
                <span className="text-muted-foreground/70">{i + 1}.</span>
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
