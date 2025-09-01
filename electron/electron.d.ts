export { }
declare global {
    interface Window {
        electronAPI?: {
            sendMessage: (channel: string, data: any) => void
            onMessage: (channel: string, callback: (data: any) => void) => void
            removeListener: (channel: string, callback: (data: any) => void) => void
            platform: 'electron'
        }
    }
}


