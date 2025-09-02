import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@cadence/contracts'
import { domReady, createPreloadLoading } from './preload-utils'

// --------- Expose minimal, typed API to the Renderer process ---------
// New preferred surface
const buildAllowedChannels = () => {
  const set = new Set(Object.values(IPC_CHANNELS))
  // In production builds, reduce IPC surface by default: block raw fs access
  try {
    if (process.env.NODE_ENV === 'production') {
      set.delete(IPC_CHANNELS.fsReadFile)
      set.delete(IPC_CHANNELS.fsWriteFile)
    }
  } catch { /* no-op */ }
  return set
}
const allowedChannels = buildAllowedChannels()
contextBridge.exposeInMainWorld('api', {
  invoke: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], ...args: unknown[]) => {
    if (!allowedChannels.has(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`)
    }
    return ipcRenderer.invoke(channel, ...args as any)
  },
})

// Legacy window.ipcRenderer exposure removed. Use window.api.invoke instead.

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = createPreloadLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}
