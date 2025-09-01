/**
 * Staffs Redux Slice
 * Manages staff state in the Redux store
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface StaffData {
    id: string
    name: string
    numberOfLines: number
    lineSpacing: number
    position: number
    projectId: string
    timeSignature?: string
    createdAt: string
    updatedAt: string
}

export interface StaffsState {
    byProjectId: Record<string, Record<string, StaffData>>
}

const initialState: StaffsState = {
    byProjectId: {}
}

type SetStaffsPayload = { projectId: string; staffs: Record<string, StaffData> }
type UpsertStaffPayload = { projectId: string; staff: StaffData }
type DeleteStaffPayload = { projectId: string; staffId: string }

const staffsSlice = createSlice({
    name: 'staffs',
    initialState,
    reducers: {
        setStaffs: (state, action: PayloadAction<SetStaffsPayload>) => {
            const { projectId, staffs } = action.payload
            state.byProjectId[projectId] = { ...staffs }
        },
        upsertStaff: (state, action: PayloadAction<UpsertStaffPayload>) => {
            const { projectId, staff } = action.payload
            if (!state.byProjectId[projectId]) {
                state.byProjectId[projectId] = {}
            }
            state.byProjectId[projectId][staff.id] = staff
        },
        updateStaff: (state, action: PayloadAction<{ projectId: string; staffId: string; updates: Partial<StaffData> }>) => {
            const { projectId, staffId, updates } = action.payload
            const staffs = state.byProjectId[projectId]
            if (!staffs || !staffs[staffId]) return
            staffs[staffId] = {
                ...staffs[staffId],
                ...updates,
                updatedAt: new Date().toISOString()
            }
        },
        deleteStaff: (state, action: PayloadAction<DeleteStaffPayload>) => {
            const { projectId, staffId } = action.payload
            const staffs = state.byProjectId[projectId]
            if (!staffs) return
            delete staffs[staffId]
        },
        clearProjectStaffs: (state, action: PayloadAction<{ projectId: string }>) => {
            const { projectId } = action.payload
            delete state.byProjectId[projectId]
        }
    }
})

export const {
    setStaffs,
    upsertStaff,
    updateStaff,
    deleteStaff,
    clearProjectStaffs
} = staffsSlice.actions

export default staffsSlice.reducer
