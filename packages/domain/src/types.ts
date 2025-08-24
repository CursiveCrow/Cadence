/**
 * Core domain types for Cadence
 */

export type UUID = string;
export type Timestamp = string; // ISO 8601
export type Beat = number;

/**
 * Score represents a project timeline with musical metaphor
 */
export interface Score {
  id: UUID;
  ownerId: UUID;
  name: string;
  startTs: Timestamp;
  endTs: Timestamp;
  tempo: number; // beats per measure
  settings?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Note represents an atomic task within a Score
 */
export interface Note {
  id: UUID;
  scoreId: UUID;
  title: string;
  startBeat: Beat;
  durationBeats: number;
  laneIndex?: number; // computed by lane assignment algorithm
  meta?: {
    description?: string;
    assignees?: UUID[];
    tags?: string[];
    color?: string;
    [key: string]: unknown;
  };
}

/**
 * Dependency represents a directed edge between notes
 */
export interface Dependency {
  scoreId: UUID;
  srcNoteId: UUID;
  dstNoteId: UUID;
}

/**
 * Chord is an implicit grouping of notes with the same start beat
 */
export interface Chord {
  startBeat: Beat;
  notes: Note[];
}

/**
 * Measure represents a time segment in the timeline
 */
export interface Measure {
  index: number;
  startBeat: Beat;
  endBeat: Beat;
  label: string;
}

/**
 * Lane represents a horizontal track for note placement
 */
export interface Lane {
  index: number;
  notes: Note[];
}

/**
 * DAG (Directed Acyclic Graph) validation result
 */
export interface DAGValidationResult {
  valid: boolean;
  cycles?: UUID[][];
  topologicalOrder?: UUID[];
}

/**
 * Lane assignment result
 */
export interface LaneAssignment {
  assignments: Map<UUID, number>; // noteId -> laneIndex
  laneCount: number;
  maxDepth: number;
}
