/**
 * UI State Slice for Redux Toolkit
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { UIState } from '@cadence/core'

const initialState: UIState = {
  activeProjectId: null,
  selection: [],
  viewport: { x: 0, y: 0, zoom: 1 },
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
} = uiSlice.actions
