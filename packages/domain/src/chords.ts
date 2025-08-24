/**
 * Chord grouping utilities
 * Groups notes that share the same start beat
 */

import type { Note, Chord, Beat } from './types';

export class ChordGrouper {
  /**
   * Group notes into chords based on their start beat
   */
  static groupIntoChords(notes: Note[]): Chord[] {
    const chordMap = new Map<Beat, Note[]>();
    
    // Group notes by start beat
    for (const note of notes) {
      const existing = chordMap.get(note.startBeat) || [];
      existing.push(note);
      chordMap.set(note.startBeat, existing);
    }
    
    // Convert to chord array and sort by start beat
    const chords: Chord[] = [];
    for (const [startBeat, chordNotes] of chordMap) {
      // Sort notes within chord by lane index (if available) or by title
      const sortedNotes = [...chordNotes].sort((a, b) => {
        if (a.laneIndex !== undefined && b.laneIndex !== undefined) {
          return a.laneIndex - b.laneIndex;
        }
        return a.title.localeCompare(b.title);
      });
      
      chords.push({
        startBeat,
        notes: sortedNotes
      });
    }
    
    // Sort chords by start beat
    return chords.sort((a, b) => a.startBeat - b.startBeat);
  }
  
  /**
   * Check if notes form a chord (share the same start beat)
   */
  static isChord(notes: Note[]): boolean {
    if (notes.length <= 1) return false;
    
    const firstNote = notes[0];
    if (!firstNote) return false;
    
    const startBeat = firstNote.startBeat;
    return notes.every(note => note.startBeat === startBeat);
  }
  
  /**
   * Find the chord containing a specific note
   */
  static findChordForNote(note: Note, chords: Chord[]): Chord | undefined {
    return chords.find(chord => 
      chord.notes.some(n => n.id === note.id)
    );
  }
  
  /**
   * Calculate the maximum duration within a chord
   */
  static getChordDuration(chord: Chord): number {
    if (chord.notes.length === 0) return 0;
    
    return Math.max(...chord.notes.map(note => note.durationBeats));
  }
  
  /**
   * Get the end beat of a chord (start + max duration)
   */
  static getChordEndBeat(chord: Chord): Beat {
    return chord.startBeat + this.getChordDuration(chord);
  }
  
  /**
   * Check if two chords overlap in time
   */
  static chordsOverlap(chord1: Chord, chord2: Chord): boolean {
    const end1 = this.getChordEndBeat(chord1);
    const end2 = this.getChordEndBeat(chord2);
    
    return !(end1 <= chord2.startBeat || end2 <= chord1.startBeat);
  }
  
  /**
   * Merge overlapping notes into proper chords
   * This is useful when notes are dragged and might need regrouping
   */
  static mergeOverlappingNotes(notes: Note[]): Note[] {
    const result: Note[] = [];
    const processed = new Set<string>();
    
    for (const note of notes) {
      if (processed.has(note.id)) continue;
      
      // Find all notes that start at the same beat
      const chordNotes = notes.filter(n => 
        n.startBeat === note.startBeat && !processed.has(n.id)
      );
      
      // Mark all as processed
      chordNotes.forEach(n => processed.add(n.id));
      
      // Add to result
      result.push(...chordNotes);
    }
    
    return result;
  }
  
  /**
   * Split a chord by moving a note to a different beat
   */
  static splitChord(chord: Chord, noteId: string, newStartBeat: Beat): Chord[] {
    const remainingNotes = chord.notes.filter(n => n.id !== noteId);
    const movedNote = chord.notes.find(n => n.id === noteId);
    
    if (!movedNote) return [chord];
    
    const chords: Chord[] = [];
    
    // Original chord with remaining notes (if any)
    if (remainingNotes.length > 0) {
      chords.push({
        startBeat: chord.startBeat,
        notes: remainingNotes
      });
    }
    
    // New chord with moved note
    const updatedNote = { ...movedNote, startBeat: newStartBeat };
    chords.push({
      startBeat: newStartBeat,
      notes: [updatedNote]
    });
    
    return chords;
  }
  
  /**
   * Calculate visual stacking order for notes in a chord
   * Returns a map of noteId to stack position (0 = bottom)
   */
  static calculateStackOrder(chord: Chord): Map<string, number> {
    const stackOrder = new Map<string, number>();
    
    // Sort by duration (longer notes at bottom) then by title
    const sorted = [...chord.notes].sort((a, b) => {
      const durDiff = b.durationBeats - a.durationBeats;
      if (durDiff !== 0) return durDiff;
      return a.title.localeCompare(b.title);
    });
    
    sorted.forEach((note, index) => {
      stackOrder.set(note.id, index);
    });
    
    return stackOrder;
  }
}
