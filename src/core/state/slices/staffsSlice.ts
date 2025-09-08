import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Staff } from '@types'

export interface StaffsState { list: Staff[] }

const initialState: StaffsState = { list: [] }

const staffsSlice = createSlice({
    name: 'staffs',
    initialState,
    reducers: {
        setStaffs: (_state, action: PayloadAction<Staff[]>) => ({ list: [...action.payload].sort((a, b) => a.position - b.position) }),
        addStaff: (state, action: PayloadAction<Staff>) => { state.list.push(action.payload); state.list.sort((a, b) => a.position - b.position) },
        updateStaff: (state, action: PayloadAction<{ id: string; updates: Partial<Staff> }>) => {
            const index = state.list.findIndex((s) => s.id === action.payload.id)
            if (index !== -1) {
                state.list[index] = { ...state.list[index], ...action.payload.updates, updatedAt: new Date().toISOString() }
                state.list.sort((a, b) => a.position - b.position)
            }
        },
        deleteStaff: (state, action: PayloadAction<string>) => {
            state.list = state.list.filter((s) => s.id !== action.payload)
            state.list.forEach((s, i) => { s.position = i })
        },
        reorderStaffs: (state, action: PayloadAction<{ staffId: string; newPosition: number }>) => {
            const { staffId, newPosition } = action.payload
            const idx = state.list.findIndex((s) => s.id === staffId)
            if (idx !== -1) {
                const item = state.list[idx]
                state.list.splice(idx, 1)
                state.list.splice(newPosition, 0, item)
                state.list.forEach((s, i) => { s.position = i })
            }
        },
    },
})

export const { setStaffs, addStaff, updateStaff, deleteStaff, reorderStaffs } = staffsSlice.actions
export default staffsSlice.reducer

