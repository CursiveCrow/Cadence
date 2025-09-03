/**
 * Redux Toolkit Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit'
import ui from './slices/uiSlice'
import staffs from './slices/staffsSlice'

// Use Redux Toolkit defaults; no custom serializableCheck needed
export const store = configureStore({
  reducer: {
    ui,
    staffs,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
