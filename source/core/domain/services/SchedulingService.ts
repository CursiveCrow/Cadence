/**
 * SchedulingService Domain Service
 * Handles task scheduling and timeline optimization
 */

import { Task } from '../entities/Task'
import { Dependency } from '../entities/Dependency'
import { Staff } from '../entities/Staff'
import { TimeRange } from '../value-objects/TimeRange'
import { DependencyService } from './DependencyService'
import { TaskService } from './TaskService'

export class SchedulingService {
    constructor(
        private dependencyService: DependencyService,
        private taskService: TaskService
    ) { }

    /**
     * Assign lanes to tasks to minimize visual overlap
     */
    assignLanes(tasks: Task[], dependencies: Dependency[]): Task[] {
        const topo = this.topologicalSort(tasks, dependencies)
        const incoming = new Map<string, string[]>()

        // Initialize incoming dependencies map
        for (const task of tasks) {
            incoming.set(task.id, [])
        }

        for (const dep of dependencies) {
            if (!incoming.has(dep.dstTaskId)) {
                incoming.set(dep.dstTaskId, [])
            }
            incoming.get(dep.dstTaskId)!.push(dep.srcTaskId)
        }

        const laneById = new Map<string, number>()
        let nextFreeLane = 0

        for (const id of topo) {
            const preds = incoming.get(id) || []
            const predLanes = preds
                .map(p => laneById.get(p))
                .filter((v): v is number => typeof v === 'number')

            let lane: number
            if (predLanes.length > 0) {
                lane = Math.min(...predLanes)
            } else {
                lane = nextFreeLane
                nextFreeLane += 1
            }

            laneById.set(id, lane)
        }

        return tasks.map(task => {
            const laneIndex = laneById.get(task.id) ?? 0
            return task.setLaneIndex(laneIndex)
        })
    }

    /**
     * Optimize task positions on staffs to minimize crossings
     */
    optimizeStaffPositions(tasks: Task[], staffs: Staff[]): Task[] {
        const staffMap = new Map(staffs.map(s => [s.id, s]))
        const tasksByStaff = new Map<string, Task[]>()

        // Group tasks by staff
        for (const task of tasks) {
            if (!tasksByStaff.has(task.staffId)) {
                tasksByStaff.set(task.staffId, [])
            }
            tasksByStaff.get(task.staffId)!.push(task)
        }

        const optimizedTasks: Task[] = []

        // Optimize each staff independently
        for (const [staffId, staffTasks] of tasksByStaff) {
            const staff = staffMap.get(staffId)
            if (!staff) continue

            // Sort tasks by start date
            const sorted = [...staffTasks].sort((a, b) =>
                new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
            )

            // Assign lines to minimize overlap
            const lineOccupancy = new Map<number, TimeRange[]>()

            for (const task of sorted) {
                let bestLine = -1
                let minConflicts = Infinity

                // Try each line
                for (let line = 0; line < staff.numberOfLines; line++) {
                    const occupiedRanges = lineOccupancy.get(line) || []
                    let conflicts = 0

                    for (const range of occupiedRanges) {
                        if (task.timeRange.overlaps(range)) {
                            conflicts++
                        }
                    }

                    if (conflicts < minConflicts) {
                        minConflicts = conflicts
                        bestLine = line
                    }

                    if (conflicts === 0) break
                }

                // Assign to best line
                if (bestLine >= 0) {
                    const updatedTask = task.moveTo(staffId, bestLine)
                    optimizedTasks.push(updatedTask)

                    // Update occupancy
                    if (!lineOccupancy.has(bestLine)) {
                        lineOccupancy.set(bestLine, [])
                    }
                    lineOccupancy.get(bestLine)!.push(task.timeRange)
                } else {
                    optimizedTasks.push(task)
                }
            }
        }

        return optimizedTasks
    }

    /**
     * Level tasks to resolve resource conflicts
     */
    levelResources(tasks: Task[], maxParallelTasks: number): Task[] {
        const sorted = [...tasks].sort((a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        )

        const leveledTasks: Task[] = []
        const activeRanges: TimeRange[] = []

        for (const task of sorted) {
            // Remove expired ranges
            const taskStart = new Date(task.startDate)
            const stillActive = activeRanges.filter(range =>
                range.contains(task.startDate)
            )

            if (stillActive.length >= maxParallelTasks) {
                // Need to delay this task
                const earliestEnd = stillActive
                    .map(r => r.getEndDate())
                    .sort((a, b) => a.getTime() - b.getTime())[0]

                const newStartDate = new Date(earliestEnd)
                newStartDate.setDate(newStartDate.getDate() + 1)

                const delayedTask = task.reschedule(
                    newStartDate.toISOString().split('T')[0]
                )
                leveledTasks.push(delayedTask)
                activeRanges.push(delayedTask.timeRange)
            } else {
                leveledTasks.push(task)
                activeRanges.push(task.timeRange)
            }
        }

        return leveledTasks
    }

    /**
     * Calculate slack time for each task
     */
    calculateSlack(tasks: Task[], dependencies: Dependency[]): Map<string, number> {
        const taskMap = new Map(tasks.map(t => [t.id, t]))
        const slack = new Map<string, number>()

        // Calculate earliest start times
        const earliestStart = new Map<string, number>()
        const latestStart = new Map<string, number>()

        // Forward pass - calculate earliest start
        const sorted = this.topologicalSort(tasks, dependencies)

        for (const taskId of sorted) {
            const task = taskMap.get(taskId)
            if (!task) continue

            const incomingDeps = dependencies.filter(d => d.dstTaskId === taskId)

            if (incomingDeps.length === 0) {
                earliestStart.set(taskId, 0)
            } else {
                let maxEarliestFinish = 0

                for (const dep of incomingDeps) {
                    const predTask = taskMap.get(dep.srcTaskId)
                    if (!predTask) continue

                    const predEarliest = earliestStart.get(dep.srcTaskId) || 0
                    const predFinish = predEarliest + predTask.durationDays

                    if (predFinish > maxEarliestFinish) {
                        maxEarliestFinish = predFinish
                    }
                }

                earliestStart.set(taskId, maxEarliestFinish)
            }
        }

        // Calculate project duration
        let projectDuration = 0
        for (const [taskId, earliest] of earliestStart) {
            const task = taskMap.get(taskId)
            if (!task) continue

            const finish = earliest + task.durationDays
            if (finish > projectDuration) {
                projectDuration = finish
            }
        }

        // Backward pass - calculate latest start
        const reverseSorted = [...sorted].reverse()

        for (const taskId of reverseSorted) {
            const task = taskMap.get(taskId)
            if (!task) continue

            const outgoingDeps = dependencies.filter(d => d.srcTaskId === taskId)

            if (outgoingDeps.length === 0) {
                latestStart.set(taskId, projectDuration - task.durationDays)
            } else {
                let minLatestStart = projectDuration

                for (const dep of outgoingDeps) {
                    const succLatest = latestStart.get(dep.dstTaskId)
                    if (succLatest !== undefined && succLatest < minLatestStart) {
                        minLatestStart = succLatest
                    }
                }

                latestStart.set(taskId, minLatestStart - task.durationDays)
            }
        }

        // Calculate slack
        for (const taskId of sorted) {
            const earliest = earliestStart.get(taskId) || 0
            const latest = latestStart.get(taskId) || 0
            slack.set(taskId, latest - earliest)
        }

        return slack
    }

    /**
     * Find the best staff and line for a new task
     */
    findBestPosition(
        task: Task,
        existingTasks: Task[],
        staffs: Staff[]
    ): { staffId: string; staffLine: number } | null {
        let bestPosition: { staffId: string; staffLine: number } | null = null
        let minConflicts = Infinity

        for (const staff of staffs) {
            for (let line = 0; line < staff.numberOfLines; line++) {
                const conflictingTasks = existingTasks.filter(t =>
                    t.staffId === staff.id &&
                    t.staffLine === line &&
                    t.timeRange.overlaps(task.timeRange)
                )

                if (conflictingTasks.length < minConflicts) {
                    minConflicts = conflictingTasks.length
                    bestPosition = { staffId: staff.id, staffLine: line }

                    if (minConflicts === 0) {
                        return bestPosition
                    }
                }
            }
        }

        return bestPosition
    }

    private topologicalSort(tasks: Task[], dependencies: Dependency[]): string[] {
        const graph = new Map<string, string[]>()
        const visited = new Set<string>()
        const result: string[] = []

        // Build graph
        for (const task of tasks) {
            graph.set(task.id, [])
        }

        for (const dep of dependencies) {
            const dependents = graph.get(dep.srcTaskId) || []
            dependents.push(dep.dstTaskId)
            graph.set(dep.srcTaskId, dependents)
        }

        // DFS
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
}
