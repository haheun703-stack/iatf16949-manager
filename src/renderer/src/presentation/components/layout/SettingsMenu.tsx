import { useEffect, useRef, useState } from 'react'
import { Settings, Check, Pencil, Folder, CalendarClock, Minus, Plus, Info, ShieldCheck } from 'lucide-react'
import type { CompanyProfile } from '@shared/ipc-types'
import { cn } from '../../../lib/utils'
import { useUIStore, FONT_SCALE_MIN, FONT_SCALE_MAX, FONT_SCALE_STEP } from '../../stores/uiStore'
import { setAuditDateCache } from '../../hooks/useDday'

/**
 * GNB 우측 설정 팝오버 — 사이드바 제거(포털 1단계)로 이동해 온 설정들:
 * 양식 작성자 · 심사일 · 정본 폴더 · 글자 크기 배율 · 제품 정보.
 */
export function SettingsMenu(): JSX.Element {
  const { setPage, fontScale, setFontScale } = useUIStore()
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [author, setAuthor] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingDate, setEditingDate] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const p = (await window.api.invoke(window.api.channels.COMPANY_PROFILE_GET)) as CompanyProfile
        if (alive) {
          setProfile(p)
          setAuthor(p?.defaultAuthor || '')
        }
      } catch {
        /* 프로필 없으면 빈 값 */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  // 바깥 클릭 / Escape 로 닫기
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent): void => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const saveAuthor = async (): Promise<void> => {
    const name = draft.trim()
    setEditing(false)
    if (!name || !profile || name === author) return
    const next = { ...profile, defaultAuthor: name }
    try {
      await window.api.invoke(window.api.channels.COMPANY_PROFILE_SAVE, next)
      setProfile(next)
      setAuthor(name)
    } catch {
      /* 저장 실패 시 이전 값 유지 */
    }
  }

  const saveAuditDate = async (value: string): Promise<void> => {
    setEditingDate(false)
    if (!value || !profile || value === profile.auditDate) return
    const next = { ...profile, auditDate: value }
    try {
      await window.api.invoke(window.api.channels.COMPANY_PROFILE_SAVE, next)
      setProfile(next)
      setAuditDateCache(value) // D-day 배지·대시보드 즉시 갱신
    } catch {
      /* 저장 실패 시 이전 값 유지 */
    }
  }

  const masterBase = profile?.mastersDir
    ? profile.mastersDir.split(/[\\/]/).filter(Boolean).pop() || ''
    : ''

  const pickMastersDir = async (): Promise<void> => {
    try {
      const res = (await window.api.invoke(window.api.channels.COMPANY_PICK_MASTERS_DIR)) as {
        filePath: string | null
      }
      if (res?.filePath && profile) setProfile({ ...profile, mastersDir: res.filePath })
    } catch {
      /* 취소/실패 무시 */
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="설정"
        aria-expanded={open}
        title="설정 — 작성자 · 심사일 · 정본 폴더 · 글자 크기"
        className={cn(
          'w-8 h-8 rounded-md flex items-center justify-center transition-colors',
          open ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-muted-foreground'
        )}
      >
        <Settings className="w-4 h-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-72 bg-popover border border-border rounded-xl shadow-lg p-3 z-50">
          {/* 양식 작성자 */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 px-1 pb-1">
            양식 작성자
          </div>
          {editing ? (
            <div className="flex items-center gap-1 px-1">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={() => void saveAuthor()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void saveAuthor()
                  else if (e.key === 'Escape') setEditing(false)
                }}
                placeholder="작성자명"
                className="flex-1 min-w-0 bg-fillable text-[12px] px-2 py-1 rounded border border-primary/50 focus:outline-none"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => void saveAuthor()}
                className="shrink-0 text-primary hover:bg-primary/10 rounded p-1"
                title="저장"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(author)
                setEditing(true)
              }}
              className="group w-full text-left text-[12px] hover:bg-muted rounded px-1 py-1 flex items-center gap-1.5"
              title="양식 작성자 변경 — 양식 자동채움·분배에 사용"
            >
              <span className="font-semibold">{author || '작성자 미설정'}</span>
              <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}

          {/* 심사일 */}
          {editingDate ? (
            <input
              autoFocus
              type="date"
              defaultValue={profile?.auditDate || ''}
              onBlur={(e) => void saveAuditDate(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveAuditDate((e.target as HTMLInputElement).value)
                else if (e.key === 'Escape') setEditingDate(false)
              }}
              className="mt-2 w-full bg-fillable text-[11px] px-1.5 py-1 rounded border border-primary/50 focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingDate(true)}
              title="정기 인증심사일 변경 — D-day 배지·브리핑의 기준일"
              className="group mt-1.5 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1 py-1"
            >
              <CalendarClock className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">
                심사일:{' '}
                <span className={cn('font-medium', profile?.auditDate ? 'text-foreground' : 'text-amber-600')}>
                  {profile?.auditDate || '미설정'}
                </span>
              </span>
              <Pencil className="w-3 h-3 ml-auto shrink-0 opacity-0 group-hover:opacity-60 transition-opacity" />
            </button>
          )}

          {/* 정본 폴더 */}
          <button
            type="button"
            onClick={() => void pickMastersDir()}
            title={profile?.mastersDir || '정본(마스터 양식) 폴더 미설정 — 클릭하여 지정. 공식 xlsx 출력의 원본 위치.'}
            className="group mt-1 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1 py-1"
          >
            <Folder className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate">
              정본 폴더:{' '}
              <span className={cn('font-medium', masterBase ? 'text-foreground' : 'text-amber-600')}>
                {masterBase || '미설정'}
              </span>
            </span>
          </button>

          {/* 글자 크기 배율 — 심사장 시연 접근성 (UI P3) */}
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground px-1 py-1">
            <span className="shrink-0">글자 크기</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setFontScale(fontScale - FONT_SCALE_STEP)}
                disabled={fontScale <= FONT_SCALE_MIN + 0.001}
                title="글자 작게"
                className="rounded p-0.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setFontScale(1)}
                title="기본 크기(100%)로 초기화"
                className="min-w-[38px] text-center font-medium text-foreground tabular-nums rounded px-1 py-0.5 hover:bg-muted"
              >
                {Math.round(fontScale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setFontScale(fontScale + FONT_SCALE_STEP)}
                disabled={fontScale >= FONT_SCALE_MAX - 0.001}
                title="글자 크게"
                className="rounded p-0.5 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 정합성 점검 (7/19 검수 체계 1층) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setPage('integrity')
            }}
            title="정합성 점검 — 팀·규정·양식·의무 체인 결정론 검사"
            className="mt-1 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1 py-1"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>정합성 점검</span>
          </button>

          {/* 제품 정보 (UI P3) */}
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setPage('about')
            }}
            title="제품 정보 — 버전 · 제조사 · 시스템 정보"
            className="mt-1 w-full flex items-center gap-1.5 text-left text-[11px] text-muted-foreground hover:bg-muted rounded px-1 py-1"
          >
            <Info className="w-3.5 h-3.5 shrink-0 opacity-80" />
            <span>제품 정보</span>
          </button>
        </div>
      )}
    </div>
  )
}
