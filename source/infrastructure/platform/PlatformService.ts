/**
 * Platform Service
 * Provides a unified interface for platform-specific functionality
 */

import { ElectronPlatformService } from './electron/ElectronPlatform'
import { WebPlatformService } from './web/WebPlatform'

export class PlatformService {
    private electronService: ElectronPlatformService
    private webService: WebPlatformService

    constructor() {
        this.electronService = new ElectronPlatformService()
        this.webService = new WebPlatformService()
    }

    isElectron(): boolean {
        return this.electronService.isElectron()
    }

    isWeb(): boolean {
        return this.webService.isWeb()
    }

    getPlatform(): 'electron' | 'web' {
        return this.isElectron() ? 'electron' : 'web'
    }

    async saveProject(projectData: any, path?: string): Promise<void> {
        if (this.isElectron() && path) {
            // Save to file system in Electron
            const json = JSON.stringify(projectData, null, 2)
            return this.electronService.saveFile(path, json)
        } else {
            // Save to IndexedDB in web
            return this.webService.saveToIndexedDB('projects', projectData)
        }
    }

    async loadProject(idOrPath: string): Promise<any> {
        if (this.isElectron() && idOrPath.includes('/') || idOrPath.includes('\\')) {
            // Load from file system in Electron
            const json = await this.electronService.readFile(idOrPath)
            return JSON.parse(json)
        } else {
            // Load from IndexedDB in web
            return this.webService.loadFromIndexedDB('projects', idOrPath)
        }
    }

    async exportProject(projectData: any, filename: string): Promise<void> {
        if (this.isElectron()) {
            const path = await this.electronService.showSaveDialog({
                title: 'Export Project',
                defaultPath: filename,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            })

            if (path) {
                const json = JSON.stringify(projectData, null, 2)
                await this.electronService.saveFile(path, json)
            }
        } else {
            await this.webService.exportAsJSON(projectData, filename)
        }
    }

    async importProject(): Promise<any> {
        if (this.isElectron()) {
            const paths = await this.electronService.showOpenDialog({
                title: 'Import Project',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            })

            if (paths && paths.length > 0) {
                const json = await this.electronService.readFile(paths[0])
                return JSON.parse(json)
            }

            return null
        } else {
            return this.webService.importFromFile()
        }
    }

    async showMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): Promise<void> {
        if (this.isElectron()) {
            await this.electronService.showMessageBox({
                type,
                message,
                buttons: ['OK']
            })
        } else {
            // Use browser alert as fallback
            alert(message)
        }
    }

    async confirmAction(message: string, detail?: string): Promise<boolean> {
        if (this.isElectron()) {
            const result = await this.electronService.showMessageBox({
                type: 'question',
                message,
                detail,
                buttons: ['Yes', 'No']
            })
            return result === 0
        } else {
            return confirm(message + (detail ? '\n\n' + detail : ''))
        }
    }

    setTitle(title: string): void {
        if (this.isElectron()) {
            this.electronService.setWindowTitle(title)
        } else {
            this.webService.setDocumentTitle(title)
        }
    }

    async copyToClipboard(text: string): Promise<void> {
        return this.webService.copyToClipboard(text)
    }

    async readFromClipboard(): Promise<string> {
        return this.webService.readFromClipboard()
    }

    showNotification(title: string, body?: string): void {
        this.webService.showNotification(title, { body })
    }

    onFocus(callback: () => void): () => void {
        if (this.isElectron()) {
            return this.electronService.onWindowFocus(callback)
        } else {
            const handler = () => callback()
            window.addEventListener('focus', handler)
            return () => window.removeEventListener('focus', handler)
        }
    }

    onBlur(callback: () => void): () => void {
        if (this.isElectron()) {
            return this.electronService.onWindowBlur(callback)
        } else {
            const handler = () => callback()
            window.addEventListener('blur', handler)
            return () => window.removeEventListener('blur', handler)
        }
    }

    onResize(callback: () => void): () => void {
        return this.webService.onWindowResize(callback)
    }

    getWindowSize(): { width: number; height: number } {
        return this.webService.getWindowSize()
    }

    isOnline(): boolean {
        return this.webService.isOnline()
    }

    onOnline(callback: () => void): () => void {
        return this.webService.onOnline(callback)
    }

    onOffline(callback: () => void): () => void {
        return this.webService.onOffline(callback)
    }
}
