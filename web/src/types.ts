export interface Note {
  id: string;
  title: string;
  startBeat: number;
  durationBeats: number;
}

export interface Dependency {
  srcId: string;
  dstId: string;
}

export interface ScoreData {
  tempo: number;
  notes: Record<string, Note>;
  deps: Dependency[];
}
