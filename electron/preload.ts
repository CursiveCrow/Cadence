import { contextBridge, ipcRenderer } from 'electron'

type Listener = (data: any) => void

const listenerMap: Map<string, Map<Listener, (...args: any[]) => void>> = new Map()

function onMessage(channel: string, callback: Listener): void {
    let channelMap = listenerMap.get(channel)
    if (!channelMap) {
        channelMap = new Map()
        listenerMap.set(channel, channelMap)
    }
    const wrapped = (_event: unknown, payload: any) => callback(payload)
    channelMap.set(callback, wrapped)
    ipcRenderer.on(channel, wrapped)
}

function removeListener(channel: string, callback: Listener): void {
    const channelMap = listenerMap.get(channel)
    const wrapped = channelMap?.get(callback)
    if (wrapped) {
        ipcRenderer.removeListener(channel, wrapped)
        channelMap?.delete(callback)
    }
}

const api = {
    sendMessage: (channel: string, data: any) => ipcRenderer.send(channel, data),
    onMessage,
    removeListener,
    platform: 'electron' as const,
}

contextBridge.exposeInMainWorld('electronAPI', api)


