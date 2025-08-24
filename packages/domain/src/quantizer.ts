/**
 * Quantizer: Handles conversion between beats and timestamps
 * Maps musical time (beats) to real time (timestamps)
 */

import type { Score, Beat, Timestamp } from './types';

export class Quantizer {
  private startMs: number;
  private endMs: number;
  private totalMs: number;
  private tempo: number;
  private measureDurationMs: number;
  private beatDurationMs: number;
  private totalBeats: number;

  constructor(score: Score) {
    this.startMs = new Date(score.startTs).getTime();
    this.endMs = new Date(score.endTs).getTime();
    this.totalMs = this.endMs - this.startMs;
    this.tempo = score.tempo;
    
    // Calculate measure and beat durations
    const totalMeasures = Math.ceil(this.totalMs / (24 * 60 * 60 * 1000)); // Rough estimate
    this.measureDurationMs = this.totalMs / totalMeasures;
    this.beatDurationMs = this.measureDurationMs / this.tempo;
    this.totalBeats = Math.floor(this.totalMs / this.beatDurationMs);
  }

  /**
   * Convert a timestamp to the nearest beat
   */
  toBeat(timestamp: Timestamp | Date): Beat {
    const ts = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const tsMs = ts.getTime();
    
    // Clamp to score boundaries
    const clampedMs = Math.max(this.startMs, Math.min(this.endMs, tsMs));
    const deltaMs = clampedMs - this.startMs;
    
    return Math.floor(deltaMs / this.beatDurationMs);
  }

  /**
   * Convert a beat to a timestamp
   */
  toTimestamp(beat: Beat): Timestamp {
    const clampedBeat = Math.max(0, Math.min(this.totalBeats, beat));
    const ms = this.startMs + (clampedBeat * this.beatDurationMs);
    return new Date(ms).toISOString();
  }

  /**
   * Snap a beat to the nearest quantization grid
   */
  snapBeat(beat: Beat, gridSize: number = 1): Beat {
    return Math.round(beat / gridSize) * gridSize;
  }

  /**
   * Get the measure index for a given beat
   */
  getMeasureIndex(beat: Beat): number {
    return Math.floor(beat / this.tempo);
  }

  /**
   * Get the beat within a measure (0 to tempo-1)
   */
  getBeatInMeasure(beat: Beat): number {
    return beat % this.tempo;
  }

  /**
   * Get total number of measures
   */
  getTotalMeasures(): number {
    return Math.ceil(this.totalBeats / this.tempo);
  }

  /**
   * Get measure boundaries
   */
  getMeasures(): Array<{ index: number; startBeat: Beat; endBeat: Beat; label: string }> {
    const measures = [];
    const totalMeasures = this.getTotalMeasures();
    
    for (let i = 0; i < totalMeasures; i++) {
      measures.push({
        index: i,
        startBeat: i * this.tempo,
        endBeat: Math.min((i + 1) * this.tempo, this.totalBeats),
        label: `M${i + 1}`
      });
    }
    
    return measures;
  }

  /**
   * Check if two beats are in the same measure
   */
  inSameMeasure(beat1: Beat, beat2: Beat): boolean {
    return this.getMeasureIndex(beat1) === this.getMeasureIndex(beat2);
  }

  /**
   * Get beat duration in milliseconds
   */
  getBeatDurationMs(): number {
    return this.beatDurationMs;
  }

  /**
   * Get tempo (beats per measure)
   */
  getTempo(): number {
    return this.tempo;
  }
}
