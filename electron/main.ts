import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import type { IpcMainEvent } from 'electron'
import path from 'node:path'
import fs from 'node:fs/promises'

// Resolve important paths
process.env.DIST = path.join(__dirname, '../dist')

let mainWindow: BrowserWindow | null = null

function getPublicPath(): string {
    // During packaged builds, assets are in dist/
    // During dev, use dist as a fallback for icons
    return process.env.DIST || __dirname
}

const preloadPath = path.join(__dirname, 'preload.cjs')
const devServerUrl = process.env.VITE_DEV_SERVER_URL
const indexHtmlPath = path.join(process.env.DIST as string, 'index.html')

async function createWindow(): Promise<void> {
    mainWindow = new BrowserWindow({
        title: 'Cadence',
        width: 1200,
        height: 800,
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        icon: path.join(getPublicPath(), 'favicon.ico'),
    })

    if (devServerUrl) {
        await mainWindow.loadURL(devServerUrl)
    } else {
        await mainWindow.loadFile(indexHtmlPath)
    }

    mainWindow.on('focus', () => {
        mainWindow?.webContents.send('window-focus')
    })
    mainWindow.on('blur', () => {
        mainWindow?.webContents.send('window-blur')
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        mainWindow = null
    }
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow()
    }
})

// ---------------- IPC: generic message pattern to match ElectronPlatformService ----------------
type MessagePayload = { responseChannel?: string } & Record<string, unknown>

function reply(event: IpcMainEvent, channel: string | undefined, payload: unknown): void {
    if (!channel) return
    event.sender.send(channel, payload)
}

ipcMain.on('set-window-title', (_event: IpcMainEvent, data: MessagePayload) => {
    if (mainWindow && typeof data?.title === 'string') {
        mainWindow.setTitle(String(data.title))
    }
})

ipcMain.on('minimize-window', () => { mainWindow?.minimize() })
ipcMain.on('maximize-window', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
})
ipcMain.on('close-window', () => { mainWindow?.close() })

ipcMain.on('show-open-dialog', async (event: IpcMainEvent, data: MessagePayload) => {
    try {
        const result = await dialog.showOpenDialog(mainWindow!, data.options as any)
        reply(event, data.responseChannel, { paths: result.canceled ? null : result.filePaths })
    } catch (error) {
        reply(event, data.responseChannel, { paths: null, error: String(error) })
    }
})

ipcMain.on('show-save-dialog', async (event: IpcMainEvent, data: MessagePayload) => {
    try {
        const result = await dialog.showSaveDialog(mainWindow!, data.options as any)
        reply(event, data.responseChannel, { path: result.canceled ? null : (result.filePath || null) })
    } catch (error) {
        reply(event, data.responseChannel, { path: null, error: String(error) })
    }
})

ipcMain.on('show-message-box', async (event: IpcMainEvent, data: MessagePayload) => {
    try {
        const res = await dialog.showMessageBox(mainWindow!, (data.options as any) || { message: '' })
        reply(event, data.responseChannel, { buttonIndex: res.response })
    } catch (error) {
        reply(event, data.responseChannel, { buttonIndex: -1, error: String(error) })
    }
})

ipcMain.on('save-file', async (event: IpcMainEvent, data: MessagePayload) => {
    try {
        const filePath = String(data.path || '')
        const content = String(data.content ?? '')
        if (!filePath) throw new Error('Missing path')
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })
        await fs.writeFile(filePath, content, 'utf8')
        reply(event, data.responseChannel, { success: true })
    } catch (error) {
        reply(event, data.responseChannel, { success: false, error: String(error) })
    }
})

ipcMain.on('read-file', async (event: IpcMainEvent, data: MessagePayload) => {
    try {
        const filePath = String(data.path || '')
        if (!filePath) throw new Error('Missing path')
        const content = await fs.readFile(filePath, 'utf8')
        reply(event, data.responseChannel, { success: true, content })
    } catch (error) {
        reply(event, data.responseChannel, { success: false, error: String(error) })
    }
})


