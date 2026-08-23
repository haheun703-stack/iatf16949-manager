import { lazy, Suspense, useEffect } from 'react'
import { AppShell } from './presentation/components/layout/AppShell'
import { applyFontScale, useUIStore } from './presentation/stores/uiStore'
import { useActiveUserStore } from './presentation/stores/activeUserStore'
import { goBackWithGuard } from './presentation/lib/navBack'

// M3 현장 폰 셸(29호 §2 "진입 자체 분리"): /m 은 관리자 화면 미탑재 모바일 셸 — React.lazy 분할(폰 번들 경량).
const MobileShell = lazy(() => import('./presentation/components/mobile/MobileShell').then((m) => ({ default: m.MobileShell })))
const isMobilePath = (): boolean => typeof location !== 'undefined' && /^\/m(\/|$)/.test(location.pathname)

function App(): JSX.Element {
  // 저장된 글자 배율을 부팅 시 1회 실제 UI에 적용 (UI P3)
  const fontScale = useUIStore((s) => s.fontScale)
  const loadUsers = useActiveUserStore((s) => s.loadUsers)
  useEffect(() => {
    applyFontScale(fontScale)
    void loadUsers() // P2 — 공용 PC 사용자 명단 로드(부팅 1회)
    // 마운트 시 1회만 — 이후 변경은 setFontScale 이 직접 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // P11 뒤로가기 전역 단축키: Alt+← / 마우스 4번째(뒤로) 버튼. PageHeader 버튼과 동일 진입점.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        goBackWithGuard()
      }
    }
    const onMouse = (e: MouseEvent): void => {
      if (e.button === 3) {
        // 마우스 4번째(브라우저 뒤로) 버튼 — 기본 동작 막고 앱 내 뒤로가기로
        e.preventDefault()
        goBackWithGuard()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mouseup', onMouse)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mouseup', onMouse)
    }
  }, [])

  if (isMobilePath()) {
    return (
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">현장 화면 여는 중…</div>}>
        <MobileShell />
      </Suspense>
    )
  }
  return <AppShell />
}

export default App
