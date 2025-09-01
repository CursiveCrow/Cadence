import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { store } from '@cadence/state'
import { persistor } from '@cadence/state'
import { CadenceMain } from '@cadence/surface'
import './App.css'
import React from 'react'
import { PlatformServicesContext, createPlatformServices } from '@cadence/platform-services'
import '@cadence/ui/styles/tokens.css'
import TimelineCanvas from '@cadence/renderer-react'

function App() {
  const services = React.useMemo(() => createPlatformServices(), [])

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <PlatformServicesContext.Provider value={services}>
          <div className="App">
            <CadenceMain RendererView={TimelineCanvas} />
          </div>
        </PlatformServicesContext.Provider>
      </PersistGate>
    </Provider>
  )
}

export default App
