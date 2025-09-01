import type { Task, Dependency } from '../types'
import { CONSTANTS } from '../config'

// Re-export for backward compatibility
export const DEFAULT_TASK_HEIGHT = CONSTANTS.DEFAULT_TASK_HEIGHT

// Compute the minimum allowed start day index for a task, given current tasks and dependencies.
// Simple heuristic: a task cannot start before all its predecessors finish.
export function computeMinAllowedStartDayIndex(
  tasks: Record<string, Task>,
  dependencies: Record<string, Dependency>,
  projectStartDate: Date,
  taskId: string
): number {
  try {
    const preds = Object.values(dependencies).filter((d) => d.dstTaskId === taskId)
    if (preds.length === 0) return 0
    const msPerDay = 24 * 60 * 60 * 1000
    const base = new Date(Date.UTC(projectStartDate.getUTCFullYear(), projectStartDate.getUTCMonth(), projectStartDate.getUTCDate()))
    let minIndex = 0
    for (const dep of preds) {
      const src = tasks[dep.srcTaskId]
      if (!src) continue
      const start = new Date(src.startDate)
      const startIdx = Math.max(0, Math.floor((start.getTime() - base.getTime()) / msPerDay))
      const endIdx = startIdx + Math.max(1, src.durationDays)
      if (endIdx > minIndex) minIndex = endIdx
    }
    return Math.max(0, minIndex)
  } catch {
    return 0
  }
}
