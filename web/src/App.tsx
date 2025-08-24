
import { Timeline } from './components/Timeline';
import { sampleData } from './sampleData';
import './App.css';

function App() {
  return (
    <div>
      <h1>Cadence Timeline</h1>
      <Timeline data={sampleData} />
    </div>
  );
}

export default App;
