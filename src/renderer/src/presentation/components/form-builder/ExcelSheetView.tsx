import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useFormStore } from '../../stores/formStore'
import type { FormRenderModelDto, RenderCellDto, RenderEditCellDto } from '@shared/ipc-types'

/**
 * 양식 캔버스 — 원본 마스터 시트를 table 로 재현하고,
 * form_cell_map 좌표의 셀만 입력 가능하게 치환한 "엑셀형 작성 화면".
 * 저장·공식출력은 기존 formStore/출력엔진 그대로(같은 values_json).
 */
export function ExcelSheetView(): JSX.Element {
  const currentForm = useFormStore((s) => s.currentForm)
  const values = useFormStore((s) => s.values)
  const setValue = useFormStore((s) => s.setValue)

  const [model, setModel] = useState<FormRenderModelDto | null>(null)
  const [loading, setLoading] = useState(false)

  // P8② — 원본 시트 배율. 기본 '폭 맞춤'(축소해 한눈에 다 보임 — "잘렸나?" 오해 방지),
  //  '100%'로 실제 크기 확인. availW = 스크롤 컨테이너 안쪽 폭(세로 스크롤바 제외).
  const scrollRef = useRef<HTMLDivElement>(null)
  const [availW, setAvailW] = useState(0)
  const [mode, setMode] = useState<'fit' | 'full'>('fit')

  const formCode = currentForm?.code

  useEffect(() => {
    if (!formCode) return
    let alive = true
    setLoading(true)
    setModel(null)
    void (async () => {
      try {
        const res = (await window.api.invoke(window.api.channels.FORM_RENDER_MODEL, {
          formCode
        })) as FormRenderModelDto
        if (alive) setModel(res)
      } catch (err) {
        if (alive)
          setModel({
            formCode, sheetName: '', rowCount: 0, colCount: 0,
            colWidthsPx: [], rowHeightsPx: [], cells: [], editCells: [],
            error: err instanceof Error ? err.message : String(err)
          })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [formCode])

  // 컨테이너 폭 추적 → '폭 맞춤' 배율 계산(창 크기·글자 배율·패널 접힘에 실시간 반응).
  //  useLayoutEffect = 페인트 전에 측정·반영 → 뷰가 열릴 때 100%→폭맞춤 깜빡임 방지.
  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = (): void => setAvailW(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [model])

  // (r,c) → 셀/입력셀 lookup
  const editLut = useMemo(() => {
    const m = new Map<string, RenderEditCellDto>()
    for (const e of model?.editCells ?? []) m.set(`${e.r},${e.c}`, e)
    return m
  }, [model])
  const cellLut = useMemo(() => {
    const m = new Map<string, RenderCellDto>()
    for (const c of model?.cells ?? []) m.set(`${c.r},${c.c}`, c)
    return m
  }, [model])
  // 슬레이브 좌표(병합 내부) — 건너뛰기용
  const slaveSet = useMemo(() => {
    const s = new Set<string>()
    for (const c of model?.cells ?? []) {
      if (c.rowspan === 1 && c.colspan === 1) continue
      for (let r = c.r; r < c.r + c.rowspan; r++)
        for (let cc = c.c; cc < c.c + c.colspan; cc++)
          if (!(r === c.r && cc === c.c)) s.add(`${r},${cc}`)
    }
    return s
  }, [model])

  if (loading || !model) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> 원본 양식 불러오는 중...
      </div>
    )
  }
  if (model.error || model.rowCount === 0) {
    return (
      <div className="flex items-start gap-2 p-4 text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold">엑셀 뷰를 만들 수 없습니다</div>
          <div className="mt-0.5 text-amber-700">
            {model.error ?? '원본 시트가 비어있습니다.'} — 입력 모드를 이용하세요.
          </div>
        </div>
      </div>
    )
  }

  const totalW = model.colWidthsPx.reduce((a, b) => a + b, 0)
  // 폭 맞춤 = 컨테이너에 딱 맞게 축소(1 이하로만 — 작은 시트는 100% 유지, 확대는 안 함).
  const fitScale = availW > 0 && totalW > 0 ? Math.min(1, availW / totalW) : 1
  const scale = mode === 'fit' ? fitScale : 1
  const scaledPct = Math.round(scale * 100)
  // 100% 배율에서 실제로 옆으로 넘칠 때만 첫 열 고정을 켠다(폭 맞춤에선 스크롤이 없어 불필요).
  const canScrollX = mode === 'full' && totalW > availW + 1

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-[11.5px] text-muted-foreground">
        <span>원본 시트: <span className="font-mono">{model.sheetName}</span></span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-sm bg-amber-100 border border-amber-400" />
          입력 가능 셀 {model.editCells.length}개 — 클릭해서 작성
        </span>
        {canScrollX && (
          <span className="inline-flex items-center gap-1 text-primary/70">← → 가로로 넘겨 보세요 (첫 열 고정)</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {mode === 'fit' && scale < 1 && (
            <span className="tabular-nums text-muted-foreground/70">폭 맞춤 {scaledPct}%</span>
          )}
          <div className="flex items-center rounded-md border border-border p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => setMode('fit')}
              title="원본 시트를 화면 폭에 맞게 축소해 한눈에 보여줍니다"
              className={
                'px-2 py-1 rounded text-[11px] font-semibold transition-colors ' +
                (mode === 'fit'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              폭 맞춤
            </button>
            <button
              type="button"
              onClick={() => setMode('full')}
              title="실제 크기(100%)로 봅니다 — 넘치면 가로 스크롤·첫 열 고정"
              className={
                'px-2 py-1 rounded text-[11px] font-semibold transition-colors ' +
                (mode === 'full'
                  ? 'bg-card shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              100%
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollRef}
        // scrollbar-gutter:stable — 세로 스크롤바 유무와 무관하게 안쪽 폭을 일정하게(폭 맞춤 배율 진동 방지)
        className="overflow-auto border border-border rounded-lg bg-white shadow-sm max-h-[calc(100vh-260px)] [scrollbar-gutter:stable]"
      >
        <table
          className="border-collapse"
          style={{
            width: totalW,
            tableLayout: 'fixed',
            zoom: scale,
            fontFamily: "'맑은 고딕', 'Malgun Gothic', sans-serif"
          }}
        >
          <colgroup>
            {model.colWidthsPx.map((w, i) => (
              <col key={i} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>
            {Array.from({ length: model.rowCount }, (_, ri) => {
              const r = ri + 1
              return (
                <tr key={r} style={{ height: model.rowHeightsPx[ri] ?? 22 }}>
                  {Array.from({ length: model.colCount }, (_, ci) => {
                    const c = ci + 1
                    const key = `${r},${c}`
                    if (slaveSet.has(key)) return null
                    const cell = cellLut.get(key)
                    const edit = editLut.get(key)
                    return (
                      <SheetCell
                        key={key}
                        cell={cell}
                        edit={edit}
                        frozen={c === 1 && canScrollX}
                        value={edit ? String(values[edit.fieldKey] ?? '') : undefined}
                        onChange={edit ? (v) => setValue(edit.fieldKey, v) : undefined}
                      />
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SheetCell({
  cell,
  edit,
  frozen,
  value,
  onChange
}: {
  cell?: RenderCellDto
  edit?: RenderEditCellDto
  frozen?: boolean
  value?: string
  onChange?: (v: string) => void
}): JSX.Element {
  const style: React.CSSProperties = {
    borderTop: cell?.bt ?? '1px solid #f0f0f0',
    borderRight: cell?.br ?? '1px solid #f0f0f0',
    borderBottom: cell?.bb ?? '1px solid #f0f0f0',
    borderLeft: cell?.bl ?? '1px solid #f0f0f0',
    backgroundColor: cell?.bg,
    color: cell?.color,
    fontWeight: cell?.bold ? 700 : 400,
    fontSize: cell?.fontSize ?? 13,
    textAlign: cell?.align ?? 'left',
    verticalAlign: cell?.valign ?? 'middle',
    whiteSpace: cell?.wrap ? 'pre-wrap' : 'nowrap',
    overflow: 'hidden',
    padding: '1px 3px',
    lineHeight: 1.25
  }
  // P8② 첫 열 고정 — 가로 스크롤 시 식별 열(NO 등)이 항상 보이게 sticky 처리.
  //  투명 셀은 뒤가 비치지 않게 흰색으로 채우고, 우측에 얇은 구분선을 준다.
  if (frozen) {
    style.position = 'sticky'
    style.left = 0
    style.zIndex = edit ? 3 : 2
    style.backgroundColor = cell?.bg ?? '#fff'
    style.boxShadow = 'inset -1px 0 0 #d4d4d8, 2px 0 5px -3px rgba(0,0,0,0.18)'
  }

  if (edit && onChange) {
    const isArea = edit.type === 'textarea'
    return (
      <td
        rowSpan={cell?.rowspan ?? 1}
        colSpan={cell?.colspan ?? 1}
        style={{ ...style, backgroundColor: '#FFFBEB', padding: 0 }}
        title={`${edit.label} (${edit.cell})`}
      >
        {isArea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={edit.label}
            className="w-full h-full min-h-[100%] resize-none bg-transparent px-1.5 py-1 text-[13px] leading-snug focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 placeholder:text-amber-400/70"
            style={{ textAlign: cell?.align ?? 'left' }}
          />
        ) : (
          <input
            type={edit.type === 'date' ? 'date' : edit.type === 'number' ? 'number' : 'text'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={edit.label}
            className="w-full h-full bg-transparent px-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-400 placeholder:text-amber-400/70"
            style={{ textAlign: cell?.align ?? 'center' }}
          />
        )}
      </td>
    )
  }

  return (
    <td rowSpan={cell?.rowspan ?? 1} colSpan={cell?.colspan ?? 1} style={style}>
      {cell?.text ?? ''}
    </td>
  )
}
