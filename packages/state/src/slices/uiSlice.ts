/**
 * UI State Slice for Redux Toolkit
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { UIState, Staff } from '@cadence/core'

const initialState: UIState = {
  activeProjectId: null,
  selection: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  staffs: [],
}

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveProject: (state, action: PayloadAction<string | null>) => {
      state.activeProjectId = action.payload
      state.selection = [] // Clear selection when switching projects
    },
    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selection = action.payload
    },
    addToSelection: (state, action: PayloadAction<string>) => {
      if (!state.selection.includes(action.payload)) {
        state.selection.push(action.payload)
      }
    },
    removeFromSelection: (state, action: PayloadAction<string>) => {
      state.selection = state.selection.filter(id => id !== action.payload)
    },
    clearSelection: (state) => {
      state.selection = []
    },
    setViewport: (state, action: PayloadAction<{ x: number; y: number; zoom: number }>) => {
      state.viewport = action.payload
    },
    updateViewport: (state, action: PayloadAction<Partial<{ x: number; y: number; zoom: number }>>) => {
      state.viewport = { ...state.viewport, ...action.payload }
    },
    // Staff management actions
    addStaff: (state, action: PayloadAction<Staff>) => {
      state.staffs.push(action.payload)
      state.staffs.sort((a, b) => a.position - b.position)
    },
    updateStaff: (state, action: PayloadAction<{ id: string; updates: Partial<Staff> }>) => {
      const index = state.staffs.findIndex(staff => staff.id === action.payload.id)
      if (index !== -1) {
        state.staffs[index] = { ...state.staffs[index], ...action.payload.updates, updatedAt: new Date().toISOString() }
        state.staffs.sort((a, b) => a.position - b.position)
      }
    },
    deleteStaff: (state, action: PayloadAction<string>) => {
      state.staffs = state.staffs.filter(staff => staff.id !== action.payload)
      // Reorder remaining staffs
      state.staffs.forEach((staff, index) => {
        staff.position = index
      })
    },
    reorderStaffs: (state, action: PayloadAction<{ staffId: string; newPosition: number }>) => {
      const { staffId, newPosition } = action.payload
      const staffIndex = state.staffs.findIndex(staff => staff.id === staffId)
      if (staffIndex !== -1) {
        const staff = state.staffs[staffIndex]
        state.staffs.splice(staffIndex, 1)
        state.staffs.splice(newPosition, 0, staff)
        // Update positions
        state.staffs.forEach((s, index) => {
          s.position = index
        })
      }
    },
    initializeDefaultStaffs: (state, action: PayloadAction<string>) => {
      const projectId = action.payload
      if (state.staffs.length === 0) {
        // Create default staffs when starting a new project
        const defaultStaffs: Staff[] = [
          {
            id: 'staff-treble',
            name: 'Treble',
            numberOfLines: 5,
            lineSpacing: 12,
            position: 0,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: 'staff-bass',
            name: 'Bass',
            numberOfLines: 5,
            lineSpacing: 12,
            position: 1,
            projectId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ]
        state.staffs = defaultStaffs
      }
    },
  },
})

export const {
  setActiveProject,
  setSelection,
  addToSelection,
  removeFromSelection,
  clearSelection,
  setViewport,
  updateViewport,
  addStaff,
  updateStaff,
  deleteStaff,
  reorderStaffs,
  initializeDefaultStaffs,
} = uiSlice.actions
