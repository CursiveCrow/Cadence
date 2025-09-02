/**
 * React hooks for observing Yjs documents
 */

import { useState, useEffect } from 'react'
import { getProjectDoc, TaskData, DependencyData } from '../ydoc'

/**
 * Hook to observe project tasks
 * Returns tasks as a plain JavaScript object
 */
export function useProjectTasks(projectId: string): Record<string, TaskData> {
  const ydoc = getProjectDoc(projectId)
  const [tasks, setTasks] = useState<Record<string, TaskData>>({})

  useEffect(() => {
    const tasksMap = ydoc.tasks

    const observer = () => {
      // Convert YMap to plain JS objects for React consumption
      setTasks(tasksMap.toJSON() as Record<string, TaskData>)
    }

    tasksMap.observe(observer)
    observer() // Initial load

    return () => tasksMap.unobserve(observer)
  }, [ydoc])

  return tasks
}

/**
 * Hook to observe project dependencies
 */
export function useProjectDependencies(projectId: string): Record<string, DependencyData> {
  const ydoc = getProjectDoc(projectId)
  const [dependencies, setDependencies] = useState<Record<string, DependencyData>>({})

  useEffect(() => {
    const dependenciesMap = ydoc.dependencies

    const observer = () => {
      setDependencies(dependenciesMap.toJSON() as Record<string, DependencyData>)
    }

    dependenciesMap.observe(observer)
    observer() // Initial load

    return () => dependenciesMap.unobserve(observer)
  }, [ydoc])

  return dependencies
}

/**
 * Hook to observe a specific task
 */
export function useTask(projectId: string, taskId: string): TaskData | undefined {
  const tasks = useProjectTasks(projectId)
  return tasks[taskId]
}

/**
 * Hook to get undo/redo functionality
 */
export {}
