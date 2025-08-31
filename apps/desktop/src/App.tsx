import { StoreProvider } from './app/providers/StoreProvider'
import { CadenceScreen } from './components/CadenceScreen'
import './App.css'
import { PlatformServicesProvider } from './app/providers/PlatformServicesProvider'
import '@cadence/ui/styles/tokens.css'
import { RepositoriesProvider } from './app/providers/RepositoriesProvider'

function App() {
  return (
    <StoreProvider>
      <PlatformServicesProvider>
        <RepositoriesProvider projectId={"demo-project"}>
          <div className="App">
            <CadenceScreen projectId={"demo-project"} />
          </div>
        </RepositoriesProvider>
      </PlatformServicesProvider>
    </StoreProvider>
  )
}

export default App
