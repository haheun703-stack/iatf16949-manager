import { contextBridge, ipcRenderer, webFrame } from 'electron'
import { IPC_CHANNELS } from '@shared/ipc-channels'

const api = {
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    return ipcRenderer.invoke(channel, ...args)
  },
  channels: IPC_CHANNELS,
  // 글자 크기 배율 — 전체 UI 확대(px 고정 사이즈까지 비례 확대). 심사장 시연 접근성. (UI P3)
  setZoomFactor: (factor: number): void => {
    webFrame.setZoomFactor(factor)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.api = api
}
