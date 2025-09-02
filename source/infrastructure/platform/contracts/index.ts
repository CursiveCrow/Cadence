import { z } from 'zod'

// Common helpers
const FileDialogFilter = z.object({ name: z.string(), extensions: z.array(z.string()) })

// Dialog contracts
export const DialogOpenFileRequest = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z.array(FileDialogFilter).optional(),
})
export type DialogOpenFileRequest = z.infer<typeof DialogOpenFileRequest>

export const DialogOpenFileResponse = z.object({
  name: z.string(),
  path: z.string(),
  content: z.instanceof(ArrayBuffer).or(z.any()), // during IPC serialization may become Buffer in Node
}).nullable()
export type DialogOpenFileResponse = z.infer<typeof DialogOpenFileResponse>

export const SaveFileRequest = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z.array(FileDialogFilter).optional(),
})
export type SaveFileRequest = z.infer<typeof SaveFileRequest>

export const SaveFileResponse = z.string().nullable()
export type SaveFileResponse = z.infer<typeof SaveFileResponse>

// App contracts
export const AppGetVersionResponse = z.string()
export type AppGetVersionResponse = z.infer<typeof AppGetVersionResponse>

// Message box contracts
export const DialogMessageBoxOptions = z.object({
  type: z.enum(['info', 'warning', 'error', 'question']).default('info'),
  title: z.string(),
  message: z.string(),
  buttons: z.array(z.string()).optional(),
  defaultId: z.number().int().nonnegative().optional(),
  cancelId: z.number().int().nonnegative().optional(),
})
export type DialogMessageBoxOptions = z.infer<typeof DialogMessageBoxOptions>

export const DialogMessageBoxResponse = z.object({
  response: z.number().int(),
  checkboxChecked: z.boolean().optional(),
})
export type DialogMessageBoxResponse = z.infer<typeof DialogMessageBoxResponse>

// Channel names (single source of truth)
export const IPC_CHANNELS = {
  dialogOpenFile: 'dialog:openFile',
  dialogSaveFile: 'dialog:saveFile',
  fsReadFile: 'fs:readFile',
  fsWriteFile: 'fs:writeFile',
  dialogMessageBox: 'dialog:messageBox',
  appGetVersion: 'app:getVersion',
  appQuit: 'app:quit',
} as const
export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// IPC Interfaces
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
