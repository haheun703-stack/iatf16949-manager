import { useUIStore } from '../stores/uiStore'
import { useFormStore } from '../stores/formStore'

/**
 * 뒤로가기(P11) — PageHeader [← 뒤로] 버튼·Alt+←·마우스 4번째 버튼이 공유하는 단일 진입점.
 * 양식 작성 화면에서 사용자가 입력한 미저장 변경이 있으면 confirm 후 이동(데이터 손실 방지, ④).
 * 스택이 비어 있으면(첫 화면) 아무 것도 하지 않는다.
 */
export function goBackWithGuard(): void {
  const ui = useUIStore.getState()
  if (ui.history.length === 0) return
  if (ui.currentPage === 'form-builder' && useFormStore.getState().dirty) {
    const ok = window.confirm('작성 중인 내용이 저장되지 않았습니다.\n저장하지 않고 뒤로 가시겠습니까?')
    if (!ok) return
  }
  ui.goBack()
}
