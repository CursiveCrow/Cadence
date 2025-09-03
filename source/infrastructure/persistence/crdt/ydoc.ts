/**
 * Yjs Document Setup and Management
 */

import * as Y from 'yjs'
import { Task, Dependency } from '@cadence/core'

export type TaskData = Omit<Task, 'laneIndex'>
export type DependencyData = Dependency


/**
 * YDoc Structure as defined in Design.md:
 * - tasks: Y.Map<TaskData>
 * - dependencies: Y.Map<DependencyData>
 * - settings: Y.Map<unknown>
 */
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

    // Set up UndoManager for undo/redo functionality
    this.undoManager = new Y.UndoManager([this.tasks, this.dependencies, this.settings])

    // Persistence is currently in-memory only. External save/load can be added later.
  }

  /**
   * Get all tasks as a plain JavaScript object
   */
  getTasks(): Record<string, TaskData> {
    return this.tasks.toJSON() as Record<string, TaskData>
  }

  /**
   * Get all dependencies as a plain JavaScript object
   */
  getDependencies(): Record<string, DependencyData> {
    return this.dependencies.toJSON() as Record<string, DependencyData>
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): TaskData | undefined {
    return this.tasks.get(taskId)
  }

  /**
   * Get dependency by ID
   */
  getDependency(dependencyId: string): DependencyData | undefined {
    return this.dependencies.get(dependencyId)
  }

  /**
   * Destroy the document and clean up resources
   */
  destroy(): void {
    this.undoManager.destroy()
    this.ydoc.destroy()
  }
}

// Global registry for project documents
const projectDocuments = new Map<string, ProjectDocument>()

/**
 * Get or create a project document
 */
export function getProjectDoc(projectId: string): ProjectDocument {
  if (!projectDocuments.has(projectId)) {
    projectDocuments.set(projectId, new ProjectDocument(projectId))
  }
  return projectDocuments.get(projectId)!
}

/**
 * Remove project document from registry
 */
export function removeProjectDoc(projectId: string): void {
  const doc = projectDocuments.get(projectId)
  if (doc) {
    try { doc.destroy() } catch { }
    projectDocuments.delete(projectId)
  }
}
