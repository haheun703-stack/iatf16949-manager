import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}
interface State {
  error: Error | null
}

/**
 * 페이지 단위 에러 경계. 한 화면에서 렌더 오류가 나도 앱 전체가
 * 백지가 되지 않고 이 카드만 표시한다. (AppShell에서 currentPage를 key로 감싸
 * 다른 메뉴로 이동하면 자동 복구된다.)
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  private reset = (): void => this.setState({ error: null })

  render(): ReactNode {
    const { error } = this.state
    if (error) {
      return (
        <div className="h-full flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-destructive" />
            <h2 className="text-lg font-bold mb-1">이 화면을 표시하는 중 문제가 발생했습니다</h2>
            <p className="text-sm text-muted-foreground mb-3">
              다른 메뉴는 정상 동작합니다. 아래 내용을 알려주시면 빠르게 고치겠습니다.
            </p>
            <pre className="text-[11px] text-left bg-muted rounded-md p-3 overflow-auto max-h-40 text-destructive whitespace-pre-wrap">
              {error.message}
            </pre>
            <button
              type="button"
              onClick={this.reset}
              className="mt-3 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90"
            >
              다시 시도
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
