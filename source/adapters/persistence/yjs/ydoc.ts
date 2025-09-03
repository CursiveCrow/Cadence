/**
 * Yjs Document Setup and Management (scoped to adapter).
 */
import * as Y from 'yjs'
import type { Task, Dependency } from '@cadence/core'

export type TaskData = Omit<Task, 'laneIndex'>
export type DependencyData = Dependency

export class ProjectDocument {
  public readonly ydoc: Y.Doc
  public readonly tasks: Y.Map<TaskData>
  public readonly dependencies: Y.Map<DependencyData>
  public readonly settings: Y.Map<unknown>
  public readonly undoManager: Y.UndoManager

  constructor(public readonly projectId: string) {
    this.ydoc = new Y.Doc()
    this.tasks = this.ydoc.getMap<TaskData>('tasks')
    this.dependencies = this.ydoc.getMap<DependencyData>('dependencies')
    this.settings = this.ydoc.getMap<unknown>('settings')
    this.undoManager = new Y.UndoManager([this.tasks, this.dependencies, this.settings])
  }

  getTasks(): Record<string, TaskData> { return this.tasks.toJSON() as Record<string, TaskData> }
  getDependencies(): Record<string, DependencyData> { return this.dependencies.toJSON() as Record<string, DependencyData> }
  destroy(): void { this.undoManager.destroy(); this.ydoc.destroy() }
}

const projectDocuments = new Map<string, ProjectDocument>()

export function getProjectDoc(projectId: string): ProjectDocument {
  if (!projectDocuments.has(projectId)) projectDocuments.set(projectId, new ProjectDocument(projectId))
  return projectDocuments.get(projectId)!
}

export function removeProjectDoc(projectId: string): void {
  const doc = projectDocuments.get(projectId)
  if (doc) { try { doc.destroy() } catch {}; projectDocuments.delete(projectId) }
}

