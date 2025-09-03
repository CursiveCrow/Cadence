/**
 * PlatformPort: OS/dialog/files abstractions consumed by application/UI.
 * Implementations live in adapters/platform/*.
 */

export interface FileDialogOptions {
  title?: string
  defaultPath?: string
  filters?: Array<{ name: string; extensions: string[] }>
}

export interface FileHandle {
  name: string
  path: string
  content: ArrayBuffer
}

export interface MessageBoxOptions {
  type: 'info' | 'warning' | 'error' | 'question'
  title: string
  message: string
  buttons?: string[]
  defaultId?: number
  cancelId?: number
}

export interface MessageBoxResult {
  response: number
  checkboxChecked?: boolean
}

export interface PlatformPort {
  // File system
  showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null>
  showSaveDialog(options: FileDialogOptions): Promise<string | null>
  readFile(path: string): Promise<ArrayBuffer>
  writeFile(path: string, content: ArrayBuffer): Promise<void>

  // Dialogs
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult>
  showErrorDialog(title: string, message: string): Promise<void>

  // App
  getAppVersion(): Promise<string>
  quit(): Promise<void>
}

