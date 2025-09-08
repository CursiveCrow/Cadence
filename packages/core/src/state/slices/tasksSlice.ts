import { createEntityAdapter, createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Task } from '@cadence/core'

export const tasksAdapter = createEntityAdapter<Task>()

const tasksSlice = createSlice({
    name: 'tasks',
    initialState: tasksAdapter.getInitialState(),
    reducers: {
        upsertMany: (state, action: PayloadAction<Task[]>) => {
            tasksAdapter.upsertMany(state, action.payload)
        },
        upsertOne: (state, action: PayloadAction<Task>) => {
            tasksAdapter.upsertOne(state, action.payload)
        },
        removeMany: (state, action: PayloadAction<string[]>) => {
            tasksAdapter.removeMany(state, action.payload)
        },
        removeOne: (state, action: PayloadAction<string>) => {
            tasksAdapter.removeOne(state, action.payload)
        },
        setAll: (state, action: PayloadAction<Task[]>) => {
            tasksAdapter.setAll(state, action.payload)
        },
        clear: (state) => {
            tasksAdapter.removeAll(state)
        },
    },
})

export const { upsertMany: upsertTasksMany, upsertOne: upsertTask, removeMany: removeTasksMany, removeOne: removeTask, setAll: setAllTasks, clear: clearTasks } = tasksSlice.actions
export default tasksSlice.reducer
export const tasksSelectors = tasksAdapter.getSelectors((state: any) => state.tasks)

