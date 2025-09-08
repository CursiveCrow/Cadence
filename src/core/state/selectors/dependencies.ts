import { createSelector } from '@reduxjs/toolkit'
import type { Task } from '@types'
import { RootState } from '../store'
import { selectTasks } from './tasks'

// Base selector
export const selectDependencies = (state: RootState) => state.dependencies.list

// Dependencies with joined task objects
export const selectDependenciesWithTasks = createSelector(
  [selectDependencies, selectTasks],
  (dependencies, tasks) => {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    return dependencies
      .map(dep => ({
        ...dep,
        sourceTask: taskMap.get(dep.srcTaskId),
        destinationTask: taskMap.get(dep.dstTaskId)
      }))
      .filter(dep => (dep as any).sourceTask && (dep as any).destinationTask)
  }
)

// Tasks with no incoming dependencies
export const selectIndependentTasks = createSelector(
  [selectTasks, selectDependencies],
  (tasks, dependencies) => {
    const dependentIds = new Set(dependencies.map(d => d.dstTaskId))
    return tasks.filter(t => !dependentIds.has(t.id))
  }
)

// Tasks that are blocking others
export const selectBlockingTasks = createSelector(
  [selectTasks, selectDependencies],
  (tasks, dependencies) => {
    const blockingIds = new Set(dependencies.map(d => d.srcTaskId))
    return tasks.filter(t => blockingIds.has(t.id))
  }
)

// Critical path (simplified longest chain)
export const selectCriticalPath = createSelector(
  [selectTasks, selectDependenciesWithTasks],
  (tasks, dependencies) => {
    const taskMap = new Map(tasks.map(t => [t.id, t]))
    const graph = new Map<string, string[]>()
    tasks.forEach(t => graph.set(t.id, []))
    dependencies.forEach(dep => {
      const src = (dep as any).sourceTask as Task | undefined
      const dst = (dep as any).destinationTask as Task | undefined
      if (src && dst) {
        const arr = graph.get(src.id) || []
        arr.push(dst.id)
        graph.set(src.id, arr)
      }
    })

    let bestPath: Task[] = []
    let bestDuration = 0
    tasks.forEach(start => {
      const path = longestPathFrom(start.id, graph, taskMap, new Set())
      const duration = path.reduce((s, t) => s + t.durationDays, 0)
      if (duration > bestDuration) { bestDuration = duration; bestPath = path }
    })

    return { path: bestPath, totalDuration: bestDuration }
  }
)

function longestPathFrom(
  id: string,
  graph: Map<string, string[]>,
  taskMap: Map<string, Task>,
  visited: Set<string>
): Task[] {
  if (visited.has(id)) return []
  const task = taskMap.get(id)
  if (!task) return []
  visited.add(id)
  let best: Task[] = []
  let bestDur = 0
  const succ = graph.get(id) || []
  for (const nxt of succ) {
    const p = longestPathFrom(nxt, graph, taskMap, new Set(visited))
    const d = p.reduce((s, t) => s + t.durationDays, 0)
    if (d > bestDur) { bestDur = d; best = p }
  }
  return [task, ...best]
}
