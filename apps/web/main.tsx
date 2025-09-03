import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '../../source/surface/containers/App'
import '../../source/surface/containers/index.css'
import { ApplicationPortsContext } from '../../source/application/context/ApplicationPortsContext'
import { PlatformServicesContext } from '../../source/surface/containers/platform/PlatformServicesContext'
import { createPersistence } from '../../source/adapters/persistence/yjs'
import { ElectronPlatformServices } from '../../source/adapters/platform/electron'
import { WebPlatformServices } from '../../source/adapters/platform/web'

try { postMessage({ payload: 'removeLoading' }, '*') } catch {}

const platform = (() => {
  try {
    if (typeof window !== 'undefined' && (window as any).api) return new ElectronPlatformServices()
    return new WebPlatformServices()
  } catch {
    return null
  }
})()

const ports = { persistence: createPersistence() }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlatformServicesContext.Provider value={platform as any}>
      <ApplicationPortsContext.Provider value={ports}>
        <App />
      </ApplicationPortsContext.Provider>
    </PlatformServicesContext.Provider>
  </React.StrictMode>,
)

