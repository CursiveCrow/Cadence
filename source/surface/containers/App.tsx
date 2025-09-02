import { Provider } from 'react-redux'
import { store } from '@cadence/state'
import { CadenceMain } from './CadenceMain'
import './App.css'
import React from 'react'
import { PlatformServicesContext, createPlatformServices } from '@cadence/platform-services'
import '@cadence/ui/styles/tokens.css'

function App() {
  const services = React.useMemo(() => createPlatformServices(), [])

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
