/**
 * Platform service interfaces for file system access and dialogs
 * Abstracts differences between Electron IPC and Web APIs
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

export interface PlatformServices {
  // File System Operations
  showOpenDialog(options: FileDialogOptions): Promise<FileHandle | null>
  showSaveDialog(options: FileDialogOptions): Promise<string | null>
  readFile(path: string): Promise<ArrayBuffer>
  writeFile(path: string, content: ArrayBuffer): Promise<void>
  
  // Dialog Operations
  showMessageBox(options: MessageBoxOptions): Promise<MessageBoxResult>
  showErrorDialog(title: string, message: string): Promise<void>
  
  // Application Operations
  getAppVersion(): Promise<string>
  quit(): Promise<void>
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

// Export validation schemas for IPC
export interface IPCRequest<T = unknown> {
  id: string
  channel: string
  payload: T
}

export interface IPCResponse<T = unknown> {
  id: string
  success: boolean
  data?: T
  error?: string
}
