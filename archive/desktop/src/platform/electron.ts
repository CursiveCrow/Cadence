/**
 * Electron IPC implementation of platform services
 */

import { PlatformServices, FileDialogOptions, FileHandle, MessageBoxOptions, MessageBoxResult } from './interfaces'
import { IPC_CHANNELS, DialogOpenFileRequest, DialogOpenFileResponse, SaveFileRequest, SaveFileResponse, AppGetVersionResponse, DialogMessageBoxOptions, DialogMessageBoxResponse } from '@cadence/contracts'

export class ElectronPlatformServices implements PlatformServices {
  private invoker: (channel: string, ...args: unknown[]) => Promise<any>
  constructor() {
    const api = (window as any).api
    if (api && typeof api.invoke === 'function') this.invoker = api.invoke.bind(api)
    else throw new Error('Electron IPC not available. Ensure preload exposes window.api')
  }
  async showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null> {
    try {
      DialogOpenFileRequest.parse({ title: options?.title, defaultPath: options?.defaultPath, filters: options?.filters })
      const result = await this.invoker(IPC_CHANNELS.dialogOpenFile, options)
      const parsed = DialogOpenFileResponse.parse(result)
      return parsed as any
    } catch { return null }
  }
  async showSaveDialog(options: FileDialogOptions): Promise<string | null> {
    try {
      SaveFileRequest.parse({ title: options?.title, defaultPath: options?.defaultPath, filters: options?.filters })
      const result = await this.invoker(IPC_CHANNELS.dialogSaveFile, options)
      const parsed = SaveFileResponse.parse(result)
      return parsed
    } catch { return null }
  }
  async readFile(path: string): Promise<ArrayBuffer> {
    const result = await this.invoker(IPC_CHANNELS.fsReadFile, path)
    if (result instanceof ArrayBuffer) {
      const view = new Uint8Array(result); const out = new Uint8Array(view.byteLength); out.set(view); return out.buffer
    }
    const view = ArrayBuffer.isView(result)
      ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength)
      : new Uint8Array(result as ArrayBufferLike)
    const out = new Uint8Array(view.byteLength); out.set(view); return out.buffer
  }
  async writeFile(path: string, content: ArrayBuffer): Promise<void> {
    const u8 = new Uint8Array(content)
    await this.invoker(IPC_CHANNELS.fsWriteFile, path, u8)
  }
  async showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult> {
    const req = DialogMessageBoxOptions.parse(options)
    const result = await this.invoker(IPC_CHANNELS.dialogMessageBox, req)
    const parsed = DialogMessageBoxResponse.safeParse(result)
    return parsed.success ? parsed.data : { response: -1 }
  }
  async showErrorDialog(title: string, message: string): Promise<void> {
    await this.showMessageBox({ type: 'error', title, message, buttons: ['OK'] })
  }
  async getAppVersion(): Promise<string> {
    const result = await this.invoker(IPC_CHANNELS.appGetVersion)
    return AppGetVersionResponse.parse(result)
  }
  async quit(): Promise<void> { await this.invoker(IPC_CHANNELS.appQuit) }
}

