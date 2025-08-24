import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Score, Note, Dependency } from '@cadence/domain';

interface TimelineState {
  // Score data
  score: Score | null;
  notes: Note[];
  dependencies: Dependency[];
  
  // UI state
  selectedNoteIds: Set<string>;
  hoveredNoteId: string | null;
  isDragging: boolean;
  zoom: number;
  scrollX: number;
  scrollY: number;
  
  // Actions
  setScore: (score: Score) => void;
  addNote: (note: Omit<Note, 'id'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addDependency: (src: string, dst: string) => void;
  removeDependency: (src: string, dst: string) => void;
  selectNote: (id: string, multi?: boolean) => void;
  clearSelection: () => void;
  setHoveredNote: (id: string | null) => void;
  setZoom: (zoom: number) => void;
  setScroll: (x: number, y: number) => void;
}

export const useTimelineStore = create<TimelineState>((set, get) => ({
  // Initial state
  score: null,
  notes: [],
  dependencies: [],
  selectedNoteIds: new Set(),
  hoveredNoteId: null,
  isDragging: false,
  zoom: 1,
  scrollX: 0,
  scrollY: 0,
  
  // Actions
  setScore: (score) => set({ score }),
  
  addNote: (noteData) => {
    const note: Note = {
      ...noteData,
      id: uuidv4(),
    };
    set((state) => ({
      notes: [...state.notes, note],
    }));
  },
  
  updateNote: (id, updates) => {
    set((state) => ({
      notes: state.notes.map((note) =>
        note.id === id ? { ...note, ...updates } : note
      ),
    }));
  },
  
  deleteNote: (id) => {
    set((state) => ({
      notes: state.notes.filter((note) => note.id !== id),
      dependencies: state.dependencies.filter(
        (dep) => dep.srcNoteId !== id && dep.dstNoteId !== id
      ),
      selectedNoteIds: new Set(
        Array.from(state.selectedNoteIds).filter((nId) => nId !== id)
      ),
    }));
  },
  
  addDependency: (src, dst) => {
    const { score } = get();
    if (!score) return;
    
    const dependency: Dependency = {
      scoreId: score.id,
      srcNoteId: src,
      dstNoteId: dst,
    };
    
    set((state) => ({
      dependencies: [...state.dependencies, dependency],
    }));
  },
  
  removeDependency: (src, dst) => {
    set((state) => ({
      dependencies: state.dependencies.filter(
        (dep) => !(dep.srcNoteId === src && dep.dstNoteId === dst)
      ),
    }));
  },
  
  selectNote: (id, multi = false) => {
    set((state) => {
      const newSelection = new Set(multi ? state.selectedNoteIds : []);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedNoteIds: newSelection };
    });
  },
  
  clearSelection: () => {
    set({ selectedNoteIds: new Set() });
  },
  
  setHoveredNote: (id) => {
    set({ hoveredNoteId: id });
  },
  
  setZoom: (zoom) => {
    set({ zoom: Math.max(0.1, Math.min(5, zoom)) });
  },
  
  setScroll: (x, y) => {
    set({ scrollX: x, scrollY: y });
  },
}));
