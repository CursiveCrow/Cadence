import { Provider } from 'react-redux'
import { store } from '../state'
import { CadenceMain } from './CadenceMain'
import './App.css'
import '@cadence/ui/styles/tokens.css'

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
