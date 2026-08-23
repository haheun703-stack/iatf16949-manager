import { useState } from 'react'
import { Lock, KeyRound } from 'lucide-react'
import { useActiveUserStore } from '../../stores/activeUserStore'
import { PAGE_LABELS, type PageId } from '../../stores/uiStore'

/**
 * M2 — IATF 애드온 잠금 화면(2026-08-23). 잠긴 화면으로 들어오면 본문 대신 이 패널.
 * 최종관리자(executive)는 여기서 키를 입력해 언락(POST /api/license:unlock) → 세션 재조회 → 화면 그대로 열림.
 * 그 외 역할은 "관리자에게 문의" 안내만. 키 검증은 서버(회사명 HMAC) — 화면은 결과 메시지를 그대로 보여준다.
 */
export function AddonLockPanel({ page }: { page: PageId }): JSX.Element {
  const session = useActiveUserStore((s) => s.session)
  const refreshSession = useActiveUserStore((s) => s.refreshSession)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const isExec = session?.role === 'executive'

  const unlock = async (): Promise<void> => {
    setBusy(true)
    setMsg(null)
    try {
      const r = await fetch('/api/license:unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key })
      })
      const j = (await r.json().catch(() => ({}))) as { error?: string; iatfAddon?: boolean }
      if (!r.ok) {
        setMsg(j.error || `실패 (${r.status})`)
        return
      }
      await refreshSession()
    } catch {
      setMsg('서버에 연결할 수 없습니다.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm" data-testid="addon-lock">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
        <Lock className="h-6 w-6" />
      </div>
      <h2 className="text-lg font-bold">IATF 16949 애드온 화면입니다</h2>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
        <b>{PAGE_LABELS[page]}</b>은(는) IATF 애드온 라이선스가 있어야 열립니다.
        <br />
        기본판(미니MES + SQ 대응)은 그대로 모두 사용할 수 있습니다.
      </p>
      {isExec ? (
        <div className="mt-6 text-left">
          <label className="text-xs font-semibold text-muted-foreground">라이선스 키 입력 (최종관리자)</label>
          <div className="mt-1.5 flex gap-2">
            <input
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="IATF-XXXX-XXXX-XXXX-XXXX"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary"
              data-testid="addon-key"
            />
            <button
              type="button"
              disabled={busy || key.trim().length < 8}
              onClick={() => void unlock()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> 열기
            </button>
          </div>
          {msg && <p className="mt-2 text-xs font-semibold text-destructive">{msg}</p>}
          <p className="mt-3 text-[11.5px] text-muted-foreground leading-relaxed">
            키는 설정의 <b>회사명</b>에 묶여 발급됩니다. 회사명과 키를 발급받은 이름이 글자 그대로 같아야 합니다.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm text-muted-foreground">
          라이선스 키 입력은 최종관리자만 할 수 있습니다. 관리자에게 문의하세요.
        </p>
      )}
    </div>
  )
}
