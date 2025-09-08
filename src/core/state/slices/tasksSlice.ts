import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Task } from '@types'

export interface TasksState { list: Task[] }

const initialState: TasksState = { list: [] }

const tasksSlice = createSlice({
    name: 'tasks',
    initialState,
    reducers: {
        setTasks: (_state, action: PayloadAction<Task[]>) => ({ list: [...action.payload] }),
        addTask: (state, action: PayloadAction<Task>) => { state.list.push(action.payload) },
        updateTask: (state, action: PayloadAction<{ id: string; updates: Partial<Task> }>) => {
            const i = state.list.findIndex(t => t.id === action.payload.id)
            if (i !== -1) {
                state.list[i] = { ...state.list[i], ...action.payload.updates, updatedAt: new Date().toISOString() }
            }
        },
        deleteTask: (state, action: PayloadAction<string>) => {
            state.list = state.list.filter(t => t.id !== action.payload)
        },
    },
})

export const { setTasks, addTask, updateTask } = tasksSlice.actions
export default tasksSlice.reducer

