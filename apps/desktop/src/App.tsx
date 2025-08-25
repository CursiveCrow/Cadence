import React from 'react'
import { Provider } from 'react-redux'
import { store } from '@cadence/state'
import { CadenceMain } from './components/CadenceMain'
import './App.css'

function App() {
  return (
    <Provider store={store}>
      <div className="App">
        <CadenceMain />
      </div>
    </Provider>
  )
}

export default App
