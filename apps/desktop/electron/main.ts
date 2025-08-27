import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { IPC_CHANNELS, DialogOpenFileRequest, SaveFileRequest, DialogOpenFileResponse, SaveFileResponse, AppGetVersionResponse } from '@cadence/contracts'
import fs from 'node:fs/promises'
import path from 'node:path'

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
// Here, you can also use other preload
const preload = path.join(__dirname, 'preload.js')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = path.join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'Cadence',
    icon: path.join(process.env.VITE_PUBLIC || process.env.DIST || __dirname, 'favicon.ico'),
    width: 1200,
    height: 800,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  })

  if (url) { // electron-vite-vue#298
    win.loadURL(url)
    // Open devTool only if explicitly requested (remove automatic opening)
    // win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }

  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) require('electron').shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(createWindow)

// ---------------- IPC handlers ----------------
ipcMain.handle(IPC_CHANNELS.dialogOpenFile, async (_event, options: unknown) => {
  const parsed = DialogOpenFileRequest.safeParse(options)
  if (!parsed.success) {
    return null
  }
  const { title, defaultPath, filters } = parsed.data
  const result = await dialog.showOpenDialog({
    title,
    defaultPath,
    filters,
    properties: ['openFile']
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const filePath = result.filePaths[0]
  const content = await fs.readFile(filePath)
  const response = { name: filePath.split(/[/\\]/).pop() || filePath, path: filePath, content: new Uint8Array(content) }
  const validated = DialogOpenFileResponse.safeParse(response)
  return validated.success ? validated.data : null
})

ipcMain.handle(IPC_CHANNELS.dialogSaveFile, async (_event, options: unknown) => {
  const parsed = SaveFileRequest.safeParse(options)
  if (!parsed.success) {
    return null
  }
  const { title, defaultPath, filters } = parsed.data
  const result = await dialog.showSaveDialog({ title, defaultPath, filters })
  const validated = SaveFileResponse.safeParse(result.canceled ? null : result.filePath || null)
  return validated.success ? validated.data : null
})

ipcMain.handle(IPC_CHANNELS.fsReadFile, async (_event, path: string) => {
  const content = await fs.readFile(path)
  return content
})

ipcMain.handle(IPC_CHANNELS.fsWriteFile, async (_event, path: string, content: ArrayBuffer | Buffer | Uint8Array) => {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content as ArrayBuffer)
  await fs.writeFile(path, buf)
  return true
})

ipcMain.handle(IPC_CHANNELS.dialogMessageBox, async (_event, options: any) => {
  const win = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0]
  if (!win) return { response: -1 }
  const result = await dialog.showMessageBox(win, options)
  return result
})

ipcMain.handle(IPC_CHANNELS.appGetVersion, () => {
  const validated = AppGetVersionResponse.safeParse(app.getVersion())
  return validated.success ? validated.data : '0.0.0'
})
ipcMain.handle(IPC_CHANNELS.appQuit, () => { app.quit(); return true })

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
