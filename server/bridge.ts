/**
 * server/bridge.ts — 웹 전환 W1b: main/ipc 핸들러 → HTTP 채널 맵 브리지
 *
 * main 소스를 **무수정**으로 재사용한다(지시서 §1 "이사"). 번들 시 `electron` import 가
 * server/electron-shim.cjs 로 alias 되어, 핸들러의 `ipcMain.handle(ch, fn)` 이 실제 IPC 대신
 * shim 의 라우트 맵에 쌓인다. 서버(index.cjs)는 그 맵으로 POST /api/{channel} 을 디스패치한다.
 *
 * 번들:
 *   npx esbuild server/bridge.ts --bundle --platform=node --format=cjs \
 *     --outfile=server/dist/bridge.cjs --external:better-sqlite3 \
 *     --alias:electron=./server/electron-shim.cjs --tsconfig=tsconfig.node.json
 */
import { registerAllIpcHandlers } from '../src/main/ipc/register'
import * as electronShim from 'electron'

export type ChannelHandler = (event: unknown, payload?: unknown) => unknown

/**
 * 전 핸들러를 등록하고 채널 맵을 돌려준다.
 * 전량 등록이 실패하는 채널이 있어도 여기서 막지 않는다 — 등록은 대부분 ipcMain.handle 뿐이고,
 * 데스크톱 전용(dialog·shell) 은 호출 시점에만 shim 스텁이 동작한다(W2 에서 HTTP 로 대체).
 */
export function buildRoutes(): Map<string, ChannelHandler> {
  registerAllIpcHandlers()
  const routes = (electronShim as unknown as { __routes: Map<string, ChannelHandler> }).__routes
  return routes
}

/** 서버 기동 로그용 — 데이터 루트(env 외부화 결과) */
export function dataDir(): string {
  return (electronShim as unknown as { __dataDir: string }).__dataDir
}

// ── 파일 다이얼로그 제어(W2 3착) — 서버가 핸들러 호출 직전 저장/열기 경로를 주입 ──
export function setPendingSave(filePath: string | null): void {
  ;(electronShim as unknown as { __setPendingSave: (p: string | null) => void }).__setPendingSave(filePath)
}
export function setPendingOpen(filePaths: string[] | null): void {
  ;(electronShim as unknown as { __setPendingOpen: (p: string[] | null) => void }).__setPendingOpen(filePaths)
}
