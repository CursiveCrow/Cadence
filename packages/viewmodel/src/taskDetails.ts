import * as React from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { Task, Staff } from '@cadence/core'
import { selectStaffs, selectTaskEntities, selectSelection, setSelection } from '@cadence/core/state'
import { updateTaskThunk } from '@cadence/core/state'
import type { AppDispatch } from '@cadence/core/state'

export interface TaskDetailsViewModel {
    projectId: string
    taskId: string | null
    task: Task | undefined
    staffs: Staff[]
    selectionCount: number
    commands: {
        updateTask: (updates: Partial<Task>) => void
        close: () => void
    }
}

export function useTaskDetailsViewModel(projectId: string, taskId: string | null): TaskDetailsViewModel {
    const dispatch = useDispatch<AppDispatch>()
    const tasks = useSelector(selectTaskEntities)
    const staffs = useSelector(selectStaffs)
    const selection = useSelector(selectSelection)

    const updateTask = React.useCallback((updates: Partial<Task>) => {
        if (!taskId) return
        dispatch(updateTaskThunk({ projectId, taskId, updates }))
    }, [dispatch, projectId, taskId])

    const close = React.useCallback(() => {
        dispatch(setSelection([]))
    }, [dispatch])

    return {
        projectId,
        taskId,
        task: taskId ? tasks[taskId] : undefined,
        staffs,
        selectionCount: selection.length,
        commands: { updateTask, close }
    }
}


