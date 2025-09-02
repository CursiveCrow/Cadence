import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@cadence/contracts'

// --------- Expose minimal, typed API to the Renderer process ---------
// New preferred surface
const buildAllowedChannels = () => {
  const set = new Set(Object.values(IPC_CHANNELS))
  // In production builds, reduce IPC surface by default: block raw fs access
  try {
    if (process.env.NODE_ENV === 'production') {
      set.delete(IPC_CHANNELS.fsReadFile)
      set.delete(IPC_CHANNELS.fsWriteFile)
    }
  } catch { /* no-op */ }
  return set
}
const allowedChannels = buildAllowedChannels()
contextBridge.exposeInMainWorld('api', {
  invoke: (channel: (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS], ...args: unknown[]) => {
    if (!allowedChannels.has(channel)) {
      throw new Error(`Blocked IPC channel: ${channel}`)
    }
    return ipcRenderer.invoke(channel, ...args as any)
  },
})

// Legacy window.ipcRenderer exposure removed. Use window.api.invoke instead.

// --------- Preload scripts loading ---------
function domReady(condition: DocumentReadyState[] = ['complete', 'interactive']) {
  return new Promise((resolve) => {
    if (condition.includes(document.readyState)) {
      resolve(true)
    } else {
      document.addEventListener('readystatechange', () => {
        if (condition.includes(document.readyState)) {
          resolve(true)
        }
      })
    }
  })
}

const safeDOM = {
  append(parent: HTMLElement, child: HTMLElement) {
    if (!Array.from(parent.children).find(c => c === child)) {
      return parent.appendChild(child)
    }
  },
  remove(parent: HTMLElement, child: HTMLElement) {
    if (Array.from(parent.children).find(c => c === child)) {
      return parent.removeChild(child)
    }
  },
}

// https://tobiasahlin.com/spinkit
// https://connoratherton.com/loaders
// https://projects.lukehaas.me/css-loaders
// https://matejkustec.com/SpinThatShit
function useLoading() {
  const className = `loaders-css__square-spin`
  const styleContent = `
@keyframes square-spin {
  25% { 
    transform: perspective(100px) rotateX(180deg) rotateY(0); 
  }
  50% { 
    transform: perspective(100px) rotateX(180deg) rotateY(180deg); 
  }
  75% { 
    transform: perspective(100px) rotateX(0) rotateY(180deg); 
  }
  100% { 
    transform: perspective(100px) rotateX(0) rotateY(0); 
  }
}
.${className} > div {
  animation-fill-mode: both;
  width: 50px;
  height: 50px;
  background: #fff;
  animation: square-spin 3s 0s cubic-bezier(0.09, 0.57, 0.49, 0.9) infinite;
}
.app-loading-wrap {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #282c34;
  z-index: 9;
}
    `
  const oStyle = document.createElement('style')
  const oDiv = document.createElement('div')

  oStyle.id = 'app-loading-style'
  oStyle.innerHTML = styleContent
  oDiv.className = 'app-loading-wrap'
  oDiv.innerHTML = `<div class="${className}"><div></div></div>`

  return {
    appendLoading() {
      safeDOM.append(document.head, oStyle)
      safeDOM.append(document.body, oDiv)
    },
    removeLoading() {
      safeDOM.remove(document.head, oStyle)
      safeDOM.remove(document.body, oDiv)
    },
  }
}

// ----------------------------------------------------------------------

const { appendLoading, removeLoading } = useLoading()
domReady().then(appendLoading)

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}
