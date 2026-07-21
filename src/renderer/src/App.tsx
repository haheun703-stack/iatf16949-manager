import { useEffect } from 'react'
import { AppShell } from './presentation/components/layout/AppShell'
import { applyFontScale, useUIStore } from './presentation/stores/uiStore'
import { useActiveUserStore } from './presentation/stores/activeUserStore'

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

  return <AppShell />
}

export default App
