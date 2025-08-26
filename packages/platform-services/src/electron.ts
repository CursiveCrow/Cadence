/**
 * Electron IPC implementation of platform services
 */

import { PlatformServices, FileDialogOptions, FileHandle, MessageBoxOptions, MessageBoxResult } from './interfaces'

/**
 * Electron implementation using IPC
 * Communicates with main process via contextBridge API
 */
export class ElectronPlatformServices implements PlatformServices {
  private ipc: {
    invoke: (channel: string, ...args: unknown[]) => Promise<any>
  }

  constructor() {
    // Access the contextBridge API exposed by preload script
    this.ipc = (window as any).ipcRenderer
    if (!this.ipc) {
      throw new Error('Electron IPC not available. Make sure contextBridge is properly configured.')
    }
  }

  async showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null> {
    try {
      const result = await this.ipc.invoke('dialog:openFile', options)
      return result
    } catch (error) {
      console.error('Failed to open file dialog:', error)
      return null
    }
  }

  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    try {
      const result = await this.ipc.invoke('dialog:saveFile', options)
      return result
    } catch (error) {
      console.error('Failed to open save dialog:', error)
      return null
    }
  }

  async readFile(path: string): Promise<ArrayBuffer> {
    try {
      const result = await this.ipc.invoke('fs:readFile', path)
      return result
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  }

  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    try {
      await this.ipc.invoke('fs:writeFile', path, content)
    } catch (error) {
      console.error('Failed to write file:', error)
      throw error
    }
  }

  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    try {
      const result = await this.ipc.invoke('dialog:messageBox', options)
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
      return await this.ipc.invoke('app:getVersion')
    } catch (error) {
      console.error('Failed to get app version:', error)
      return 'unknown'
    }
  }

  async quit(): Promise<void> {
    try {
      await this.ipc.invoke('app:quit')
    } catch (error) {
      console.error('Failed to quit app:', error)
    }
  }
}
