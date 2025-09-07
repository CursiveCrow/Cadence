import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import os from 'node:os'

let win: BrowserWindow | null = null

const isDev = !!process.env.VITE_DEV_SERVER_URL

// In dev, redirect userData to a temp directory to avoid cache permission issues
if (isDev) {
  const devUserData = path.join(os.tmpdir(), 'cadence-dev-userdata')
  app.setPath('userData', devUserData)
}

async function loadURLWithRetry(window: BrowserWindow, url: string, attempts: number = 20, delayMs: number = 300) {
  for (let i = 0; i < attempts; i++) {
    try {
      await window.loadURL(url)
      return
    } catch (err) {
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
    },
    title: 'Cadence',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    try {
      await loadURLWithRetry(win, process.env.VITE_DEV_SERVER_URL)
      win.webContents.openDevTools({ mode: 'detach' })
    } catch (err) {
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

