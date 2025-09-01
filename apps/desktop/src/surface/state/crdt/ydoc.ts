import * as Y from 'yjs'
import { TaskStatus, DependencyType } from '@cadence/core'
import { getPersistenceProvider, initializePersistence } from './persistence'

export interface TaskData { id: string; title: string; startDate: string; durationDays: number; status: TaskStatus; assignee?: string; description?: string; staffId: string; staffLine: number; projectId: string; createdAt: string; updatedAt: string }
export interface DependencyData { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType }

class ProjectPersistenceController { private bound = false; constructor(private readonly projectId: string, private readonly ydoc: Y.Doc) {} async init(): Promise<void> { await initializePersistence(); const provider = getPersistenceProvider(); const updates = await provider.loadUpdates(this.projectId); for (const u of updates) { try { Y.applyUpdate(this.ydoc, u) } catch {} } if (!this.bound) { this.ydoc.on('update', (update: Uint8Array) => { provider.saveUpdate(this.projectId, update).catch(() => {}) }); this.bound = true } } }

export class ProjectDocument { public readonly ydoc: any; public readonly tasks: any; public readonly dependencies: any; public readonly settings: any; public readonly undoManager: any; private persistence: ProjectPersistenceController; constructor(public readonly projectId: string) { this.ydoc = new (Y as any).Doc(); this.tasks = this.ydoc.getMap('tasks'); this.dependencies = this.ydoc.getMap('dependencies'); this.settings = this.ydoc.getMap('settings'); this.undoManager = new (Y as any).UndoManager([this.tasks, this.dependencies, this.settings]); this.persistence = new ProjectPersistenceController(projectId, this.ydoc); void this.persistence.init() } getTasks(): Record<string, TaskData> { return this.tasks.toJSON() as Record<string, TaskData> } getDependencies(): Record<string, DependencyData> { return this.dependencies.toJSON() as Record<string, DependencyData> } getTask(taskId: string): TaskData | undefined { return this.tasks.get(taskId) } getDependency(dependencyId: string): DependencyData | undefined { return this.dependencies.get(dependencyId) } destroy(): void { this.undoManager.destroy(); this.ydoc.destroy() } }

const projectDocuments = new Map<string, ProjectDocument>()
export function getProjectDoc(projectId: string): ProjectDocument { if (!projectDocuments.has(projectId)) { projectDocuments.set(projectId, new ProjectDocument(projectId)) } return projectDocuments.get(projectId)! }
export function removeProjectDoc(projectId: string): void { const doc = projectDocuments.get(projectId); if (doc) { doc.destroy(); projectDocuments.delete(projectId) } }

