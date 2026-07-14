import { useEffect } from 'react'
import { AppShell } from './presentation/components/layout/AppShell'
import { applyFontScale, useUIStore } from './presentation/stores/uiStore'

function App(): JSX.Element {
  // 저장된 글자 배율을 부팅 시 1회 실제 UI에 적용 (UI P3)
  const fontScale = useUIStore((s) => s.fontScale)
  useEffect(() => {
    applyFontScale(fontScale)
    // 마운트 시 1회만 — 이후 변경은 setFontScale 이 직접 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <AppShell />
}

export default App
