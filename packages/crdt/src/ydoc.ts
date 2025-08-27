/**
 * Yjs Document Setup and Management
 */

import * as Y from 'yjs'
import { TaskStatus, DependencyType } from '@cadence/core'
import { getPersistenceProvider, initializePersistence } from './persistence'

export interface TaskData {
  id: string
  title: string
  startDate: string
  durationDays: number
  status: TaskStatus
  assignee?: string
  description?: string
  staffId: string // ID of the staff this task is on
  staffLine: number // Which line on the staff (0 = bottom line, 1 = first space, etc.)
  projectId: string
  createdAt: string
  updatedAt: string
}

export interface DependencyData {
  id: string
  srcTaskId: string
  dstTaskId: string
  type: DependencyType
}

/**
 * Persistence controller encapsulates persistence lifecycle per project
 */
class ProjectPersistenceController {
  private bound = false

  constructor(private readonly projectId: string, private readonly ydoc: Y.Doc) { }

  async init(): Promise<void> {
    await initializePersistence()
    const provider = getPersistenceProvider()
    // Load historical updates
    const updates = await provider.loadUpdates(this.projectId)
    for (const u of updates) {
      try { Y.applyUpdate(this.ydoc, u) } catch { }
    }
    // Bind persister once
    if (!this.bound) {
      this.ydoc.on('update', (update: Uint8Array) => {
        provider.saveUpdate(this.projectId, update).catch(() => { })
      })
      this.bound = true
    }
  }
}

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
  private persistence: ProjectPersistenceController

  constructor(public readonly projectId: string) {
    this.ydoc = new Y.Doc()
    this.tasks = this.ydoc.getMap<TaskData>('tasks')
    this.dependencies = this.ydoc.getMap<DependencyData>('dependencies')
    this.settings = this.ydoc.getMap<unknown>('settings')

    // Set up UndoManager for undo/redo functionality
    this.undoManager = new Y.UndoManager([this.tasks, this.dependencies, this.settings])

    // Attach persistence controller (non-blocking)
    this.persistence = new ProjectPersistenceController(projectId, this.ydoc)
    void this.persistence.init()
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
    doc.destroy()
    projectDocuments.delete(projectId)
  }
}
