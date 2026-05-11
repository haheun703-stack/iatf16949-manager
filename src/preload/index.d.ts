import type { IPC_CHANNELS } from '../shared/ipc-channels'
import type { IpcChannelMap } from '../shared/ipc-types'

type IpcChannelKey = keyof IpcChannelMap

interface ElectronApi {
  invoke: <K extends IpcChannelKey>(
    channel: K,
    ...args: IpcChannelMap[K]['request'] extends void ? [] : [IpcChannelMap[K]['request']]
  ) => Promise<IpcChannelMap[K]['response']>
  channels: typeof IPC_CHANNELS
}

declare global {
  interface Window {
    api: ElectronApi
  }
}
