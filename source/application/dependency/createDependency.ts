import type { PersistencePort } from '../ports/PersistencePort'
import type { Dependency } from '@cadence/core'
import { validateDAG } from '@cadence/core'

export type CreateDependencyInput = Omit<Dependency, 'projectId' | 'createdAt' | 'updatedAt'> & { projectId: string }

export const createDependency = (persistence: PersistencePort) => async (input: CreateDependencyInput) => {
  const { projectId, ...dep } = input
  // Enforce DAG at application boundary
  const snapshot = await persistence.getSnapshot(projectId)
  const tasks = Object.values(snapshot.tasks) as any
  const deps = Object.values(snapshot.dependencies) as any
  const proposed = deps.concat([{ ...dep, projectId, createdAt: '', updatedAt: '' }])
  if (!validateDAG(tasks, proposed)) return
  await persistence.createDependency(projectId, dep)
}
