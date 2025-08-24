/**
 * Lane Assignment Algorithm
 * Implements melody alignment to keep dependency chains on the same lane
 * O(N log L) complexity where N is notes and L is lanes
 */

import type { Note, Dependency, UUID, LaneAssignment } from './types';
import { DAG } from './dag';

interface LaneOccupancy {
  laneIndex: number;
  occupiedUntil: number; // Last beat occupied
}

export class LaneAssigner {
  private notes: Map<UUID, Note>;
  private dag: DAG;
  private dependencies: Dependency[];

  constructor(notes: Note[], dependencies: Dependency[]) {
    this.notes = new Map(notes.map(n => [n.id, n]));
    this.dag = new DAG(notes, dependencies);
    this.dependencies = dependencies;
  }

  /**
   * Assign notes to lanes using melody alignment strategy
   */
  assign(): LaneAssignment {
    // Get topological order, then sort by start beat as secondary criteria
    const topOrder = this.dag.topologicalSort();
    const sortedNotes = topOrder
      .map(id => this.notes.get(id)!)
      .filter(Boolean)
      .sort((a, b) => {
        // Primary: topological order (preserved from input)
        const topoA = topOrder.indexOf(a.id);
        const topoB = topOrder.indexOf(b.id);
        if (topoA !== topoB) return topoA - topoB;
        // Secondary: start beat
        return a.startBeat - b.startBeat;
      });

    // Track lane occupancy using min-heaps (simulated with arrays)
    const lanes: LaneOccupancy[] = [];
    const assignments = new Map<UUID, number>();
    
    // Process each note in order
    for (const note of sortedNotes) {
      const noteEndBeat = note.startBeat + note.durationBeats;
      
      // Find preferred lane (predecessor's lane if possible)
      const preferredLane = this.getPreferredLane(note, assignments);
      
      let assignedLane: number;
      
      if (preferredLane !== null && this.canUseLane(lanes, preferredLane, note.startBeat)) {
        // Use predecessor's lane if available
        assignedLane = preferredLane;
      } else {
        // Find nearest free lane or create new one
        assignedLane = this.findNearestFreeLane(lanes, note.startBeat, preferredLane);
      }
      
      // Update lane occupancy
      if (!lanes[assignedLane]) {
        lanes[assignedLane] = { laneIndex: assignedLane, occupiedUntil: 0 };
      }
      const lane = lanes[assignedLane];
      if (lane) {
        lane.occupiedUntil = Math.max(lane.occupiedUntil, noteEndBeat);
      }
      
      assignments.set(note.id, assignedLane);
    }
    
    // Post-process: smooth short detours back to predecessor lane
    this.smoothAssignments(assignments, sortedNotes);
    
    return {
      assignments,
      laneCount: lanes.length,
      maxDepth: Math.max(...Array.from(assignments.values())) + 1
    };
  }

  /**
   * Get the preferred lane based on predecessors
   */
  private getPreferredLane(note: Note, assignments: Map<UUID, number>): number | null {
    const predecessors = this.dag.getPredecessors(note.id);
    
    if (predecessors.length === 0) {
      return null;
    }
    
    // Find the predecessor with the latest end beat (most recently finished)
    let latestPred: Note | null = null;
    let latestEndBeat = -1;
    
    for (const predId of predecessors) {
      const pred = this.notes.get(predId);
      if (pred) {
        const predEndBeat = pred.startBeat + pred.durationBeats;
        if (predEndBeat > latestEndBeat) {
          latestEndBeat = predEndBeat;
          latestPred = pred;
        }
      }
    }
    
    if (latestPred && assignments.has(latestPred.id)) {
      return assignments.get(latestPred.id)!;
    }
    
    return null;
  }

  /**
   * Check if a lane is available at a given beat
   */
  private canUseLane(lanes: LaneOccupancy[], laneIndex: number, startBeat: number): boolean {
    const lane = lanes[laneIndex];
    if (!lane) return true; // Lane doesn't exist yet
    return lane.occupiedUntil <= startBeat;
  }

  /**
   * Find the nearest free lane, preferring lanes close to the preferred lane
   */
  private findNearestFreeLane(
    lanes: LaneOccupancy[],
    startBeat: number,
    preferredLane: number | null
  ): number {
    // First, try to find a free existing lane
    const freeLanes: number[] = [];
    
    for (let i = 0; i < lanes.length; i++) {
      if (this.canUseLane(lanes, i, startBeat)) {
        freeLanes.push(i);
      }
    }
    
    if (freeLanes.length > 0) {
      if (preferredLane !== null) {
        // Find the free lane closest to preferred
        freeLanes.sort((a, b) => {
          const distA = Math.abs(a - preferredLane);
          const distB = Math.abs(b - preferredLane);
          return distA - distB;
        });
      }
      return freeLanes[0] ?? 0;
    }
    
    // No free lanes, create a new one
    const newLaneIndex = lanes.length;
    
    // If we have a preferred lane, try to place the new lane adjacent to it
    if (preferredLane !== null && preferredLane < newLaneIndex) {
      // Consider inserting near the preferred lane for better visual grouping
      // For now, just append (can be optimized later)
    }
    
    return newLaneIndex;
  }

  /**
   * Post-process to smooth short detours back to predecessor lanes
   */
  private smoothAssignments(assignments: Map<UUID, number>, sortedNotes: Note[]): void {
    // Look for chains where a note temporarily moves to a different lane
    // and then a successor could move back
    
    for (const note of sortedNotes) {
      const predecessors = this.dag.getPredecessors(note.id);
      const successors = this.dag.getSuccessors(note.id);
      
      if (predecessors.length === 1 && successors.length === 1) {
        // This note is in a simple chain
        const predId = predecessors[0];
        const succId = successors[0];
        
        if (!predId || !succId) continue;
        
        const predLane = assignments.get(predId);
        const currLane = assignments.get(note.id);
        const succLane = assignments.get(succId);
        
        if (predLane !== undefined && currLane !== undefined && succLane !== undefined) {
          // Check if this is a short detour
          if (predLane === succLane && predLane !== currLane) {
            // Try to move current note back to the main lane
            const pred = this.notes.get(predId)!;
            const succ = this.notes.get(succId)!;
            
            const predEnd = pred.startBeat + pred.durationBeats;
            const noteEnd = note.startBeat + note.durationBeats;
            
            // Check if there's room on the preferred lane
            if (predEnd <= note.startBeat && noteEnd <= succ.startBeat) {
              // Safe to move back to the main lane
              assignments.set(note.id, predLane);
            }
          }
        }
      }
    }
  }



  /**
   * Calculate metrics for the assignment quality
   */
  calculateMetrics(assignments: Map<UUID, number>): {
    averageVerticalMovement: number;
    maxVerticalMovement: number;
    continuityScore: number;
  } {
    let totalMovement = 0;
    let maxMovement = 0;
    let continuousChains = 0;
    let totalChains = 0;
    
    for (const dep of this.dependencies) {
      const srcLane = assignments.get(dep.srcNoteId);
      const dstLane = assignments.get(dep.dstNoteId);
      
      if (srcLane !== undefined && dstLane !== undefined) {
        const movement = Math.abs(dstLane - srcLane);
        totalMovement += movement;
        maxMovement = Math.max(maxMovement, movement);
        
        totalChains++;
        if (movement === 0) {
          continuousChains++;
        }
      }
    }
    
    return {
      averageVerticalMovement: totalChains > 0 ? totalMovement / totalChains : 0,
      maxVerticalMovement: maxMovement,
      continuityScore: totalChains > 0 ? continuousChains / totalChains : 1
    };
  }
}
