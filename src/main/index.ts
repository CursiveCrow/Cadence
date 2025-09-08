import { app, BrowserWindow, ipcMain, Menu } from 'electron'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

let win: BrowserWindow | null = null

const isDev = !!process.env.VITE_DEV_SERVER_URL

// Enable WebGPU (Chromium flags)
app.commandLine.appendSwitch('enable-unsafe-webgpu')
app.commandLine.appendSwitch('ignore-gpu-blocklist')

// In dev, redirect userData to a temp directory to avoid cache permission issues
if (isDev) {
  const devUserData = path.join(os.tmpdir(), 'cadence-dev-userdata')
  app.setPath('userData', devUserData)
}

async function loadURLWithRetry(window: BrowserWindow, url: string, attempts: number = 60, delayMs: number = 500) {
  for (let i = 0; i < attempts; i++) {
    try {
      await window.loadURL(url)
      console.log('[main] Connected to dev server:', url)
      return
    } catch (_err) {
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }
  // Final attempt surfacing error
  await window.loadURL(url)
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      experimentalFeatures: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Cadence',
  })

  // Security: block navigation to external origins
  win.webContents.on('will-navigate', (e) => e.preventDefault())
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  if (process.env.VITE_DEV_SERVER_URL) {
    try {
      await loadURLWithRetry(win, process.env.VITE_DEV_SERVER_URL)
      win.webContents.openDevTools({ mode: 'detach' })
    } catch (_err) {
      console.warn('[main] Dev server not reachable, loading built index.html')
      // Fallback to built index if dev server couldn't be reached
      await win.loadFile(path.join(__dirname, '../../dist/index.html'))
    }
  } else {
    await win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Simple file-backed key/value storage for Electron builds
function getStoragePath() {
  try { return path.join(app.getPath('userData'), 'cadence-storage.json') }
  catch {
    const fallback = path.join(os.tmpdir(), 'cadence-storage.json')
    if (isDev) console.warn('[storage] Falling back to temp userData path:', fallback)
    return fallback
  }
}

function readStorage(): Record<string, string> {
  const p = getStoragePath()
  try {
    if (!fs.existsSync(p)) return {}
    const txt = fs.readFileSync(p, 'utf-8')
    const obj = JSON.parse(txt)
    return (obj && typeof obj === 'object') ? obj : {}
  } catch { return {} }
}

function writeStorage(obj: Record<string, string>) {
  const p = getStoragePath()
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true })
    fs.writeFileSync(p, JSON.stringify(obj), 'utf-8')
  } catch {}
}

ipcMain.on('cadence:storage:getSync', (event, key: string) => {
  try {
    const db = readStorage()
    event.returnValue = db[key] ?? null
  } catch {
    event.returnValue = null
  }
})

ipcMain.on('cadence:storage:set', (_event, key: string, value: string) => {
  try {
    const db = readStorage()
    db[key] = value
    writeStorage(db)
  } catch {}
})

// Lightweight health probe for renderer to query
ipcMain.handle('cadence:health', async () => {
  try {
    return { ok: true, webgpuRequired: true }
  } catch {
    return { ok: false }
  }
})


// Build app menu with commands routed to renderer
function sendCommandToFocused(id: string) {
  const focused = BrowserWindow.getFocusedWindow()
  if (focused) focused.webContents.send('cadence:command', id)
}

function buildMenu() {

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'View',
      submenu: [
        { role: 'reload', accelerator: 'CmdOrCtrl+R' },
        { role: 'forceReload', accelerator: (process.platform === 'darwin') ? 'CmdOrCtrl+Shift+R' : 'Ctrl+Shift+R' },
        { role: 'toggleDevTools', accelerator: (process.platform === 'darwin') ? 'Alt+Command+I' : 'Ctrl+Shift+I' },
        { type: 'separator' },
        { label: 'Zoom In', accelerator: 'CmdOrCtrl+=', click: () => sendCommandToFocused('zoom.in') },
        { label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', click: () => sendCommandToFocused('zoom.out') },
        { label: 'Actual Size', accelerator: 'CmdOrCtrl+0', click: () => sendCommandToFocused('zoom.reset') },
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Clear Selection', accelerator: 'Esc', click: () => sendCommandToFocused('selection.clear') },
      ]
    }
  ]
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

app.whenReady().then(buildMenu)






