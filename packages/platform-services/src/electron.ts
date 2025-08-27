/**
 * Electron IPC implementation of platform services
 */

import { PlatformServices, FileDialogOptions, FileHandle, MessageBoxOptions, MessageBoxResult } from './interfaces'
import { IPC_CHANNELS, DialogOpenFileRequest, DialogOpenFileResponse, SaveFileRequest, SaveFileResponse, AppGetVersionResponse } from '@cadence/contracts'

/**
 * Electron implementation using IPC
 * Communicates with main process via contextBridge API
 */
export class ElectronPlatformServices implements PlatformServices {
    private invoker: (channel: string, ...args: unknown[]) => Promise<any>

    constructor() {
        // Prefer minimal API exposed by preload
        const api = (window as any).api
        if (api && typeof api.invoke === 'function') {
            this.invoker = api.invoke.bind(api)
        } else {
            throw new Error('Electron IPC not available. Ensure preload exposes window.api')
        }
    }

    async showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null> {
        try {
            // Validate request shape
            DialogOpenFileRequest.parse({
                title: options?.title,
                defaultPath: options?.defaultPath,
                filters: options?.filters,
            })
            const result = await this.invoker(IPC_CHANNELS.dialogOpenFile, options)
            const parsed = DialogOpenFileResponse.parse(result)
            return parsed as any
        } catch (error) {
            console.error('Failed to open file dialog:', error)
            return null
        }
    }

    async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
        try {
            SaveFileRequest.parse({
                title: options?.title,
                defaultPath: options?.defaultPath,
                filters: options?.filters,
            })
            const result = await this.invoker(IPC_CHANNELS.dialogSaveFile, options)
            const parsed = SaveFileResponse.parse(result)
            return parsed
        } catch (error) {
            console.error('Failed to open save dialog:', error)
            return null
        }
    }

    async readFile(path: string): Promise<ArrayBuffer> {
        try {
            const result = await this.invoker(IPC_CHANNELS.fsReadFile, path)
            // Normalize to a standalone ArrayBuffer (copy) regardless of IPC serialization (Buffer, Uint8Array, SharedArrayBuffer, etc.)
            if (result instanceof ArrayBuffer) {
                // Make a copy to avoid underlying shared memory issues
                const view = new Uint8Array(result)
                const out = new Uint8Array(view.byteLength)
                out.set(view)
                return out.buffer
            }
            const view = ArrayBuffer.isView(result)
                ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
                : new Uint8Array(result as ArrayBufferLike)
            const out = new Uint8Array(view.byteLength)
            out.set(view)
            return out.buffer
        } catch (error) {
            console.error('Failed to read file:', error)
            throw error
        }
    }

    async writeFile(path: string, content: ArrayBuffer): Promise<void> {
        try {
            const u8 = new Uint8Array(content)
            await this.invoker(IPC_CHANNELS.fsWriteFile, path, u8)
        } catch (error) {
            console.error('Failed to write file:', error)
            throw error
        }
    }

    async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
        try {
            const result = await this.invoker(IPC_CHANNELS.dialogMessageBox, options)
            return result
        } catch (error) {
            console.error('Failed to show message box:', error)
            return { response: -1 }
        }
    }

    async showErrorDialog(title: string, message: string): Promise<void> {
        await this.showMessageBox({
            type: 'error',
            title,
            message,
            buttons: ['OK']
        })
    }

    async getAppVersion(): Promise<string> {
        try {
            const result = await this.invoker(IPC_CHANNELS.appGetVersion)
            return AppGetVersionResponse.parse(result)
        } catch (error) {
            console.error('Failed to get app version:', error)
            return 'unknown'
        }
    }

    async quit(): Promise<void> {
        try {
            await this.invoker(IPC_CHANNELS.appQuit)
        } catch (error) {
            console.error('Failed to quit app:', error)
        }
    }
}
