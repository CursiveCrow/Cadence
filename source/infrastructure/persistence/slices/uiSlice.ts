/**
 * UI State Slice (consolidated)
 * Combines activeProjectId, selection and viewport state to reduce boilerplate.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

export interface UIState {
  activeProjectId: string | null
  selection: string[]
  selectionAnchor: { x: number; y: number } | null
  viewport: ViewportState
}

const initialState: UIState = {
  activeProjectId: null,
  selection: [],
  selectionAnchor: null,
  viewport: { x: 0, y: 0, zoom: 1 },
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveProject: (state, action: PayloadAction<string | null>) => {
      state.activeProjectId = action.payload
    },
    setSelection: (state, action: PayloadAction<string[]>) => {
      state.selection = action.payload
      state.selectionAnchor = null
    },
    setSelectionWithAnchor: (
      state,
      action: PayloadAction<{ ids: string[]; anchor?: { x: number; y: number } }>
    ) => {
      state.selection = action.payload.ids
      state.selectionAnchor = action.payload.anchor ? { ...action.payload.anchor } : null
    },
    setViewport: (state, action: PayloadAction<ViewportState>) => {
      state.viewport = action.payload
    },
    updateViewport: (state, action: PayloadAction<Partial<ViewportState>>) => {
      state.viewport = { ...state.viewport, ...action.payload }
    },
  },
})

export const { setActiveProject, setSelection, setSelectionWithAnchor, setViewport, updateViewport } = uiSlice.actions
export default uiSlice.reducer
