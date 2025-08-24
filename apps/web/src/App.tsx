import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { TimelineCanvas } from './components/TimelineCanvas';
import { useTimelineStore } from './store/timelineStore';
import type { Score } from '@cadence/domain';

function App() {
  const { setScore, addNote, addDependency } = useTimelineStore();
  
  // Initialize with sample data
  useEffect(() => {
    // Create a sample score
    const sampleScore: Score = {
      id: uuidv4(),
      ownerId: uuidv4(),
      name: 'Release 1.0',
      startTs: new Date('2025-01-01').toISOString(),
      endTs: new Date('2025-03-01').toISOString(),
      tempo: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setScore(sampleScore);
    
    // Add sample notes
    const note1Id = uuidv4();
    const note2Id = uuidv4();
    const note3Id = uuidv4();
    const note4Id = uuidv4();
    const note5Id = uuidv4();
    
    // Create a chain of notes
    addNote({
      scoreId: sampleScore.id,
      title: 'Build',
      startBeat: 0,
      durationBeats: 2,
    });
    
    addNote({
      scoreId: sampleScore.id,
      title: 'Test',
      startBeat: 2,
      durationBeats: 2,
    });
    
    addNote({
      scoreId: sampleScore.id,
      title: 'Deploy',
      startBeat: 4,
      durationBeats: 1,
    });
    
    // Create a chord (parallel notes)
    addNote({
      scoreId: sampleScore.id,
      title: 'Documentation',
      startBeat: 0,
      durationBeats: 3,
    });
    
    addNote({
      scoreId: sampleScore.id,
      title: 'Review',
      startBeat: 3,
      durationBeats: 2,
    });
    
    // Note: In a real app, we'd need to get the actual IDs after creation
    // For now, this is just demonstrating the structure
  }, [setScore, addNote, addDependency]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-cadence-dark">
      <header className="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-cadence-purple">
                Cadence
              </h1>
              <span className="ml-4 text-sm text-gray-500 dark:text-gray-400">
                Musical Timeline Management
              </span>
            </div>
            <nav className="flex space-x-4">
              <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cadence-purple">
                Scores
              </button>
              <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cadence-purple">
                Portfolio
              </button>
              <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-cadence-purple">
                Settings
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<ScoreListView />} />
          <Route path="/scores/:id" element={<ScoreView />} />
          <Route path="/portfolio" element={<PortfolioView />} />
        </Routes>
      </main>
    </div>
  );
}

function ScoreListView() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Your Scores</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ScoreCard name="Release 1.0" tempo={4} notes={12} />
          <ScoreCard name="Q2 Planning" tempo={8} notes={24} />
          <ScoreCard name="Feature X" tempo={4} notes={8} />
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ name, tempo, notes }: { name: string; tempo: number; notes: number }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
      <h3 className="font-semibold text-lg">{name}</h3>
      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        <p>Tempo: {tempo} beats/measure</p>
        <p>Notes: {notes}</p>
      </div>
    </div>
  );
}

function ScoreView() {
  const { score } = useTimelineStore();
  
  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{score?.name || 'Untitled Score'}</h2>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-cadence-purple text-white rounded hover:bg-purple-600">
              Add Note
            </button>
            <button className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600">
              Export
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 relative">
        <TimelineCanvas width={window.innerWidth} height={window.innerHeight - 120} />
      </div>
    </div>
  );
}

function PortfolioView() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio View</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Multi-score synchronized timeline view coming soon...
        </p>
      </div>
    </div>
  );
}

export default App;
