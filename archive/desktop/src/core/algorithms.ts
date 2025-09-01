import { Task, Dependency } from './types'

export function validateDAG(tasks: Task[], dependencies: Dependency[]): boolean {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  for (const taskId of tasks.map(t => t.id)) {
    if (!visited.has(taskId)) {
      if (hasCycleDFS(taskId, graph, visited, recursionStack)) return false
    }
  }
  return true
}

export function topologicalSort(tasks: Task[], dependencies: Dependency[]): string[] {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set<string>()
  const result: string[] = []
  function dfs(taskId: string) {
    if (visited.has(taskId)) return
    visited.add(taskId)
    const dependents = graph.get(taskId) || []
    for (const dependentId of dependents) dfs(dependentId)
    result.unshift(taskId)
  }
  for (const task of tasks) if (!visited.has(task.id)) dfs(task.id)
  return result
}

function buildDependencyGraph(tasks: Task[], dependencies: Dependency[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  for (const task of tasks) graph.set(task.id, [])
  for (const dep of dependencies) {
    const dependents = graph.get(dep.srcTaskId) || []
    dependents.push(dep.dstTaskId)
    graph.set(dep.srcTaskId, dependents)
  }
  return graph
}

function hasCycleDFS(taskId: string, graph: Map<string, string[]>, visited: Set<string>, recursionStack: Set<string>): boolean {
  visited.add(taskId)
  recursionStack.add(taskId)
  const dependents = graph.get(taskId) || []
  for (const dependentId of dependents) {
    if (!visited.has(dependentId)) {
      if (hasCycleDFS(dependentId, graph, visited, recursionStack)) return true
    } else if (recursionStack.has(dependentId)) {
      return true
    }
  }
  recursionStack.delete(taskId)
  return false
}

export function assignLanes(tasks: Task[], dependencies: Dependency[]): Task[] {
  const topo = topologicalSort(tasks, dependencies)
  const incoming = new Map<string, string[]>()
  for (const t of tasks) incoming.set(t.id, [])
  for (const d of dependencies) {
    if (!incoming.has(d.dstTaskId)) incoming.set(d.dstTaskId, [])
    incoming.get(d.dstTaskId)!.push(d.srcTaskId)
  }
  const laneById = new Map<string, number>()
  let nextFreeLane = 0
  for (const id of topo) {
    const preds = incoming.get(id) || []
    const predLanes = preds.map(p => laneById.get(p)).filter((v): v is number => typeof v === 'number')
    let lane: number
    if (predLanes.length > 0) lane = Math.min(...predLanes)
    else { lane = nextFreeLane; nextFreeLane += 1 }
    laneById.set(id, lane)
  }
  return tasks.map(t => ({ ...t, laneIndex: laneById.get(t.id) ?? 0 }))
}

