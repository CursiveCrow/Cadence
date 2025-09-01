import { getProjectDoc } from './ydoc'
export function undoProject(projectId: string): void { const doc = getProjectDoc(projectId); try { (doc.undoManager as any)?.undo?.() } catch {} }
export function redoProject(projectId: string): void { const doc = getProjectDoc(projectId); try { (doc.undoManager as any)?.redo?.() } catch {} }
export function getUndoRedoState(projectId: string): { canUndo: boolean; canRedo: boolean } { try { const doc = getProjectDoc(projectId); const um: any = (doc as any).undoManager; return { canUndo: !!um?.canUndo?.(), canRedo: !!um?.canRedo?.() } } catch { return { canUndo: false, canRedo: false } } }

