/**
 * CRDT Mutation Functions
 * All mutations must occur within a transaction with 'local' origin for UndoManager tracking
 */

import { getProjectDoc, TaskData, DependencyData } from './ydoc'
import { Task, validateDAG, Dependency as CoreDependency } from '@cadence/core'

/**
 * Create a new task in a project
 */
export function createTask(projectId: string, task: Omit<Task, 'projectId' | 'createdAt' | 'updatedAt'>): void {
  const doc = getProjectDoc(projectId)
  const now = new Date().toISOString()
  const taskData: TaskData = {
    ...task,
    projectId,
    createdAt: now,
    updatedAt: now,
  }
  doc.ydoc.transact(() => {
    doc.tasks.set(task.id, taskData)
  }, 'local')
}

export function updateTask(
  projectId: string,
  taskId: string,
  updates: Partial<TaskData>
): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    const task = ydoc.tasks.get(taskId)
    if (task) {
      ydoc.tasks.set(taskId, { ...task, ...updates, updatedAt: new Date().toISOString() })
    }
  }, 'local')
}

export function deleteTask(projectId: string, taskId: string): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    ydoc.tasks.delete(taskId)

    // Also remove any dependencies involving this task
    const dependencies = ydoc.getDependencies()
    for (const [depId, dep] of Object.entries(dependencies)) {
      if (dep.srcTaskId === taskId || dep.dstTaskId === taskId) {
        ydoc.dependencies.delete(depId)
      }
    }
  }, 'local')
}

export {}

export function createDependency(
  projectId: string,
  dependency: DependencyData
): void {
  const y = getProjectDoc(projectId)

  // Basic validation: distinct endpoints and existing tasks
  if (!dependency || dependency.srcTaskId === dependency.dstTaskId) return
  const tasksMap = y.getTasks()
  if (!tasksMap[dependency.srcTaskId] || !tasksMap[dependency.dstTaskId]) return

  // DAG validation: simulate new deps array and verify no cycles
  const tasks = Object.values(tasksMap) as Task[]
  const existingDeps = Object.values(y.getDependencies())
  const depsForCheck: CoreDependency[] = existingDeps
    .concat([{ ...dependency, projectId, createdAt: '', updatedAt: '' } as unknown as CoreDependency])
    .map((d: any) => ({
      id: d.id,
      srcTaskId: d.srcTaskId,
      dstTaskId: d.dstTaskId,
      type: d.type,
      projectId: d.projectId ?? projectId,
      createdAt: d.createdAt ?? '',
      updatedAt: d.updatedAt ?? '',
    }))

  if (!validateDAG(tasks, depsForCheck)) {
    // Reject creating a cyclic dependency
    return
  }

  y.ydoc.transact(() => {
    y.dependencies.set(dependency.id, dependency)
  }, 'local')
}

export function deleteDependency(projectId: string, dependencyId: string): void {
  const ydoc = getProjectDoc(projectId)

  ydoc.ydoc.transact(() => {
    ydoc.dependencies.delete(dependencyId)
  }, 'local')
}

export {}
