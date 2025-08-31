/**
 * UI State Slice for Redux Toolkit
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface UIProjectState {
  activeProjectId: string | null
}

const initialState: UIProjectState = { activeProjectId: null }

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveProject: (state, action: PayloadAction<string | null>) => {
      state.activeProjectId = action.payload
    },
  },
})

export const { setActiveProject } = uiSlice.actions
export default uiSlice.reducer
