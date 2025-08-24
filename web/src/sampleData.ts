import type { ScoreData } from './types';

// Example score bundle from the design document
export const sampleData: ScoreData = {
  tempo: 4,
  notes: {
    a1: { id: 'a1', title: 'Build', startBeat: 0, durationBeats: 2 },
    b2: { id: 'b2', title: 'Test', startBeat: 2, durationBeats: 2 },
    c3: { id: 'c3', title: 'Deploy', startBeat: 4, durationBeats: 1 },
  },
  deps: [
    { srcId: 'a1', dstId: 'b2' },
    { srcId: 'b2', dstId: 'c3' },
  ],
};
