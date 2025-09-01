/**
 * DependencyService Domain Service
 * Handles dependency validation and management
 */

import { Task } from '../entities/Task'
import { Dependency } from '../entities/Dependency'
import { DependencyType } from '../value-objects/DependencyType'

export class DependencyService {
    /**
     * Validate that adding a dependency won't create a cycle
     */
    validateNoCycle(tasks: Task[], dependencies: Dependency[], newDependency: Dependency): boolean {
        const allDeps = [...dependencies, newDependency]
        return this.validateDAG(tasks, allDeps)
    }

    /**
     * Check if the dependency graph is a valid DAG (Directed Acyclic Graph)
     */
    validateDAG(tasks: Task[], dependencies: Dependency[]): boolean {
        const graph = this.buildDependencyGraph(tasks, dependencies)
        const visited = new Set<string>()
        const recursionStack = new Set<string>()

        for (const taskId of tasks.map(t => t.id)) {
            if (!visited.has(taskId)) {
                if (this.hasCycleDFS(taskId, graph, visited, recursionStack)) {
                    return false
                }
            }
        }

        return true
    }

    /**
     * Find all transitive dependencies of a task
     */
    getTransitiveDependencies(taskId: string, dependencies: Dependency[]): Set<string> {
        const result = new Set<string>()
        const visited = new Set<string>()

        // Build reverse dependency map (who do I depend on)
        const dependsOn = new Map<string, string[]>()
        for (const dep of dependencies) {
            if (!dependsOn.has(dep.dstTaskId)) {
                dependsOn.set(dep.dstTaskId, [])
            }
            dependsOn.get(dep.dstTaskId)!.push(dep.srcTaskId)
        }

        function dfs(currentId: string) {
            if (visited.has(currentId)) return
            visited.add(currentId)

            const deps = dependsOn.get(currentId) || []
            for (const depId of deps) {
                result.add(depId)
                dfs(depId)
            }
        }

        dfs(taskId)
        return result
    }

    /**
     * Find all tasks that depend on a given task (transitively)
     */
    getTransitiveDependents(taskId: string, dependencies: Dependency[]): Set<string> {
        const result = new Set<string>()
        const visited = new Set<string>()

        // Build dependency map (who depends on me)
        const dependents = new Map<string, string[]>()
        for (const dep of dependencies) {
            if (!dependents.has(dep.srcTaskId)) {
                dependents.set(dep.srcTaskId, [])
            }
            dependents.get(dep.srcTaskId)!.push(dep.dstTaskId)
        }

        function dfs(currentId: string) {
            if (visited.has(currentId)) return
            visited.add(currentId)

            const deps = dependents.get(currentId) || []
            for (const depId of deps) {
                result.add(depId)
                dfs(depId)
            }
        }

        dfs(taskId)
        return result
    }

    /**
     * Check if a dependency already exists between two tasks
     */
    dependencyExists(srcTaskId: string, dstTaskId: string, dependencies: Dependency[]): boolean {
        return dependencies.some(dep =>
            dep.srcTaskId === srcTaskId && dep.dstTaskId === dstTaskId
        )
    }

    /**
     * Find redundant dependencies (those implied by transitivity)
     */
    findRedundantDependencies(dependencies: Dependency[]): Dependency[] {
        const redundant: Dependency[] = []

        for (const dep of dependencies) {
            // Get all paths from src to dst excluding this dependency
            const otherDeps = dependencies.filter(d => d.id !== dep.id)
            const transitiveDeps = this.getTransitiveDependents(dep.srcTaskId, otherDeps)

            if (transitiveDeps.has(dep.dstTaskId)) {
                redundant.push(dep)
            }
        }

        return redundant
    }

    /**
     * Suggest dependencies based on task dates and staff positions
     */
    suggestDependencies(tasks: Task[]): Array<{ src: Task; dst: Task; type: DependencyType }> {
        const suggestions: Array<{ src: Task; dst: Task; type: DependencyType }> = []

        for (let i = 0; i < tasks.length; i++) {
            for (let j = 0; j < tasks.length; j++) {
                if (i === j) continue

                const task1 = tasks[i]
                const task2 = tasks[j]

                // Suggest finish-to-start if task2 starts right after task1 ends
                const task1End = new Date(task1.endDate)
                const task2Start = new Date(task2.startDate)
                const daysDiff = Math.abs((task2Start.getTime() - task1End.getTime()) / (1000 * 60 * 60 * 24))

                if (daysDiff <= 1 && task1End <= task2Start) {
                    suggestions.push({
                        src: task1,
                        dst: task2,
                        type: DependencyType.FINISH_TO_START
                    })
                }

                // Suggest start-to-start if tasks start on the same day
                if (task1.startDate === task2.startDate) {
                    suggestions.push({
                        src: task1,
                        dst: task2,
                        type: DependencyType.START_TO_START
                    })
                }
            }
        }

        return suggestions
    }

    /**
     * Remove a dependency and check if it breaks the schedule
     */
    canRemoveDependency(dependency: Dependency, allDependencies: Dependency[]): boolean {
        // A dependency can be removed if it's redundant or if there are alternative paths
        const otherDeps = allDependencies.filter(d => d.id !== dependency.id)
        const transitiveDeps = this.getTransitiveDependents(dependency.srcTaskId, otherDeps)

        // If there's still a path from src to dst without this dependency, it can be removed
        return transitiveDeps.has(dependency.dstTaskId)
    }

    private buildDependencyGraph(tasks: Task[], dependencies: Dependency[]): Map<string, string[]> {
        const graph = new Map<string, string[]>()

        for (const task of tasks) {
            graph.set(task.id, [])
        }

        for (const dep of dependencies) {
            const dependents = graph.get(dep.srcTaskId) || []
            dependents.push(dep.dstTaskId)
            graph.set(dep.srcTaskId, dependents)
        }

        return graph
    }

    private hasCycleDFS(
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
                if (this.hasCycleDFS(dependentId, graph, visited, recursionStack)) {
                    return true
                }
            } else if (recursionStack.has(dependentId)) {
                return true
            }
        }

        recursionStack.delete(taskId)
        return false
    }
}
