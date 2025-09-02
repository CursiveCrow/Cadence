/**
 * React hooks for observing Yjs documents (moved from infrastructure/crdt)
 */

import { useState, useEffect } from 'react'
import { getProjectDoc, type TaskData, type DependencyData } from '@cadence/crdt'

export function useProjectTasks(projectId: string): Record<string, TaskData> {
    const ydoc = getProjectDoc(projectId)
    const [tasks, setTasks] = useState<Record<string, TaskData>>({})

    useEffect(() => {
        const tasksMap = ydoc.tasks
        const observer = () => {
            setTasks(tasksMap.toJSON() as Record<string, TaskData>)
        }
        tasksMap.observe(observer)
        observer()
        return () => tasksMap.unobserve(observer)
    }, [ydoc])

    return tasks
}

export function useProjectDependencies(projectId: string): Record<string, DependencyData> {
    const ydoc = getProjectDoc(projectId)
    const [dependencies, setDependencies] = useState<Record<string, DependencyData>>({})

    useEffect(() => {
        const dependenciesMap = ydoc.dependencies
        const observer = () => {
            setDependencies(dependenciesMap.toJSON() as Record<string, DependencyData>)
        }
        dependenciesMap.observe(observer)
        observer()
        return () => dependenciesMap.unobserve(observer)
    }, [ydoc])

    return dependencies
}

export function useTask(projectId: string, taskId: string): TaskData | undefined {
    const tasks = useProjectTasks(projectId)
    return tasks[taskId]
}


