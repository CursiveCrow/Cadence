import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Task, Dependency, Staff } from '@cadence/core'
import { selectTaskEntities, selectDependencyEntities, selectSelection, selectViewport, selectStaffs, setSelection, setViewport as setViewportAction } from '@cadence/core/state'
import { updateTaskThunk, createDependencyThunk, createTaskThunk } from '@cadence/core/state'
import type { AppDispatch } from '@cadence/core/state'

export interface TimelineViewModel {
    projectId: string
    tasks: Record<string, Task>
    dependencies: Record<string, Dependency>
    selection: string[]
    viewport: { x: number; y: number; zoom: number }
    staffs: Staff[]
    commands: {
        select: (ids: string[]) => void
        setViewport: (v: { x: number; y: number; zoom: number }) => void
        updateTask: (taskId: string, updates: Partial<Task>) => void
        createDependency: (dep: { id: string; srcTaskId: string; dstTaskId: string; type: Dependency['type'] }) => void
        createTask: (task: Task) => void
    }
}

export function useTimelineViewModel(projectId: string): TimelineViewModel {
    const dispatch = useDispatch<AppDispatch>()
    const tasks = useSelector(selectTaskEntities)
    const rawDependencies = useSelector(selectDependencyEntities)
    const selection = useSelector(selectSelection)
    const viewport = useSelector(selectViewport)
    const staffs = useSelector(selectStaffs)

    const select = React.useCallback((ids: string[]) => {
        dispatch(setSelection(ids))
    }, [dispatch])

    const setViewport = React.useCallback((v: { x: number; y: number; zoom: number }) => {
        dispatch(setViewportAction(v))
    }, [dispatch])

    const updateTask = React.useCallback((taskId: string, updates: Partial<Task>) => {
        dispatch(updateTaskThunk({ projectId, taskId, updates }))
    }, [dispatch, projectId])

    const createDependency = React.useCallback((dep: { id: string; srcTaskId: string; dstTaskId: string; type: Dependency['type'] }) => {
        dispatch(createDependencyThunk({ projectId, dep: dep as any }))
    }, [dispatch, projectId])

    const createTask = React.useCallback((task: Task) => {
        dispatch(createTaskThunk({ projectId, task }))
    }, [dispatch, projectId])

    const dependencies: Record<string, Dependency> = React.useMemo(() => {
        const out: Record<string, Dependency> = {}
        for (const [id, dep] of Object.entries(rawDependencies || {})) {
            out[id] = { ...(dep as any), id } as Dependency
        }
        return out
    }, [rawDependencies])

    return {
        projectId,
        tasks,
        dependencies,
        selection,
        viewport,
        staffs,
        commands: { select, setViewport, updateTask, createDependency, createTask }
    }
}


