import { describe, expect, it } from 'vitest';
import { assignLanes } from './laneAssignment';
import type { Note, Dependency } from './types';

describe('assignLanes', () => {
  it('keeps a dependency chain on the same lane', () => {
    const notes: Record<string, Note> = {
      a: { id: 'a', title: 'A', startBeat: 0, durationBeats: 1 },
      b: { id: 'b', title: 'B', startBeat: 1, durationBeats: 1 },
      c: { id: 'c', title: 'C', startBeat: 2, durationBeats: 1 },
    };
    const deps: Dependency[] = [
      { srcId: 'a', dstId: 'b' },
      { srcId: 'b', dstId: 'c' },
    ];
    const lanes = assignLanes(notes, deps);
    expect(lanes.a).toBe(lanes.b);
    expect(lanes.b).toBe(lanes.c);
  });

  it('places fan-out dependents on adjacent lanes', () => {
    const notes: Record<string, Note> = {
      a: { id: 'a', title: 'A', startBeat: 0, durationBeats: 1 },
      b: { id: 'b', title: 'B', startBeat: 1, durationBeats: 1 },
      c: { id: 'c', title: 'C', startBeat: 1, durationBeats: 1 },
    };
    const deps: Dependency[] = [
      { srcId: 'a', dstId: 'b' },
      { srcId: 'a', dstId: 'c' },
    ];
    const lanes = assignLanes(notes, deps);
    expect(lanes.a).toBe(lanes.b);
    expect(Math.abs(lanes.b - lanes.c)).toBe(1);
  });
});

