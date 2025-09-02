import type { Task, Dependency } from './types'

/**
 * Validate that task dependencies form an acyclic graph.
 * Returns true if there is no cycle; false otherwise.
 */
export function validateDAG(tasks: Task[], dependencies: Dependency[]): boolean {
  try {
    const taskIds = new Set<string>(tasks.map(t => t.id))
    // Build adjacency list src -> [dst]
    const adj = new Map<string, string[]>()
    for (const dep of dependencies) {
      if (!taskIds.has(dep.srcTaskId) || !taskIds.has(dep.dstTaskId)) continue
      const list = adj.get(dep.srcTaskId) ?? []
      list.push(dep.dstTaskId)
      adj.set(dep.srcTaskId, list)
    }
    const temp = new Set<string>()
    const perm = new Set<string>()
    const visit = (id: string): boolean => {
      if (perm.has(id)) return true
      if (temp.has(id)) return false // found a back edge => cycle
      temp.add(id)
      const next = adj.get(id)
      if (next) {
        for (const n of next) {
          if (!visit(n)) return false
        }
      }
      temp.delete(id)
      perm.add(id)
      return true
    }
    for (const t of tasks) {
      if (!visit(t.id)) return false
    }
    return true
  } catch {
    return false
  }
}

