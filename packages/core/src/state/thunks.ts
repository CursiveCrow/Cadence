import { createAsyncThunk } from '@reduxjs/toolkit'
import type { Task, DependencyType } from '@cadence/core'

export const updateTaskThunk = createAsyncThunk(
    'tasks/updateTask',
    async (args: { projectId: string; taskId: string; updates: Partial<Task> }) => {
        const { updateTask } = await import('@cadence/crdt')
        updateTask(args.projectId, args.taskId, args.updates as any)
        return args
    }
)

export const createDependencyThunk = createAsyncThunk(
    'dependencies/createDependency',
    async (args: { projectId: string; dep: { id: string; srcTaskId: string; dstTaskId: string; type: DependencyType } }) => {
        const { createDependency } = await import('@cadence/crdt')
        createDependency(args.projectId, args.dep as any)
        return args
    }
)

export const createTaskThunk = createAsyncThunk(
    'tasks/createTask',
    async (args: { projectId: string; task: Task }) => {
        const { createTask } = await import('@cadence/crdt')
        createTask(args.projectId, args.task as any)
        return args
    }
)

export const moveTaskThunk = createAsyncThunk(
    'tasks/moveTask',
    async (args: { projectId: string; taskId: string; newStartDate: string }) => {
        const { moveTask } = await import('@cadence/crdt')
        moveTask(args.projectId, args.taskId, args.newStartDate)
        return args
    }
)

