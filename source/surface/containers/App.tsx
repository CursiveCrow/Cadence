import { Provider } from 'react-redux'
import { store } from '../../infrastructure/persistence'
import { CadenceMain } from './CadenceMain'
import './App.css'
import React from 'react'
import { PlatformServicesContext } from './platform/PlatformServicesContext'
import '@cadence/ui/styles/tokens.css'
import type { PlatformServices } from '../../infrastructure/platform/services/interfaces'
import { ElectronPlatformServices } from '../../infrastructure/platform/services/electron'
import { WebPlatformServices } from '../../infrastructure/platform/services/web'

function App() {
  const services = React.useMemo<PlatformServices | null>(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).api) {
        return new ElectronPlatformServices()
      }
      return new WebPlatformServices()
    } catch {
      return null
    }
  }, [])

  return (
    <Provider store={store}>
      <PlatformServicesContext.Provider value={services}>
        <div className="App">
          <CadenceMain />
        </div>
      </PlatformServicesContext.Provider>
    </Provider>
  )
}

export default App
