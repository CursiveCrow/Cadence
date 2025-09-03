import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('cadence', {
  version: '2.0.0',
})

export {}

