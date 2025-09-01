import { getProjectDoc, TaskData, DependencyData } from './ydoc'
import { Task, TaskStatus, validateDAG, Dependency as CoreDependency } from '@cadence/core'

export function createTask(projectId: string, task: Omit<Task, 'projectId' | 'createdAt' | 'updatedAt'>): void {
  const doc = getProjectDoc(projectId)
  const now = new Date().toISOString()
  const taskData: TaskData = { ...task, projectId, createdAt: now, updatedAt: now } as any
  doc.ydoc.transact(() => { doc.tasks.set(task.id, taskData) }, 'local')
}

export function updateTask(projectId: string, taskId: string, updates: Partial<TaskData>): void {
  const ydoc = getProjectDoc(projectId)
  ydoc.ydoc.transact(() => { const task = ydoc.tasks.get(taskId); if (task) { ydoc.tasks.set(taskId, { ...task, ...updates, updatedAt: new Date().toISOString() }) } }, 'local')
}

export function deleteTask(projectId: string, taskId: string): void {
  const ydoc = getProjectDoc(projectId)
  ydoc.ydoc.transact(() => { ydoc.tasks.delete(taskId); const dependencies = ydoc.getDependencies(); for (const [depId, dep] of Object.entries(dependencies)) { if ((dep as any).srcTaskId === taskId || (dep as any).dstTaskId === taskId) { ydoc.dependencies.delete(depId) } } }, 'local')
}

export function moveTask(projectId: string, taskId: string, newStartDate: string): void {
  const ydoc = getProjectDoc(projectId)
  ydoc.ydoc.transact(() => { const task = ydoc.tasks.get(taskId); if (task) { ydoc.tasks.set(taskId, { ...task, startDate: newStartDate, updatedAt: new Date().toISOString() }) } }, 'local')
}

export function createDependency(projectId: string, dependency: DependencyData): void {
  const y = getProjectDoc(projectId)
  if (!dependency || dependency.srcTaskId === dependency.dstTaskId) return
  const tasksMap = y.getTasks(); if (!tasksMap[dependency.srcTaskId] || !tasksMap[dependency.dstTaskId]) return
  const tasks = Object.values(tasksMap) as Task[]
  const existingDeps = Object.values(y.getDependencies())
  const depsForCheck: CoreDependency[] = existingDeps.concat([{ ...dependency, projectId, createdAt: '', updatedAt: '' } as unknown as CoreDependency]).map((d: any) => ({ id: d.id, srcTaskId: d.srcTaskId, dstTaskId: d.dstTaskId, type: d.type, projectId: d.projectId ?? projectId, createdAt: d.createdAt ?? '', updatedAt: d.updatedAt ?? '' }))
  if (!validateDAG(tasks, depsForCheck)) return
  y.ydoc.transact(() => { y.dependencies.set(dependency.id, dependency) }, 'local')
}

export function deleteDependency(projectId: string, dependencyId: string): void { const ydoc = getProjectDoc(projectId); ydoc.ydoc.transact(() => { ydoc.dependencies.delete(dependencyId) }, 'local') }
export function updateTaskStatus(projectId: string, taskId: string, status: TaskStatus): void { updateTask(projectId, taskId, { status }) }

