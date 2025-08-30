/**
 * Domain Algorithms for Cadence Project Management System
 * Based on Design.md specification
 */
import { Task, Dependency } from './types'
/**
 * DAG Validation - Cycle Detection
 * Performs Depth First Search (DFS) to ensure no cycles exist in the dependency graph
 */
export declare function validateDAG(tasks: Task[], dependencies: Dependency[]): boolean
/**
 * Topological Sort
 * Returns tasks in dependency order
 */
export declare function topologicalSort(tasks: Task[], dependencies: Dependency[]): string[]
/**
 * Assign simple lane indices to tasks to support visual layout.
 * Heuristic:
 * - Process tasks in topological order.
 * - If a task has predecessors, pick the minimum predecessor lane to keep chains together.
 * - If a task has no predecessors, place it in the next available lane, cycling from 0.
 */
export declare function assignLanes(tasks: Task[], dependencies: Dependency[]): Task[]
//# sourceMappingURL=algorithms.d.ts.map
