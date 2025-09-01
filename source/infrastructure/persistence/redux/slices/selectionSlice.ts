/**
 * Selection Redux Slice
 * Manages selection state for tasks and other entities
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface SelectionState {
    selectedTaskIds: string[]
    selectedDependencyIds: string[]
    selectedStaffIds: string[]
    lastSelectedType: 'task' | 'dependency' | 'staff' | null
    multiSelectMode: boolean
}

const initialState: SelectionState = {
    selectedTaskIds: [],
    selectedDependencyIds: [],
    selectedStaffIds: [],
    lastSelectedType: null,
    multiSelectMode: false
}

const selectionSlice = createSlice({
    name: 'selection',
    initialState,
    reducers: {
        selectTasks: (state, action: PayloadAction<string[]>) => {
            state.selectedTaskIds = action.payload
            state.selectedDependencyIds = []
            state.selectedStaffIds = []
            state.lastSelectedType = 'task'
        },
        addTaskToSelection: (state, action: PayloadAction<string>) => {
            if (!state.selectedTaskIds.includes(action.payload)) {
                state.selectedTaskIds.push(action.payload)
            }
            state.lastSelectedType = 'task'
        },
        removeTaskFromSelection: (state, action: PayloadAction<string>) => {
            state.selectedTaskIds = state.selectedTaskIds.filter(id => id !== action.payload)
        },
        toggleTaskSelection: (state, action: PayloadAction<string>) => {
            const index = state.selectedTaskIds.indexOf(action.payload)
            if (index === -1) {
                state.selectedTaskIds.push(action.payload)
            } else {
                state.selectedTaskIds.splice(index, 1)
            }
            state.lastSelectedType = 'task'
        },
        selectDependencies: (state, action: PayloadAction<string[]>) => {
            state.selectedDependencyIds = action.payload
            state.selectedTaskIds = []
            state.selectedStaffIds = []
            state.lastSelectedType = 'dependency'
        },
        selectStaffs: (state, action: PayloadAction<string[]>) => {
            state.selectedStaffIds = action.payload
            state.selectedTaskIds = []
            state.selectedDependencyIds = []
            state.lastSelectedType = 'staff'
        },
        clearSelection: (state) => {
            state.selectedTaskIds = []
            state.selectedDependencyIds = []
            state.selectedStaffIds = []
            state.lastSelectedType = null
        },
        setMultiSelectMode: (state, action: PayloadAction<boolean>) => {
            state.multiSelectMode = action.payload
        },
        selectAll: (state, action: PayloadAction<{
            type: 'task' | 'dependency' | 'staff'
            ids: string[]
        }>) => {
            const { type, ids } = action.payload
            switch (type) {
                case 'task':
                    state.selectedTaskIds = ids
                    state.selectedDependencyIds = []
                    state.selectedStaffIds = []
                    break
                case 'dependency':
                    state.selectedDependencyIds = ids
                    state.selectedTaskIds = []
                    state.selectedStaffIds = []
                    break
                case 'staff':
                    state.selectedStaffIds = ids
                    state.selectedTaskIds = []
                    state.selectedDependencyIds = []
                    break
            }
            state.lastSelectedType = type
        }
    }
})

export const {
    selectTasks,
    addTaskToSelection,
    removeTaskFromSelection,
    toggleTaskSelection,
    selectDependencies,
    selectStaffs,
    clearSelection,
    setMultiSelectMode,
    selectAll
} = selectionSlice.actions

export default selectionSlice.reducer
