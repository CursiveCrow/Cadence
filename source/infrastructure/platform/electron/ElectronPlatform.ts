/**
 * Electron Platform Service
 * Handles Electron-specific functionality
 */

export interface ElectronAPI {
    sendMessage: (channel: string, data: any) => void
    onMessage: (channel: string, callback: (data: any) => void) => void
    removeListener: (channel: string, callback: (data: any) => void) => void
    platform: 'electron'
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI
    }
}

export class ElectronPlatformService {
    private api: ElectronAPI | null = null

    constructor() {
        this.api = window.electronAPI || null
    }

    isElectron(): boolean {
        return this.api !== null && this.api.platform === 'electron'
    }

    async saveFile(path: string, content: string): Promise<void> {
        if (!this.api) {
            throw new Error('Electron API not available')
        }

        return new Promise((resolve, reject) => {
            const responseChannel = `save-file-response-${Date.now()}`

            const handleResponse = (response: { success: boolean; error?: string }) => {
                this.api!.removeListener(responseChannel, handleResponse)
                if (response.success) {
                    resolve()
                } else {
                    reject(new Error(response.error || 'Failed to save file'))
                }
            }

            this.api.onMessage(responseChannel, handleResponse)
            this.api.sendMessage('save-file', { path, content, responseChannel })
        })
    }

    async readFile(path: string): Promise<string> {
        if (!this.api) {
            throw new Error('Electron API not available')
        }

        return new Promise((resolve, reject) => {
            const responseChannel = `read-file-response-${Date.now()}`

            const handleResponse = (response: { success: boolean; content?: string; error?: string }) => {
                this.api!.removeListener(responseChannel, handleResponse)
                if (response.success && response.content !== undefined) {
                    resolve(response.content)
                } else {
                    reject(new Error(response.error || 'Failed to read file'))
                }
            }

            this.api.onMessage(responseChannel, handleResponse)
            this.api.sendMessage('read-file', { path, responseChannel })
        })
    }

    async showOpenDialog(options: {
        title?: string
        filters?: Array<{ name: string; extensions: string[] }>
        properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>
    }): Promise<string[] | null> {
        if (!this.api) {
            throw new Error('Electron API not available')
        }

        return new Promise((resolve) => {
            const responseChannel = `open-dialog-response-${Date.now()}`

            const handleResponse = (response: { paths: string[] | null }) => {
                this.api!.removeListener(responseChannel, handleResponse)
                resolve(response.paths)
            }

            this.api.onMessage(responseChannel, handleResponse)
            this.api.sendMessage('show-open-dialog', { options, responseChannel })
        })
    }

    async showSaveDialog(options: {
        title?: string
        defaultPath?: string
        filters?: Array<{ name: string; extensions: string[] }>
    }): Promise<string | null> {
        if (!this.api) {
            throw new Error('Electron API not available')
        }

        return new Promise((resolve) => {
            const responseChannel = `save-dialog-response-${Date.now()}`

            const handleResponse = (response: { path: string | null }) => {
                this.api!.removeListener(responseChannel, handleResponse)
                resolve(response.path)
            }

            this.api.onMessage(responseChannel, handleResponse)
            this.api.sendMessage('show-save-dialog', { options, responseChannel })
        })
    }

    async showMessageBox(options: {
        type?: 'none' | 'info' | 'error' | 'question' | 'warning'
        title?: string
        message: string
        detail?: string
        buttons?: string[]
    }): Promise<number> {
        if (!this.api) {
            throw new Error('Electron API not available')
        }

        return new Promise((resolve) => {
            const responseChannel = `message-box-response-${Date.now()}`

            const handleResponse = (response: { buttonIndex: number }) => {
                this.api!.removeListener(responseChannel, handleResponse)
                resolve(response.buttonIndex)
            }

            this.api.onMessage(responseChannel, handleResponse)
            this.api.sendMessage('show-message-box', { options, responseChannel })
        })
    }

    setWindowTitle(title: string): void {
        if (this.api) {
            this.api.sendMessage('set-window-title', { title })
        }
    }

    minimize(): void {
        if (this.api) {
            this.api.sendMessage('minimize-window', {})
        }
    }

    maximize(): void {
        if (this.api) {
            this.api.sendMessage('maximize-window', {})
        }
    }

    close(): void {
        if (this.api) {
            this.api.sendMessage('close-window', {})
        }
    }

    onWindowFocus(callback: () => void): () => void {
        if (!this.api) {
            return () => { }
        }

        this.api.onMessage('window-focus', callback)
        return () => this.api!.removeListener('window-focus', callback)
    }

    onWindowBlur(callback: () => void): () => void {
        if (!this.api) {
            return () => { }
        }

        this.api.onMessage('window-blur', callback)
        return () => this.api!.removeListener('window-blur', callback)
    }

    getAppVersion(): string {
        if (this.api) {
            // This would need to be implemented in the preload script
            return '1.0.0'
        }
        return 'unknown'
    }
}
