/**
 * server/polyfill/web-api.ts — 웹 전환 W1b: 브라우저용 window.api 폴리필
 *
 * Electron 에서는 preload 가 `window.api`(invoke·channels·setZoomFactor)를 주입한다.
 * 브라우저에는 preload 가 없으므로 동일 시그니처를 fetch 로 구현해 **렌더러를 수정하지 않고**
 * 그대로 동작시킨다(지시서 §1.1 "어댑터 한 겹" — 컴포넌트가 교체를 눈치채지 못해야 성공).
 *
 * 서버가 index.html <head> 에 <script src="/__web-api.js"> 로 주입한다(정적 산출물 무수정).
 * 번들: npx esbuild server/polyfill/web-api.ts --bundle --format=iife --outfile=server/dist/web-api.js
 */
import { IPC_CHANNELS } from '../../src/shared/ipc-channels'

async function invoke(channel: string, payload?: unknown): Promise<unknown> {
  const res = await fetch('/api/' + channel, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {})
  })
  if (!res.ok) {
    let msg = `요청 실패 (HTTP ${res.status}) — ${channel}`
    try {
      const j = (await res.json()) as { error?: string }
      if (j && j.error) msg = j.error
    } catch {
      /* 본문 없음 */
    }
    throw new Error(msg)
  }
  const json = (await res.json()) as unknown

  // 파일 다운로드(W2 3착): 서버가 생성한 파일을 브라우저가 저장하게 <a download> 트리거.
  // 렌더러는 결과 요약만 보므로(res.download 는 안 봄) 무수정 원칙 유지 — 폴리필이 흡수.
  const dl = (json as { download?: string } | null)?.download
  if (dl) {
    try {
      const a = document.createElement('a')
      a.href = dl
      a.download = ''
      document.body.appendChild(a)
      a.click()
      a.remove()
    } catch {
      /* 다운로드 트리거 실패 무시 — 결과는 그대로 반환 */
    }
  }
  return json
}

const api = {
  invoke,
  channels: IPC_CHANNELS,
  /** Electron webFrame.setZoomFactor 의 웹 등가물 — 글자 배율(UI P3) */
  setZoomFactor(factor: number): void {
    try {
      ;(document.documentElement.style as unknown as Record<string, string>).zoom = String(factor)
    } catch {
      /* 미지원 브라우저 무시 */
    }
  }
}

;(window as unknown as { api: typeof api }).api = api
