import type { IPC_CHANNELS } from '@cadence/contracts'

export interface IElectronAPI {
  on: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], listener: (event: any, ...args: any[]) => void) => void
  off: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], listener?: (...args: any[]) => void) => void
  send: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], ...args: any[]) => void
  invoke: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], ...args: any[]) => Promise<any>
}

declare global {
  interface Window {
    ipcRenderer: IElectronAPI
    api: { invoke: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], ...args: any[]) => Promise<any> }
  }
}
