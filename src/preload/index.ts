import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('cadence', {
  version: '2.0.0',
  storageSync: {
    getItem: (key: string) => {
      try { return ipcRenderer.sendSync('cadence:storage:getSync', key) } catch { return null }
    },
    setItem: (key: string, value: string) => {
      try { ipcRenderer.send('cadence:storage:set', key, value) } catch {}
    }
  },
  onCommand: (handler: (id: string) => void) => {
    try {
      const listener = (_event: any, id: string) => { try { handler(id) } catch {} }
      ipcRenderer.on('cadence:command', listener)
      return () => ipcRenderer.removeListener('cadence:command', listener)
    } catch { return () => {} }
  }
})

export {}
