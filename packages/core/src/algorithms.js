/**
 * Domain Algorithms for Cadence Project Management System
 * Based on Design.md specification
 */
/**
 * DAG Validation - Cycle Detection
 * Performs Depth First Search (DFS) to ensure no cycles exist in the dependency graph
 */
export function validateDAG(tasks, dependencies) {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set()
  const recursionStack = new Set()
  for (const taskId of tasks.map(t => t.id)) {
    if (!visited.has(taskId)) {
      if (hasCycleDFS(taskId, graph, visited, recursionStack)) {
        return false
      }
    }
  }
  return true
}
/**
 * Topological Sort
 * Returns tasks in dependency order
 */
export function topologicalSort(tasks, dependencies) {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set()
  const result = []
  function dfs(taskId) {
    if (visited.has(taskId)) return
    visited.add(taskId)
    const dependents = graph.get(taskId) || []
    for (const dependentId of dependents) {
      dfs(dependentId)
    }
    result.unshift(taskId)
  }
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id)
    }
  }
  return result
}
// Helper functions
function buildDependencyGraph(tasks, dependencies) {
  const graph = new Map()
  // Initialize graph with all tasks
  for (const task of tasks) {
    graph.set(task.id, [])
  }
  // Add dependencies (src -> dst)
  for (const dep of dependencies) {
    const dependents = graph.get(dep.srcTaskId) || []
    dependents.push(dep.dstTaskId)
    graph.set(dep.srcTaskId, dependents)
  }
  return graph
}
function hasCycleDFS(taskId, graph, visited, recursionStack) {
  visited.add(taskId)
  recursionStack.add(taskId)
  const dependents = graph.get(taskId) || []
  for (const dependentId of dependents) {
    if (!visited.has(dependentId)) {
      if (hasCycleDFS(dependentId, graph, visited, recursionStack)) {
        return true
      }
    } else if (recursionStack.has(dependentId)) {
      return true
    }
  }
  recursionStack.delete(taskId)
  return false
}
/**
 * Assign simple lane indices to tasks to support visual layout.
 * Heuristic:
 * - Process tasks in topological order.
 * - If a task has predecessors, pick the minimum predecessor lane to keep chains together.
 * - If a task has no predecessors, place it in the next available lane, cycling from 0.
 */
export function assignLanes(tasks, dependencies) {
  // Build a quick lookup if needed in future heuristics
  // const idToTask = new Map<string, Task>(tasks.map(t => [t.id, t]))
  const topo = topologicalSort(tasks, dependencies)
  // Build reverse edges: dst -> [src]
  const incoming = new Map()
  for (const t of tasks) incoming.set(t.id, [])
  for (const d of dependencies) {
    if (!incoming.has(d.dstTaskId)) incoming.set(d.dstTaskId, [])
    incoming.get(d.dstTaskId).push(d.srcTaskId)
  }
  const laneById = new Map()
  let nextFreeLane = 0
  for (const id of topo) {
    const preds = incoming.get(id) || []
    // choose lane: prefer predecessor lane if available
    const predLanes = preds.map(p => laneById.get(p)).filter(v => typeof v === 'number')
    let lane
    if (predLanes.length > 0) {
      lane = Math.min(...predLanes)
    } else {
      lane = nextFreeLane
      nextFreeLane += 1
    }
    laneById.set(id, lane)
  }
  // Produce new array with laneIndex populated (non-mutating to be safe)
  return tasks.map(t => ({ ...t, laneIndex: laneById.get(t.id) ?? 0 }))
}
//# sourceMappingURL=algorithms.js.map
