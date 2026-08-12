import { Eraser, Search, Plus, Save, Trash2, FileSpreadsheet, Printer, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useUIStore } from '../../stores/uiStore'

/**
 * 32호 §1-4 — 8버튼 툴바 (전 화면 고정): 초기화 · 조회 · 추가 · 저장 · 삭제 · 엑셀 · 인쇄 · 닫기.
 * 위치·순서·아이콘 전 화면 동일. 미지원 버튼은 흐림(정직 문법 — 숨기지 않는다).
 * 콜백이 없는 버튼 = 미지원. 닫기 기본 동작 = goBack(없으면 MES 홈).
 */

interface MesToolbarProps {
  onReset?: () => void
  onSearch?: () => void
  onAdd?: () => void
  onSave?: () => void
  onDelete?: () => void
  onExcel?: () => void
  onPrint?: () => void
  /** 미지정 시 goBack → home */
  onClose?: () => void
  /** 조회 진행 중 표시(조회 버튼만 비활성) */
  busy?: boolean
}

const BTN =
  'h-8 px-2.5 rounded-lg text-[12px] font-bold flex items-center gap-1 border transition-colors whitespace-nowrap'

export function MesToolbar(props: MesToolbarProps): JSX.Element {
  const { goBack, setPage } = useUIStore()
  const close = props.onClose ?? ((): void => {
    if (!goBack()) setPage('home')
  })
  const items: Array<{ label: string; icon: JSX.Element; fn?: () => void; busy?: boolean; accent?: boolean }> = [
    { label: '초기화', icon: <Eraser className="w-3.5 h-3.5" />, fn: props.onReset },
    { label: '조회', icon: <Search className="w-3.5 h-3.5" />, fn: props.onSearch, busy: props.busy, accent: true },
    { label: '추가', icon: <Plus className="w-3.5 h-3.5" />, fn: props.onAdd },
    { label: '저장', icon: <Save className="w-3.5 h-3.5" />, fn: props.onSave },
    { label: '삭제', icon: <Trash2 className="w-3.5 h-3.5" />, fn: props.onDelete },
    { label: '엑셀', icon: <FileSpreadsheet className="w-3.5 h-3.5" />, fn: props.onExcel },
    { label: '인쇄', icon: <Printer className="w-3.5 h-3.5" />, fn: props.onPrint },
    { label: '닫기', icon: <X className="w-3.5 h-3.5" />, fn: close }
  ]
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {items.map((b) => {
        const enabled = !!b.fn && !b.busy
        return (
          <button
            key={b.label}
            type="button"
            disabled={!enabled}
            onClick={() => b.fn?.()}
            className={cn(
              BTN,
              b.accent && enabled
                ? 'bg-mega-active text-white border-mega-active hover:opacity-90'
                : enabled
                  ? 'bg-card text-secondary-foreground border-border hover:bg-muted'
                  : 'bg-card text-muted-foreground/35 border-border/60 cursor-not-allowed'
            )}
          >
            {b.icon}
            {b.busy ? '조회 중…' : b.label}
          </button>
        )
      })}
    </div>
  )
}

/** 그리드 데이터 → CSV 다운로드 (엑셀 버튼 공용 — BOM 첨부로 한글 안전) */
export function downloadCsv(fileName: string, header: string[], rows: Array<Array<string | number | null>>): void {
  // 8/11 검수 Minor: 수식 선행문자 방어 — 엑셀은 = + - @ 로 시작하는 셀을 수식으로 해석한다
  // (품번·사유 등 사람이 적은 문자열이 그대로 수식이 되는 자리). 숫자는 무해화 제외 = 집계 보존.
  const NUMERIC = /^-?\d+(\.\d+)?$/
  const esc = (v: string | number | null): string => {
    let s = v == null ? '' : String(v)
    if (typeof v !== 'number' && /^[=+\-@\t\r]/.test(s) && !NUMERIC.test(s)) s = `'${s}`
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}
