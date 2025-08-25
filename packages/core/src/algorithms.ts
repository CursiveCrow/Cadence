/**
 * Domain Algorithms for Cadence Project Management System
 * Based on Design.md specification
 */

import { Task, Dependency } from './types'

/**
 * DAG Validation - Cycle Detection
 * Performs Depth First Search (DFS) to ensure no cycles exist in the dependency graph
 */
export function validateDAG(tasks: Task[], dependencies: Dependency[]): boolean {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set<string>()
  const recursionStack = new Set<string>()

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
 * Lane Assignment Algorithm
 * Minimizes vertical movement by keeping dependent chains in the same or adjacent lanes
 */
export function assignLanes(tasks: Task[], dependencies: Dependency[]): Task[] {
  const graph = buildDependencyGraph(tasks, dependencies)
  const sortedTaskIds = topologicalSort(tasks, dependencies)
  const laneAssignments = new Map<string, number>()
  const laneTasks = new Map<number, string[]>()

  for (const taskId of sortedTaskIds) {
    const predecessors = findPredecessors(taskId, graph)
    let assignedLane = 0

    if (predecessors.length > 0) {
      // Try to assign to the same lane as immediate predecessor
      const preferredLane = laneAssignments.get(predecessors[0]) || 0
      assignedLane = findAvailableLane(taskId, preferredLane, laneTasks)
    } else {
      // Root task, find first available lane
      assignedLane = findAvailableLane(taskId, 0, laneTasks)
    }

    laneAssignments.set(taskId, assignedLane)
    
    if (!laneTasks.has(assignedLane)) {
      laneTasks.set(assignedLane, [])
    }
    laneTasks.get(assignedLane)!.push(taskId)
  }

  // Update tasks with lane assignments
  return tasks.map(task => ({
    ...task,
    laneIndex: laneAssignments.get(task.id) || 0
  }))
}

/**
 * Topological Sort
 * Returns tasks in dependency order
 */
export function topologicalSort(tasks: Task[], dependencies: Dependency[]): string[] {
  const graph = buildDependencyGraph(tasks, dependencies)
  const visited = new Set<string>()
  const result: string[] = []

  function dfs(taskId: string) {
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

function buildDependencyGraph(tasks: Task[], dependencies: Dependency[]): Map<string, string[]> {
  const graph = new Map<string, string[]>()
  
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

function hasCycleDFS(
  taskId: string,
  graph: Map<string, string[]>,
  visited: Set<string>,
  recursionStack: Set<string>
): boolean {
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

function findPredecessors(taskId: string, graph: Map<string, string[]>): string[] {
  const predecessors: string[] = []
  
  for (const [srcId, dependents] of graph.entries()) {
    if (dependents.includes(taskId)) {
      predecessors.push(srcId)
    }
  }
  
  return predecessors
}

function findAvailableLane(
  _taskId: string,
  preferredLane: number,
  laneTasks: Map<number, string[]>
): number {
  // Check if preferred lane is available
  if (!laneTasks.has(preferredLane) || laneTasks.get(preferredLane)!.length === 0) {
    return preferredLane
  }

  // Find nearest available lane
  let lane = 0
  while (laneTasks.has(lane) && laneTasks.get(lane)!.length > 0) {
    lane++
  }

  return lane
}
