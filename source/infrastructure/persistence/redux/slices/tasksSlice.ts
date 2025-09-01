/**
 * Tasks Redux Slice
 * Manages task state in the Redux store
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface TaskData {
    id: string
    title: string
    startDate: string
    durationDays: number
    status: string
    assignee?: string
    description?: string
    staffId: string
    staffLine: number
    laneIndex?: number
    projectId: string
    createdAt: string
    updatedAt: string
}

export interface TasksState {
    byProjectId: Record<string, Record<string, TaskData>>
}

const initialState: TasksState = {
    byProjectId: {}
}

type UpsertTaskPayload = { projectId: string; task: TaskData }
type UpdateTaskPayload = { projectId: string; taskId: string; updates: Partial<TaskData> }
type DeleteTaskPayload = { projectId: string; taskId: string }
type SetTasksPayload = { projectId: string; tasks: Record<string, TaskData> }

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        setTasks: (state, action: PayloadAction<SetTasksPayload>) => {
            const { projectId, tasks } = action.payload
            state.byProjectId[projectId] = { ...tasks }
        },
        upsertTask: (state, action: PayloadAction<UpsertTaskPayload>) => {
            const { projectId, task } = action.payload
            if (!state.byProjectId[projectId]) {
                state.byProjectId[projectId] = {}
            }
            state.byProjectId[projectId][task.id] = task
        },
        updateTask: (state, action: PayloadAction<UpdateTaskPayload>) => {
            const { projectId, taskId, updates } = action.payload
            const tasks = state.byProjectId[projectId]
            if (!tasks || !tasks[taskId]) return
            tasks[taskId] = {
                ...tasks[taskId],
                ...updates,
                updatedAt: new Date().toISOString()
            }
        },
        deleteTask: (state, action: PayloadAction<DeleteTaskPayload>) => {
            const { projectId, taskId } = action.payload
            const tasks = state.byProjectId[projectId]
            if (!tasks) return
            delete tasks[taskId]
        },
        clearProjectTasks: (state, action: PayloadAction<{ projectId: string }>) => {
            const { projectId } = action.payload
            delete state.byProjectId[projectId]
        }
    },
})

export const {
    setTasks,
    upsertTask,
    updateTask,
    deleteTask,
    clearProjectTasks
} = tasksSlice.actions

export default tasksSlice.reducer
